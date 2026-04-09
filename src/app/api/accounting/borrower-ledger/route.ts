import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch Borrower Ledger data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || 'all';
    const borrowerId = searchParams.get('borrowerId');

    console.log(`[Borrower Ledger] Fetching data for company: ${companyId}, borrower: ${borrowerId || 'all'}`);

    // If specific borrower requested, get their transactions
    if (borrowerId) {
      return getBorrowerTransactions(borrowerId);
    }

    // Get all customers with loans
    const customers = await db.user.findMany({
      where: {
        role: 'CUSTOMER',
        loanApplications: {
          some: {
            status: { in: ['ACTIVE', 'DISBURSED', 'CLOSED'] }
          }
        }
      },
      include: {
        loanApplications: {
          where: {
            status: { in: ['ACTIVE', 'DISBURSED', 'CLOSED'] },
            ...(companyId !== 'all' && { companyId })
          },
          include: {
            company: { select: { id: true, name: true, code: true } },
            sessionForm: true,
            emiSchedules: true,
            payments: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    const borrowers: any[] = [];

    for (const customer of customers) {
      const activeLoans = customer.loanApplications.filter(l => ['ACTIVE', 'DISBURSED'].includes(l.status));
      if (activeLoans.length === 0) continue;

      const totalBorrowed = customer.loanApplications.reduce((sum, l) => 
        sum + (l.sessionForm?.approvedAmount || l.requestedAmount), 0);

      const totalOutstanding = customer.loanApplications.reduce((sum, loan) => {
        const outstanding = loan.emiSchedules.reduce((s, emi) => {
          if (emi.paymentStatus === 'PAID') return s;
          return s + (emi.totalAmount - emi.paidAmount);
        }, 0);
        return sum + outstanding;
      }, 0);

      const totalPaid = customer.loanApplications.reduce((sum, loan) => 
        sum + loan.payments.reduce((s, p) => s + p.amount, 0), 0);

      const totalInterestPaid = customer.loanApplications.reduce((sum, loan) => 
        sum + loan.payments.reduce((s, p) => s + p.interestComponent, 0), 0);

      // Find next EMI
      let nextEMIDate: Date | null = null;
      let nextEMIAmount = 0;
      for (const loan of activeLoans) {
        const pendingEMI = loan.emiSchedules.find(e => e.paymentStatus === 'PENDING');
        if (pendingEMI) {
          const dueDate = new Date(pendingEMI.dueDate);
          if (!nextEMIDate || dueDate < nextEMIDate) {
            nextEMIDate = dueDate;
            nextEMIAmount = pendingEMI.totalAmount;
          }
        }
      }

      // Check NPA status
      let npaStatus = 'ACTIVE';
      const today = new Date();
      for (const loan of activeLoans) {
        const overdueEMI = loan.emiSchedules.find(e => {
          if (e.paymentStatus === 'PAID') return false;
          const dueDate = new Date(e.dueDate);
          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          return daysOverdue > 90;
        });
        if (overdueEMI) {
          npaStatus = 'NPA';
          break;
        }
      }

      // Build loans array
      const loans = customer.loanApplications.map(loan => ({
        id: loan.id,
        applicationNo: loan.applicationNo,
        loanType: loan.loanType,
        approvedAmount: loan.sessionForm?.approvedAmount || loan.requestedAmount,
        outstandingAmount: loan.emiSchedules.reduce((s, e) => {
          if (e.paymentStatus === 'PAID') return s;
          return s + (e.totalAmount - e.paidAmount);
        }, 0),
        interestRate: loan.sessionForm?.interestRate || 0,
        tenure: loan.sessionForm?.tenure || 0,
        emiAmount: loan.sessionForm?.emiAmount || 0,
        emiPaid: loan.emiSchedules.filter(e => e.paymentStatus === 'PAID').length,
        emiPending: loan.emiSchedules.filter(e => e.paymentStatus !== 'PAID').length,
        status: loan.status,
        companyName: loan.company?.name || 'Unknown',
        disbursementDate: loan.disbursedAt || loan.createdAt,
        lastPaymentDate: loan.payments[0]?.createdAt || null
      }));

      borrowers.push({
        id: customer.id,
        name: customer.name || 'Unknown',
        phone: customer.phone || 'N/A',
        email: customer.email,
        address: customer.address,
        city: customer.city,
        totalLoans: customer.loanApplications.length,
        activeLoans: activeLoans.length,
        totalBorrowed,
        totalOutstanding,
        totalPaid,
        totalInterestPaid,
        nextEMIDate,
        nextEMIAmount,
        creditScore: 0, // TODO: Implement credit score
        npaStatus,
        loans
      });
    }

    // Sort by outstanding amount (highest first)
    borrowers.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    console.log(`[Borrower Ledger] Found ${borrowers.length} borrowers`);

    return NextResponse.json({
      success: true,
      borrowers
    });

  } catch (error) {
    console.error('[Borrower Ledger] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch borrower data',
      details: (error as Error).message
    }, { status: 500 });
  }
}

async function getBorrowerTransactions(borrowerId: string) {
  try {
    const payments = await db.payment.findMany({
      where: {
        customerId: borrowerId
      },
      include: {
        loanApplication: {
          select: { applicationNo: true }
        },
        emiSchedule: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const disbursements = await db.loanApplication.findMany({
      where: {
        customerId: borrowerId,
        status: { in: ['ACTIVE', 'DISBURSED', 'CLOSED'] }
      },
      select: {
        id: true,
        applicationNo: true,
        disbursedAt: true,
        disbursedAmount: true,
        sessionForm: { select: { approvedAmount: true } }
      }
    });

    const transactions: any[] = [];

    // Add disbursements
    for (const loan of disbursements) {
      if (loan.disbursedAt && loan.disbursedAmount) {
        transactions.push({
          id: `disb-${loan.id}`,
          date: loan.disbursedAt,
          type: 'DISBURSEMENT',
          description: `Loan Disbursement - ${loan.applicationNo}`,
          amount: -loan.disbursedAmount,
          principal: -loan.disbursedAmount,
          interest: 0,
          balance: 0
        });
      }
    }

    // Add payments
    for (const payment of payments) {
      transactions.push({
        id: payment.id,
        date: payment.createdAt,
        type: 'PAYMENT',
        description: `EMI Payment - ${payment.loanApplication?.applicationNo || 'N/A'}`,
        amount: payment.amount,
        principal: payment.principalComponent,
        interest: payment.interestComponent,
        balance: 0
      });
    }

    // Sort by date
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('[Borrower Ledger] Error fetching transactions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch transactions'
    }, { status: 500 });
  }
}
