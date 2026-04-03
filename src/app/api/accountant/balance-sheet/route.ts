import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * NEW BALANCE SHEET API
 * 
 * LEFT SIDE (Liabilities / Source of Funds):
 * - Equity (Capital invested by owners)
 * - Borrowed Money (Loans taken from banks/investors)
 * - Final Equity (Equity + Borrowed ± Profit/Loss)
 * 
 * RIGHT SIDE (Assets / How Funds Are Used):
 * - Bank Balance
 * - Cashbook Balance
 * - Invest Money (Money invested out)
 * - Loan Principal (Outstanding principal from loans given)
 * - Interest Receivable (Pending interest from customers)
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
    // RIGHT SIDE - Assets (How Funds Are Used)
    // ============================================

    // 1. Bank Balance
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

    // 2. CashBook Balance
    const cashBook = await db.cashBook.findUnique({
      where: { companyId },
      select: { currentBalance: true }
    });
    const cashBookBalance = cashBook?.currentBalance || 0;

    // 3. Invest Money - Get from ChartOfAccount (account code 2201 - Investor Capital as investment out)
    let investMoney = 0;
    const investAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: '2201' // Investor Capital
      },
      select: { currentBalance: true }
    });
    if (investAccount) {
      investMoney = Math.abs(investAccount.currentBalance);
    }

    // 4. Loan Principal Outstanding - from all active loans
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
            paidPrincipal: true,
            interestAmount: true,
            paidInterest: true,
          }
        }
      }
    });

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
        customerName: true,
        customerPhone: true,
        emis: {
          select: {
            principalAmount: true,
            paidPrincipal: true,
            interestAmount: true,
            paidInterest: true,
          }
        }
      }
    });

    // Calculate totals
    let onlinePrincipalOutstanding = 0;
    let onlineInterestPending = 0;
    
    onlineLoans.forEach(loan => {
      loan.emiSchedules.forEach(emi => {
        onlinePrincipalOutstanding += (emi.principalAmount - emi.paidPrincipal);
        onlineInterestPending += (emi.interestAmount - emi.paidInterest);
      });
    });

    let offlinePrincipalOutstanding = 0;
    let offlineInterestPending = 0;
    
    offlineLoans.forEach(loan => {
      loan.emis.forEach(emi => {
        offlinePrincipalOutstanding += (emi.principalAmount - emi.paidPrincipal);
        offlineInterestPending += (emi.interestAmount - emi.paidInterest);
      });
    });

    const totalLoanPrincipal = onlinePrincipalOutstanding + offlinePrincipalOutstanding;
    const totalInterestReceivable = onlineInterestPending + offlineInterestPending;

    // ============================================
    // LEFT SIDE - Liabilities (Source of Funds)
    // ============================================

    // 1. Equity - Get from ChartOfAccount (account code 5000 or 5100)
    let equity = 0;
    const equityAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: { in: ['5000', '5100'] }
      },
      select: { currentBalance: true, accountCode: true },
      orderBy: { accountCode: 'asc' }
    });
    if (equityAccount) {
      equity = equityAccount.currentBalance;
    }

    // 2. Borrowed Money - Get from ChartOfAccount (account code 2202 - Borrowed Funds)
    let borrowedMoney = 0;
    const borrowedAccount = await db.chartOfAccount.findFirst({
      where: { 
        companyId, 
        accountCode: '2202' // Borrowed Funds
      },
      select: { currentBalance: true }
    });
    if (borrowedAccount) {
      borrowedMoney = Math.abs(borrowedAccount.currentBalance);
    }

    // 3. Profit/Loss from P&L
    // Calculate income - expenses for the period
    const incomeAccounts = await db.chartOfAccount.findMany({
      where: { companyId, accountType: 'INCOME' },
      select: { currentBalance: true }
    });
    const totalIncome = incomeAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    const expenseAccounts = await db.chartOfAccount.findMany({
      where: { companyId, accountType: 'EXPENSE' },
      select: { currentBalance: true }
    });
    const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

    const profitLoss = totalIncome - totalExpenses;

    // 4. Final Equity = Equity + Borrowed Money ± Profit/Loss
    const finalEquity = equity + borrowedMoney + profitLoss;

    // ============================================
    // TOTALS
    // ============================================
    
    const rightTotal = totalBankBalance + cashBookBalance + investMoney + totalLoanPrincipal + totalInterestReceivable;
    const leftTotal = equity + borrowedMoney + finalEquity;

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
      
      // LEFT SIDE - Liabilities (Source of Funds)
      leftSide: {
        items: [
          {
            name: 'Equity',
            amount: equity,
            type: 'EQUITY',
            canAdd: true
          },
          {
            name: 'Borrowed Money',
            amount: borrowedMoney,
            type: 'BORROWED_MONEY',
            canAdd: true
          },
          {
            name: 'Final Equity',
            amount: finalEquity,
            type: 'FINAL_EQUITY',
            isCalculated: true,
            formula: 'Equity + Borrowed Money ± Profit/Loss'
          }
        ],
        total: leftTotal
      },
      
      // RIGHT SIDE - Assets (How Funds Are Used)
      rightSide: {
        items: [
          {
            name: 'Bank Balance',
            amount: totalBankBalance,
            type: 'BANK',
            details: bankAccounts.map(acc => ({
              bankName: acc.bankName,
              accountNumber: acc.accountNumber,
              balance: acc.currentBalance
            }))
          },
          {
            name: 'Cashbook Balance',
            amount: cashBookBalance,
            type: 'CASH'
          },
          {
            name: 'Invest Money',
            amount: investMoney,
            type: 'INVEST_MONEY',
            canAdd: true
          },
          {
            name: 'Loan Principal',
            amount: totalLoanPrincipal,
            type: 'LOAN_PRINCIPAL',
            count: onlineLoans.length + offlineLoans.length,
            onlineLoans: onlineLoans.length,
            offlineLoans: offlineLoans.length
          },
          {
            name: 'Interest Receivable',
            amount: totalInterestReceivable,
            type: 'INTEREST_RECEIVABLE'
          }
        ],
        total: rightTotal
      },
      
      // Summary
      summary: {
        cashBookBalance,
        bankBalance: totalBankBalance,
        investMoney,
        equity,
        borrowedMoney,
        profitLoss,
        finalEquity,
        loanPrincipal: totalLoanPrincipal,
        interestReceivable: totalInterestReceivable,
        onlineLoansCount: onlineLoans.length,
        offlineLoansCount: offlineLoans.length,
        totalIncome,
        totalExpenses,
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
