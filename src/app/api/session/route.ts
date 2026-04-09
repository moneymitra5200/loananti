import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateEMI } from '@/utils/helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanApplicationId, agentId, approvedAmount, interestRate, tenure, interestType, specialConditions } = body;

    if (!loanApplicationId || !agentId || !approvedAmount || !interestRate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if loan exists and is in correct status
    const loan = await db.loanApplication.findUnique({
      where: { id: loanApplicationId }
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan application not found' }, { status: 404 });
    }

    if (loan.status !== 'LOAN_FORM_COMPLETED') {
      return NextResponse.json(
        { error: 'Loan must be in LOAN_FORM_COMPLETED status to create session' },
        { status: 400 }
      );
    }

    // Check if session already exists
    const existingSession = await db.sessionForm.findUnique({
      where: { loanApplicationId }
    });

    if (existingSession) {
      return NextResponse.json(
        { error: 'Session already exists for this loan' },
        { status: 400 }
      );
    }

    // Check if this is an INTEREST_ONLY loan
    const isInterestOnlyLoan = loan.loanType === 'INTEREST_ONLY' || loan.isInterestOnlyLoan;

    // Get processing fee from loan product
    const product = await db.cMSService.findFirst({
      where: { loanType: loan.loanType }
    });

    const processingFeePercent = product?.processingFeePercent || 1;
    const processingFeeMin = product?.processingFeeMin || 500;
    const processingFeeMax = product?.processingFeeMax || 10000;
    
    // Check if this loan has a mirror mapping — if so processing fee = 0
    // (the fee is auto-calculated as originalEMI - mirrorLastEMI and tracked in MirrorLoanMapping)
    const existingMirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanApplicationId }
    });
    
    // Calculate processing fee (percentage of approved amount, with min/max limits)
    // For mirror loans: always 0 — fee is tracked in MirrorLoanMapping separately
    let processingFee = existingMirrorMapping
      ? 0
      : (approvedAmount * processingFeePercent) / 100;
    if (!existingMirrorMapping) {
      processingFee = Math.max(processingFeeMin, Math.min(processingFeeMax, processingFee));
    }

    // For INTEREST_ONLY loans: only calculate monthly interest
    // For regular loans: calculate full EMI
    let emiAmount: number;
    let totalInterest: number;
    let totalAmount: number;
    let emiSchedule: any[] = [];
    
    if (isInterestOnlyLoan) {
      // INTEREST_ONLY: Only monthly interest, no principal EMI
      const monthlyInterest = (approvedAmount * interestRate / 100) / 12;
      emiAmount = monthlyInterest;
      totalInterest = 0; // Will be calculated when loan starts
      totalAmount = approvedAmount; // Principal stays same until loan starts
      
      console.log(`[Session] INTEREST_ONLY loan: Monthly Interest = ${monthlyInterest}`);
    } else {
      // Regular loan: Calculate EMI
      if (!tenure) {
        return NextResponse.json(
          { error: 'Tenure is required for regular loans' },
          { status: 400 }
        );
      }
      
      const emiCalculation = calculateEMI(approvedAmount, interestRate, tenure, interestType || 'FLAT');
      emiAmount = emiCalculation.emi;
      totalInterest = emiCalculation.totalInterest;
      totalAmount = emiCalculation.totalAmount;
      emiSchedule = emiCalculation.schedule;
    }

    // Create session form
    const session = await db.sessionForm.create({
      data: {
        loanApplicationId,
        agentId,
        approvedAmount,
        interestRate,
        tenure: isInterestOnlyLoan ? (tenure || 0) : tenure, // Tenure optional for INTEREST_ONLY
        interestType: interestType || 'FLAT',
        emiFrequency: 'MONTHLY',
        processingFee,
        processingFeeType: 'FLAT',
        emiAmount,
        totalInterest,
        totalAmount,
        moratoriumPeriod: 0,
        latePaymentPenalty: product?.latePaymentPenaltyPercent || 2,
        bounceCharges: product?.bounceCharges || 500,
        specialConditions,
        requestedAmount: loan.requestedAmount,
        requestedTenure: loan.requestedTenure,
        requestedInterestRate: loan.requestedInterestRate
      }
    });

    // For mirror loans: update the MirrorLoanMapping with the auto-calculated processing fee
    // processingFee = originalEMI - lastMirrorEMI (e.g. 1200 - 1014.2 = 185.8)
    if (existingMirrorMapping && !isInterestOnlyLoan) {
      try {
        const { calculateMirrorLoan } = await import('@/lib/mirror-loan');
        const calc = calculateMirrorLoan(
          approvedAmount,
          interestRate,
          tenure || 10,
          (interestType || 'FLAT') as 'FLAT' | 'REDUCING',
          existingMirrorMapping.mirrorInterestRate,
          existingMirrorMapping.mirrorInterestType as 'FLAT' | 'REDUCING'
        );
        if (calc.processingFee > 0) {
          await db.mirrorLoanMapping.update({
            where: { id: existingMirrorMapping.id },
            data: {
              mirrorProcessingFee: calc.processingFee,
              processingFeeRecorded: false
            }
          });
          console.log(`[Session] Mirror processing fee set: ₹${calc.processingFee} for loan ${loanApplicationId}`);
        }
      } catch (mpfErr) {
        console.warn('[Session] Could not update mirrorProcessingFee (non-critical):', mpfErr);
      }
    }

    // Update loan status
    await db.loanApplication.update({
      where: { id: loanApplicationId },
      data: {
        status: 'SESSION_CREATED',
        sessionCreatedAt: new Date(),
        currentStage: 'CUSTOMER_APPROVAL',
        // Set interest-only specific fields
        ...(isInterestOnlyLoan && {
          isInterestOnlyLoan: true,
          interestOnlyMonthlyAmount: emiAmount
        })
      }
    });

    // Create workflow log
    await db.workflowLog.create({
      data: {
        loanApplicationId,
        actionById: agentId,
        previousStatus: 'LOAN_FORM_COMPLETED',
        newStatus: 'SESSION_CREATED',
        action: 'create_session',
        remarks: isInterestOnlyLoan 
          ? 'Interest-only loan session created by agent' 
          : 'Loan session created by agent'
      }
    });

    return NextResponse.json({
      success: true,
      session: {
        ...session,
        emiSchedule,
        isInterestOnlyLoan
      }
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    const session = await db.sessionForm.findUnique({
      where: { loanApplicationId: loanId },
      include: {
        agent: { select: { id: true, name: true, agentCode: true } }
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Get loan to check if INTEREST_ONLY
    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      select: { loanType: true, isInterestOnlyLoan: true }
    });

    const isInterestOnlyLoan = loan?.loanType === 'INTEREST_ONLY' || loan?.isInterestOnlyLoan;

    // For INTEREST_ONLY loans, no EMI schedule
    if (isInterestOnlyLoan) {
      return NextResponse.json({
        session,
        emiSchedule: [],
        isInterestOnlyLoan: true,
        monthlyInterest: session.emiAmount // This is the monthly interest amount
      });
    }

    // For regular loans: Get EMI schedule - pass interest type for correct calculation
    const emiCalculation = calculateEMI(
      session.approvedAmount,
      session.interestRate,
      session.tenure,
      session.interestType as 'FLAT' | 'REDUCING' || 'FLAT'
    );

    return NextResponse.json({
      session,
      emiSchedule: emiCalculation.schedule,
      isInterestOnlyLoan: false
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanApplicationId, customerApproved, customerSignature, rejected, rejectionReason } = body;

    if (!loanApplicationId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    const session = await db.sessionForm.findUnique({
      where: { loanApplicationId }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (customerApproved) {
      const updated = await db.sessionForm.update({
        where: { loanApplicationId },
        data: {
          customerApproved: true,
          customerApprovedAt: new Date(),
          customerSignature,
          customerSignatureHash: customerSignature ? Buffer.from(customerSignature).toString('base64') : null
        }
      });

      await db.loanApplication.update({
        where: { id: loanApplicationId },
        data: {
          status: 'CUSTOMER_SESSION_APPROVED',
          customerApprovedAt: new Date()
        }
      });

      return NextResponse.json({ success: true, session: updated });
    }

    if (rejected) {
      const updated = await db.sessionForm.update({
        where: { loanApplicationId },
        data: {
          rejected: true,
          rejectedAt: new Date(),
          rejectionReason
        }
      });

      await db.loanApplication.update({
        where: { id: loanApplicationId },
        data: { status: 'SESSION_REJECTED' }
      });

      return NextResponse.json({ success: true, session: updated });
    }

    return NextResponse.json({ error: 'No action specified' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
