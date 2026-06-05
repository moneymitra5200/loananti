import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateEMI } from '@/utils/helpers';
import { AccountingService } from '@/lib/accounting-service';
import { calculateMirrorLoan } from '@/lib/mirror-loan';
import { recordBankTransaction, recordCashBookEntry } from '@/lib/simple-accounting';

// POST - Start an offline loan (convert from interest-only to normal EMI)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      loanId,
      tenure,
      interestRate,
      interestType,
      startedBy,
      processingFee,
      bankAccountId,
      secondaryPaymentPageId,
    } = body;

    if (!loanId || !tenure || !interestRate) {
      return NextResponse.json({ error: 'Missing required fields: loanId, tenure, interestRate' }, { status: 400 });
    }
    if (tenure < 1 || tenure > 120) {
      return NextResponse.json({ error: 'Tenure must be between 1 and 120 months' }, { status: 400 });
    }
    if (interestRate < 1 || interestRate > 50) {
      return NextResponse.json({ error: 'Interest rate must be between 1% and 50%' }, { status: 400 });
    }

    const loan = await db.offlineLoan.findUnique({
      where: { id: loanId },
      include: { company: { select: { id: true, name: true, code: true } } }
    });

    if (!loan) return NextResponse.json({ error: 'Offline loan not found' }, { status: 404 });
    if (loan.status !== 'INTEREST_ONLY') {
      return NextResponse.json({ error: 'Loan must be in INTEREST_ONLY status to start. Current: ' + loan.status }, { status: 400 });
    }

    const principalAmount = loan.loanAmount;
    if (!principalAmount || principalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid principal amount' }, { status: 400 });
    }

    const companyId = loan.companyId;
    if (!companyId) return NextResponse.json({ error: 'Loan has no associated company' }, { status: 400 });

    const actualInterestType: 'FLAT' | 'REDUCING' = (
      interestType === 'REDUCING' ? 'REDUCING' :
      (loan.interestType === 'REDUCING' ? 'REDUCING' : 'FLAT')
    ) as 'FLAT' | 'REDUCING';

    const emiCalc = calculateEMI(principalAmount, interestRate, tenure, actualInterestType, new Date());
    const emiAmount = emiCalc.emi;
    const parsedProcessingFee = parseFloat(processingFee) || 0;

    console.log(`[Start Offline Loan] ${loan.loanNumber} | ₹${principalAmount} @ ${interestRate}% ${actualInterestType} × ${tenure}mo = EMI ₹${emiAmount} | PF ₹${parsedProcessingFee}`);

    const result = await db.$transaction(async (tx) => {
      await tx.offlineLoanEMI.deleteMany({ where: { offlineLoanId: loanId } });

      const emis = emiCalc.schedule.map((item, index) => {
        const emiDayOfMonth = loan.disbursementDate ? new Date(loan.disbursementDate).getDate() : new Date().getDate();
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + index + 1);
        dueDate.setDate(emiDayOfMonth);
        dueDate.setHours(0, 0, 0, 0);
        return {
          offlineLoanId: loanId,
          installmentNumber: item.installmentNumber,
          dueDate,
          principalAmount: item.principal,
          interestAmount: item.interest,
          totalAmount: item.totalAmount,
          outstandingPrincipal: item.outstandingPrincipal,
          paymentStatus: 'PENDING'
        };
      });

      await tx.offlineLoanEMI.createMany({ data: emis as any });

      const updatedLoan = await tx.offlineLoan.update({
        where: { id: loanId },
        data: {
          status: 'ACTIVE',
          tenure,
          interestRate,
          interestType: actualInterestType,
          emiAmount,
          isInterestOnlyLoan: false,
          partialPaymentEnabled: true,
          processingFee: parsedProcessingFee,
          ...(bankAccountId ? { bankAccountId } : {}),
          ...(secondaryPaymentPageId ? { secondaryPaymentPageId } : {}),
        }
      });

      await tx.actionLog.create({
        data: {
          userId: startedBy || 'system',
          userRole: 'SYSTEM',
          actionType: 'UPDATE',
          module: 'OFFLINE_LOAN',
          recordId: loanId,
          recordType: 'OfflineLoan',
          newData: JSON.stringify({ action: 'LOAN_STARTED', tenure, interestRate, interestType: actualInterestType, emiAmount, processingFee: parsedProcessingFee }),
          description: `Offline loan ${loan.loanNumber} started (Phase 2): ${tenure}mo @ ${interestRate}% ${actualInterestType}`,
          canUndo: false
        }
      });

      return { updatedLoan, emis };
    });

    console.log(`[Start Offline Loan] ✅ ${loan.loanNumber} → ${result.emis.length} EMIs created`);

    // ── Record processing fee (same as normal loan creation) ──────────────────
    // ONLY record if NOT a mirror loan. Mirror loans handle PF dynamically on EMI #1.
    const mirrorMappingForPF = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId, isOfflineLoan: true }
    });

    if (parsedProcessingFee > 0 && !mirrorMappingForPF) {
      try {
        const pfPaymentMode = (bankAccountId && !bankAccountId.startsWith('cash_')) ? 'BANK_TRANSFER' : 'CASH';
        const pfBankId = (bankAccountId && !bankAccountId.startsWith('cash_')) ? bankAccountId : undefined;

        // Bank credit for processing fee
        if (pfPaymentMode === 'BANK_TRANSFER' && pfBankId) {
          await recordBankTransaction({
            companyId,
            bankAccountId: pfBankId,
            transactionType: 'CREDIT',
            amount: parsedProcessingFee,
            description: `Processing Fee - ${loan.loanNumber}`,
            referenceType: 'PROCESSING_FEE',
            referenceId: loanId,
            createdById: startedBy || 'system',
          });
        } else {
          // Cash credit
          await recordCashBookEntry({
            companyId,
            entryType: 'CREDIT',
            amount: parsedProcessingFee,
            description: `Processing Fee - ${loan.loanNumber}`,
            referenceType: 'PROCESSING_FEE',
            referenceId: loanId,
            createdById: startedBy || 'system',
          });
        }

        // Accounting journal entry for processing fee
        const accountingService = new AccountingService(companyId);
        await accountingService.initializeChartOfAccounts();
        await accountingService.recordProcessingFee({
          loanId,
          customerId: loan.customerId || loanId,
          amount: parsedProcessingFee,
          collectionDate: new Date(),
          createdById: startedBy || 'system',
          paymentMode: pfPaymentMode,
          bankAccountId: pfBankId,
        });

        await db.offlineLoan.update({
          where: { id: loanId },
          data: { processingFeeRecorded: true }
        });
        console.log(`[Start Offline Loan] ✅ Processing fee ₹${parsedProcessingFee} recorded for ${loan.loanNumber}`);
      } catch (pfErr) {
        console.error('[Start Offline Loan] Processing fee recording failed (non-fatal):', pfErr);
      }
    }

    // ── CASCADE: Also start the mirror offline loan with shifted schedule ─────
    setImmediate(async () => {
      try {
        const mirrorMapping = await db.mirrorLoanMapping.findFirst({
          where: { originalLoanId: loanId, isOfflineLoan: true },
          include: { mirrorCompany: { select: { id: true, name: true } } }
        });

        if (!mirrorMapping?.mirrorLoanId) {
          console.log(`[Mirror Start] No mirror for offline loan ${loan.loanNumber}`);
          return;
        }

        const mirrorLoan = await db.offlineLoan.findUnique({ where: { id: mirrorMapping.mirrorLoanId } });
        if (!mirrorLoan) return;

        // Mirror uses its OWN rate from mapping
        const mirrorRate  = mirrorMapping.mirrorInterestRate || interestRate;
        const mirrorType  = (mirrorMapping.mirrorInterestType || 'REDUCING') as 'FLAT' | 'REDUCING';

        // ── Calculate full mirror + shifted schedule (same as normal loan) ────
        const mirrorCalc = calculateMirrorLoan(
          principalAmount,
          interestRate,
          tenure,
          actualInterestType,
          mirrorRate,
          mirrorType
        );

        // shiftedSchedule: last (smallest) EMI moved to position 1
        const shiftedSchedule = mirrorCalc.shiftedSchedule;
        const autoProcessingFee = mirrorCalc.processingFee; // originalEMI - lastMirrorEMI
        const mirrorTenure = mirrorCalc.mirrorLoan.schedule.length;

        // Clear IO placeholder EMIs from mirror
        await db.offlineLoanEMI.deleteMany({ where: { offlineLoanId: mirrorLoan.id } });

        // Generate mirror's SHIFTED amortizing schedule (last EMI → first position)
        const mirrorEMIs = shiftedSchedule.map((item, index) => {
          const emiDayOfMonth = loan.disbursementDate ? new Date(loan.disbursementDate).getDate() : new Date().getDate();
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + index + 1);
          dueDate.setDate(emiDayOfMonth);
          dueDate.setHours(0, 0, 0, 0);
          return {
            offlineLoanId: mirrorLoan.id,
            installmentNumber: item.installmentNumber,
            dueDate,
            principalAmount: item.principal,
            interestAmount: item.interest,
            totalAmount: item.emi,
            outstandingPrincipal: item.outstandingPrincipal,
            paymentStatus: 'PENDING' as const,
          };
        });

        await db.offlineLoanEMI.createMany({ data: mirrorEMIs as any });

        await db.offlineLoan.update({
          where: { id: mirrorLoan.id },
          data: {
            status: 'ACTIVE',
            tenure: mirrorTenure,
            interestRate: mirrorRate,
            interestType: mirrorType,
            emiAmount: mirrorCalc.mirrorLoan.emiAmount,
            isInterestOnlyLoan: false,
            partialPaymentEnabled: true,
            processingFee: autoProcessingFee,
          }
        });

        // Update mirror mapping with processing fee and tenure info
        await db.mirrorLoanMapping.update({
          where: { id: mirrorMapping.id },
          data: {
            mirrorTenure,
            originalTenure: tenure,
            mirrorProcessingFee: autoProcessingFee,
            processingFeeRecorded: false,
          }
        });

        // Note: No journal entry for disbursement is needed here because the loan 
        // was already disbursed when it was created in Phase 1 (INTEREST_ONLY).

        console.log(`[Mirror Start] ✅ ${mirrorLoan.loanNumber} activated | ${mirrorRate}% ${mirrorType} | EMI ₹${mirrorCalc.mirrorLoan.emiAmount} × ${mirrorTenure}mo | shifted schedule | PF ₹${autoProcessingFee}`);
      } catch (e) {
        console.error('[Mirror Start] Non-fatal error:', e);
      }
    });
    // ── END MIRROR CASCADE ────────────────────────────────────────────────────

    // Broadcast real-time refresh
    setImmediate(() => {
      import('@/lib/socket-emit').then(m => m.emitDashboardRefresh({ companyId: companyId || '' })).catch(() => {});
    });

    return NextResponse.json({
      success: true,
      loan: result.updatedLoan,
      emiDetails: {
        emiAmount,
        totalInterest: emiCalc.totalInterest,
        totalAmount: emiCalc.totalAmount,
        tenure,
        interestRate,
        interestType: actualInterestType,
        principalAmount,
        processingFee: parsedProcessingFee,
        emiCount: result.emis.length
      },
      message: `Loan started successfully! EMI: ₹${emiAmount.toFixed(2)}/month for ${tenure} months`
    });

  } catch (error) {
    console.error('Start offline loan error:', error);
    return NextResponse.json({ error: 'Failed to start loan', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// GET - Preview EMI calculation for starting offline loan (includes processing fee preview)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId          = searchParams.get('loanId');
    const tenure          = parseInt(searchParams.get('tenure') || '0');
    const interestRate    = parseFloat(searchParams.get('interestRate') || '0');
    const interestTypeParam = searchParams.get('interestType');

    if (!loanId) return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });

    const loan = await db.offlineLoan.findUnique({
      where: { id: loanId },
      include: { company: { select: { id: true, name: true, code: true } } }
    });

    if (!loan) return NextResponse.json({ error: 'Offline loan not found' }, { status: 404 });

    const principalAmount    = loan.loanAmount;
    const defaultTenure      = tenure || loan.tenure || 12;
    const defaultRate        = interestRate || loan.interestRate || 12;
    const actualInterestType: 'FLAT' | 'REDUCING' = (
      interestTypeParam === 'REDUCING' ? 'REDUCING' :
      (loan.interestType === 'REDUCING' ? 'REDUCING' : 'FLAT')
    ) as 'FLAT' | 'REDUCING';

    const emiCalc = calculateEMI(principalAmount, defaultRate, defaultTenure, actualInterestType, new Date());

    // Calculate processing fee from mirror mapping if it exists
    let processingFeePreview = 0;
    let mirrorRateUsed = 0;
    try {
      const mirrorMapping = await db.mirrorLoanMapping.findFirst({
        where: { originalLoanId: loanId, isOfflineLoan: true }
      });
      if (mirrorMapping) {
        const mirrorRate = mirrorMapping.mirrorInterestRate || defaultRate;
        const mirrorType = (mirrorMapping.mirrorInterestType || 'REDUCING') as 'FLAT' | 'REDUCING';
        mirrorRateUsed = mirrorRate;
        const mirrorCalc = calculateMirrorLoan(
          principalAmount, defaultRate, defaultTenure, actualInterestType, mirrorRate, mirrorType
        );
        processingFeePreview = mirrorCalc.processingFee;
      }
    } catch { /* non-fatal — no mirror mapping */ }

    return NextResponse.json({
      success: true,
      loan: {
        id: loan.id,
        loanNumber: loan.loanNumber,
        status: loan.status,
        customerName: loan.customerName,
        customerPhone: loan.customerPhone,
        company: loan.company,
        principalAmount,
        isInterestOnlyLoan: loan.isInterestOnlyLoan,
        interestOnlyMonthlyAmount: loan.interestOnlyMonthlyAmount,
        interestType: actualInterestType,
      },
      preview: {
        emiAmount: emiCalc.emi,
        totalInterest: emiCalc.totalInterest,
        totalAmount: emiCalc.totalAmount,
        tenure: defaultTenure,
        interestRate: defaultRate,
        interestType: actualInterestType,
        principalAmount,
        processingFee: processingFeePreview,
        mirrorRate: mirrorRateUsed,
        schedulePreview: emiCalc.schedule.slice(0, 3)
      }
    });

  } catch (error) {
    console.error('Preview EMI calculation error:', error);
    return NextResponse.json({ error: 'Failed to calculate EMI preview', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
