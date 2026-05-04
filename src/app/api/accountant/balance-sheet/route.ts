import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheTTL } from '@/lib/cache';

/**
 * GNUCASH-STYLE BALANCE SHEET API
 * 
 * IMPORTANT: For Bank Account (1102) and Cash in Hand (1101),
 * we use the ACTUAL balances from BankAccount and CashBook tables
 * as the source of truth, NOT ChartOfAccount.
 * 
 * BALANCE SHEET STRUCTURE:
 * 
 * LEFT SIDE (Liabilities + Equity - Source of Funds):
 * - Owner's Capital (Account Code 3002)
 * - Opening Balance Equity (Account Code 3001)
 * - Retained Earnings (Account Code 3003)
 * - Current Year Profit (Account Code 3004)
 * - Bank Loans (Account Code 2101)
 * - Borrowed Funds (Account Code 2120)
 * 
 * RIGHT SIDE (Assets - How Funds Are Used):
 * - Cash in Hand (Account Code 1101) - From CashBook table
 * - Bank Accounts (Account Code 1102) - From BankAccount table
 * - Loans Receivable (Account Code 1200/1201/1210)
 * - Interest Receivable (Account Code 1301)
 * 
 * Company-wise: Separate for each company
 * Year-wise: Filter by financial year
 */

// Account code constants
const ACCOUNT_CODES = {
  // Assets
  CASH_IN_HAND: '1101',
  BANK_MAIN: '1103',
  LOANS_RECEIVABLE: '1200',
  ONLINE_LOANS_RECEIVABLE: '1201',
  OFFLINE_LOANS_RECEIVABLE: '1210',
  INTEREST_RECEIVABLE: '1301',
  
  // Liabilities
  BANK_LOANS: '2101',
  INVESTOR_CAPITAL: '2110',
  BORROWED_FUNDS: '2120',
  
  // Equity
  OPENING_BALANCE_EQUITY: '3001',
  OWNERS_CAPITAL: '3002',
  RETAINED_EARNINGS: '3003',
  CURRENT_YEAR_PROFIT: '3004',
  
  // Income
  INTEREST_INCOME: '4110',

  PROCESSING_FEE_INCOME: '4121',
  LATE_FEE_INCOME: '4122',
  
  // Expenses
  OPERATING_EXPENSES: '5100',
  INTEREST_EXPENSE: '5201',
  BANK_CHARGES: '5203',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const year = searchParams.get('year'); // e.g., "2024" for FY 2024-25

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Cache 5 min — balance sheet only changes when journal entries are made
    const cacheKey = `accountant:balance-sheet:${companyId}:${year || 'current'}`;
    const cached = cache.get<object>(cacheKey);
    if (cached) return NextResponse.json(cached);

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
    // GET ALL ACCOUNTS FROM CHART OF ACCOUNTS
    // This is the SINGLE SOURCE OF TRUTH (except for Bank/Cash)
    // ============================================
    
    const accounts = await db.chartOfAccount.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        accountCode: true,
        accountName: true,
        accountType: true,
        currentBalance: true,
        openingBalance: true
      },
      orderBy: { accountCode: 'asc' }
    });

    // ============================================
    // GET ACTUAL BANK AND CASH BALANCES
    // These are the source of truth for accounts 1101 and 1102
    // ============================================
    
    // Get ACTUAL bank balance from BankAccount table
    const bankAccountsData = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
      select: { 
        id: true,
        bankName: true,
        accountNumber: true,
        currentBalance: true, 
        openingBalance: true 
      }
    });
    const actualBankBalance = bankAccountsData.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
    const actualBankOpening = bankAccountsData.reduce((sum, b) => sum + (b.openingBalance || 0), 0);
    
    // Get ACTUAL cash balance from CashBook table
    const cashBookData = await db.cashBook.findUnique({
      where: { companyId },
      select: { currentBalance: true, openingBalance: true }
    });
    const actualCashBalance = cashBookData?.currentBalance || 0;
    const actualCashOpening = cashBookData?.openingBalance || 0;

    // Helper function to get account balance by code
    const getAccountBalance = (code: string): number => {
      // For Bank Account (1102) and Cash in Hand (1101), use actual balances
      if (code === '1101') return actualCashBalance;
      if (code === '1102') return actualBankBalance;
      
      const account = accounts.find(a => a.accountCode === code);
      return account?.currentBalance || 0;
    };

    // Helper function to get multiple accounts by code prefix
    const getAccountsByPrefix = (prefix: string) => {
      return accounts.filter(a => a.accountCode.startsWith(prefix));
    };

    // ============================================
    // LEFT SIDE - Liabilities & Equity (Source of Funds)
    // ============================================

    // Equity Accounts
    const openingBalanceEquity = getAccountBalance(ACCOUNT_CODES.OPENING_BALANCE_EQUITY);
    const ownersCapital = getAccountBalance(ACCOUNT_CODES.OWNERS_CAPITAL);
    const retainedEarnings = getAccountBalance(ACCOUNT_CODES.RETAINED_EARNINGS);
    const currentYearProfit = getAccountBalance(ACCOUNT_CODES.CURRENT_YEAR_PROFIT);

    // Calculate total income and expenses for P&L
    const incomeAccounts = accounts.filter(a => a.accountType === 'INCOME');
    const expenseAccounts = accounts.filter(a => a.accountType === 'EXPENSE');
    
    const totalIncome = incomeAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
    const profitLoss = totalIncome - totalExpenses;

    // Liability Accounts
    const bankLoans = Math.abs(getAccountBalance(ACCOUNT_CODES.BANK_LOANS));
    const investorCapital = Math.abs(getAccountBalance(ACCOUNT_CODES.INVESTOR_CAPITAL));
    const borrowedFunds = Math.abs(getAccountBalance(ACCOUNT_CODES.BORROWED_FUNDS));

    // ============================================
    // RIGHT SIDE - Assets (How Funds Are Used)
    // ============================================

    // Asset Accounts from Chart of Accounts
    const cashInHand = getAccountBalance(ACCOUNT_CODES.CASH_IN_HAND);
    const bankMain = getAccountBalance(ACCOUNT_CODES.BANK_MAIN);
    
    // Get all bank accounts (codes starting with 110)
    const bankAccounts = getAccountsByPrefix('110').filter(a => 
      a.accountCode !== '1101' && // Exclude Cash in Hand
      a.accountCode.startsWith('1102') || a.accountCode.startsWith('1103') || a.accountCode.startsWith('1104')
    );
    const totalBankBalance = bankAccounts.reduce((sum, a) => sum + a.currentBalance, 0) + bankMain;

    // Loans Receivable
    const onlineLoansReceivable = getAccountBalance(ACCOUNT_CODES.ONLINE_LOANS_RECEIVABLE);
    const offlineLoansReceivable = getAccountBalance(ACCOUNT_CODES.OFFLINE_LOANS_RECEIVABLE);
    const totalLoansReceivable = getAccountBalance(ACCOUNT_CODES.LOANS_RECEIVABLE) || 
      (onlineLoansReceivable + offlineLoansReceivable);

    // Other Receivables
    const interestReceivable = getAccountBalance(ACCOUNT_CODES.INTEREST_RECEIVABLE);

    // ============================================
    // BUILD BALANCE SHEET ITEMS
    // ============================================

    // Left Side Items (Liabilities & Equity)
    const leftSideItems = [
      {
        name: "Owner's Capital",
        amount: ownersCapital,
        type: 'EQUITY',
        accountCode: ACCOUNT_CODES.OWNERS_CAPITAL,
        description: 'Money invested by owner - Add via Journal Entry (Debit Bank/Cash, Credit Owner Capital)'
      },
      {
        name: 'Opening Balance Equity',
        amount: openingBalanceEquity,
        type: 'OPENING_EQUITY',
        accountCode: ACCOUNT_CODES.OPENING_BALANCE_EQUITY,
        description: 'Initial capital when company started'
      },
      {
        name: 'Retained Earnings',
        amount: retainedEarnings,
        type: 'EQUITY',
        accountCode: ACCOUNT_CODES.RETAINED_EARNINGS,
        description: 'Accumulated profits from previous years'
      },
      {
        name: 'Current Year Profit/Loss',
        amount: profitLoss,
        type: 'PROFIT_LOSS',
        isCalculated: true,
        formula: 'Total Income - Total Expenses',
        details: [
          { name: 'Total Income', amount: totalIncome },
          { name: 'Total Expenses', amount: totalExpenses }
        ]
      },
      {
        name: 'Bank Loans',
        amount: bankLoans,
        type: 'LIABILITY',
        accountCode: ACCOUNT_CODES.BANK_LOANS,
        description: 'Loans taken from banks'
      },
      {
        name: 'Investor Capital',
        amount: investorCapital,
        type: 'LIABILITY',
        accountCode: ACCOUNT_CODES.INVESTOR_CAPITAL,
        description: 'Capital from investors'
      },
      {
        name: 'Borrowed Funds',
        amount: borrowedFunds,
        type: 'LIABILITY',
        accountCode: ACCOUNT_CODES.BORROWED_FUNDS,
        description: 'Funds borrowed from other sources'
      }
    ].filter(item => item.amount !== 0 || ['Owner\'s Capital', 'Current Year Profit/Loss'].includes(item.name));

    // Right Side Items (Assets)
    const rightSideItems = [
      {
        name: 'Cash in Hand',
        amount: cashInHand,
        type: 'ASSET',
        accountCode: ACCOUNT_CODES.CASH_IN_HAND,
        description: 'Physical cash on hand (from CashBook)',
        isActualBalance: true
      },
      {
        name: 'Bank Balance',
        amount: actualBankBalance,
        type: 'ASSET',
        accountCode: ACCOUNT_CODES.BANK_MAIN,
        isActualBalance: true,
        description: 'Bank account balance (from BankAccount table)',
        details: bankAccountsData.map(acc => ({
          accountName: `${acc.bankName} - ${acc.accountNumber?.slice(-4) || 'N/A'}`,
          accountCode: acc.id,
          balance: acc.currentBalance || 0
        }))
      },
      {
        name: 'Loans Receivable',
        amount: Math.max(0, totalLoansReceivable),
        type: 'ASSET',
        accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
        details: [
          { name: 'Online Loans', amount: onlineLoansReceivable },
          { name: 'Offline Loans', amount: offlineLoansReceivable }
        ]
      },
      {
        name: 'Interest Receivable',
        amount: Math.max(0, interestReceivable),
        type: 'ASSET',
        accountCode: ACCOUNT_CODES.INTEREST_RECEIVABLE,
        description: 'Interest accrued but not received'
      }
    ].filter(item => item.amount !== 0 || ['Cash in Hand', 'Bank Balance'].includes(item.name));

    // ============================================
    // CALCULATE TOTALS
    // ============================================

    const leftTotal = leftSideItems.reduce((sum, item) => sum + item.amount, 0);
    const rightTotal = rightSideItems.reduce((sum, item) => sum + item.amount, 0);

    // ============================================
    // GET FINANCIAL YEARS LIST
    // ============================================

    const financialYears = await db.financialYear.findMany({
      where: { companyId },
      select: { id: true, name: true, startDate: true, endDate: true, isClosed: true },
      orderBy: { startDate: 'desc' }
    });

    const yearOptions = financialYears.length > 0 ? financialYears : [
      { name: 'FY 2024-25', startDate: new Date(2024, 3, 1), endDate: new Date(2025, 2, 31) },
      { name: 'FY 2023-24', startDate: new Date(2023, 3, 1), endDate: new Date(2024, 2, 31) }
    ];

    const responseData = {
      company: { id: company.id, name: company.name, code: company.code },
      financialYear: year ? `FY ${year}-${parseInt(year) + 1}` : `FY ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      yearOptions,
      leftSide: { title: 'Liabilities & Equity', items: leftSideItems, total: leftTotal },
      rightSide: { title: 'Assets', items: rightSideItems, total: rightTotal },
      summary: {
        totalEquity: ownersCapital + openingBalanceEquity + retainedEarnings + profitLoss,
        totalLiabilities: bankLoans + investorCapital + borrowedFunds,
        totalAssets: rightTotal, profitLoss, totalIncome, totalExpenses,
        isBalanced: Math.abs(leftTotal - rightTotal) < 0.01,
        difference: Math.abs(leftTotal - rightTotal)
      },
      guidance: {
        title: 'How to Add Equity (GnuCash Style)',
        steps: [
          '1. Go to Journal Entry section',
          '2. Create a new journal entry:',
          '   - Debit: Cash in Hand (1101) OR Bank Account (1103)',
          '   - Credit: Owner\'s Capital (3002)',
          '3. Enter the amount (e.g., ₹1,00,000)',
          '4. Add narration: "Owner\'s capital investment"',
          '5. Save the entry - Equity will automatically update!'
        ],
        example: {
          description: 'Owner invests ₹1,00,000 in cash',
          entry: [
            { account: 'Cash in Hand (1101)', debit: 100000, credit: 0 },
            { account: 'Owner\'s Capital (3002)', debit: 0, credit: 100000 }
          ],
          result: 'Assets = ₹1,00,000 | Equity = ₹1,00,000 | Balanced ✓'
        }
      }
    };
    cache.set(cacheKey, responseData, CacheTTL.LONG); // 5 min
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Balance sheet error:', error);
    return NextResponse.json({ 
      error: 'Failed to get balance sheet',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
