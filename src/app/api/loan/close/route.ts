import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
// ACID: retry on deadlock
import { withRetry } from '@/lib/db-utils';


// GET - Calculate foreclosure amount for an online loan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    if (!loanId) return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });

    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      include: {
        sessionForm: true,
        customer:    { select: { id: true, name: true, phone: true } },
        emiSchedules: { orderBy: { installmentNumber: 'asc' } }
      }
    });

    if (!loan || !loan.sessionForm) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    if (loan.status === 'CLOSED') {
      return NextResponse.json({ error: 'Loan is already closed' }, { status: 400 });
    }

    const now = new Date();
    // INTEREST_ONLY_PAID = interest paid, principal deferred to new EMI — already accounted for
    const isCloseable = (e: any) => !['PAID', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
    const unpaidEMIs  = loan.emiSchedules.filter(isCloseable);
    const paidCnt     = loan.emiSchedules.length - unpaidEMIs.length;

    if (unpaidEMIs.length === 0) {
      return NextResponse.json({ error: 'No pending EMIs. Loan is already fully paid.' }, { status: 400 });
    }

    let totalPrincipal = 0;
    let totalInterest  = 0;
    const emiDetails = unpaidEMIs.map((emi) => {
      const monthHasStarted = new Date(emi.dueDate) <= now;
      const paidP = Number(emi.paidPrincipal ?? 0);
      const paidI = Number(emi.paidInterest  ?? 0);
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
        principalToPay:   remainingP,
        interestToPay:    remainingI,
        monthHasStarted,
        amountToPay:      remainingP + remainingI,
      };
    });

    const originalRemainingAmount = unpaidEMIs.reduce(
      (s, e) => s + Number(e.totalAmount ?? 0) - Number(e.paidAmount ?? 0), 0);
    const totalForeclosureAmount = totalPrincipal + totalInterest;
    const savings = originalRemainingAmount - totalForeclosureAmount;

    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId },
      include: {
        mirrorCompany:   { select: { id: true, name: true, code: true } },
        originalCompany: { select: { id: true, name: true, code: true } },
      }
    });

    return NextResponse.json({
      success: true,
      foreclosure: {
        loanId,
        applicationNo:          loan.applicationNo,
        customer:               loan.customer,
        unpaidEMICount:         unpaidEMIs.length,
        totalEMIs:              loan.sessionForm.tenure,
        paidEMIs:               paidCnt,
        originalRemainingAmount,
        totalPrincipal,
        totalInterest,
        totalForeclosureAmount,
        savings,
        interestRate:           loan.sessionForm.interestRate,
        emiDetails,
        mirrorLoan: mirrorMapping
          ? { isMirrorLoan: true, mirrorCompany: mirrorMapping.mirrorCompany, originalCompany: mirrorMapping.originalCompany }
          : { isMirrorLoan: false },
      }
    });

  } catch (error: any) {
    console.error('[OnlineLoan/Close GET]', error);
    return NextResponse.json({ error: 'Failed to calculate foreclosure', details: error?.message }, { status: 500 });
  }
}

// POST - Close an online loan (PAYMENT foreclosure OR LOSS write-off)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // closeType: 'PAYMENT' | 'LOSS'
    // lossType:  'PRINCIPAL_AND_INTEREST' | 'PRINCIPAL_ONLY'
    const { loanId, userId, companyId, paymentMode, creditType, remarks, closeType, lossType } = body;

    if (!loanId || !userId) {
      return NextResponse.json({ error: 'Loan ID and User ID required' }, { status: 400 });
    }

    const loan = await db.loanApplication.findUnique({
      where:   { id: loanId },
      include: {
        sessionForm:  true,
        customer:     { select: { id: true, name: true, phone: true } },
        emiSchedules: { orderBy: { installmentNumber: 'asc' } },
        company:      true,
      }
    });

    if (!loan)               return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    if (loan.status === 'CLOSED') return NextResponse.json({ error: 'Loan is already closed' }, { status: 400 });

    const now  = new Date();
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId }
    });

    const effectiveCompanyId = companyId || loan.companyId || '';
    const isCloseable        = (e: any) => !['PAID', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
    const unpaidEMIs         = loan.emiSchedules.filter(isCloseable);
    const unpaidEMIIds       = unpaidEMIs.map((e: any) => e.id);
    const accountingWarnings: string[] = [];

    // ─── Helper: close online mirror loan (BATCH — avoids sequential round-trips) ─
    const closeMirrorLoan = async () => {
      if (!mirrorMapping?.mirrorLoanId) return;
      try {
        const mirrorLoan = await db.loanApplication.findUnique({
          where:  { id: mirrorMapping.mirrorLoanId },
          select: { id: true, applicationNo: true, status: true }
        });
        if (!mirrorLoan || mirrorLoan.status === 'CLOSED') return;

        // BATCH: one updateMany instead of N sequential updates
        await db.eMISchedule.updateMany({
          where: {
            loanApplicationId: mirrorMapping.mirrorLoanId,
            paymentStatus:     { notIn: ['PAID', 'INTEREST_ONLY_PAID'] }
          },
          data: {
            paymentStatus: 'PAID',
            paidDate:      now,
            paymentMode:   paymentMode || 'CASH',
            notes:         `Written off as loss (Mirror) - Loan closed`,
          }
        });
        await db.loanApplication.update({
          where: { id: mirrorMapping.mirrorLoanId! },
          data:  { status: 'CLOSED', closedAt: now }
        });
        console.log(`[Close] ✅ Mirror loan ${mirrorLoan.applicationNo} also closed`);
      } catch (e: any) {
        console.error('[Close] ❌ Mirror loan close failed:', e?.message);
        accountingWarnings.push(`Mirror loan close failed: ${e?.message}`);
      }
    };

    // ─── A. WRITE-OFF AS LOSS ────────────────────────────────────────────────
    if (closeType === 'LOSS') {
      const writeOffInterestOnly = lossType === 'PRINCIPAL_ONLY'; // true = only write off principal
      let totalRemainingPrincipal = 0;
      let totalRemainingInterest  = 0;

      for (const emi of unpaidEMIs) {
        totalRemainingPrincipal += Math.max(0, Number(emi.principalAmount ?? 0) - Number(emi.paidPrincipal ?? 0));
        totalRemainingInterest  += Math.max(0, Number(emi.interestAmount  ?? 0) - Number(emi.paidInterest  ?? 0));
      }

      const totalWriteOff = writeOffInterestOnly
        ? totalRemainingPrincipal
        : totalRemainingPrincipal + totalRemainingInterest;

      // ── ACID: Wrap LOSS close atomically with deadlock retry ──────────────
      await withRetry(() => db.$transaction(async (tx) => {
        if (unpaidEMIIds.length > 0) {
          await tx.eMISchedule.updateMany({
            where: { id: { in: unpaidEMIIds } },
            data: {
              paymentStatus: 'PAID',
              paidDate:      now,
              notes:         `Written off as loss (${writeOffInterestOnly ? 'Principal Only' : 'P+I'})`,
            }
          });
        }
        // ACID GUARD: re-read to prevent double-close race
        const freshLoan = await tx.loanApplication.findUnique({ where: { id: loanId }, select: { status: true } });
        if (freshLoan?.status === 'CLOSED') {
          const err: any = new Error('Loan already closed'); err.code = 'LOAN_ALREADY_CLOSED'; throw err;
        }
        await tx.loanApplication.update({
          where: { id: loanId },
          data:  {
            status:          'CLOSED',
            closedAt:        now,
            rejectionReason: `Loan written off as irrecoverable loss (${writeOffInterestOnly ? 'Principal Only' : 'P+I'}). ₹${totalWriteOff.toFixed(2)} written off. ${remarks || ''}`
          }
        });
      }, { maxWait: 5000, timeout: 10000 }));

      // ActionLog — fire-and-forget
      db.actionLog.create({
        data: {
          userId, userRole: user.role, actionType: 'CLOSE', module: 'LOAN_CLOSE',
          recordId: loanId, recordType: 'LoanApplication',
          // previousData enables undo handler to reopen the loan
          previousData: JSON.stringify({ status: loan.status, closedAt: null }),
          newData: JSON.stringify({ closeType: 'LOSS', totalWriteOff, lossType, companyId: effectiveCompanyId }),
          description: `Loan ${loan.applicationNo} written off as loss (${writeOffInterestOnly ? 'P-only' : 'P+I'}). P:₹${totalRemainingPrincipal.toFixed(2)}, I:₹${writeOffInterestOnly ? 0 : totalRemainingInterest.toFixed(2)}`,
          canUndo: true,
        }
      }).catch(e => console.error('[Close/Loss] ActionLog failed:', e));

      // Close mirror too
      await closeMirrorLoan();

      // ── Accounting: Irrecoverable Debt write-off journal — ORIGINAL COMPANY
      if (effectiveCompanyId) {
        try {
          const { AccountingService } = await import('@/lib/accounting-service');
          const accSvc = new AccountingService(effectiveCompanyId);
          await accSvc.initializeChartOfAccounts();

          let totalAccruedInterest = 0;
          let totalReclassifiedInterest = 0;

          if (!writeOffInterestOnly && unpaidEMIIds.length > 0) {
            const existingEntries = await db.journalEntry.findMany({
              where: {
                companyId: effectiveCompanyId,
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
              const remI = Math.max(0, Number(emi.interestAmount ?? 0) - Number(emi.paidInterest ?? 0));
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
              { accountCode: '5500', debitAmount: actualWriteOff, creditAmount: 0, narration: `Write-off to Irrecoverable Debt (${writeOffInterestOnly ? 'P-only' : 'P+I'})` },
              { accountCode: '1200', debitAmount: 0, creditAmount: totalRemainingPrincipal, narration: `Loan ${loan.applicationNo} principal removed from Loans Receivable` }
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
              narration:     `Loan ${loan.applicationNo} written off (${writeOffInterestOnly ? 'P-only' : 'P+I'}). P:₹${totalRemainingPrincipal.toFixed(2)} I:₹${(totalAccruedInterest + totalReclassifiedInterest).toFixed(2)}. ${remarks || ''}`,
              lines,
              createdById: userId,
              isAutoEntry: true,
            });
            console.log(`[Close/Loss] ✅ Write-off journal (original co.): ₹${actualWriteOff}`);
          }
        } catch (e: any) {
          const msg = `Write-off journal failed: ${e?.message}`;
          accountingWarnings.push(msg);
          console.error('[Close/Loss] ❌', msg);
        }
      }

      // ── Accounting: Irrecoverable Debt write-off journal — MIRROR COMPANY ──
      if (mirrorMapping?.mirrorLoanId && mirrorMapping?.mirrorCompanyId) {
        try {
          const mirrorLoan = await db.loanApplication.findUnique({
            where: { id: mirrorMapping.mirrorLoanId }, include: { emiSchedules: true }
          });
          if (mirrorLoan) {
            const mirrorUnpaid = mirrorLoan.emiSchedules.filter(isCloseable);
            const mirrorUnpaidIds = mirrorUnpaid.map(e => e.id);
            let mirrorP = 0;
            let mirrorAccruedI = 0;
            let mirrorReclassifiedI = 0;

            let existingMirrorEntries: any[] = [];
            if (!writeOffInterestOnly && mirrorUnpaidIds.length > 0) {
              existingMirrorEntries = await db.journalEntry.findMany({
                where: {
                  companyId: mirrorMapping.mirrorCompanyId,
                  referenceType: { in: ['INTEREST_ACCRUAL', 'INTEREST_RECLASSIFICATION'] },
                  referenceId: { in: mirrorUnpaidIds },
                  isReversed: false
                },
                select: {
                  referenceId: true,
                  referenceType: true
                }
              });
            }

            const mirrorAccrualMap = new Map<string, string>();
            for (const ent of existingMirrorEntries) {
              const refId = ent.referenceId;
              const refType = ent.referenceType;
              if (refId && refType && (refType === 'INTEREST_RECLASSIFICATION' || !mirrorAccrualMap.has(refId))) {
                mirrorAccrualMap.set(refId, refType);
              }
            }

            for (const e of mirrorUnpaid) {
              mirrorP += Math.max(0, Number(e.principalAmount ?? 0) - Number(e.paidPrincipal ?? 0));
              const remI = Math.max(0, Number(e.interestAmount ?? 0) - Number(e.paidInterest ?? 0));
              if (remI > 0) {
                const type = mirrorAccrualMap.get(e.id);
                if (type === 'INTEREST_RECLASSIFICATION') {
                  mirrorReclassifiedI += remI;
                } else if (type === 'INTEREST_ACCRUAL') {
                  mirrorAccruedI += remI;
                }
              }
            }

            const mirrorWriteOff = mirrorP + mirrorAccruedI + mirrorReclassifiedI;

            if (mirrorWriteOff > 0) {
              const { AccountingService } = await import('@/lib/accounting-service');
              const mirrorAccSvc = new AccountingService(mirrorMapping.mirrorCompanyId);
              await mirrorAccSvc.initializeChartOfAccounts();

              const lines = [
                { accountCode: '5500', debitAmount: mirrorWriteOff, creditAmount: 0, narration: `[MIRROR] Write-off to Irrecoverable Debt` },
                { accountCode: '1200', debitAmount: 0, creditAmount: mirrorP, narration: `[MIRROR] Loan ${mirrorLoan.applicationNo} principal removed from Loans Receivable` }
              ];

              if (mirrorAccruedI > 0) {
                lines.push({ accountCode: '1301', debitAmount: 0, creditAmount: mirrorAccruedI, narration: `[MIRROR] Waived accrued interest removed from Interest Receivable` });
              }
              if (mirrorReclassifiedI > 0) {
                lines.push({ accountCode: '1305', debitAmount: 0, creditAmount: mirrorReclassifiedI, narration: `[MIRROR] Waived overdue interest removed from Irrecoverable Interest` });
              }

              await mirrorAccSvc.createJournalEntry({
                entryDate:     now,
                referenceType: 'PRINCIPAL_ONLY_PAYMENT',
                referenceId:   `${mirrorMapping.mirrorLoanId}-LOSS-WRITEOFF`,
                narration:     `[MIRROR] Loan ${mirrorLoan.applicationNo} written off (${writeOffInterestOnly ? 'P-only' : 'P+I'}) P:₹${mirrorP.toFixed(2)} I:₹${(mirrorAccruedI + mirrorReclassifiedI).toFixed(2)}`,
                lines,
                createdById: userId,
                isAutoEntry: true,
              });
              console.log(`[Close/Loss] ✅ Mirror write-off journal: ₹${mirrorWriteOff} in co. ${mirrorMapping.mirrorCompanyId}`);
            }
          }
        } catch (e: any) {
          const msg = `Mirror write-off journal failed: ${e?.message}`;
          accountingWarnings.push(msg);
          console.error('[Close/Loss Mirror] ❌', msg);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Loan ${loan.applicationNo} written off as irrecoverable loss (${writeOffInterestOnly ? 'Principal Only' : 'P+I'}: ₹${totalWriteOff.toFixed(2)})`,
        accountingOk: accountingWarnings.length === 0,
        accountingWarnings,
      });
    }

    // ─── B. FORECLOSURE — COLLECT PAYMENT ────────────────────────────────────
    const isOnlineMode = ['BANK_TRANSFER', 'UPI', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS', 'ONLINE'].includes(
      (paymentMode || '').toUpperCase()
    );

    let totalPrincipal = 0;
    let totalInterest  = 0;
    for (const emi of unpaidEMIs) {
      const monthHasStarted = new Date(emi.dueDate) <= now;
      totalPrincipal += Math.max(0, Number(emi.principalAmount ?? 0) - Number(emi.paidPrincipal ?? 0));
      if (monthHasStarted) {
        totalInterest += Math.max(0, Number(emi.interestAmount ?? 0) - Number(emi.paidInterest ?? 0));
      }
    }
    const totalForeclosureAmount = totalPrincipal + totalInterest;

    // Resolve mirror loan details if mapping exists
    let mirrorLoan: any = null;
    let mirrorUnpaidEMIs: any[] = [];
    let mirrorTotalPrincipal = 0;
    let mirrorTotalInterest = 0;
    let mirrorTotalForeclosureAmount = 0;

    if (mirrorMapping?.mirrorLoanId) {
      mirrorLoan = await db.loanApplication.findUnique({
        where: { id: mirrorMapping.mirrorLoanId },
        include: { emiSchedules: { orderBy: { installmentNumber: 'asc' } } }
      });
      if (mirrorLoan) {
        mirrorUnpaidEMIs = mirrorLoan.emiSchedules.filter(isCloseable);
        for (const emi of mirrorUnpaidEMIs) {
          const monthHasStarted = new Date(emi.dueDate) <= now;
          mirrorTotalPrincipal += Math.max(0, Number(emi.principalAmount ?? 0) - Number(emi.paidPrincipal ?? 0));
          if (monthHasStarted) {
            mirrorTotalInterest += Math.max(0, Number(emi.interestAmount ?? 0) - Number(emi.paidInterest ?? 0));
          }
        }
        mirrorTotalForeclosureAmount = mirrorTotalPrincipal + mirrorTotalInterest;
      }
    }

    // ── ACID: Core DB ops — BATCH updateMany + loan update + payment + credit ──
    // withRetry: deadlock resilience; status guard prevents double-foreclosure
    const paymentRecord = await withRetry(() => db.$transaction(async (tx) => {
      // ACID GUARD: re-read loan status to prevent double-close race condition
      const freshLoan = await tx.loanApplication.findUnique({ where: { id: loanId }, select: { status: true } });
      if (freshLoan?.status === 'CLOSED') {
        const err: any = new Error('Loan already closed'); err.code = 'LOAN_ALREADY_CLOSED'; throw err;
      }
      
      // Update original loan EMIs
      if (unpaidEMIIds.length > 0) {
        await tx.eMISchedule.updateMany({
          where: { id: { in: unpaidEMIIds } },
          data: {
            paymentStatus: 'PAID',
            paidDate:      now,
            paymentMode,
            notes:         `Foreclosure payment — Loan closed`,
          }
        });
      }

      await tx.loanApplication.update({
        where: { id: loanId },
        data:  {
          status:          'CLOSED',
          closedAt:        now,
          rejectionReason: `Loan closed via foreclosure. Amount: ₹${totalForeclosureAmount.toFixed(2)} via ${paymentMode}. ${remarks || ''}`
        }
      });

      // Create payment record for original loan
      const pmt = await tx.payment.create({
        data: {
          loanApplicationId: loanId,
          customerId:        loan.customerId,
          amount:            totalForeclosureAmount,
          principalComponent: totalPrincipal,
          interestComponent:  totalInterest,
          paymentType:       'FORECLOSURE' as any,
          paymentMode:       paymentMode,
          status:            'COMPLETED',
          paidById:          userId,
          remarks:           remarks || `Foreclosure — Loan ${loan.applicationNo}`,
          receiptGenerated:  false,
        }
      });

      // Update mirror loan and create payment record if mirror mapping exists
      if (mirrorMapping?.mirrorLoanId && mirrorLoan) {
        const mirrorUnpaidIds = mirrorUnpaidEMIs.map(e => e.id);
        if (mirrorUnpaidIds.length > 0) {
          await tx.eMISchedule.updateMany({
            where: { id: { in: mirrorUnpaidIds } },
            data: {
              paymentStatus: 'PAID',
              paidDate:      now,
              paymentMode:   paymentMode || 'CASH',
              notes:         `Foreclosure payment (Mirror) — Loan closed`,
            }
          });
        }
        await tx.loanApplication.update({
          where: { id: mirrorMapping.mirrorLoanId },
          data: {
            status:   'CLOSED',
            closedAt: now,
            rejectionReason: `Loan closed via foreclosure (Mirror). Amount: ₹${mirrorTotalForeclosureAmount.toFixed(2)} via ${paymentMode || 'CASH'}.`
          }
        });
        
        // Create payment record for mirror loan
        await tx.payment.create({
          data: {
            loanApplicationId: mirrorMapping.mirrorLoanId,
            customerId:        loan.customerId,
            amount:            mirrorTotalForeclosureAmount,
            principalComponent: mirrorTotalPrincipal,
            interestComponent:  mirrorTotalInterest,
            paymentType:       'FORECLOSURE' as any,
            paymentMode:       paymentMode || 'CASH',
            status:            'COMPLETED',
            paidById:          userId,
            remarks:           remarks ? `${remarks} (Mirror)` : `Foreclosure (Mirror) — Loan ${mirrorLoan.applicationNo}`,
            receiptGenerated:  false,
          }
        });
      }

      // Credit update
      const effectiveCreditType = creditType === 'PERSONAL' ? 'PERSONAL' : 'COMPANY';
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data:  {
          credit:         { increment: totalForeclosureAmount },
          personalCredit: effectiveCreditType === 'PERSONAL' ? { increment: totalForeclosureAmount } : undefined,
          companyCredit:  effectiveCreditType === 'COMPANY'  ? { increment: totalForeclosureAmount } : undefined,
        }
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          transactionType:       effectiveCreditType === 'PERSONAL' ? 'PERSONAL_COLLECTION' : 'CREDIT_INCREASE',
          amount:                totalForeclosureAmount,
          paymentMode:           (paymentMode || 'CASH') as any,
          creditType:            effectiveCreditType as any,
          sourceType:            'FORECLOSURE',
          loanApplicationId:     loanId,
          customerName:          loan.customer?.name,
          loanApplicationNo:     loan.applicationNo,
          companyBalanceAfter:   updatedUser.companyCredit,
          personalBalanceAfter:  updatedUser.personalCredit,
          balanceAfter:          updatedUser.credit,
          description:           `Foreclosure — ${loan.applicationNo} (P:₹${totalPrincipal.toFixed(2)} I:₹${totalInterest.toFixed(2)})`,
          transactionDate:       now,
        }
      });

      return pmt;
    }, { maxWait: 5000, timeout: 10000 })); // end withRetry + $transaction

    // ── Update per-EMI exact amounts OUTSIDE transaction (fire-and-forget) ──
    // paidAmount/paidPrincipal/paidInterest are display fields — non-critical.
    // Loan is already CLOSED; these run asynchronously to keep the response fast.
    setImmediate(async () => {
      try {
        for (const emi of unpaidEMIs) {
          const monthHasStarted = new Date(emi.dueDate) <= now;
          const collectP = Math.max(0, Number(emi.principalAmount ?? 0) - Number(emi.paidPrincipal ?? 0));
          const collectI = monthHasStarted ? Math.max(0, Number(emi.interestAmount ?? 0) - Number(emi.paidInterest ?? 0)) : 0;
          await db.eMISchedule.update({
            where: { id: emi.id },
            data: {
              paidAmount:    Number(emi.paidAmount ?? 0) + collectP + collectI,
              paidPrincipal: Number(emi.principalAmount ?? 0),
              paidInterest:  monthHasStarted ? Number(emi.interestAmount ?? 0) : Number(emi.paidInterest ?? 0),
            }
          }).catch(() => {});
        }

        if (mirrorMapping?.mirrorLoanId && mirrorUnpaidEMIs.length > 0) {
          for (const emi of mirrorUnpaidEMIs) {
            const monthHasStarted = new Date(emi.dueDate) <= now;
            const collectP = Math.max(0, Number(emi.principalAmount ?? 0) - Number(emi.paidPrincipal ?? 0));
            const collectI = monthHasStarted ? Math.max(0, Number(emi.interestAmount ?? 0) - Number(emi.paidInterest ?? 0)) : 0;
            await db.eMISchedule.update({
              where: { id: emi.id },
              data: {
                paidAmount:    Number(emi.paidAmount ?? 0) + collectP + collectI,
                paidPrincipal: Number(emi.principalAmount ?? 0),
                paidInterest:  monthHasStarted ? Number(emi.interestAmount ?? 0) : Number(emi.paidInterest ?? 0),
              }
            }).catch(() => {});
          }
        }
      } catch { /* silent */ }
    });

    // ActionLog — fire-and-forget
    db.actionLog.create({
      data: {
        userId, userRole: user.role, actionType: 'CLOSE', module: 'LOAN_CLOSE',
        recordId: loanId, recordType: 'LoanApplication',
        // previousData enables undo handler to reopen the loan
        previousData: JSON.stringify({ status: loan.status, closedAt: null }),
        newData: JSON.stringify({ closeType: 'PAYMENT', totalForeclosureAmount, paymentMode, companyId: effectiveCompanyId }),
        description: `Loan ${loan.applicationNo} closed via foreclosure. ₹${totalForeclosureAmount.toFixed(2)} via ${paymentMode}`,
        canUndo: true,
      }
    }).catch(e => console.error('[Close/Payment] ActionLog failed:', e));

    // ── Accounting: Foreclosure entries for original loan ──
    if (effectiveCompanyId && totalForeclosureAmount > 0) {
      try {
        const { recordCashBookEntry, recordBankTransaction } = await import('@/lib/simple-accounting');
        const entryArgs = {
          companyId:     effectiveCompanyId,
          amount:        totalForeclosureAmount,
          description:   `Foreclosure - ${loan.applicationNo} (P:₹${totalPrincipal.toFixed(2)} + I:₹${totalInterest.toFixed(2)})`,
          referenceType: 'EMI_PAYMENT' as const,
          referenceId:   `${loanId}-FORECLOSURE`,
          createdById:   userId,
        };
        if (isOnlineMode) {
          await recordBankTransaction({ ...entryArgs, transactionType: 'CREDIT' });
          console.log(`[Close/Payment] ✅ Bank entry: ₹${totalForeclosureAmount} → co. ${effectiveCompanyId}`);
        } else {
          await recordCashBookEntry({ ...entryArgs, entryType: 'CREDIT' });
          console.log(`[Close/Payment] ✅ Cashbook entry: ₹${totalForeclosureAmount} → co. ${effectiveCompanyId}`);
        }
      } catch (e: any) {
        const msg = `Original cashbook/bank entry failed: ${e?.message}`;
        accountingWarnings.push(msg);
        console.error('[Close/Payment] ❌', msg);
      }

      try {
        const { AccountingService, ACCOUNT_CODES } = await import('@/lib/accounting-service');
        const accSvc = new AccountingService(effectiveCompanyId);
        await accSvc.initializeChartOfAccounts();

        // Query existing accrual/reclassification entries for unpaid EMIs of original loan
        const existingEntries = await db.journalEntry.findMany({
          where: {
            companyId: effectiveCompanyId,
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

        let totalAccruedInterest = 0;
        let totalReclassifiedInterest = 0;
        let totalDirectInterest = 0;

        for (const emi of unpaidEMIs) {
          const monthHasStarted = new Date(emi.dueDate) <= now;
          if (monthHasStarted) {
            const remI = Math.max(0, Number(emi.interestAmount ?? 0) - Number(emi.paidInterest ?? 0));
            if (remI > 0) {
              const type = accrualMap.get(emi.id);
              if (type === 'INTEREST_RECLASSIFICATION') {
                totalReclassifiedInterest += remI;
              } else if (type === 'INTEREST_ACCRUAL') {
                totalAccruedInterest += remI;
              } else {
                totalDirectInterest += remI;
              }
            }
          }
        }

        const lines: any[] = [
          { accountCode: isOnlineMode ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND, debitAmount: totalForeclosureAmount, creditAmount: 0, narration: `Foreclosure collected (${paymentMode})` },
          { accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: totalPrincipal, narration: `Loan principal recovered` }
        ];

        if (totalAccruedInterest > 0) {
          lines.push({ accountCode: ACCOUNT_CODES.INTEREST_RECEIVABLE, debitAmount: 0, creditAmount: totalAccruedInterest, narration: `Accrued interest cleared` });
        }
        if (totalReclassifiedInterest > 0) {
          lines.push({ accountCode: '1305', debitAmount: 0, creditAmount: totalReclassifiedInterest, narration: `Overdue interest cleared` });
        }
        if (totalDirectInterest > 0) {
          lines.push({ accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitAmount: 0, creditAmount: totalDirectInterest, narration: `Interest income on foreclosure` });
        }

        await accSvc.createJournalEntry({
          entryDate:     now,
          referenceType: 'EMI_PAYMENT',
          referenceId:   `${loanId}-FORECLOSURE-JE`,
          narration:     `Foreclosure - ${loan.applicationNo} — P:₹${totalPrincipal.toFixed(2)} I:₹${totalInterest.toFixed(2)} via ${paymentMode}`,
          lines,
          createdById: userId,
          isAutoEntry: true,
        });
        console.log(`[Close/Payment] ✅ Foreclosure journal created (original co.): ₹${totalForeclosureAmount}`);
      } catch (e: any) {
        const msg = `Original foreclosure journal failed: ${e?.message}`;
        accountingWarnings.push(msg);
        console.error('[Close/Payment] ❌ Journal', msg);
      }
    }

    // ── Accounting: Foreclosure entries for mirror loan ──
    if (mirrorMapping?.mirrorCompanyId && mirrorTotalForeclosureAmount > 0) {
      try {
        const { recordCashBookEntry, recordBankTransaction } = await import('@/lib/simple-accounting');
        const entryArgs = {
          companyId:     mirrorMapping.mirrorCompanyId,
          amount:        mirrorTotalForeclosureAmount,
          description:   `[MIRROR] Foreclosure - ${mirrorLoan.applicationNo} (P:₹${mirrorTotalPrincipal.toFixed(2)} + I:₹${mirrorTotalInterest.toFixed(2)})`,
          referenceType: 'EMI_PAYMENT' as const,
          referenceId:   `${mirrorMapping.mirrorLoanId}-FORECLOSURE`,
          createdById:   userId,
        };
        if (isOnlineMode) {
          await recordBankTransaction({ ...entryArgs, transactionType: 'CREDIT' });
          console.log(`[Close/Payment] ✅ Mirror Bank entry: ₹${mirrorTotalForeclosureAmount} → co. ${mirrorMapping.mirrorCompanyId}`);
        } else {
          await recordCashBookEntry({ ...entryArgs, entryType: 'CREDIT' });
          console.log(`[Close/Payment] ✅ Mirror Cashbook entry: ₹${mirrorTotalForeclosureAmount} → co. ${mirrorMapping.mirrorCompanyId}`);
        }
      } catch (e: any) {
        const msg = `Mirror cashbook/bank entry failed: ${e?.message}`;
        accountingWarnings.push(msg);
        console.error('[Close/Payment] ❌ Mirror Cash/Bank', msg);
      }

      try {
        const { AccountingService, ACCOUNT_CODES } = await import('@/lib/accounting-service');
        const accSvc = new AccountingService(mirrorMapping.mirrorCompanyId);
        await accSvc.initializeChartOfAccounts();

        const mirrorUnpaidEMIIds = mirrorUnpaidEMIs.map(e => e.id);
        const existingEntries = await db.journalEntry.findMany({
          where: {
            companyId: mirrorMapping.mirrorCompanyId,
            referenceId: { in: mirrorUnpaidEMIIds },
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

        let totalAccruedInterest = 0;
        let totalReclassifiedInterest = 0;
        let totalDirectInterest = 0;

        for (const emi of mirrorUnpaidEMIs) {
          const monthHasStarted = new Date(emi.dueDate) <= now;
          if (monthHasStarted) {
            const remI = Math.max(0, Number(emi.interestAmount ?? 0) - Number(emi.paidInterest ?? 0));
            if (remI > 0) {
              const type = accrualMap.get(emi.id);
              if (type === 'INTEREST_RECLASSIFICATION') {
                totalReclassifiedInterest += remI;
              } else if (type === 'INTEREST_ACCRUAL') {
                totalAccruedInterest += remI;
              } else {
                totalDirectInterest += remI;
              }
            }
          }
        }

        const lines: any[] = [
          { accountCode: isOnlineMode ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND, debitAmount: mirrorTotalForeclosureAmount, creditAmount: 0, narration: `[MIRROR] Foreclosure collected (${paymentMode})` },
          { accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: mirrorTotalPrincipal, narration: `[MIRROR] Loan principal recovered` }
        ];

        if (totalAccruedInterest > 0) {
          lines.push({ accountCode: ACCOUNT_CODES.INTEREST_RECEIVABLE, debitAmount: 0, creditAmount: totalAccruedInterest, narration: `[MIRROR] Accrued interest cleared` });
        }
        if (totalReclassifiedInterest > 0) {
          lines.push({ accountCode: '1305', debitAmount: 0, creditAmount: totalReclassifiedInterest, narration: `[MIRROR] Overdue interest cleared` });
        }
        if (totalDirectInterest > 0) {
          lines.push({ accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitAmount: 0, creditAmount: totalDirectInterest, narration: `[MIRROR] Interest income on foreclosure` });
        }

        await accSvc.createJournalEntry({
          entryDate:     now,
          referenceType: 'EMI_PAYMENT',
          referenceId:   `${mirrorMapping.mirrorLoanId}-FORECLOSURE-JE`,
          narration:     `[MIRROR] Foreclosure - ${mirrorLoan.applicationNo} — P:₹${mirrorTotalPrincipal.toFixed(2)} I:₹${mirrorTotalInterest.toFixed(2)} via ${paymentMode}`,
          lines,
          createdById: userId,
          isAutoEntry: true,
        });
        console.log(`[Close/Payment] ✅ Mirror foreclosure journal created: ₹${mirrorTotalForeclosureAmount}`);
      } catch (e: any) {
        const msg = `Mirror foreclosure journal failed: ${e?.message}`;
        accountingWarnings.push(msg);
        console.error('[Close/Payment] ❌ Mirror Journal', msg);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Loan ${loan.applicationNo} closed. ₹${totalForeclosureAmount.toFixed(2)} collected via ${paymentMode}.`,
      accountingOk: accountingWarnings.length === 0,
      accountingWarnings,
    });

  } catch (error: any) {
    // ACID: 409 for double-close attempts
    if (error?.code === 'LOAN_ALREADY_CLOSED') {
      return NextResponse.json({ error: 'Loan is already closed. Duplicate request blocked.', code: 'LOAN_ALREADY_CLOSED' }, { status: 409 });
    }
    console.error('[OnlineLoan/Close POST]', error);
    return NextResponse.json({ error: 'Failed to close loan', details: error?.message }, { status: 500 });
  }
}
