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
      where: {
        OR: [
          { originalLoanId: loanId },
          { mirrorLoanId: loanId }
        ]
      },
      include: {
        mirrorCompany:   { select: { id: true, name: true, code: true } },
        originalCompany: { select: { id: true, name: true, code: true } },
      }
    });

    let mirrorDetails: any = null;
    let isMirrorChild = false;
    let originalLoanNo = "";

    if (mirrorMapping) {
      isMirrorChild = mirrorMapping.mirrorLoanId === loanId;
      
      // If we are viewing the original loan, get mirror loan details
      if (!isMirrorChild && mirrorMapping.mirrorLoanId) {
        const mirrorLoan = await db.loanApplication.findUnique({
          where: { id: mirrorMapping.mirrorLoanId },
          include: { emiSchedules: { orderBy: { installmentNumber: 'asc' } } }
        });
        if (mirrorLoan) {
          const mirrorUnpaid = mirrorLoan.emiSchedules.filter(isCloseable);
          let mirrorP = 0;
          let mirrorI = 0;
          for (const emi of mirrorUnpaid) {
            const monthHasStarted = new Date(emi.dueDate) <= now;
            mirrorP += Math.max(0, Number(emi.principalAmount ?? 0) - Number(emi.paidPrincipal ?? 0));
            if (monthHasStarted) {
              mirrorI += Math.max(0, Number(emi.interestAmount ?? 0) - Number(emi.paidInterest ?? 0));
            }
          }
          mirrorDetails = {
            loanNumber: mirrorLoan.applicationNo,
            totalPrincipal: mirrorP,
            totalInterest: mirrorI,
            totalForeclosureAmount: mirrorP + mirrorI,
            unpaidEMIsCount: mirrorUnpaid.length,
          };
        }
      } else if (isMirrorChild) {
        // If we are viewing the mirror loan itself, fetch original loan's number
        const origLoan = await db.loanApplication.findUnique({
          where: { id: mirrorMapping.originalLoanId },
          select: { applicationNo: true }
        });
        if (origLoan) {
          originalLoanNo = origLoan.applicationNo;
        }
      }
    }

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
          ? {
              isMirrorLoan: true,
              isMirrorChild,
              originalLoanNo,
              mirrorCompany: mirrorMapping.mirrorCompany,
              originalCompany: mirrorMapping.originalCompany,
              details: mirrorDetails,
            }
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
      where: {
        OR: [
          { originalLoanId: loanId },
          { mirrorLoanId: loanId }
        ]
      }
    });

    const effectiveCompanyId = companyId || loan.companyId || '';
    const isCloseable        = (e: any) => !['PAID', 'INTEREST_ONLY_PAID'].includes(e.paymentStatus);
    const unpaidEMIs         = loan.emiSchedules.filter(isCloseable);
    const unpaidEMIIds       = unpaidEMIs.map((e: any) => e.id);
    const accountingWarnings: string[] = [];

    // Resolve partner loan details if mapping exists
    let partnerLoan: any = null;
    let partnerUnpaidEMIs: any[] = [];
    let partnerTotalPrincipal = 0;
    let partnerTotalInterest = 0;
    let partnerTotalForeclosureAmount = 0;
    const partnerLoanId = mirrorMapping
      ? (loanId === mirrorMapping.originalLoanId ? mirrorMapping.mirrorLoanId : mirrorMapping.originalLoanId)
      : null;
    const partnerCompanyId = mirrorMapping
      ? (loanId === mirrorMapping.originalLoanId ? mirrorMapping.mirrorCompanyId : mirrorMapping.originalCompanyId)
      : null;

    if (partnerLoanId) {
      partnerLoan = await db.loanApplication.findUnique({
        where: { id: partnerLoanId },
        include: { emiSchedules: { orderBy: { installmentNumber: 'asc' } } }
      });
      if (partnerLoan) {
        partnerUnpaidEMIs = partnerLoan.emiSchedules.filter(isCloseable);
        for (const emi of partnerUnpaidEMIs) {
          const monthHasStarted = new Date(emi.dueDate) <= now;
          partnerTotalPrincipal += Math.max(0, Number(emi.principalAmount ?? 0) - Number(emi.paidPrincipal ?? 0));
          if (monthHasStarted) {
            partnerTotalInterest += Math.max(0, Number(emi.interestAmount ?? 0) - Number(emi.paidInterest ?? 0));
          }
        }
        partnerTotalForeclosureAmount = partnerTotalPrincipal + partnerTotalInterest;
      }
    }

    // ─── Helper: close online partner loan (BATCH — avoids sequential round-trips) ─
    const closePartnerLoan = async () => {
      if (!partnerLoanId) return;
      try {
        const partner = await db.loanApplication.findUnique({
          where:  { id: partnerLoanId },
          select: { id: true, applicationNo: true, status: true }
        });
        if (!partner || partner.status === 'CLOSED') return;

        // BATCH: one updateMany instead of N sequential updates
        await db.eMISchedule.updateMany({
          where: {
            loanApplicationId: partnerLoanId,
            paymentStatus:     { notIn: ['PAID', 'INTEREST_ONLY_PAID'] }
          },
          data: {
            paymentStatus: 'PAID',
            paidDate:      now,
            paymentMode:   paymentMode || 'CASH',
            notes:         `Written off as loss (Partner) - Loan closed`,
          }
        });
        await db.loanApplication.update({
          where: { id: partnerLoanId },
          data:  { status: 'CLOSED', closedAt: now }
        });
        console.log(`[Close] ✅ Partner loan ${partner.applicationNo} also closed`);
      } catch (e: any) {
        console.error('[Close] ❌ Partner loan close failed:', e?.message);
        accountingWarnings.push(`Partner loan close failed: ${e?.message}`);
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

      // Close partner too
      await closePartnerLoan();

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
              { accountCode: '5500', debitAmount: actualWriteOff, creditAmount: 0, narration: `Write-off to Irrecoverable Debt (${writeOffInterestOnly ? 'P-only' : 'P+I'})`, loanId, customerId: loan.customerId },
              { accountCode: '1200', debitAmount: 0, creditAmount: totalRemainingPrincipal, narration: `Loan ${loan.applicationNo} principal removed from Loans Receivable`, loanId, customerId: loan.customerId }
            ];

            if (totalAccruedInterest > 0) {
              lines.push({ accountCode: '1301', debitAmount: 0, creditAmount: totalAccruedInterest, narration: `Waived accrued interest removed from Interest Receivable`, loanId, customerId: loan.customerId });
            }
            if (totalReclassifiedInterest > 0) {
              lines.push({ accountCode: '1305', debitAmount: 0, creditAmount: totalReclassifiedInterest, narration: `Waived overdue interest removed from Irrecoverable Interest`, loanId, customerId: loan.customerId });
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

      // ── Accounting: Irrecoverable Debt write-off journal — PARTNER COMPANY ──
      if (partnerLoanId && partnerCompanyId && partnerLoan) {
        try {
          const partnerUnpaid = partnerUnpaidEMIs;
          const partnerUnpaidIds = partnerUnpaid.map(e => e.id);
            let partnerP = 0;
            let partnerAccruedI = 0;
            let partnerReclassifiedI = 0;

            let existingPartnerEntries: any[] = [];
            if (!writeOffInterestOnly && partnerUnpaidIds.length > 0) {
              existingPartnerEntries = await db.journalEntry.findMany({
                where: {
                  companyId: partnerCompanyId,
                  referenceType: { in: ['INTEREST_ACCRUAL', 'INTEREST_RECLASSIFICATION'] },
                  referenceId: { in: partnerUnpaidIds },
                  isReversed: false
                },
                select: {
                  referenceId: true,
                  referenceType: true
                }
              });
            }

            const partnerAccrualMap = new Map<string, string>();
            for (const ent of existingPartnerEntries) {
              const refId = ent.referenceId;
              const refType = ent.referenceType;
              if (refId && refType && (refType === 'INTEREST_RECLASSIFICATION' || !partnerAccrualMap.has(refId))) {
                partnerAccrualMap.set(refId, refType);
              }
            }

            for (const e of partnerUnpaid) {
              partnerP += Math.max(0, Number(e.principalAmount ?? 0) - Number(e.paidPrincipal ?? 0));
              const remI = Math.max(0, Number(e.interestAmount ?? 0) - Number(e.paidInterest ?? 0));
              if (remI > 0) {
                const type = partnerAccrualMap.get(e.id);
                if (type === 'INTEREST_RECLASSIFICATION') {
                  partnerReclassifiedI += remI;
                } else if (type === 'INTEREST_ACCRUAL') {
                  partnerAccruedI += remI;
                }
              }
            }

            const partnerWriteOff = partnerP + partnerAccruedI + partnerReclassifiedI;

            if (partnerWriteOff > 0) {
              const { AccountingService } = await import('@/lib/accounting-service');
              const partnerAccSvc = new AccountingService(partnerCompanyId);
              await partnerAccSvc.initializeChartOfAccounts();

              const lines = [
                { accountCode: '5500', debitAmount: partnerWriteOff, creditAmount: 0, narration: `[PARTNER] Write-off to Irrecoverable Debt`, loanId: partnerLoanId, customerId: loan.customerId },
                { accountCode: '1200', debitAmount: 0, creditAmount: partnerP, narration: `[PARTNER] Loan ${partnerLoan.applicationNo} principal removed from Loans Receivable`, loanId: partnerLoanId, customerId: loan.customerId }
              ];

              if (partnerAccruedI > 0) {
                lines.push({ accountCode: '1301', debitAmount: 0, creditAmount: partnerAccruedI, narration: `[PARTNER] Waived accrued interest removed from Interest Receivable`, loanId: partnerLoanId, customerId: loan.customerId });
              }
              if (partnerReclassifiedI > 0) {
                lines.push({ accountCode: '1305', debitAmount: 0, creditAmount: partnerReclassifiedI, narration: `[PARTNER] Waived overdue interest removed from Irrecoverable Interest`, loanId: partnerLoanId, customerId: loan.customerId });
              }

              await partnerAccSvc.createJournalEntry({
                entryDate:     now,
                referenceType: 'PRINCIPAL_ONLY_PAYMENT',
                referenceId:   `${partnerLoanId}-LOSS-WRITEOFF`,
                narration:     `[PARTNER] Loan ${partnerLoan.applicationNo} written off (${writeOffInterestOnly ? 'P-only' : 'P+I'}) P:₹${partnerP.toFixed(2)} I:₹${(partnerAccruedI + partnerReclassifiedI).toFixed(2)}`,
                lines,
                createdById: userId,
                isAutoEntry: true,
              });
              console.log(`[Close/Loss] ✅ Partner write-off journal: ₹${partnerWriteOff} in co. ${partnerCompanyId}`);
            }
        } catch (e: any) {
          const msg = `Partner write-off journal failed: ${e?.message}`;
          accountingWarnings.push(msg);
          console.error('[Close/Loss Partner] ❌', msg);
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

      // Update partner loan and create payment record if mirror mapping exists
      if (partnerLoanId && partnerLoan) {
        const partnerUnpaidIds = partnerUnpaidEMIs.map(e => e.id);
        if (partnerUnpaidIds.length > 0) {
          await tx.eMISchedule.updateMany({
            where: { id: { in: partnerUnpaidIds } },
            data: {
              paymentStatus: 'PAID',
              paidDate:      now,
              paymentMode:   paymentMode || 'CASH',
              notes:         `Foreclosure payment (Partner) — Loan closed`,
            }
          });
        }
        await tx.loanApplication.update({
          where: { id: partnerLoanId },
          data: {
            status:   'CLOSED',
            closedAt: now,
            rejectionReason: `Loan closed via foreclosure (Partner). Amount: ₹${partnerTotalForeclosureAmount.toFixed(2)} via ${paymentMode || 'CASH'}.`
          }
        });
        
        // Create payment record for partner loan
        await tx.payment.create({
          data: {
            loanApplicationId: partnerLoanId,
            customerId:        loan.customerId,
            amount:            partnerTotalForeclosureAmount,
            principalComponent: partnerTotalPrincipal,
            interestComponent:  partnerTotalInterest,
            paymentType:       'FORECLOSURE' as any,
            paymentMode:       paymentMode || 'CASH',
            status:            'COMPLETED',
            paidById:          userId,
            remarks:           remarks ? `${remarks} (Partner)` : `Foreclosure (Partner) — Loan ${partnerLoan.applicationNo}`,
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

        if (partnerLoanId && partnerUnpaidEMIs.length > 0) {
          for (const emi of partnerUnpaidEMIs) {
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
          loanId:        loanId,
          customerId:    loan.customerId,
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
          { accountCode: isOnlineMode ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND, debitAmount: totalForeclosureAmount, creditAmount: 0, narration: `Foreclosure collected (${paymentMode})`, loanId: loanId, customerId: loan.customerId },
          { accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: totalPrincipal, narration: `Loan principal recovered`, loanId: loanId, customerId: loan.customerId }
        ];

        if (totalAccruedInterest > 0) {
          lines.push({ accountCode: ACCOUNT_CODES.INTEREST_RECEIVABLE, debitAmount: 0, creditAmount: totalAccruedInterest, narration: `Accrued interest cleared`, loanId: loanId, customerId: loan.customerId });
        }
        if (totalReclassifiedInterest > 0) {
          lines.push({ accountCode: '1305', debitAmount: 0, creditAmount: totalReclassifiedInterest, narration: `Overdue interest cleared`, loanId: loanId, customerId: loan.customerId });
        }
        if (totalDirectInterest > 0) {
          lines.push({ accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitAmount: 0, creditAmount: totalDirectInterest, narration: `Interest income on foreclosure`, loanId: loanId, customerId: loan.customerId });
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

    // ── Accounting: Foreclosure entries for partner loan ──
    if (partnerCompanyId && partnerTotalForeclosureAmount > 0) {
      try {
        const { recordCashBookEntry, recordBankTransaction } = await import('@/lib/simple-accounting');
        const entryArgs = {
          companyId:     partnerCompanyId,
          amount:        partnerTotalForeclosureAmount,
          description:   `[PARTNER] Foreclosure - ${partnerLoan.applicationNo} (P:₹${partnerTotalPrincipal.toFixed(2)} + I:₹${partnerTotalInterest.toFixed(2)})`,
          referenceType: 'EMI_PAYMENT' as const,
          referenceId:   `${partnerLoanId}-FORECLOSURE`,
          createdById:   userId,
          loanId:        partnerLoanId,
          customerId:    loan.customerId,
        };
        if (isOnlineMode) {
          await recordBankTransaction({ ...entryArgs, transactionType: 'CREDIT' });
          console.log(`[Close/Payment] ✅ Partner Bank entry: ₹${partnerTotalForeclosureAmount} → co. ${partnerCompanyId}`);
        } else {
          await recordCashBookEntry({ ...entryArgs, entryType: 'CREDIT' });
          console.log(`[Close/Payment] ✅ Partner Cashbook entry: ₹${partnerTotalForeclosureAmount} → co. ${partnerCompanyId}`);
        }
      } catch (e: any) {
        const msg = `Partner cashbook/bank entry failed: ${e?.message}`;
        accountingWarnings.push(msg);
        console.error('[Close/Payment] ❌ Partner Cash/Bank', msg);
      }

      try {
        const { AccountingService, ACCOUNT_CODES } = await import('@/lib/accounting-service');
        const accSvc = new AccountingService(partnerCompanyId);
        await accSvc.initializeChartOfAccounts();

        const partnerUnpaidEMIIds = partnerUnpaidEMIs.map(e => e.id);
        const existingEntries = await db.journalEntry.findMany({
          where: {
            companyId: partnerCompanyId,
            referenceId: { in: partnerUnpaidEMIIds },
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

        for (const emi of partnerUnpaidEMIs) {
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
          { accountCode: isOnlineMode ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND, debitAmount: partnerTotalForeclosureAmount, creditAmount: 0, narration: `[PARTNER] Foreclosure collected (${paymentMode})`, loanId: partnerLoanId, customerId: loan.customerId },
          { accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: partnerTotalPrincipal, narration: `[PARTNER] Loan principal recovered`, loanId: partnerLoanId, customerId: loan.customerId }
        ];

        if (totalAccruedInterest > 0) {
          lines.push({ accountCode: ACCOUNT_CODES.INTEREST_RECEIVABLE, debitAmount: 0, creditAmount: totalAccruedInterest, narration: `[PARTNER] Accrued interest cleared`, loanId: partnerLoanId, customerId: loan.customerId });
        }
        if (totalReclassifiedInterest > 0) {
          lines.push({ accountCode: '1305', debitAmount: 0, creditAmount: totalReclassifiedInterest, narration: `[PARTNER] Overdue interest cleared`, loanId: partnerLoanId, customerId: loan.customerId });
        }
        if (totalDirectInterest > 0) {
          lines.push({ accountCode: ACCOUNT_CODES.INTEREST_INCOME, debitAmount: 0, creditAmount: totalDirectInterest, narration: `[PARTNER] Interest income on foreclosure`, loanId: partnerLoanId, customerId: loan.customerId });
        }

        await accSvc.createJournalEntry({
          entryDate:     now,
          referenceType: 'EMI_PAYMENT',
          referenceId:   `${partnerLoanId}-FORECLOSURE-JE`,
          narration:     `[PARTNER] Foreclosure - ${partnerLoan.applicationNo} — P:₹${partnerTotalPrincipal.toFixed(2)} I:₹${partnerTotalInterest.toFixed(2)} via ${paymentMode}`,
          lines,
          createdById: userId,
          isAutoEntry: true,
        });
        console.log(`[Close/Payment] ✅ Partner foreclosure journal created: ₹${partnerTotalForeclosureAmount}`);
      } catch (e: any) {
        const msg = `Partner foreclosure journal failed: ${e?.message}`;
        accountingWarnings.push(msg);
        console.error('[Close/Payment] ❌ Partner Journal', msg);
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
