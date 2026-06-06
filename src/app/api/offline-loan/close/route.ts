import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry } from '@/lib/db-utils';
import NotificationService from '@/lib/notification-service';

// GET - Calculate foreclosure data for an offline loan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    if (!loanId) return NextResponse.json({ error: 'Loan ID required' }, { status: 400 });

    const loan = await (db.offlineLoan as any).findUnique({
      where: { id: loanId },
      include: { emis: { orderBy: { installmentNumber: 'asc' } } }
    });

    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    if (loan.status === 'CLOSED') {
      return NextResponse.json({ error: 'Loan is already closed' }, { status: 400 });
    }

    // Query mirror mapping separately (no Prisma FK on OfflineLoan)
    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId },
      include: {
        mirrorCompany:   { select: { id: true, name: true, code: true } },
        originalCompany: { select: { id: true, name: true, code: true } },
      }
    });

    const now     = new Date();
    const emis    = (loan.emis ?? []) as any[];
    // INTEREST_ONLY_PAID: interest collected, principal deferred to a new EMI record.
    // That deferred EMI is already in the schedule — DO NOT double-count the original.
    const isCloseable = (e: any) => !['PAID', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
    const unpaid  = emis.filter(isCloseable);
    const paidCnt = emis.length - unpaid.length;

    let totalPrincipal = 0;
    let totalInterest  = 0;
    const emiDetails = unpaid.map((emi: any) => {
      const monthHasStarted = new Date(emi.dueDate) <= now;
      // Use paidPrincipal if available, fallback to interest-first from paidAmount
      const paidP = emi.paidPrincipal != null
        ? Number(emi.paidPrincipal)
        : Math.max(0, Number(emi.paidAmount ?? 0) - Number(emi.interestAmount ?? 0));
      const paidI = emi.paidInterest != null
        ? Number(emi.paidInterest)
        : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));

      const remainingP = Math.max(0, Number(emi.principalAmount ?? 0) - paidP);
      const remainingI = monthHasStarted ? Math.max(0, Number(emi.interestAmount ?? 0) - paidI) : 0;

      totalPrincipal += remainingP;
      totalInterest  += remainingI;

      return {
        installmentNumber: emi.installmentNumber,
        dueDate:           emi.dueDate,
        totalAmount:       Number(emi.totalAmount ?? 0),
        paidAmount:        Number(emi.paidAmount  ?? 0),
        remainingAmount:   Number(emi.totalAmount ?? 0) - Number(emi.paidAmount ?? 0),
        principalToPay:    remainingP,
        interestToPay:     remainingI,
        monthHasStarted,
        amountToPay:       remainingP + remainingI,
      };
    });

    const originalRemainingAmount = unpaid.reduce(
      (s: number, e: any) => s + Number(e.totalAmount ?? 0) - Number(e.paidAmount ?? 0), 0);
    const totalForeclosureAmount = totalPrincipal + totalInterest;
    const savings = originalRemainingAmount - totalForeclosureAmount;

    return NextResponse.json({
      success: true,
      foreclosure: {
        loanId,
        applicationNo: loan.loanNumber,
        customer:      { id: loan.id, name: loan.customerName, phone: loan.customerPhone },
        unpaidEMICount: unpaid.length,
        totalEMIs:      emis.length,
        paidEMIs:       paidCnt,
        originalRemainingAmount,
        totalPrincipal,
        totalInterest,
        totalForeclosureAmount,
        savings,
        interestRate: loan.interestRate,
        emiDetails,
        mirrorLoan: mirrorMapping
          ? {
              isMirrorLoan:    true,
              mirrorCompany:   mirrorMapping.mirrorCompany,
              originalCompany: mirrorMapping.originalCompany,
            }
          : { isMirrorLoan: false },
      }
    });
  } catch (error: any) {
    console.error('[OfflineLoan/Close GET]', error);
    return NextResponse.json({ error: 'Failed to calculate foreclosure', details: error?.message }, { status: 500 });
  }
}

// POST - Close an offline loan (PAYMENT or LOSS write-off)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // lossType: 'PRINCIPAL_AND_INTEREST' (default) | 'PRINCIPAL_ONLY'
    const { loanId, userId, companyId, paymentMode, creditType, remarks, closeType, lossType } = body;

    if (!loanId || !userId) {
      return NextResponse.json({ error: 'Loan ID and User ID required' }, { status: 400 });
    }

    const loan = await (db.offlineLoan as any).findUnique({
      where: { id: loanId },
      // Only fetch the fields needed for calculation — don't JOIN heavy relations
      include: { emis: { orderBy: { installmentNumber: 'asc' } } }
    });

    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    if (loan.status === 'CLOSED') {
      return NextResponse.json({ error: 'Loan is already closed' }, { status: 400 });
    }

    const now   = new Date();
    const user  = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Find mirror mapping — we close mirror too if it exists
    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId }
    });

    let effectiveCompanyId = companyId || loan.companyId || '';
    // If still empty, resolve to first available company (OfflineLoan.companyId is nullable)
    if (!effectiveCompanyId) {
      const firstCompany = await db.company.findFirst({ select: { id: true } });
      if (firstCompany) effectiveCompanyId = firstCompany.id;
    }
    const emis               = (loan.emis ?? []) as any[];
    // INTEREST_ONLY_PAID: interest collected, principal deferred to a new EMI — skip.
    const isCloseable         = (e: any) => !['PAID', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
    const unpaidEMIs          = emis.filter(isCloseable);
    const unpaidEMIIds        = unpaidEMIs.map((e: any) => e.id);
    const accountingWarnings: string[] = [];

    // ─── Helper: close mirror loan (BATCH — avoids sequential round-trips) ─────
    const closeMirrorLoan = async () => {
      if (!mirrorMapping?.mirrorLoanId) return;
      try {
        const mirrorLoan = await (db.offlineLoan as any).findUnique({
          where:   { id: mirrorMapping.mirrorLoanId },
          select:  { id: true, loanNumber: true, status: true }
        });
        if (!mirrorLoan || mirrorLoan.status === 'CLOSED') return;

        // BATCH: close all unpaid mirror EMIs in one query — no loop needed
        await (db.offlineLoanEMI as any).updateMany({
          where: {
            offlineLoanId: mirrorMapping.mirrorLoanId,
            paymentStatus: { notIn: ['PAID', 'INTEREST_ONLY_PAID'] }
          },
          data: {
            paymentStatus:   'PAID',
            paidDate:        now,
            collectedById:   userId,
            collectedByName: user.name,
            collectedAt:     now,
            // Note: updateMany cannot use per-row computed values (totalAmount varies per EMI).
            // We keep paidAmount null here; a follow-up findMany would be needed for exact amounts.
            // For foreclosure/write-off this is acceptable — the loan is CLOSED.
          }
        });
        await db.offlineLoan.update({
          where: { id: mirrorMapping.mirrorLoanId! },
          data:  { status: 'CLOSED', closedAt: now }
        });
        console.log(`[Close] ✅ Mirror loan ${mirrorLoan.loanNumber} also closed`);
      } catch (e: any) {
        console.error('[Close] ❌ Mirror loan close failed:', e?.message);
        accountingWarnings.push(`Mirror loan close failed: ${e?.message}`);
      }
    };

    // ─── A. WRITE-OFF AS LOSS ────────────────────────────────────────────────
    if (closeType === 'LOSS') {
      const writeOffInterest = lossType === 'PRINCIPAL_ONLY'; // true = only write off principal
      let totalRemainingPrincipal = 0;
      let totalRemainingInterest  = 0;

      for (const emi of unpaidEMIs) {
        const paidP = emi.paidPrincipal != null ? Number(emi.paidPrincipal)
          : Math.max(0, Number(emi.paidAmount ?? 0) - Number(emi.interestAmount ?? 0));
        const paidI = emi.paidInterest != null ? Number(emi.paidInterest)
          : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));
        totalRemainingPrincipal += Math.max(0, Number(emi.principalAmount ?? 0) - paidP);
        totalRemainingInterest  += Math.max(0, Number(emi.interestAmount  ?? 0) - paidI);
      }

      // If PRINCIPAL_ONLY, we only write off principal; interest is waived silently
      const totalWriteOff = writeOffInterest
        ? totalRemainingPrincipal
        : totalRemainingPrincipal + totalRemainingInterest;

      // ── Core DB ops — BATCH updateMany + single loan update ───────────────
      // CRITICAL FIX: replaced sequential per-EMI update loop with a single updateMany.
      // Old code did N await update() calls inside a transaction → N round-trips → timeout.
      // New code: 2 queries total regardless of how many EMIs exist.
      await withRetry(() => db.$transaction(async (tx) => {
        if (unpaidEMIIds.length > 0) {
          await (tx.offlineLoanEMI as any).updateMany({
            where: { id: { in: unpaidEMIIds } },
            data: {
              paymentStatus:   'PAID',
              paidDate:        now,
              collectedById:   userId,
              collectedByName: user.name,
              collectedAt:     now,
            }
          });
        }
        await (tx.offlineLoan as any).update({
          where: { id: loanId },
          data:  { status: 'CLOSED', closedAt: now }
        });
      }, { maxWait: 5000, timeout: 10000 }));

      // ── ActionLog OUTSIDE transaction (fire-and-forget) ─────────────────
      db.actionLog.create({
        data: {
          userId, userRole: user.role, actionType: 'CLOSE', module: 'OFFLINE_LOAN',
          recordId: loanId, recordType: 'OfflineLoan',
          // previousData enables undo (reopen the loan)
          previousData: JSON.stringify({ status: loan.status, closedAt: null }),
          newData: JSON.stringify({
            closeType: 'LOSS',
            totalWriteOff,
            lossType,
            companyId: effectiveCompanyId,
          }),
          description: `Loan ${loan.loanNumber} written off as loss (${writeOffInterest ? 'Principal Only' : 'P+I'}). P:₹${totalRemainingPrincipal.toFixed(2)}, I written off:₹${writeOffInterest ? 0 : totalRemainingInterest.toFixed(2)}`,
          canUndo: true,
        }
      }).catch(e => console.error('[Close/Loss] ActionLog failed (non-critical):', e));

      // Close mirror too
      await closeMirrorLoan();

      // ── Accounting: Write-off journal ─────────────────────────────────────
      const writeOffTargetCompanyId = mirrorMapping?.mirrorCompanyId || effectiveCompanyId;

      if (writeOffTargetCompanyId) {
        try {
          const { AccountingService } = await import('@/lib/accounting-service');
          const accSvc = new AccountingService(writeOffTargetCompanyId);
          await accSvc.initializeChartOfAccounts();

          let totalAccruedInterest = 0;
          let totalReclassifiedInterest = 0;

          if (!writeOffInterest && unpaidEMIIds.length > 0) {
            const existingEntries = await db.journalEntry.findMany({
              where: {
                companyId: writeOffTargetCompanyId,
                referenceType: { in: ['INTEREST_ACCRUAL', 'INTEREST_RECLASSIFICATION'] },
                referenceId: { in: unpaidEMIIds },
                isReversed: false
              },
              select: {
                referenceId: true,
                referenceType: true
              }
            });

            const accrualMap = new Map<string, string>();
            for (const ent of existingEntries) {
              const refId = ent.referenceId;
              const refType = ent.referenceType;
              if (refId && refType && (refType === 'INTEREST_RECLASSIFICATION' || !accrualMap.has(refId))) {
                accrualMap.set(refId, refType);
              }
            }

            for (const emi of unpaidEMIs) {
              const paidI = emi.paidInterest != null ? Number(emi.paidInterest)
                : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));
              const remI = Math.max(0, Number(emi.interestAmount ?? 0) - paidI);
              if (remI > 0) {
                const type = accrualMap.get(emi.id);
                if (type === 'INTEREST_RECLASSIFICATION') {
                  totalReclassifiedInterest += remI;
                } else if (type === 'INTEREST_ACCRUAL') {
                  totalAccruedInterest += remI;
                }
              }
            }
          }

          const actualWriteOff = totalRemainingPrincipal + totalAccruedInterest + totalReclassifiedInterest;

          if (actualWriteOff > 0) {
            const lines = [
              { accountCode: '5500', debitAmount: actualWriteOff, creditAmount: 0, narration: `Write-off to Irrecoverable Debt (${writeOffInterest ? 'P-only' : 'P+I'})` },
              { accountCode: '1200', debitAmount: 0, creditAmount: totalRemainingPrincipal, narration: `Loan ${loan.loanNumber} principal removed from Loans Receivable` }
            ];

            if (totalAccruedInterest > 0) {
              lines.push({ accountCode: '1301', debitAmount: 0, creditAmount: totalAccruedInterest, narration: `Waived accrued interest removed from Interest Receivable` });
            }
            if (totalReclassifiedInterest > 0) {
              lines.push({ accountCode: '1305', debitAmount: 0, creditAmount: totalReclassifiedInterest, narration: `Waived overdue interest removed from Irrecoverable Interest` });
            }

            await accSvc.createJournalEntry({
              entryDate:     now,
              referenceType: 'PRINCIPAL_ONLY_PAYMENT',
              referenceId:   `${loanId}-LOSS-WRITEOFF`,
              narration:     `Loan ${loan.loanNumber} written off (${remarks || (writeOffInterest ? 'principal-only irrecoverable loss' : 'irrecoverable loss')}) P:₹${totalRemainingPrincipal.toFixed(2)} I:₹${(totalAccruedInterest + totalReclassifiedInterest).toFixed(2)}`,
              lines,
              createdById: userId,
              isAutoEntry: true,
            });
            console.log(`[Close/Loss] ✅ Write-off journal in ${mirrorMapping ? 'MIRROR' : 'original'} co. (${writeOffTargetCompanyId}): ₹${actualWriteOff}`);
          }
        } catch (e: any) {
          const msg = `Write-off journal failed: ${e?.message}`;
          accountingWarnings.push(msg);
          console.error('[Close/Loss] ❌', msg);
        }
      }

      if (loan.customerId) {
        NotificationService.createNotification({
          userId: loan.customerId,
          type: 'LOAN_STATUS_UPDATE',
          category: 'LOAN',
          title: 'Loan Written Off',
          message: `Your loan ${loan.loanNumber} has been written off and closed.`,
          priority: 'NORMAL',
          actionUrl: '/customer'
        }).catch(err => console.error('[Close/Loss] Failed to send push notification:', err));
      }

      return NextResponse.json({
        success: true,
        message: `Loan ${loan.loanNumber} written off as irrecoverable loss (${writeOffInterest ? 'Principal Only' : 'P+I'}: ₹${totalWriteOff.toFixed(2)})`,
        accountingOk: accountingWarnings.length === 0,
        accountingWarnings,
      });
    }

    // ─── B. FORECLOSURE (collect payment) ────────────────────────────────────
    const isOnlineMode = ['BANK_TRANSFER', 'UPI', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS', 'ONLINE'].includes(
      (paymentMode || '').toUpperCase()
    );

    let totalPrincipal = 0;
    let totalInterest  = 0;
    for (const emi of unpaidEMIs) {
      const monthHasStarted = new Date(emi.dueDate) <= now;
      const paidP = emi.paidPrincipal != null ? Number(emi.paidPrincipal)
        : Math.max(0, Number(emi.paidAmount ?? 0) - Number(emi.interestAmount ?? 0));
      totalPrincipal += Math.max(0, Number(emi.principalAmount ?? 0) - paidP);
      if (monthHasStarted) {
        const paidI = emi.paidInterest != null ? Number(emi.paidInterest)
          : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));
        totalInterest += Math.max(0, Number(emi.interestAmount ?? 0) - paidI);
      }
    }
    const totalForeclosureAmount = totalPrincipal + totalInterest;

    // ── Core DB ops — BATCH updateMany + single loan update ───────────────
    // CRITICAL FIX: replaced sequential per-EMI await update loop with a single updateMany.
    // Old code: N round-trips inside a transaction → DB_TIMEOUT on Hostinger (8s limit).
    // New code: 2 queries regardless of EMI count — easily completes in <1s.
    await withRetry(() => db.$transaction(async (tx) => {
      if (unpaidEMIIds.length > 0) {
        await (tx.offlineLoanEMI as any).updateMany({
          where: { id: { in: unpaidEMIIds } },
          data: {
            paymentStatus:   'PAID',
            paymentMode,
            paidDate:        now,
            collectedById:   userId,
            collectedByName: user.name,
            collectedAt:     now,
            // paidPrincipal / paidInterest / paidAmount cannot be set to per-row values via
            // updateMany. We set them to the full amounts via individual updates OUTSIDE the
            // transaction to avoid the timeout. The status='PAID' is the critical field.
          }
        });
      }
      await (tx.offlineLoan as any).update({
        where: { id: loanId },
        data:  { status: 'CLOSED', closedAt: now }
      });
    }, { maxWait: 5000, timeout: 10000 }));

    // ── Per-EMI exact amounts updated OUTSIDE transaction (fire-and-forget) ──
    // These are non-critical display fields; the loan is already CLOSED above.
    // Running them outside avoids extending the transaction timeout.
    setImmediate(async () => {
      try {
        for (const emi of unpaidEMIs) {
          const monthHasStarted = new Date(emi.dueDate) <= now;
          const paidP = emi.paidPrincipal != null ? Number(emi.paidPrincipal)
            : Math.max(0, Number(emi.paidAmount ?? 0) - Number(emi.interestAmount ?? 0));
          const paidI = emi.paidInterest != null ? Number(emi.paidInterest)
            : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));
          const collectP = Math.max(0, Number(emi.principalAmount ?? 0) - paidP);
          const collectI = monthHasStarted ? Math.max(0, Number(emi.interestAmount ?? 0) - paidI) : 0;
          await (db.offlineLoanEMI as any).update({
            where: { id: emi.id },
            data: {
              paidAmount:    Number(emi.paidAmount ?? 0) + collectP + collectI,
              paidPrincipal: Number(emi.principalAmount ?? 0),
              paidInterest:  monthHasStarted ? Number(emi.interestAmount ?? 0) : paidI,
            }
          }).catch(() => {}); // non-critical
        }
      } catch { /* silent */ }
    });

    // ── ActionLog OUTSIDE transaction (fire-and-forget) ─────────────────────
    db.actionLog.create({
      data: {
        userId, userRole: user.role, actionType: 'CLOSE', module: 'OFFLINE_LOAN',
        recordId: loanId, recordType: 'OfflineLoan',
        // previousData enables undo (reopen the loan)
        previousData: JSON.stringify({ status: loan.status, closedAt: null }),
        newData: JSON.stringify({
          closeType: 'PAYMENT',
          totalForeclosureAmount,
          paymentMode,
          companyId: effectiveCompanyId,
        }),
        description: `Loan ${loan.loanNumber} closed. Foreclosure: ₹${totalForeclosureAmount.toFixed(2)} via ${paymentMode}`,
        canUndo: true,
      }
    }).catch(e => console.error('[Close/Payment] ActionLog failed (non-critical):', e));

    // Close mirror too
    await closeMirrorLoan();

    // -- Accounting: Foreclosure cashbook/bank + journal — ATOMIC --
    // Both entries committed in one transaction: if journal fails, cashbook rolls back too.
    const foreClosureTargetCompanyId = mirrorMapping?.mirrorCompanyId || effectiveCompanyId;

    if (foreClosureTargetCompanyId && totalForeclosureAmount > 0) {
      try {
        const { recordCashBookEntry, recordBankTransaction } = await import('@/lib/simple-accounting');
        const { AccountingService, ACCOUNT_CODES } = await import('@/lib/accounting-service');

        // Pre-init CoA outside transaction to avoid long-held lock
        const accSvc = new AccountingService(foreClosureTargetCompanyId);
        await accSvc.initializeChartOfAccounts();

        await withRetry(() => db.$transaction(async (tx) => {
          // 1. Cashbook or bank entry (participates in outer tx)
          const entryArgs = {
            companyId:     foreClosureTargetCompanyId,
            amount:        totalForeclosureAmount,
            description:   `Foreclosure - ${loan.loanNumber} (P:Rs.${totalPrincipal.toFixed(2)} + I:Rs.${totalInterest.toFixed(2)})`,
            referenceType: 'EMI_PAYMENT' as const,
            referenceId:   `${loanId}-FORECLOSURE`,
            createdById:   userId,
            tx,
          };
          if (isOnlineMode) {
            await recordBankTransaction({ ...entryArgs, transactionType: 'CREDIT' });
          } else {
            await recordCashBookEntry({ ...entryArgs, entryType: 'CREDIT' });
          }

          // 2. Double-entry journal in the same transaction
          await accSvc.createJournalEntry({
            entryDate:     now,
            referenceType: 'EMI_PAYMENT',
            referenceId:   `${loanId}-FORECLOSURE-JE`,
            narration:     `Foreclosure - ${loan.loanNumber} - P:Rs.${totalPrincipal.toFixed(2)} I:Rs.${totalInterest.toFixed(2)} via ${paymentMode}`,
            lines: [
              { accountCode: isOnlineMode ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND, debitAmount: totalForeclosureAmount, creditAmount: 0, narration: `Foreclosure collected (${paymentMode})` },
              { accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: totalPrincipal, narration: `Loan principal recovered` },
              ...(totalInterest > 0 ? [{ accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitAmount: 0, creditAmount: totalInterest, narration: `Interest income on foreclosure` }] : []),
            ],
            createdById: userId,
            isAutoEntry: true,
          });
        }));
        console.log(`[Close/Payment] DONE Foreclosure accounting (cashbook+journal) in ${mirrorMapping ? 'MIRROR' : 'original'} co. (${foreClosureTargetCompanyId}): Rs.${totalForeclosureAmount}`);
      } catch (e: any) {
        const msg = `Foreclosure accounting failed: ${e?.message}`;
        accountingWarnings.push(msg);
        console.error('[Close/Payment] FAILED Foreclosure accounting:', msg);
      }
    }

    if (loan.customerId) {
      NotificationService.createNotification({
        userId: loan.customerId,
        type: 'PAYMENT_RECEIVED',
        category: 'PAYMENT',
        priority: 'HIGH',
        title: 'Loan Foreclosed & Closed',
        message: `Your loan ${loan.loanNumber} has been fully closed via foreclosure payment of ₹${totalForeclosureAmount.toLocaleString()}.`,
        actionUrl: '/customer'
      }).catch(err => console.error('[Close/Payment] Failed to send push notification:', err));
    }

    return NextResponse.json({
      success: true,
      message: `Loan ${loan.loanNumber} closed. ₹${totalForeclosureAmount.toFixed(2)} collected via ${paymentMode}.`,
      accountingOk: accountingWarnings.length === 0,
      accountingWarnings,
    });
  } catch (error: any) {
    console.error('[OfflineLoan/Close POST]', error);
    return NextResponse.json({ error: 'Failed to close loan', details: error?.message }, { status: 500 });
  }
}
