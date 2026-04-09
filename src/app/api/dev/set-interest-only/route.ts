import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// This is a dev-only endpoint to fix Interest Only loans that are already disbursed
// It updates the status to ACTIVE_INTEREST_ONLY and creates the first interest EMI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId } = body;

    let targetLoanId = loanId;

    if (!loanId) {
      // Find any Interest Only loan that needs fixing
      const loan = await db.loanApplication.findFirst({
        where: {
          OR: [
            { status: 'DISBURSED', isInterestOnlyLoan: true },
            { status: 'ACTIVE', isInterestOnlyLoan: true },
            { status: 'DISBURSED', loanType: 'INTEREST_ONLY' },
            { status: 'ACTIVE', loanType: 'INTEREST_ONLY' }
          ]
        },
        include: {
          sessionForm: {
            select: { approvedAmount: true, interestRate: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!loan) {
        return NextResponse.json({ 
          success: false,
          message: 'No Interest Only loan found that needs fixing' 
        }, { status: 404 });
      }

      targetLoanId = loan.id;
      
      // Fix the loan
      const result = await fixInterestOnlyLoan(loan);
      return NextResponse.json(result);
    }

    // Fix specific loan
    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      include: {
        sessionForm: {
          select: { approvedAmount: true, interestRate: true }
        }
      }
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    const result = await fixInterestOnlyLoan(loan);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fixing loan:', error);
    return NextResponse.json({ 
      error: 'Failed to fix loan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function fixInterestOnlyLoan(loan: any) {
  const loanId = loan.id;
  
  // Check if already fixed
  if (loan.status === 'ACTIVE_INTEREST_ONLY') {
    // Check if interest EMI exists
    const existingEmi = await db.eMISchedule.findFirst({
      where: {
        loanApplicationId: loanId,
        isInterestOnly: true
      }
    });
    
    if (existingEmi) {
      return {
        success: true,
        message: 'Loan is already properly set up',
        loan: {
          id: loan.id,
          applicationNo: loan.applicationNo,
          status: loan.status,
          hasInterestEmi: true
        },
        interestEmi: {
          id: existingEmi.id,
          installmentNumber: existingEmi.installmentNumber,
          amount: existingEmi.interestAmount,
          dueDate: existingEmi.dueDate,
          status: existingEmi.paymentStatus
        }
      };
    }
  }

  // Calculate interest
  const approvedAmount = loan.sessionForm?.approvedAmount || loan.requestedAmount || 0;
  const interestRate = loan.sessionForm?.interestRate || 12;
  const monthlyInterest = (approvedAmount * interestRate / 100) / 12;

  console.log(`[FIX INTEREST ONLY] Loan: ${loan.applicationNo}`);
  console.log(`[FIX INTEREST ONLY] Principal: ${approvedAmount}, Rate: ${interestRate}%, Monthly Interest: ${monthlyInterest}`);

  // Use transaction to update loan and create EMI
  const result = await db.$transaction(async (tx) => {
    // Update loan status
    const updatedLoan = await tx.loanApplication.update({
      where: { id: loanId },
      data: {
        status: 'ACTIVE_INTEREST_ONLY',
        isInterestOnlyLoan: true,
        interestOnlyStartDate: loan.interestOnlyStartDate || new Date(),
        interestOnlyMonthlyAmount: monthlyInterest
      }
    });

    // Check if interest EMI already exists
    const existingEmi = await tx.eMISchedule.findFirst({
      where: {
        loanApplicationId: loanId,
        isInterestOnly: true
      }
    });

    let interestEmi = existingEmi;

    if (!existingEmi) {
      // Create the first interest EMI
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(5); // Due on 5th of next month
      dueDate.setHours(0, 0, 0, 0);

      interestEmi = await tx.eMISchedule.create({
        data: {
          loanApplicationId: loanId,
          installmentNumber: 1,
          dueDate,
          originalDueDate: dueDate,
          principalAmount: 0,
          interestAmount: monthlyInterest,
          totalAmount: monthlyInterest,
          outstandingPrincipal: approvedAmount,
          outstandingInterest: 0,
          paidAmount: 0,
          paidPrincipal: 0,
          paidInterest: 0,
          paymentStatus: 'PENDING',
          penaltyAmount: 0,
          penaltyPaid: 0,
          daysOverdue: 0,
          isInterestOnly: true,
          interestOnlyAmount: monthlyInterest
        }
      });

      console.log(`[FIX INTEREST ONLY] Created first Interest EMI for loan ${loan.applicationNo}`);
    }

    return { updatedLoan, interestEmi };
  });

  return {
    success: true,
    message: 'Loan fixed successfully! Status updated to ACTIVE_INTEREST_ONLY and interest EMI created.',
    loan: {
      id: result.updatedLoan.id,
      applicationNo: result.updatedLoan.applicationNo,
      status: result.updatedLoan.status,
      isInterestOnlyLoan: result.updatedLoan.isInterestOnlyLoan
    },
    interestEmi: result.interestEmi ? {
      id: result.interestEmi.id,
      installmentNumber: result.interestEmi.installmentNumber,
      amount: result.interestEmi.interestAmount,
      dueDate: result.interestEmi.dueDate,
      status: result.interestEmi.paymentStatus
    } : null
  };
}

// GET - List all Interest Only loans and their status
export async function GET() {
  try {
    const loans = await db.loanApplication.findMany({
      where: {
        OR: [
          { loanType: 'INTEREST_ONLY' },
          { isInterestOnlyLoan: true }
        ]
      },
      select: {
        id: true,
        applicationNo: true,
        status: true,
        loanType: true,
        isInterestOnlyLoan: true,
        requestedAmount: true,
        sessionForm: {
          select: { approvedAmount: true, interestRate: true }
        },
        customer: {
          select: { name: true }
        },
        emiSchedules: {
          where: { isInterestOnly: true },
          select: {
            id: true,
            installmentNumber: true,
            interestAmount: true,
            dueDate: true,
            paymentStatus: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const loansWithStatus = loans.map(loan => ({
      ...loan,
      needsFixing: loan.status !== 'ACTIVE_INTEREST_ONLY' || loan.emiSchedules.length === 0,
      currentStatus: loan.status,
      expectedStatus: 'ACTIVE_INTEREST_ONLY',
      hasInterestEmi: loan.emiSchedules.length > 0
    }));

    return NextResponse.json({
      success: true,
      loans: loansWithStatus
    });
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
}
