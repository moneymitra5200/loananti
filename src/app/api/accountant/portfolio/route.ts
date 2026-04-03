import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Loan portfolio summary for a company
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get active loans for company with EMI schedules
    const loans = await db.loanApplication.findMany({
      where: {
        companyId,
        status: { in: ['ACTIVE', 'DISBURSED'] }
      },
      select: {
        id: true,
        loanAmount: true,
        disbursedAmount: true,
        interestRate: true,
        emiSchedules: {
          select: {
            totalAmount: true,
            paidAmount: true,
            principalAmount: true,
            interestAmount: true
          }
        }
      }
    });

    // Get offline loans
    const offlineLoans = await db.offlineLoan.findMany({
      where: {
        companyId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        loanAmount: true,
        interestRate: true,
        emis: {
          select: {
            totalAmount: true,
            paidAmount: true
          }
        }
      }
    });

    // Calculate totals
    const totalLoans = loans.length + offlineLoans.length;
    
    const totalDisbursed = loans.reduce((sum, l) => 
      sum + (l.disbursedAmount || l.loanAmount || 0), 0) + 
      offlineLoans.reduce((sum, l) => sum + (l.loanAmount || 0), 0);

    const totalOutstanding = loans.reduce((sum, loan) => {
      const outstanding = loan.emiSchedules.reduce((emiSum, emi) => 
        emiSum + (emi.totalAmount - emi.paidAmount), 0);
      return sum + outstanding;
    }, 0) + offlineLoans.reduce((sum, loan) => {
      const outstanding = loan.emis.reduce((emiSum, emi) => 
        emiSum + (emi.totalAmount - emi.paidAmount), 0);
      return sum + outstanding;
    }, 0);

    const totalInterestEarned = loans.reduce((sum, loan) => {
      const interest = loan.emiSchedules.reduce((emiSum, emi) => 
        emiSum + emi.interestAmount, 0);
      return sum + interest;
    }, 0);

    const totalPrincipalCollected = loans.reduce((sum, loan) => {
      const collected = loan.emiSchedules.reduce((emiSum, emi) => 
        emiSum + emi.paidAmount, 0);
      return sum + collected;
    }, 0) + offlineLoans.reduce((sum, loan) => {
      const collected = loan.emis.reduce((emiSum, emi) => 
        emiSum + emi.paidAmount, 0);
      return sum + collected;
    }, 0);

    // Calculate NPA (loans overdue by 90+ days)
    const npaLoans = await db.eMISchedule.findMany({
      where: {
        loanApplication: { companyId },
        paymentStatus: 'OVERDUE',
        dueDate: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      },
      select: {
        principalAmount: true,
        interestAmount: true
      }
    });

    const npaAmount = npaLoans.reduce((sum, e) => 
      sum + (e.principalAmount || 0) + (e.interestAmount || 0), 0);

    return NextResponse.json({
      totalLoans,
      totalDisbursed,
      totalOutstanding,
      totalInterestEarned,
      totalPrincipalCollected,
      npaCount: npaLoans.length,
      npaAmount
    });

  } catch (error) {
    console.error('Portfolio error:', error);
    return NextResponse.json({ 
      error: 'Failed to get portfolio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
