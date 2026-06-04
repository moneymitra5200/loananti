import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateEMI } from '@/utils/helpers';
import { calculateMirrorLoan } from '@/lib/mirror-loan';
// ACID: retry on deadlock
import { withRetry } from '@/lib/db-utils';
import { AccountingService } from '@/lib/accounting-service';
import { recordBankTransaction, recordCashBookEntry } from '@/lib/simple-accounting';

// POST - Start a loan (convert from interest-only to normal EMI)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      loanId, 
      tenure, 
      interestRate, 
      startedBy,
      processingFee,
      bankAccountId,
      secondaryPaymentPageId
    } = body;

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
      // Delete only PENDING EMI schedules (from interest-only phase) to avoid FK constraint violations
      await tx.eMISchedule.deleteMany({
        where: { loanApplicationId: loanId, paymentStatus: 'PENDING' }
      });

      // Find the highest installment number to start the new amortizing EMIs after
      const lastEmi = await tx.eMISchedule.findFirst({
        where: { loanApplicationId: loanId },
        orderBy: { installmentNumber: 'desc' }
      });
      const startingInstallmentOffset = lastEmi ? lastEmi.installmentNumber : 0;

      const startDay = loan.disbursedAt ? new Date(loan.disbursedAt).getDate() : (loan.interestOnlyStartDate ? new Date(loan.interestOnlyStartDate).getDate() : new Date().getDate());

      // Create new EMI schedules
      const emiSchedules = emiCalculation.schedule.map((item, index) => {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + index + 1);
        dueDate.setDate(startDay);
        dueDate.setHours(0, 0, 0, 0);

        return {
          loanApplicationId: loanId,
          installmentNumber: startingInstallmentOffset + item.installmentNumber,
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
          isInterestOnlyLoan: false,
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

    // ── Record processing fee for online loan (Phase 2 startup) ──────────────────
    const mirrorMappingForPF = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId, isOfflineLoan: false }
    });

    const parsedProcessingFee = parseFloat(processingFee) || 0;
    // ONLY record if NOT a mirror loan. Mirror loans handle PF dynamically on EMI #1.
    if (parsedProcessingFee > 0 && loan.companyId && !mirrorMappingForPF) {
      try {
        const pfPaymentMode = (bankAccountId && !bankAccountId.startsWith('cash_')) ? 'BANK_TRANSFER' : 'CASH';
        const pfBankId = (bankAccountId && !bankAccountId.startsWith('cash_')) ? bankAccountId : undefined;

        // Bank credit for processing fee
        if (pfPaymentMode === 'BANK_TRANSFER' && pfBankId) {
          await recordBankTransaction({
            companyId: loan.companyId,
            bankAccountId: pfBankId,
            transactionType: 'CREDIT',
            amount: parsedProcessingFee,
            description: `Processing Fee - ${loan.applicationNo}`,
            referenceType: 'PROCESSING_FEE',
            referenceId: loanId,
            createdById: startedBy || 'system',
          });
        } else {
          // Cash credit
          await recordCashBookEntry({
            companyId: loan.companyId,
            entryType: 'CREDIT',
            amount: parsedProcessingFee,
            description: `Processing Fee - ${loan.applicationNo}`,
            referenceType: 'PROCESSING_FEE',
            referenceId: loanId,
            createdById: startedBy || 'system',
          });
        }

        // Accounting journal entry for processing fee
        const accountingService = new AccountingService(loan.companyId);
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

        // Update the mirror mapping to mark it recorded
        await db.mirrorLoanMapping.updateMany({
          where: { originalLoanId: loanId, isOfflineLoan: false },
          data: { processingFeeRecorded: true, mirrorProcessingFee: parsedProcessingFee }
        });
        
        console.log(`[Start Loan] ✅ Processing fee ₹${parsedProcessingFee} recorded for ${loan.applicationNo}`);
      } catch (pfErr) {
        console.error('[Start Loan] Processing fee recording failed (non-fatal):', pfErr);
      }
    }

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

        // Calculate mirror loan using proper extraction
        const mirrorCalc = calculateMirrorLoan(
          principal,
          interestRate,
          tenure,
          (loan.sessionForm?.interestType as 'FLAT' | 'REDUCING') || 'FLAT',
          mirrorRate,
          mirrorType
        );

        // shiftedSchedule: last (smallest) EMI moved to position 1
        const shiftedSchedule = mirrorCalc.shiftedSchedule;
        const autoProcessingFee = mirrorCalc.processingFee; // originalEMI - lastMirrorEMI
        const actualMirrorTenure = mirrorCalc.mirrorLoan.schedule.length;

        // Delete mirror's pending IO placeholder EMIs to avoid FK constraints on paid EMIs
        await db.eMISchedule.deleteMany({ where: { loanApplicationId: mirrorMapping.mirrorLoanId, paymentStatus: 'PENDING' } });

        // Find the highest installment number to start the new amortizing EMIs after
        const lastMirrorEmi = await db.eMISchedule.findFirst({
          where: { loanApplicationId: mirrorMapping.mirrorLoanId },
          orderBy: { installmentNumber: 'desc' }
        });
        const startingMirrorOffset = lastMirrorEmi ? lastMirrorEmi.installmentNumber : 0;

        // Build mirror's SHIFTED amortizing schedule (last EMI → first position)
        const mirrorSchedule = shiftedSchedule.map((item, index) => {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + index + 1);
          dueDate.setDate(startDay);
          dueDate.setHours(0, 0, 0, 0);
          return {
            loanApplicationId: mirrorMapping.mirrorLoanId!,
            installmentNumber: startingMirrorOffset + item.installmentNumber,
            dueDate,
            originalDueDate: dueDate,
            principalAmount: item.principal,
            interestAmount: item.interest,
            totalAmount: item.emi,
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
          data: { 
            status: 'ACTIVE', 
            tenure: actualMirrorTenure, 
            interestRate: mirrorRate, 
            emiAmount: mirrorCalc.mirrorLoan.emiAmount, 
            loanStartedAt: new Date() 
          }
        });

        // Update session form if exists
        if (mirrorLoan.sessionForm) {
          await db.sessionForm.update({
            where: { loanApplicationId: mirrorMapping.mirrorLoanId! },
            data: { 
              tenure: actualMirrorTenure, 
              interestRate: mirrorRate, 
              interestType: mirrorType,
              emiAmount: mirrorCalc.mirrorLoan.emiAmount, 
              totalInterest: mirrorCalc.mirrorLoan.totalInterest, 
              totalAmount: mirrorCalc.mirrorLoan.totalAmount 
            }
          });
        }

        // Update mapping
        await db.mirrorLoanMapping.update({
          where: { id: mirrorMapping.id },
          data: { 
            mirrorTenure: actualMirrorTenure, 
            originalTenure: tenure,
            mirrorProcessingFee: autoProcessingFee,
            processingFeeRecorded: false,
          }
        });

        // Note: No journal entry for disbursement is needed here because the loan 
        // was already disbursed when it was created in Phase 1 (INTEREST_ONLY).

        console.log(`[Mirror Start Online] ✅ ${mirrorLoan.applicationNo} activated | ${mirrorRate}% ${mirrorType} | EMI ₹${mirrorCalc.mirrorLoan.emiAmount} × ${actualMirrorTenure}mo | shifted schedule | PF ₹${autoProcessingFee}`);
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

    // Calculate processing fee from mirror mapping if it exists
    let processingFeePreview = 0;
    let mirrorRateUsed = 0;
    try {
      const mirrorMapping = await db.mirrorLoanMapping.findFirst({
        where: { originalLoanId: loanId, isOfflineLoan: false }
      });
      if (mirrorMapping) {
        const mirrorRate = mirrorMapping.mirrorInterestRate || defaultRate;
        const mirrorType = (mirrorMapping.mirrorInterestType || 'REDUCING') as 'FLAT' | 'REDUCING';
        mirrorRateUsed = mirrorRate;
        const mirrorCalc = calculateMirrorLoan(
          principalAmount, defaultRate, defaultTenure, interestType, mirrorRate, mirrorType
        );
        processingFeePreview = mirrorCalc.processingFee;
      }
    } catch { /* non-fatal — no mirror mapping */ }

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
        interestType,
        principalAmount,
        processingFee: processingFeePreview,
        mirrorRate: mirrorRateUsed,
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
