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
      where: {
        OR: [
          { originalLoanId: loanId, isOfflineLoan: true },
          { mirrorLoanId: loanId, isOfflineLoan: true }
        ]
      },
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

    let mirrorDetails: any = null;
    let isMirrorChild = false;
    let originalLoanNo = "";

    if (mirrorMapping) {
      isMirrorChild = mirrorMapping.mirrorLoanId === loanId;
      
      // If we are viewing the original offline loan, get mirror offline loan details
      if (!isMirrorChild && mirrorMapping.mirrorLoanId) {
        const mLoan = await (db.offlineLoan as any).findUnique({
          where: { id: mirrorMapping.mirrorLoanId },
          include: { emis: { orderBy: { installmentNumber: 'asc' } } }
        });
        if (mLoan) {
          const mirrorUnpaid = ((mLoan.emis ?? []) as any[]).filter(isCloseable);
          let mirrorP = 0;
          let mirrorI = 0;
          for (const emi of mirrorUnpaid) {
            const monthHasStarted = new Date(emi.dueDate) <= now;
            const paidP = emi.paidPrincipal != null ? Number(emi.paidPrincipal)
              : Math.max(0, Number(emi.paidAmount ?? 0) - Number(emi.interestAmount ?? 0));
            const paidI = emi.paidInterest != null ? Number(emi.paidInterest)
              : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));
            mirrorP += Math.max(0, Number(emi.principalAmount ?? 0) - paidP);
            if (monthHasStarted) {
              mirrorI += Math.max(0, Number(emi.interestAmount ?? 0) - paidI);
            }
          }
          mirrorDetails = {
            loanNumber: mLoan.loanNumber,
            totalPrincipal: mirrorP,
            totalInterest: mirrorI,
            totalForeclosureAmount: mirrorP + mirrorI,
            unpaidEMIsCount: mirrorUnpaid.length,
          };
        }
      } else if (isMirrorChild) {
        // If we are viewing the mirror offline loan, fetch original offline loan's number
        const origLoan = await (db.offlineLoan as any).findUnique({
          where: { id: mirrorMapping.originalLoanId },
          select: { loanNumber: true }
        });
        if (origLoan) {
          originalLoanNo = origLoan.loanNumber;
        }
      }
    }

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
              isMirrorChild,
              originalLoanNo,
              mirrorCompany:   mirrorMapping.mirrorCompany,
              originalCompany: mirrorMapping.originalCompany,
              details:         mirrorDetails,
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

    // Find mirror mapping — we close mirror too if it exists
    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: {
        OR: [
          { originalLoanId: loanId, isOfflineLoan: true },
          { mirrorLoanId: loanId, isOfflineLoan: true }
        ]
      }
    });

    const targetOriginalId = mirrorMapping ? mirrorMapping.originalLoanId : loanId;
    const targetMirrorId   = mirrorMapping ? mirrorMapping.mirrorLoanId   : null;

    const loan = await (db.offlineLoan as any).findUnique({
      where: { id: targetOriginalId },
      include: { emis: { orderBy: { installmentNumber: 'asc' } } }
    });

    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    if (loan.status === 'CLOSED') {
      return NextResponse.json({ error: 'Loan is already closed' }, { status: 400 });
    }

    const now   = new Date();
    const user  = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

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

    // Resolve mirror loan details if mapping exists
    let mirrorLoan: any = null;
    let mirrorUnpaidEMIs: any[] = [];
    let mirrorTotalPrincipal = 0;
    let mirrorTotalInterest  = 0;
    let mirrorTotalForeclosureAmount = 0;

    if (targetMirrorId) {
      mirrorLoan = await (db.offlineLoan as any).findUnique({
        where:   { id: targetMirrorId },
        include: { emis: { orderBy: { installmentNumber: 'asc' } } }
      });
      if (mirrorLoan) {
        mirrorUnpaidEMIs = ((mirrorLoan.emis ?? []) as any[]).filter(isCloseable);
        for (const emi of mirrorUnpaidEMIs) {
          const monthHasStarted = new Date(emi.dueDate) <= now;
          const paidP = emi.paidPrincipal != null ? Number(emi.paidPrincipal)
            : Math.max(0, Number(emi.paidAmount ?? 0) - Number(emi.interestAmount ?? 0));
          const paidI = emi.paidInterest != null ? Number(emi.paidInterest)
            : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));
          mirrorTotalPrincipal += Math.max(0, Number(emi.principalAmount ?? 0) - paidP);
          if (monthHasStarted) {
            mirrorTotalInterest += Math.max(0, Number(emi.interestAmount ?? 0) - paidI);
          }
        }
        mirrorTotalForeclosureAmount = mirrorTotalPrincipal + mirrorTotalInterest;
      }
    }

    // ─── A. WRITE-OFF AS LOSS ────────────────────────────────────────────────
    if (closeType === 'LOSS') {
      const writeOffInterest = lossType === 'PRINCIPAL_ONLY';
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

      const totalWriteOff = writeOffInterest
        ? totalRemainingPrincipal
        : totalRemainingPrincipal + totalRemainingInterest;

      await withRetry(() => db.$transaction(async (tx) => {
        // 1. Close original loan & EMIs
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
          where: { id: targetOriginalId },
          data:  { status: 'CLOSED', closedAt: now }
        });

        // 2. Close mirror loan & EMIs (if mirror exists)
        if (targetMirrorId && mirrorUnpaidEMIs.length > 0) {
          const mirrorUnpaidEMIIds = mirrorUnpaidEMIs.map((e: any) => e.id);
          await (tx.offlineLoanEMI as any).updateMany({
            where: { id: { in: mirrorUnpaidEMIIds } },
            data: {
              paymentStatus:   'PAID',
              paidDate:        now,
              collectedById:   userId,
              collectedByName: user.name,
              collectedAt:     now,
            }
          });
          await (tx.offlineLoan as any).update({
            where: { id: targetMirrorId },
            data:  { status: 'CLOSED', closedAt: now }
          });
        }
      }, { maxWait: 5000, timeout: 10000 }));

      db.actionLog.create({
        data: {
          userId, userRole: user.role, actionType: 'CLOSE', module: 'OFFLINE_LOAN',
          recordId: loanId, recordType: 'OfflineLoan',
          previousData: JSON.stringify({ status: loan.status, closedAt: null }),
          newData: JSON.stringify({
            closeType: 'LOSS',
            totalWriteOff,
            lossType,
            companyId: effectiveCompanyId,
            closedEMIIds: unpaidEMIIds,
          }),
          description: `Loan ${loan.loanNumber} written off as loss (${writeOffInterest ? 'Principal Only' : 'P+I'}). P:₹${totalRemainingPrincipal.toFixed(2)}, I written off:₹${writeOffInterest ? 0 : totalRemainingInterest.toFixed(2)}`,
          canUndo: true,
        }
      }).catch(e => console.error('[Close/Loss] ActionLog failed (non-critical):', e));

      // ── Accounting: Write-off journal ─────────────────────────────────────
      if (mirrorMapping) {
        if (mirrorMapping.mirrorCompanyId && mirrorMapping.mirrorLoanId && mirrorLoan) {
          try {
            const { AccountingService } = await import('@/lib/accounting-service');
            const mirrorAccSvc = new AccountingService(mirrorMapping.mirrorCompanyId);
            await mirrorAccSvc.initializeChartOfAccounts();

            const mirrorUnpaid = mirrorUnpaidEMIs;
            const unpaidMirrorEMIIds = mirrorUnpaid.map((e: any) => e.id);

            let mirrorRemainingPrincipal = 0;
            let mirrorRemainingInterest = 0;
            for (const emi of mirrorUnpaid) {
              const paidP = emi.paidPrincipal != null ? Number(emi.paidPrincipal)
                : Math.max(0, Number(emi.paidAmount ?? 0) - Number(emi.interestAmount ?? 0));
              const paidI = emi.paidInterest != null ? Number(emi.paidInterest)
                : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));
              mirrorRemainingPrincipal += Math.max(0, Number(emi.principalAmount ?? 0) - paidP);
              mirrorRemainingInterest  += Math.max(0, Number(emi.interestAmount ?? 0) - paidI);
            }

            let mirrorAccruedInterest = 0;
            let mirrorReclassifiedInterest = 0;

            if (!writeOffInterest && unpaidMirrorEMIIds.length > 0) {
              const existingEntries = await db.journalEntry.findMany({
                where: {
                  companyId: mirrorMapping.mirrorCompanyId,
                  referenceType: { in: ['INTEREST_ACCRUAL', 'INTEREST_RECLASSIFICATION'] },
                  referenceId: { in: unpaidMirrorEMIIds },
                  isReversed: false
                },
                select: { referenceId: true, referenceType: true }
              });

              const accrualMap = new Map<string, string>();
              for (const ent of existingEntries) {
                if (ent.referenceId && ent.referenceType && (ent.referenceType === 'INTEREST_RECLASSIFICATION' || !accrualMap.has(ent.referenceId))) {
                  accrualMap.set(ent.referenceId, ent.referenceType);
                }
              }

              for (const emi of mirrorUnpaid) {
                const paidI = emi.paidInterest != null ? Number(emi.paidInterest)
                  : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));
                const remI = Math.max(0, Number(emi.interestAmount ?? 0) - paidI);
                if (remI > 0) {
                  const type = accrualMap.get(emi.id);
                  if (type === 'INTEREST_RECLASSIFICATION') mirrorReclassifiedInterest += remI;
                  else if (type === 'INTEREST_ACCRUAL') mirrorAccruedInterest += remI;
                }
              }
            }

            const mirrorWriteOff = mirrorRemainingPrincipal + mirrorAccruedInterest + mirrorReclassifiedInterest;

            if (mirrorWriteOff > 0) {
              const custId = loan.customerId || undefined;
              const mLoanId = mirrorMapping.mirrorLoanId || undefined;
              const lines = [
                { accountCode: '5500', debitAmount: mirrorWriteOff, creditAmount: 0, loanId: mLoanId, customerId: custId, narration: `[MIRROR] Write-off to Irrecoverable Debt (${writeOffInterest ? 'P-only' : 'P+I'})` },
                { accountCode: '1200', debitAmount: 0, creditAmount: mirrorRemainingPrincipal, loanId: mLoanId, customerId: custId, narration: `[MIRROR] Loan principal removed` }
              ];
              if (mirrorAccruedInterest > 0) lines.push({ accountCode: '1301', debitAmount: 0, creditAmount: mirrorAccruedInterest, loanId: mLoanId, customerId: custId, narration: `[MIRROR] Waived accrued interest removed` });
              if (mirrorReclassifiedInterest > 0) lines.push({ accountCode: '1305', debitAmount: 0, creditAmount: mirrorReclassifiedInterest, loanId: mLoanId, customerId: custId, narration: `[MIRROR] Waived overdue interest removed` });

              await mirrorAccSvc.createJournalEntry({
                entryDate:     now,
                referenceType: 'LOSS_WRITE_OFF',
                referenceId:   `${mirrorMapping.mirrorLoanId}-LOSS-WRITEOFF`,
                narration:     `[MIRROR] Loan written off as irrecoverable loss. P:₹${mirrorRemainingPrincipal.toFixed(2)} I:₹${(mirrorAccruedInterest + mirrorReclassifiedInterest).toFixed(2)}`,
                lines,
                createdById: userId,
                isAutoEntry: true,
              });
            }
          } catch (e: any) { accountingWarnings.push(`Mirror write-off journal failed: ${e?.message}`); }
        }

        // Disable original company settlement entry to prevent entries in original company for mirror loans
        /*
        if (mirrorMapping.originalCompanyId || loan.companyId) {
          try {
            const { AccountingService } = await import('@/lib/accounting-service');
            const origAccSvc = new AccountingService(mirrorMapping.originalCompanyId || loan.companyId);
            await origAccSvc.initializeChartOfAccounts();
            const custId = loan.customerId || undefined;
            await origAccSvc.createJournalEntry({
              entryDate:     now,
              referenceType: 'LOSS_WRITE_OFF',
              referenceId:   `${loanId}-LOSS-WRITEOFF-SETTLEMENT`,
              narration:     `Loan ${loan.loanNumber} write-off inter-company settlement (funded via mirror)`,
              lines: [
                { accountCode: '2100', debitAmount: totalRemainingPrincipal, creditAmount: 0, narration: 'Inter-company Accounts Payable cleared' },
                { accountCode: '1200', debitAmount: 0, creditAmount: totalRemainingPrincipal, loanId, customerId: custId, narration: `Loans Receivable cleared for original loan` }
              ],
              createdById: userId,
              isAutoEntry: true,
            });
          } catch (settleErr: any) { accountingWarnings.push(`Intercompany settlement journal failed: ${settleErr?.message}`); }
        }
        */
      } else if (effectiveCompanyId) {
        try {
          const { AccountingService } = await import('@/lib/accounting-service');
          const accSvc = new AccountingService(effectiveCompanyId);
          await accSvc.initializeChartOfAccounts();

          let totalAccruedInterest = 0;
          let totalReclassifiedInterest = 0;

          if (!writeOffInterest && unpaidEMIIds.length > 0) {
            const existingEntries = await db.journalEntry.findMany({
              where: {
                companyId: effectiveCompanyId,
                referenceType: { in: ['INTEREST_ACCRUAL', 'INTEREST_RECLASSIFICATION'] },
                referenceId: { in: unpaidEMIIds },
                isReversed: false
              },
              select: { referenceId: true, referenceType: true }
            });

            const accrualMap = new Map<string, string>();
            for (const ent of existingEntries) {
              if (ent.referenceId && ent.referenceType && (ent.referenceType === 'INTEREST_RECLASSIFICATION' || !accrualMap.has(ent.referenceId))) {
                accrualMap.set(ent.referenceId, ent.referenceType);
              }
            }

            for (const emi of unpaidEMIs) {
              const paidI = emi.paidInterest != null ? Number(emi.paidInterest)
                : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));
              const remI = Math.max(0, Number(emi.interestAmount ?? 0) - paidI);
              if (remI > 0) {
                const type = accrualMap.get(emi.id);
                if (type === 'INTEREST_RECLASSIFICATION') totalReclassifiedInterest += remI;
                else if (type === 'INTEREST_ACCRUAL') totalAccruedInterest += remI;
              }
            }
          }

          const actualWriteOff = totalRemainingPrincipal + totalAccruedInterest + totalReclassifiedInterest;
          if (actualWriteOff > 0) {
            const custId = loan.customerId || undefined;
            const lines = [
              { accountCode: '5500', debitAmount: actualWriteOff, creditAmount: 0, loanId, customerId: custId, narration: `Write-off to Irrecoverable Debt (${writeOffInterest ? 'P-only' : 'P+I'})` },
              { accountCode: '1200', debitAmount: 0, creditAmount: totalRemainingPrincipal, loanId, customerId: custId, narration: `Loan ${loan.loanNumber} principal removed` }
            ];
            if (totalAccruedInterest > 0) lines.push({ accountCode: '1301', debitAmount: 0, creditAmount: totalAccruedInterest, loanId, customerId: custId, narration: `Waived accrued interest removed` });
            if (totalReclassifiedInterest > 0) lines.push({ accountCode: '1305', debitAmount: 0, creditAmount: totalReclassifiedInterest, loanId, customerId: custId, narration: `Waived overdue interest removed` });

            await accSvc.createJournalEntry({
              entryDate:     now,
              referenceType: 'LOSS_WRITE_OFF',
              referenceId:   `${loanId}-LOSS-WRITEOFF`,
              narration:     `Loan ${loan.loanNumber} written off. P:₹${totalRemainingPrincipal.toFixed(2)} I:₹${(totalAccruedInterest + totalReclassifiedInterest).toFixed(2)}`,
              lines,
              createdById: userId,
              isAutoEntry: true,
            });
          }
        } catch (e: any) { accountingWarnings.push(`Write-off journal failed: ${e?.message}`); }
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
    const isOnlineMode = ['BANK_TRANSFER', 'UPI', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS', 'ONLINE'].includes((paymentMode || '').toUpperCase());

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



    const effectiveCreditType = creditType === 'PERSONAL' ? 'PERSONAL' : 'COMPANY';
    const isOnlinePayment = ['ONLINE', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS'].includes((paymentMode || '').toUpperCase());
    const creditIncreaseAmount = isOnlinePayment ? 0 : totalForeclosureAmount;

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
          }
        });
      }
      await (tx.offlineLoan as any).update({
        where: { id: loanId },
        data:  { status: 'CLOSED', closedAt: now }
      });

      if (mirrorMapping?.mirrorLoanId && mirrorUnpaidEMIs.length > 0) {
        const mirrorUnpaidEMIIds = mirrorUnpaidEMIs.map((e: any) => e.id);
        await (tx.offlineLoanEMI as any).updateMany({
          where: { id: { in: mirrorUnpaidEMIIds } },
          data: {
            paymentStatus:   'PAID',
            paymentMode,
            paidDate:        now,
            collectedById:   userId,
            collectedByName: user.name,
            collectedAt:     now,
          }
        });
        await (tx.offlineLoan as any).update({
          where: { id: mirrorMapping.mirrorLoanId },
          data:  { status: 'CLOSED', closedAt: now }
        });
      }

      let updatedUser: any = null;
      if (creditIncreaseAmount > 0) {
        updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            credit: { increment: creditIncreaseAmount },
            personalCredit: effectiveCreditType === 'PERSONAL' ? { increment: creditIncreaseAmount } : undefined,
            companyCredit: effectiveCreditType === 'COMPANY' ? { increment: creditIncreaseAmount } : undefined,
          }
        });
      } else {
        updatedUser = await tx.user.findUnique({
          where: { id: userId },
          select: { credit: true, personalCredit: true, companyCredit: true }
        });
      }

      await tx.creditTransaction.create({
        data: {
          userId,
          transactionType: isOnlinePayment ? 'BANK_DIRECT' : (effectiveCreditType === 'PERSONAL' ? 'PERSONAL_COLLECTION' : 'CREDIT_INCREASE'),
          amount: creditIncreaseAmount,
          paymentMode: (paymentMode || 'CASH') as any,
          creditType: effectiveCreditType as any,
          sourceType: 'FORECLOSURE',
          sourceId: `${loanId}-FORECLOSURE`,
          loanApplicationId: loanId,
          customerName: loan.customerName,
          loanApplicationNo: loan.loanNumber,
          companyBalanceAfter: updatedUser?.companyCredit || 0,
          personalBalanceAfter: updatedUser?.personalCredit || 0,
          balanceAfter: updatedUser?.credit || 0,
          description: `Foreclosure — ${loan.loanNumber} (P:₹${totalPrincipal.toFixed(2)} I:₹${totalInterest.toFixed(2)})${isOnlinePayment ? ' (Online Direct)' : ''}`,
          transactionDate: now,
        }
      });
    }, { maxWait: 15000, timeout: 30000 }));

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
          }).catch(() => {});
        }

        if (mirrorMapping?.mirrorLoanId && mirrorUnpaidEMIs.length > 0) {
          for (const emi of mirrorUnpaidEMIs) {
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
            }).catch(() => {});
          }
        }
      } catch { /* silent */ }
    });

    db.actionLog.create({
      data: {
        userId, userRole: user.role, actionType: 'CLOSE', module: 'OFFLINE_LOAN',
        recordId: loanId, recordType: 'OfflineLoan',
        previousData: JSON.stringify({ status: loan.status, closedAt: null }),
        newData: JSON.stringify({
          closeType: 'PAYMENT',
          totalForeclosureAmount,
          paymentMode,
          companyId: effectiveCompanyId,
          collectorId: userId,
          creditType: effectiveCreditType,
          customerName: loan.customerName,
          closedEMIIds: unpaidEMIIds,
        }),
        description: `Loan ${loan.loanNumber} closed. Foreclosure: ₹${totalForeclosureAmount.toFixed(2)} via ${paymentMode}`,
        canUndo: true,
      }
    }).catch(e => console.error('[Close/Payment] ActionLog failed (non-critical):', e));

    if (mirrorMapping) {
      if (mirrorMapping.mirrorCompanyId && mirrorTotalForeclosureAmount > 0) {
        try {
          const { recordCashBookEntry, recordBankTransaction } = await import('@/lib/simple-accounting');
          const { AccountingService, ACCOUNT_CODES } = await import('@/lib/accounting-service');
          const mirrorAccSvc = new AccountingService(mirrorMapping.mirrorCompanyId);
          await mirrorAccSvc.initializeChartOfAccounts();

          await withRetry(() => db.$transaction(async (tx) => {
            const entryArgs = {
              companyId:     mirrorMapping.mirrorCompanyId,
              amount:        mirrorTotalForeclosureAmount,
              description:   `[MIRROR] Foreclosure - Loan ${mirrorLoan?.loanNumber || ''} (P:Rs.${mirrorTotalPrincipal.toFixed(2)} + I:Rs.${mirrorTotalInterest.toFixed(2)})`,
              referenceType: 'OFFLINE_LOAN_FORECLOSURE' as const,
              referenceId:   `${mirrorMapping.mirrorLoanId}-FORECLOSURE`,
              createdById:   userId,
              tx,
            };
            if (isOnlineMode) await recordBankTransaction({ ...entryArgs, transactionType: 'CREDIT' });
            else await recordCashBookEntry({ ...entryArgs, entryType: 'CREDIT' });

            const unpaidMirrorEMIIds = mirrorUnpaidEMIs.map((e: any) => e.id);
            const existingEntries = await tx.journalEntry.findMany({
              where: {
                companyId: mirrorMapping.mirrorCompanyId,
                referenceId: { in: unpaidMirrorEMIIds },
                isReversed: false
              },
              select: { referenceId: true, referenceType: true }
            });

            const accrualMap = new Map<string, string>();
            for (const ent of existingEntries) {
              if (ent.referenceId && ent.referenceType && (ent.referenceType === 'INTEREST_RECLASSIFICATION' || !accrualMap.has(ent.referenceId))) {
                accrualMap.set(ent.referenceId, ent.referenceType);
              }
            }

            let totalAccruedInterest = 0, totalReclassifiedInterest = 0, totalDirectInterest = 0;
            for (const emi of mirrorUnpaidEMIs) {
              const monthHasStarted = new Date(emi.dueDate) <= now;
              if (monthHasStarted) {
                const paidI = emi.paidInterest != null ? Number(emi.paidInterest)
                  : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));
                const remI = Math.max(0, Number(emi.interestAmount ?? 0) - paidI);
                if (remI > 0) {
                  const type = accrualMap.get(emi.id);
                  if (type === 'INTEREST_RECLASSIFICATION') totalReclassifiedInterest += remI;
                  else if (type === 'INTEREST_ACCRUAL') totalAccruedInterest += remI;
                  else totalDirectInterest += remI;
                }
              }
            }
            const custId = loan.customerId || undefined;
            const mLoanId = mirrorMapping.mirrorLoanId || undefined;
            const lines = [
              { accountCode: isOnlineMode ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND, debitAmount: mirrorTotalForeclosureAmount, creditAmount: 0, loanId: mLoanId, customerId: custId, narration: `[MIRROR] Foreclosure collected (${paymentMode})` },
              { accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: mirrorTotalPrincipal, loanId: mLoanId, customerId: custId, narration: `[MIRROR] Loan principal recovered` }
            ];
            if (totalAccruedInterest > 0) lines.push({ accountCode: ACCOUNT_CODES.INTEREST_RECEIVABLE, debitAmount: 0, creditAmount: totalAccruedInterest, loanId: mLoanId, customerId: custId, narration: `[MIRROR] Accrued interest cleared` });
            if (totalReclassifiedInterest > 0) lines.push({ accountCode: '1305', debitAmount: 0, creditAmount: totalReclassifiedInterest, loanId: mLoanId, customerId: custId, narration: `[MIRROR] Overdue interest cleared` });
            if (totalDirectInterest > 0) lines.push({ accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitAmount: 0, creditAmount: totalDirectInterest, loanId: mLoanId, customerId: custId, narration: `[MIRROR] Interest income on foreclosure` });

            await mirrorAccSvc.createJournalEntry({
              entryDate:     now,
              referenceType: 'OFFLINE_LOAN_FORECLOSURE',
              referenceId:   `${mirrorMapping.mirrorLoanId}-FORECLOSURE-JE`,
              narration:     `[MIRROR] Foreclosure - P:Rs.${mirrorTotalPrincipal.toFixed(2)} I:Rs.${mirrorTotalInterest.toFixed(2)} via ${paymentMode}`,
              lines,
              createdById: userId,
              isAutoEntry: true,
            }, tx);
          }, { maxWait: 15000, timeout: 30000 }));
        } catch (e: any) { accountingWarnings.push(`Mirror foreclosure accounting failed: ${e?.message}`); }
      }

      // Disable original company foreclosure entries to prevent entries in original company for mirror loans
      /*
      if ((mirrorMapping.originalCompanyId || loan.companyId) && totalForeclosureAmount > 0) {
        try {
          const { recordCashBookEntry, recordBankTransaction } = await import('@/lib/simple-accounting');
          const { AccountingService, ACCOUNT_CODES } = await import('@/lib/accounting-service');
          const origAccSvc = new AccountingService(mirrorMapping.originalCompanyId || loan.companyId);
          await origAccSvc.initializeChartOfAccounts();

          await withRetry(() => db.$transaction(async (tx) => {
            const receiptArgs = {
              companyId:     mirrorMapping.originalCompanyId || loan.companyId,
              amount:        totalForeclosureAmount,
              description:   `Foreclosure - Loan ${loan.loanNumber} (P:Rs.${totalPrincipal.toFixed(2)} + I:Rs.${totalInterest.toFixed(2)})`,
              referenceType: 'OFFLINE_LOAN_FORECLOSURE' as const,
              referenceId:   `${loanId}-FORECLOSURE-RECEIPT`,
              createdById:   userId,
              tx,
            };
            if (isOnlineMode) await recordBankTransaction({ ...receiptArgs, transactionType: 'CREDIT' });
            else await recordCashBookEntry({ ...receiptArgs, entryType: 'CREDIT' });

            const paymentArgs = {
              companyId:     mirrorMapping.originalCompanyId || loan.companyId,
              amount:        totalPrincipal,
              description:   `Inter-company settlement to Mirror - Loan ${loan.loanNumber} Principal`,
              referenceType: 'OFFLINE_LOAN_FORECLOSURE' as const,
              referenceId:   `${loanId}-FORECLOSURE-SETTLE-PAYMENT`,
              createdById:   userId,
              tx,
            };
            if (isOnlineMode) await recordBankTransaction({ ...paymentArgs, transactionType: 'DEBIT' });
            else await recordCashBookEntry({ ...paymentArgs, entryType: 'DEBIT' });

            const custId = loan.customerId || undefined;
            const cashBankAccountCode = isOnlineMode ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND;
            const lines = [
              { accountCode: cashBankAccountCode, debitAmount: totalForeclosureAmount, creditAmount: 0, loanId, customerId: custId, narration: `Foreclosure received from customer` },
              { accountCode: '2100', debitAmount: totalPrincipal, creditAmount: 0, narration: `Inter-company Accounts Payable cleared` },
              { accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: totalPrincipal, loanId, customerId: custId, narration: `Loans Receivable cleared for original loan` },
              { accountCode: cashBankAccountCode, debitAmount: 0, creditAmount: totalPrincipal, narration: `Settlement payment to Mirror company` },
              { accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitAmount: 0, creditAmount: totalInterest, loanId, customerId: custId, narration: `Interest income on foreclosure` }
            ];

            await origAccSvc.createJournalEntry({
              entryDate:     now,
              referenceType: 'OFFLINE_LOAN_FORECLOSURE',
              referenceId:   `${loanId}-FORECLOSURE-JE`,
              narration:     `Foreclosure Inter-company - P:Rs.${totalPrincipal.toFixed(2)} I:Rs.${totalInterest.toFixed(2)}`,
              lines,
              createdById: userId,
              isAutoEntry: true,
            }, tx);
          }, { maxWait: 15000, timeout: 30000 }));
        } catch (e: any) { accountingWarnings.push(`Original company foreclosure accounting failed: ${e?.message}`); }
      }
      */
    } else if (effectiveCompanyId && totalForeclosureAmount > 0) {
      try {
        const { recordCashBookEntry, recordBankTransaction } = await import('@/lib/simple-accounting');
        const { AccountingService, ACCOUNT_CODES } = await import('@/lib/accounting-service');
        const accSvc = new AccountingService(effectiveCompanyId);
        await accSvc.initializeChartOfAccounts();

        await withRetry(() => db.$transaction(async (tx) => {
          const entryArgs = {
            companyId:     effectiveCompanyId,
            amount:        totalForeclosureAmount,
            description:   `Foreclosure - ${loan.loanNumber} (P:Rs.${totalPrincipal.toFixed(2)} + I:Rs.${totalInterest.toFixed(2)})`,
            referenceType: 'OFFLINE_LOAN_FORECLOSURE' as const,
            referenceId:   `${loanId}-FORECLOSURE`,
            createdById:   userId,
            tx,
          };
          if (isOnlineMode) await recordBankTransaction({ ...entryArgs, transactionType: 'CREDIT' });
          else await recordCashBookEntry({ ...entryArgs, entryType: 'CREDIT' });

          const existingEntries = await tx.journalEntry.findMany({
            where: {
              companyId: effectiveCompanyId,
              referenceId: { in: unpaidEMIIds },
              isReversed: false
            },
            select: { referenceId: true, referenceType: true }
          });

          const accrualMap = new Map<string, string>();
          for (const ent of existingEntries) {
            if (ent.referenceId && ent.referenceType && (ent.referenceType === 'INTEREST_RECLASSIFICATION' || !accrualMap.has(ent.referenceId))) {
              accrualMap.set(ent.referenceId, ent.referenceType);
            }
          }

          let totalAccruedInterest = 0, totalReclassifiedInterest = 0, totalDirectInterest = 0;
          for (const emi of unpaidEMIs) {
            const monthHasStarted = new Date(emi.dueDate) <= now;
            if (monthHasStarted) {
              const paidI = emi.paidInterest != null ? Number(emi.paidInterest)
                : Math.min(Number(emi.paidAmount ?? 0), Number(emi.interestAmount ?? 0));
              const remI = Math.max(0, Number(emi.interestAmount ?? 0) - paidI);
              if (remI > 0) {
                const type = accrualMap.get(emi.id);
                if (type === 'INTEREST_RECLASSIFICATION') totalReclassifiedInterest += remI;
                else if (type === 'INTEREST_ACCRUAL') totalAccruedInterest += remI;
                else totalDirectInterest += remI;
              }
            }
          }

          const custId = loan.customerId || undefined;
          const lines = [
            { accountCode: isOnlineMode ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND, debitAmount: totalForeclosureAmount, creditAmount: 0, loanId, customerId: custId, narration: `Foreclosure collected (${paymentMode})` },
            { accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: totalPrincipal, loanId, customerId: custId, narration: `Loan principal recovered` }
          ];
          if (totalAccruedInterest > 0) lines.push({ accountCode: ACCOUNT_CODES.INTEREST_RECEIVABLE, debitAmount: 0, creditAmount: totalAccruedInterest, loanId, customerId: custId, narration: `Accrued interest cleared` });
          if (totalReclassifiedInterest > 0) lines.push({ accountCode: '1305', debitAmount: 0, creditAmount: totalReclassifiedInterest, loanId, customerId: custId, narration: `Overdue interest cleared` });
          if (totalDirectInterest > 0) lines.push({ accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitAmount: 0, creditAmount: totalDirectInterest, loanId, customerId: custId, narration: `Interest income on foreclosure` });

          await accSvc.createJournalEntry({
            entryDate:     now,
            referenceType: 'OFFLINE_LOAN_FORECLOSURE',
            referenceId:   `${loanId}-FORECLOSURE-JE`,
            narration:     `Foreclosure - ${loan.loanNumber} - P:Rs.${totalPrincipal.toFixed(2)} I:Rs.${totalInterest.toFixed(2)} via ${paymentMode}`,
            lines,
            createdById: userId,
            isAutoEntry: true,
          }, tx);
        }, { maxWait: 15000, timeout: 30000 }));
      } catch (e: any) { accountingWarnings.push(`Foreclosure accounting failed: ${e?.message}`); }
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
