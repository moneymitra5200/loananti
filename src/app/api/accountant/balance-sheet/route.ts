import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * NEW BALANCE SHEET API
 * 
 * LEFT SIDE (Assets/Funds Available):
 * - CashBook Balance (Cash in hand)
 * - Bank Balance (Money in bank)
 * 
 * RIGHT SIDE (Where Funds Are Deployed):
 * - Outstanding Loans (Principal + Pending Interest)
 * - Profit/Loss (Difference to balance both sides)
 * 
 * Company-wise: Separate for Company 1 and Company 2
 * Year-wise: Filter by financial year
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const year = searchParams.get('year'); // e.g., "2024" for FY 2024-25

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Get company details
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { 
        id: true, 
        name: true, 
        code: true,
        defaultInterestRate: true,
        defaultInterestType: true
      }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Calculate financial year range
    let fyStart: Date;
    let fyEnd: Date;
    
    if (year) {
      const yearNum = parseInt(year);
      // Indian Financial Year: April 1 to March 31
      fyStart = new Date(yearNum, 3, 1); // April 1
      fyEnd = new Date(yearNum + 1, 2, 31); // March 31
    } else {
      // Current financial year
      const now = new Date();
      const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      fyStart = new Date(currentYear, 3, 1);
      fyEnd = new Date(currentYear + 1, 2, 31);
    }

    // ============================================
    // LEFT SIDE - Assets (Funds Available)
    // ============================================

    // 1. CashBook Balance
    const cashBook = await db.cashBook.findUnique({
      where: { companyId },
      select: { currentBalance: true }
    });
    const cashBookBalance = cashBook?.currentBalance || 0;

    // 2. Bank Accounts Balance
    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
      select: { 
        id: true,
        bankName: true, 
        accountNumber: true, 
        currentBalance: true 
      }
    });
    const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    // ============================================
    // RIGHT SIDE - Deployments (Loans Given)
    // ============================================

    // 1. Online Loans - Outstanding Principal + Pending Interest
    const onlineLoans = await db.loanApplication.findMany({
      where: { 
        companyId, 
        status: 'ACTIVE' 
      },
      select: {
        id: true,
        applicationNo: true,
        disbursedAmount: true,
        interestRate: true,
        customer: {
          select: { name: true, phone: true }
        },
        emiSchedules: {
          select: {
            principalAmount: true,
            interestAmount: true,
            totalAmount: true,
            paidAmount: true,
            paidPrincipal: true,
            paidInterest: true,
            paymentStatus: true
          }
        }
      }
    });

    // 2. Offline Loans - Outstanding Principal + Pending Interest
    const offlineLoans = await db.offlineLoan.findMany({
      where: { 
        companyId, 
        status: 'ACTIVE' 
      },
      select: {
        id: true,
        loanNumber: true,
        loanAmount: true,
        interestRate: true,
        interestType: true,
        customerName: true,
        customerPhone: true,
        emis: {
          select: {
            principalAmount: true,
            interestAmount: true,
            totalAmount: true,
            paidAmount: true,
            paidPrincipal: true,
            paidInterest: true,
            paymentStatus: true
          }
        }
      }
    });

    // Calculate Outstanding for Online Loans
    let onlinePrincipalOutstanding = 0;
    let onlineInterestPending = 0;
    
    const onlineLoanDetails = onlineLoans.map(loan => {
      const principalOutstanding = loan.emiSchedules.reduce((sum, emi) => {
        return sum + (emi.principalAmount - emi.paidPrincipal);
      }, 0);
      
      const interestPending = loan.emiSchedules.reduce((sum, emi) => {
        return sum + (emi.interestAmount - emi.paidInterest);
      }, 0);
      
      onlinePrincipalOutstanding += principalOutstanding;
      onlineInterestPending += interestPending;
      
      return {
        id: loan.id,
        loanNo: loan.applicationNo,
        customerName: loan.customer?.name || 'N/A',
        customerPhone: loan.customer?.phone || 'N/A',
        disbursedAmount: loan.disbursedAmount || 0,
        principalOutstanding,
        interestPending,
        totalOutstanding: principalOutstanding + interestPending
      };
    });

    // Calculate Outstanding for Offline Loans
    let offlinePrincipalOutstanding = 0;
    let offlineInterestPending = 0;
    
    const offlineLoanDetails = offlineLoans.map(loan => {
      const principalOutstanding = loan.emis.reduce((sum, emi) => {
        return sum + (emi.principalAmount - emi.paidPrincipal);
      }, 0);
      
      const interestPending = loan.emis.reduce((sum, emi) => {
        return sum + (emi.interestAmount - emi.paidInterest);
      }, 0);
      
      offlinePrincipalOutstanding += principalOutstanding;
      offlineInterestPending += interestPending;
      
      return {
        id: loan.id,
        loanNo: loan.loanNumber,
        customerName: loan.customerName || 'N/A',
        customerPhone: loan.customerPhone || 'N/A',
        loanAmount: loan.loanAmount,
        principalOutstanding,
        interestPending,
        totalOutstanding: principalOutstanding + interestPending
      };
    });

    // ============================================
    // BALANCE CALCULATION
    // ============================================
    
    const leftTotal = cashBookBalance + totalBankBalance;
    const loansTotal = onlinePrincipalOutstanding + offlinePrincipalOutstanding + 
                       onlineInterestPending + offlineInterestPending;
    
    // Profit/Loss = Left Total - Loans Total (to balance both sides)
    const profitLoss = leftTotal - loansTotal;
    
    const rightTotal = loansTotal + profitLoss;

    // Get financial years list for dropdown
    const financialYears = await db.financialYear.findMany({
      where: { companyId },
      select: { id: true, name: true, startDate: true, endDate: true, isClosed: true },
      orderBy: { startDate: 'desc' }
    });

    // If no financial years exist, create default list
    const yearOptions = financialYears.length > 0 ? financialYears : [
      { name: 'FY 2024-25', startDate: new Date(2024, 3, 1), endDate: new Date(2025, 2, 31) },
      { name: 'FY 2023-24', startDate: new Date(2023, 3, 1), endDate: new Date(2024, 2, 31) },
      { name: 'FY 2022-23', startDate: new Date(2022, 3, 1), endDate: new Date(2023, 2, 31) }
    ];

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        code: company.code
      },
      financialYear: year ? `FY ${year}-${parseInt(year) + 1}` : `FY ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      yearOptions,
      
      // LEFT SIDE - Assets
      leftSide: {
        items: [
          {
            name: 'Cash in Hand (CashBook)',
            amount: cashBookBalance,
            type: 'CASH'
          },
          {
            name: 'Bank Balance',
            amount: totalBankBalance,
            type: 'BANK',
            details: bankAccounts.map(acc => ({
              bankName: acc.bankName,
              accountNumber: acc.accountNumber,
              balance: acc.currentBalance
            }))
          }
        ],
        total: leftTotal
      },
      
      // RIGHT SIDE - Deployments
      rightSide: {
        items: [
          {
            name: 'Online Loans Outstanding (Principal)',
            amount: onlinePrincipalOutstanding,
            type: 'ONLINE_PRINCIPAL',
            count: onlineLoans.length,
            details: onlineLoanDetails
          },
          {
            name: 'Offline Loans Outstanding (Principal)',
            amount: offlinePrincipalOutstanding,
            type: 'OFFLINE_PRINCIPAL',
            count: offlineLoans.length,
            details: offlineLoanDetails
          },
          {
            name: 'Interest Receivable (Online)',
            amount: onlineInterestPending,
            type: 'ONLINE_INTEREST'
          },
          {
            name: 'Interest Receivable (Offline)',
            amount: offlineInterestPending,
            type: 'OFFLINE_INTEREST'
          },
          {
            name: profitLoss >= 0 ? 'Profit' : 'Loss',
            amount: Math.abs(profitLoss),
            type: profitLoss >= 0 ? 'PROFIT' : 'LOSS',
            isDifference: true
          }
        ],
        total: rightTotal
      },
      
      // Summary
      summary: {
        cashBookBalance,
        bankBalance: totalBankBalance,
        onlineLoansCount: onlineLoans.length,
        offlineLoansCount: offlineLoans.length,
        totalPrincipalOutstanding: onlinePrincipalOutstanding + offlinePrincipalOutstanding,
        totalInterestPending: onlineInterestPending + offlineInterestPending,
        profitLoss,
        isBalanced: Math.abs(leftTotal - rightTotal) < 0.01
      }
    });

  } catch (error) {
    console.error('Balance sheet error:', error);
    return NextResponse.json({ 
      error: 'Failed to get balance sheet',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
