import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateEMI } from '@/utils/helpers';
import { AccountingService } from '@/lib/accounting-service';

// POST - Start an offline loan (convert from interest-only to normal EMI)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, tenure, interestRate, interestType, startedBy } = body;

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

    const actualInterestType: 'FLAT' | 'REDUCING' = (
      interestType === 'REDUCING' ? 'REDUCING' :
      (loan.interestType === 'REDUCING' ? 'REDUCING' : 'FLAT')
    ) as 'FLAT' | 'REDUCING';

    const emiCalc = calculateEMI(principalAmount, interestRate, tenure, actualInterestType, new Date());
    const emiAmount = emiCalc.emi;

    console.log(`[Start Offline Loan] ${loan.loanNumber} | ₹${principalAmount} @ ${interestRate}% ${actualInterestType} × ${tenure}mo = EMI ₹${emiAmount}`);

    const result = await db.$transaction(async (tx) => {
      await tx.offlineLoanEMI.deleteMany({ where: { offlineLoanId: loanId } });

      const emis = emiCalc.schedule.map((item, index) => {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + index + 1);
        dueDate.setDate(5);
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
          newData: JSON.stringify({ action: 'LOAN_STARTED', tenure, interestRate, interestType: actualInterestType, emiAmount }),
          description: `Offline loan ${loan.loanNumber} started: ${tenure}mo @ ${interestRate}% ${actualInterestType}`,
          canUndo: false
        }
      });

      return { updatedLoan, emis };
    });

    console.log(`[Start Offline Loan] ✅ ${loan.loanNumber} → ${result.emis.length} EMIs created`);

    // ── CASCADE: Also start the mirror offline loan with its own rate ─────────
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

        // Mirror uses its OWN rate from mapping (not original's rate)
        const mirrorRate   = mirrorMapping.mirrorInterestRate || interestRate;
        const mirrorType   = (mirrorMapping.mirrorInterestType || 'REDUCING') as 'FLAT' | 'REDUCING';
        const mirrorTenure = tenure; // same tenure as original

        const mc = calculateEMI(principalAmount, mirrorRate, mirrorTenure, mirrorType, new Date());

        // Clear IO placeholder EMIs from mirror
        await db.offlineLoanEMI.deleteMany({ where: { offlineLoanId: mirrorLoan.id } });

        // Generate mirror's proper amortizing schedule
        const mirrorEMIs = mc.schedule.map((item, index) => {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + index + 1);
          dueDate.setDate(5);
          dueDate.setHours(0, 0, 0, 0);
          return {
            offlineLoanId: mirrorLoan.id,
            installmentNumber: item.installmentNumber,
            dueDate,
            principalAmount: item.principal,
            interestAmount: item.interest,
            totalAmount: item.totalAmount,
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
            emiAmount: mc.emi,
            isInterestOnlyLoan: false,
            partialPaymentEnabled: true,
          }
        });

        await db.mirrorLoanMapping.update({
          where: { id: mirrorMapping.id },
          data: { mirrorTenure, originalTenure: tenure }
        });

        // ── Journal entry in mirror company ──────────────────────────────
        try {
          const mcId  = mirrorMapping.mirrorCompanyId;
          const acctSvc = new AccountingService(mcId);
          await acctSvc.initializeChartOfAccounts();
          const entryNumber = await acctSvc.generateEntryNumber();

          const loansRec = await db.chartOfAccount.findFirst({ where: { companyId: mcId, accountCode: '1200' } });
          const cashAcc  = await db.chartOfAccount.findFirst({ where: { companyId: mcId, accountCode: '1101' } });

          if (loansRec && cashAcc) {
            await db.journalEntry.create({
              data: {
                companyId: mcId,
                entryNumber,
                entryDate: new Date(),
                referenceType: 'LOAN_ACTIVATION',
                referenceId: mirrorLoan.id,
                narration: `Mirror loan activated (IO→EMI): ${loan.loanNumber} | ${mirrorRate}% ${mirrorType} × ${mirrorTenure}mo`,
                totalDebit: principalAmount, totalCredit: principalAmount,
                isAutoEntry: true, isApproved: true,
                createdById: startedBy || 'system',
                lines: {
                  create: [
                    { accountId: loansRec.id, debitAmount: principalAmount, creditAmount: 0, loanId: mirrorLoan.id, narration: `Mirror activated: ${loan.loanNumber}` },
                    { accountId: cashAcc.id,  debitAmount: 0, creditAmount: principalAmount, narration: `Offset — loan now earning mirror interest` },
                  ]
                }
              }
            });
          }
        } catch (je) { console.error('[Mirror Start] Journal entry failed (non-fatal):', je); }

        console.log(`[Mirror Start] ✅ ${mirrorLoan.loanNumber} activated | ${mirrorRate}% ${mirrorType} | EMI ₹${mc.emi} × ${mirrorTenure}mo`);
      } catch (e) {
        console.error('[Mirror Start] Non-fatal error:', e);
      }
    });
    // ── END MIRROR CASCADE ────────────────────────────────────────────────────

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
        emiCount: result.emis.length
      },
      message: `Loan started successfully! EMI: ₹${emiAmount.toFixed(2)}/month for ${tenure} months`
    });

  } catch (error) {
    console.error('Start offline loan error:', error);
    return NextResponse.json({ error: 'Failed to start loan', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// GET - Preview EMI calculation for starting offline loan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId         = searchParams.get('loanId');
    const tenure         = parseInt(searchParams.get('tenure') || '0');
    const interestRate   = parseFloat(searchParams.get('interestRate') || '0');
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
        schedulePreview: emiCalc.schedule.slice(0, 3)
      }
    });

  } catch (error) {
    console.error('Preview EMI calculation error:', error);
    return NextResponse.json({ error: 'Failed to calculate EMI preview', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
