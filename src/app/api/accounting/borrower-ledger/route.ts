import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch Borrower Ledger data (Both Online and Offline Loans)
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

    const borrowers: any[] = [];

    // ============================================
    // 1. GET ONLINE LOAN CUSTOMERS
    // ============================================
    const onlineCustomers = await db.user.findMany({
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

    // Process online loan customers
    for (const customer of onlineCustomers) {
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
        loanMode: 'ONLINE' as const,
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
        creditScore: 0,
        npaStatus,
        loans
      });
    }

    // ============================================
    // 2. GET OFFLINE LOAN CUSTOMERS
    // ============================================
    const offlineLoanWhereClause: any = {
      status: { in: ['ACTIVE', 'INTEREST_ONLY', 'CLOSED'] }
    };
    if (companyId !== 'all') {
      offlineLoanWhereClause.companyId = companyId;
    }

    const offlineLoans = await db.offlineLoan.findMany({
      where: offlineLoanWhereClause,
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true, address: true, city: true }
        },
        company: { select: { id: true, name: true, code: true } },
        emis: {
          orderBy: { dueDate: 'asc' }
        }
      }
    });

    // Group offline loans by customer
    const offlineLoansByCustomer = new Map<string, any[]>();
    for (const loan of offlineLoans) {
      const customerId = loan.customerId;
      if (!customerId) continue; // Skip loans without customer
      if (!offlineLoansByCustomer.has(customerId)) {
        offlineLoansByCustomer.set(customerId, []);
      }
      offlineLoansByCustomer.get(customerId)!.push(loan);
    }

    // Process offline loan customers
    for (const [customerId, loans] of offlineLoansByCustomer) {
      // Check if this customer already exists in borrowers (from online loans)
      const existingBorrower = borrowers.find(b => b.id === customerId);
      
      const activeLoans = loans.filter(l => ['ACTIVE', 'INTEREST_ONLY'].includes(l.status));
      const totalBorrowed = loans.reduce((sum, l) => sum + l.loanAmount, 0);
      
      const totalOutstanding = loans.reduce((sum, loan) => {
        const outstanding = loan.emis.reduce((s, emi) => {
          if (emi.paymentStatus === 'PAID') return s;
          return s + (emi.totalAmount - emi.paidAmount);
        }, 0);
        return sum + outstanding;
      }, 0);

      const totalPaid = loans.reduce((sum, loan) => 
        sum + loan.emis.reduce((s, e) => s + e.paidAmount, 0), 0);

      const totalInterestPaid = loans.reduce((sum, loan) => 
        sum + loan.emis.reduce((s, e) => s + e.paidInterest, 0), 0);

      // Find next EMI
      let nextEMIDate: Date | null = null;
      let nextEMIAmount = 0;
      for (const loan of activeLoans) {
        const pendingEMI = loan.emis.find(e => e.paymentStatus === 'PENDING');
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
        const overdueEMI = loan.emis.find(e => {
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

      // Build offline loans array
      const offlineLoansData = loans.map(loan => ({
        id: loan.id,
        applicationNo: loan.loanNumber,
        loanType: loan.loanType,
        loanMode: 'OFFLINE' as const,
        approvedAmount: loan.loanAmount,
        outstandingAmount: loan.emis.reduce((s, e) => {
          if (e.paymentStatus === 'PAID') return s;
          return s + (e.totalAmount - e.paidAmount);
        }, 0),
        interestRate: loan.interestRate || 0,
        tenure: loan.tenure || 0,
        emiAmount: loan.emiAmount || 0,
        emiPaid: loan.emis.filter(e => e.paymentStatus === 'PAID').length,
        emiPending: loan.emis.filter(e => e.paymentStatus !== 'PAID').length,
        status: loan.status,
        companyName: loan.company?.name || 'Unknown',
        disbursementDate: loan.disbursementDate || loan.createdAt,
        lastPaymentDate: loan.emis.filter(e => e.paymentStatus === 'PAID')[0]?.paidDate || null
      }));

      if (existingBorrower) {
        // Merge offline loans with existing online loans
        existingBorrower.loans.push(...offlineLoansData);
        existingBorrower.totalLoans += loans.length;
        existingBorrower.activeLoans += activeLoans.length;
        existingBorrower.totalBorrowed += totalBorrowed;
        existingBorrower.totalOutstanding += totalOutstanding;
        existingBorrower.totalPaid += totalPaid;
        existingBorrower.totalInterestPaid += totalInterestPaid;
        
        // Update next EMI if earlier
        if (nextEMIDate && (!existingBorrower.nextEMIDate || nextEMIDate < new Date(existingBorrower.nextEMIDate))) {
          existingBorrower.nextEMIDate = nextEMIDate;
          existingBorrower.nextEMIAmount = nextEMIAmount;
        }
        
        // Update NPA status
        if (npaStatus === 'NPA') {
          existingBorrower.npaStatus = 'NPA';
        }
      } else {
        // Add new borrower with offline loans only
        const customer = loans[0].customer;
        borrowers.push({
          id: customerId,
          name: customer?.name || 'Unknown',
          phone: customer?.phone || 'N/A',
          email: customer?.email,
          address: customer?.address,
          city: customer?.city,
          totalLoans: loans.length,
          activeLoans: activeLoans.length,
          totalBorrowed,
          totalOutstanding,
          totalPaid,
          totalInterestPaid,
          nextEMIDate,
          nextEMIAmount,
          creditScore: 0,
          npaStatus,
          loans: offlineLoansData
        });
      }
    }

    // Sort by outstanding amount (highest first)
    borrowers.sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    console.log(`[Borrower Ledger] Found ${borrowers.length} borrowers (online + offline)`);

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
    const transactions: any[] = [];

    // ============================================
    // 1. GET ONLINE LOAN TRANSACTIONS
    // ============================================
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

    // Add online disbursements
    for (const loan of disbursements) {
      if (loan.disbursedAt && loan.disbursedAmount) {
        transactions.push({
          id: `online-disb-${loan.id}`,
          date: loan.disbursedAt,
          type: 'DISBURSEMENT',
          loanType: 'ONLINE',
          description: `Loan Disbursement (Online) - ${loan.applicationNo}`,
          amount: -loan.disbursedAmount,
          principal: -loan.disbursedAmount,
          interest: 0,
          balance: 0
        });
      }
    }

    // Add online payments
    for (const payment of payments) {
      transactions.push({
        id: payment.id,
        date: payment.createdAt,
        type: 'PAYMENT',
        loanType: 'ONLINE',
        description: `EMI Payment (Online) - ${payment.loanApplication?.applicationNo || 'N/A'}`,
        amount: payment.amount,
        principal: payment.principalComponent,
        interest: payment.interestComponent,
        penalty: payment.penaltyComponent,
        balance: 0
      });
    }

    // ============================================
    // 2. GET OFFLINE LOAN TRANSACTIONS
    // ============================================
    const offlineLoans = await db.offlineLoan.findMany({
      where: {
        customerId: borrowerId,
        status: { in: ['ACTIVE', 'INTEREST_ONLY', 'CLOSED'] }
      },
      include: {
        emis: {
          where: {
            paymentStatus: { in: ['PAID', 'PARTIALLY_PAID'] }
          },
          orderBy: { paidDate: 'desc' }
        }
      }
    });

    // Add offline disbursements
    for (const loan of offlineLoans) {
      if (loan.disbursementDate) {
        transactions.push({
          id: `offline-disb-${loan.id}`,
          date: loan.disbursementDate,
          type: 'DISBURSEMENT',
          loanType: 'OFFLINE',
          description: `Loan Disbursement (Offline) - ${loan.loanNumber}`,
          amount: -loan.loanAmount,
          principal: -loan.loanAmount,
          interest: 0,
          balance: 0
        });
      }
    }

    // Add offline EMI payments
    for (const loan of offlineLoans) {
      for (const emi of loan.emis) {
        if (emi.paidAmount > 0 && emi.paidDate) {
          transactions.push({
            id: `offline-emi-${emi.id}`,
            date: emi.paidDate,
            type: 'PAYMENT',
            loanType: 'OFFLINE',
            description: `EMI Payment (Offline) - ${loan.loanNumber} - EMI #${emi.installmentNumber}`,
            amount: emi.paidAmount,
            principal: emi.paidPrincipal,
            interest: emi.paidInterest,
            penalty: emi.penaltyPaid,
            balance: 0
          });
        }
      }
    }

    // Sort by date (newest first)
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
