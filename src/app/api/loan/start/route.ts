import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateEMI } from '@/utils/helpers';
// ACID: retry on deadlock
import { withRetry } from '@/lib/db-utils';
import { AccountingService } from '@/lib/accounting-service';

// POST - Start a loan (convert from interest-only to normal EMI)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, tenure, interestRate, startedBy } = body;

    // Validate required fields
    if (!loanId || !tenure || !interestRate) {
      return NextResponse.json({ error: 'Missing required fields: loanId, tenure, interestRate' }, { status: 400 });
    }

    // Validate tenure and interest rate
    if (tenure < 1 || tenure > 120) {
      return NextResponse.json({ error: 'Tenure must be between 1 and 120 months' }, { status: 400 });
    }

    if (interestRate < 1 || interestRate > 50) {
      return NextResponse.json({ error: 'Interest rate must be between 1% and 50%' }, { status: 400 });
    }

    // Get the loan
    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      include: {
        sessionForm: true,
        customer: { select: { id: true, name: true, phone: true } },
        company: { select: { id: true, name: true, code: true } }
      }
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Check if loan is an Interest Only loan
    const isInterestOnlyLoan = loan.isInterestOnlyLoan || loan.loanType === 'INTEREST_ONLY';
    
    // Allow starting if:
    // 1. Loan is in ACTIVE_INTEREST_ONLY status, OR
    // 2. Loan is marked as Interest Only (isInterestOnlyLoan or loanType) and is in DISBURSED/ACTIVE status
    const validStatuses = ['ACTIVE_INTEREST_ONLY', 'DISBURSED', 'ACTIVE'] as string[];
    if (!isInterestOnlyLoan) {
      return NextResponse.json({ 
        error: 'This endpoint is only for Interest Only loans. This loan is not an Interest Only loan.' 
      }, { status: 400 });
    }
    
    if (!validStatuses.includes(loan.status as any)) {
      return NextResponse.json({ 
        error: 'Loan must be in ACTIVE_INTEREST_ONLY, DISBURSED, or ACTIVE status to start. Current status: ' + loan.status 
      }, { status: 400 });
    }

    console.log(`[Start Loan] Loan: ${loan.applicationNo}, Status: ${loan.status}, Is Interest Only: ${isInterestOnlyLoan}`);

    // Get the principal amount
    // Use approvedAmount from session form, or requestedAmount if no session
    const principalAmount = loan.sessionForm?.approvedAmount || loan.requestedAmount;

    if (!principalAmount || principalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid principal amount' }, { status: 400 });
    }

    // Determine interest type (default to FLAT if not specified)
    const interestType = (loan.sessionForm?.interestType || 'FLAT') as 'FLAT' | 'REDUCING';

    // Calculate EMI schedule with the new tenure and interest rate
    const emiCalculation = calculateEMI(
      principalAmount,
      interestRate,
      tenure,
      interestType,
      new Date() // Start from current date
    );

    console.log(`[Start Loan] Loan: ${loan.applicationNo}`);
    console.log(`[Start Loan] Principal: ${principalAmount}, Rate: ${interestRate}%, Tenure: ${tenure} months`);
    console.log(`[Start Loan] EMI: ${emiCalculation.emi}, Total Interest: ${emiCalculation.totalInterest}`);

    // ── ACID: Wrap loan start in atomic transaction with deadlock retry ──────
    // withRetry: deadlock resilience (P2034) up to 3×
    // Status guard inside tx: prevents double-start if two requests race
    const result = await withRetry(() => db.$transaction(async (tx) => {
      // ACID GUARD: re-read loan status inside tx to prevent race condition
      const freshLoan = await tx.loanApplication.findUnique({
        where: { id: loanId }, select: { status: true }
      });
      if (freshLoan?.status === 'ACTIVE' && loan.status !== 'ACTIVE') {
        const err: any = new Error('Loan already started by concurrent request');
        err.code = 'LOAN_ALREADY_STARTED';
        throw err;
      }
      // Delete any existing EMI schedules (from interest-only phase)
      await tx.eMISchedule.deleteMany({
        where: { loanApplicationId: loanId }
      });

      // Create new EMI schedules
      const emiSchedules = emiCalculation.schedule.map((item, index) => {
        // Set due date to 5th of each month
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + index + 1);
        dueDate.setDate(5);
        dueDate.setHours(0, 0, 0, 0);

        return {
          loanApplicationId: loanId,
          installmentNumber: item.installmentNumber,
          dueDate,
          originalDueDate: dueDate,
          principalAmount: item.principal,
          interestAmount: item.interest,
          totalAmount: item.totalAmount,
          outstandingPrincipal: item.outstandingPrincipal,
          outstandingInterest: 0,
          paidAmount: 0,
          paidPrincipal: 0,
          paidInterest: 0,
          paymentStatus: 'PENDING',
          penaltyAmount: 0,
          penaltyPaid: 0,
          waivedAmount: 0,
          daysOverdue: 0,
          isPartialPayment: false,
          partialPaymentCount: 0,
          remainingAmount: 0,
          isInterestOnly: false,
          principalDeferred: false,
        };
      });

      await tx.eMISchedule.createMany({
        data: emiSchedules as any
      });

      // Update session form if exists
      if (loan.sessionForm) {
        await tx.sessionForm.update({
          where: { loanApplicationId: loanId },
          data: {
            tenure,
            interestRate,
            emiAmount: emiCalculation.emi,
            totalInterest: emiCalculation.totalInterest,
            totalAmount: emiCalculation.totalAmount,
          }
        });
      }

      // Update loan status and details
      const updatedLoan = await tx.loanApplication.update({
        where: { id: loanId },
        data: {
          status: 'ACTIVE',
          loanStartedAt: new Date(),
          tenure,
          interestRate,
          emiAmount: emiCalculation.emi,
        }
      });

      // Create workflow log
      await tx.workflowLog.create({
        data: {
          loanApplicationId: loanId,
          actionById: startedBy || 'system',
          action: 'LOAN_STARTED',
          previousStatus: loan.status as any,
          newStatus: 'ACTIVE',
          remarks: `Loan started with tenure: ${tenure} months, interest rate: ${interestRate}%`
        }
      });

      return { updatedLoan, emiSchedules };
    })); // end withRetry + $transaction

    console.log(`[Start Loan] Successfully started loan ${loan.applicationNo}`);
    console.log(`[Start Loan] Created ${result.emiSchedules.length} EMI schedules`);

    // Broadcast real-time refresh
    setImmediate(() => {
      import('@/lib/socket-emitter').then(m => m.broadcastRefresh()).catch(() => {});
    });

    // ── CASCADE: Also start the mirror online loan with its own rate ──────────
    setImmediate(async () => {
      try {
        const mirrorMapping = await db.mirrorLoanMapping.findFirst({
          where: { originalLoanId: loanId, isOfflineLoan: false },
          include: { mirrorCompany: { select: { id: true, name: true } } }
        });

        if (!mirrorMapping?.mirrorLoanId) {
          console.log(`[Mirror Start Online] No online mirror for ${loan.applicationNo}`);
          return;
        }

        const mirrorLoan = await db.loanApplication.findUnique({
          where: { id: mirrorMapping.mirrorLoanId },
          include: { sessionForm: true }
        });
        if (!mirrorLoan) return;

        // Mirror uses its OWN rate from mapping
        const mirrorRate   = mirrorMapping.mirrorInterestRate || interestRate;
        const mirrorType   = (mirrorMapping.mirrorInterestType || 'REDUCING') as 'FLAT' | 'REDUCING';
        const mirrorTenure = tenure;
        const principal    = principalAmount;

        const mc = calculateEMI(principal, mirrorRate, mirrorTenure, mirrorType, new Date());

        // Delete mirror's IO placeholder EMIs
        await db.eMISchedule.deleteMany({ where: { loanApplicationId: mirrorMapping.mirrorLoanId } });

        // Build mirror amortizing schedule
        const mirrorSchedule = mc.schedule.map((item, index) => {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + index + 1);
          dueDate.setDate(5);
          dueDate.setHours(0, 0, 0, 0);
          return {
            loanApplicationId: mirrorMapping.mirrorLoanId!,
            installmentNumber: item.installmentNumber,
            dueDate,
            originalDueDate: dueDate,
            principalAmount: item.principal,
            interestAmount: item.interest,
            totalAmount: item.totalAmount,
            outstandingPrincipal: item.outstandingPrincipal,
            outstandingInterest: 0,
            paidAmount: 0, paidPrincipal: 0, paidInterest: 0,
            paymentStatus: 'PENDING' as const,
            penaltyAmount: 0, penaltyPaid: 0, waivedAmount: 0,
            daysOverdue: 0, isPartialPayment: false, partialPaymentCount: 0,
            remainingAmount: 0, isInterestOnly: false, principalDeferred: false,
          };
        });

        await db.eMISchedule.createMany({ data: mirrorSchedule as any });

        // Activate mirror loan
        await db.loanApplication.update({
          where: { id: mirrorMapping.mirrorLoanId! },
          data: { status: 'ACTIVE', tenure: mirrorTenure, interestRate: mirrorRate, emiAmount: mc.emi, loanStartedAt: new Date() }
        });

        // Update session form if exists
        if (mirrorLoan.sessionForm) {
          await db.sessionForm.update({
            where: { loanApplicationId: mirrorMapping.mirrorLoanId! },
            data: { tenure: mirrorTenure, interestRate: mirrorRate, emiAmount: mc.emi, totalInterest: mc.totalInterest, totalAmount: mc.totalAmount }
          });
        }

        // Update mapping
        await db.mirrorLoanMapping.update({
          where: { id: mirrorMapping.id },
          data: { mirrorTenure, originalTenure: tenure }
        });

        // ── Journal entry in mirror company ──────────────────────────────────
        try {
          const mcId    = mirrorMapping.mirrorCompanyId;
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
                referenceId: mirrorMapping.mirrorLoanId!,
                narration: `Mirror loan activated (IO→EMI): ${loan.applicationNo} | ${mirrorRate}% ${mirrorType} × ${mirrorTenure}mo`,
                totalDebit: principal, totalCredit: principal,
                isAutoEntry: true, isApproved: true,
                createdById: startedBy || 'system',
                lines: {
                  create: [
                    { accountId: loansRec.id, debitAmount: principal, creditAmount: 0, loanId: mirrorMapping.mirrorLoanId!, narration: `Mirror activated: ${loan.applicationNo}` },
                    { accountId: cashAcc.id,  debitAmount: 0, creditAmount: principal, narration: `Offset — loan earning mirror interest` },
                  ]
                }
              }
            });
          }
        } catch (je) { console.error('[Mirror Start Online] Journal entry failed (non-fatal):', je); }

        console.log(`[Mirror Start Online] ✅ ${mirrorLoan.applicationNo} activated | ${mirrorRate}% ${mirrorType} | EMI ₹${mc.emi} × ${mirrorTenure}mo`);
      } catch (e) {
        console.error('[Mirror Start Online] Non-fatal error:', e);
      }
    });
    // ── END MIRROR CASCADE ────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      loan: result.updatedLoan,
      emiDetails: {
        emiAmount: emiCalculation.emi,
        totalInterest: emiCalculation.totalInterest,
        totalAmount: emiCalculation.totalAmount,
        tenure,
        interestRate,
        principalAmount,
        emiCount: result.emiSchedules.length
      },
      message: `Loan started successfully! EMI: ₹${emiCalculation.emi.toFixed(2)}/month for ${tenure} months`
    });

  } catch (error) {
    console.error('Start loan error:', error);
    return NextResponse.json({ 
      error: 'Failed to start loan', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}


// GET - Preview EMI calculation for starting loan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    const tenure = parseInt(searchParams.get('tenure') || '0');
    const interestRate = parseFloat(searchParams.get('interestRate') || '0');

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    // Get the loan
    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      include: {
        sessionForm: true,
        customer: { select: { id: true, name: true, phone: true } },
        company: { select: { id: true, name: true, code: true } }
      }
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Get the principal amount
    const principalAmount = loan.sessionForm?.approvedAmount || loan.requestedAmount;

    // Get default values if not provided
    const defaultTenure = tenure || loan.sessionForm?.tenure || loan.requestedTenure || 12;
    const defaultRate = interestRate || loan.sessionForm?.interestRate || loan.interestRate || 12;
    const interestType = (loan.sessionForm?.interestType || 'FLAT') as 'FLAT' | 'REDUCING';

    // Calculate EMI preview
    const emiCalculation = calculateEMI(
      principalAmount,
      defaultRate,
      defaultTenure,
      interestType,
      new Date()
    );

    // Get product/service defaults if available
    let productDefaults: {
      minTenure: number;
      maxTenure: number;
      defaultTenure: number;
      minInterestRate: number;
      maxInterestRate: number;
      defaultInterestRate: number;
    } | null = null;
    if (loan.sessionForm?.agentId) {
      const service = await db.cMSService.findFirst({
        where: { isActive: true }
      });
      if (service) {
        productDefaults = {
          minTenure: service.minTenure,
          maxTenure: service.maxTenure,
          defaultTenure: service.defaultTenure,
          minInterestRate: service.minInterestRate,
          maxInterestRate: service.maxInterestRate,
          defaultInterestRate: service.defaultInterestRate,
        };
      }
    }

    return NextResponse.json({
      success: true,
      loan: {
        id: loan.id,
        applicationNo: loan.applicationNo,
        status: loan.status,
        customer: loan.customer,
        company: loan.company,
        principalAmount,
        currentTenure: loan.sessionForm?.tenure || loan.requestedTenure,
        currentInterestRate: loan.sessionForm?.interestRate || loan.interestRate,
        interestType,
        isInterestOnlyLoan: loan.isInterestOnlyLoan,
        totalInterestOnlyPaid: loan.totalInterestOnlyPaid,
      },
      preview: {
        emiAmount: emiCalculation.emi,
        totalInterest: emiCalculation.totalInterest,
        totalAmount: emiCalculation.totalAmount,
        tenure: defaultTenure,
        interestRate: defaultRate,
        principalAmount,
        schedulePreview: emiCalculation.schedule.slice(0, 3) // First 3 EMIs
      },
      productDefaults
    });

  } catch (error) {
    console.error('Preview EMI calculation error:', error);
    return NextResponse.json({ 
      error: 'Failed to calculate EMI preview', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
