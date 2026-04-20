import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateEMI } from '@/utils/helpers';

// Local type definitions - Prisma schema uses strings, not enums
type EMIPaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID' | 'INTEREST_ONLY_PAID' | 'WAIVED';

// POST - Start an offline loan (convert from interest-only to normal EMI)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, tenure, interestRate, interestType, startedBy } = body;

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

    // Get the offline loan
    const loan = await db.offlineLoan.findUnique({
      where: { id: loanId },
      include: {
        company: { select: { id: true, name: true, code: true } }
      }
    });

    if (!loan) {
      return NextResponse.json({ error: 'Offline loan not found' }, { status: 404 });
    }

    // Check if loan is in INTEREST_ONLY status
    if (loan.status !== 'INTEREST_ONLY') {
      return NextResponse.json({ 
        error: 'Loan must be in INTEREST_ONLY status to start. Current status: ' + loan.status 
      }, { status: 400 });
    }

    const principalAmount = loan.loanAmount;

    if (!principalAmount || principalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid principal amount' }, { status: 400 });
    }

    // Determine interest type (default to FLAT)
    const actualInterestType: 'FLAT' | 'REDUCING' = (
      interestType === 'REDUCING' ? 'REDUCING' : 
      (loan.interestType === 'REDUCING' ? 'REDUCING' : 'FLAT')
    ) as 'FLAT' | 'REDUCING';

    // Calculate EMI using the helper function
    const emiCalculation = calculateEMI(
      principalAmount,
      interestRate,
      tenure,
      actualInterestType,
      new Date()
    );

    const emiAmount = emiCalculation.emi;

    console.log(`[Start Offline Loan] Loan: ${loan.loanNumber}`);
    console.log(`[Start Offline Loan] Principal: ${principalAmount}, Rate: ${interestRate}%, Tenure: ${tenure} months, Type: ${actualInterestType}`);
    console.log(`[Start Offline Loan] EMI: ${emiAmount}`);

    // Start a transaction to update loan and create EMI schedules
    const result = await db.$transaction(async (tx) => {
      // Delete any existing EMI schedules (from interest-only phase)
      await tx.offlineLoanEMI.deleteMany({
        where: { offlineLoanId: loanId }
      });

      // Create new EMI schedules with proper due dates (5th of each month)
      const emis = emiCalculation.schedule.map((item, index) => {
        // Set due date to 5th of each month (same as online loan)
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

      await tx.offlineLoanEMI.createMany({
        data: emis as any
      });

      // Update loan status and details
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

      // Create action log
      await tx.actionLog.create({
        data: {
          userId: startedBy || 'system',
          userRole: 'SYSTEM',
          actionType: 'UPDATE',
          module: 'OFFLINE_LOAN',
          recordId: loanId,
          recordType: 'OfflineLoan',
          newData: JSON.stringify({
            action: 'LOAN_STARTED',
            tenure,
            interestRate,
            interestType: actualInterestType,
            emiAmount
          }),
          description: `Offline loan ${loan.loanNumber} started with tenure: ${tenure} months, interest rate: ${interestRate}%, type: ${actualInterestType}`,
          canUndo: false
        }
      });

      return { updatedLoan, emis };
    });

    console.log(`[Start Offline Loan] Successfully started loan ${loan.loanNumber}`);
    console.log(`[Start Offline Loan] Created ${result.emis.length} EMI schedules`);

    return NextResponse.json({
      success: true,
      loan: result.updatedLoan,
      emiDetails: {
        emiAmount,
        totalInterest: emiCalculation.totalInterest,
        totalAmount: emiCalculation.totalAmount,
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
    return NextResponse.json({ 
      error: 'Failed to start loan', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// GET - Preview EMI calculation for starting offline loan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    const tenure = parseInt(searchParams.get('tenure') || '0');
    const interestRate = parseFloat(searchParams.get('interestRate') || '0');
    const interestTypeParam = searchParams.get('interestType');

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    // Get the offline loan
    const loan = await db.offlineLoan.findUnique({
      where: { id: loanId },
      include: {
        company: { select: { id: true, name: true, code: true } }
      }
    });

    if (!loan) {
      return NextResponse.json({ error: 'Offline loan not found' }, { status: 404 });
    }

    const principalAmount = loan.loanAmount;

    // Get default values if not provided
    const defaultTenure = tenure || loan.tenure || 12;
    const defaultRate = interestRate || loan.interestRate || 12;
    const actualInterestType: 'FLAT' | 'REDUCING' = (
      interestTypeParam === 'REDUCING' ? 'REDUCING' : 
      (loan.interestType === 'REDUCING' ? 'REDUCING' : 'FLAT')
    ) as 'FLAT' | 'REDUCING';

    // Calculate EMI preview using the helper function
    const emiCalculation = calculateEMI(
      principalAmount,
      defaultRate,
      defaultTenure,
      actualInterestType,
      new Date()
    );

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
        emiAmount: emiCalculation.emi,
        totalInterest: emiCalculation.totalInterest,
        totalAmount: emiCalculation.totalAmount,
        tenure: defaultTenure,
        interestRate: defaultRate,
        interestType: actualInterestType,
        principalAmount,
        schedulePreview: emiCalculation.schedule.slice(0, 3)
      }
    });

  } catch (error) {
    console.error('Preview EMI calculation error:', error);
    return NextResponse.json({ 
      error: 'Failed to calculate EMI preview', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
