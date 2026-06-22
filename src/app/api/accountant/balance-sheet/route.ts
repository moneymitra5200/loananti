import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheTTL } from '@/lib/cache';
import { performOnDemandAccrual } from '@/lib/accrual-helper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  PROCESSING_FEE_RECEIVABLE: '1302',
  PENALTY_RECEIVABLE: '1303',
  IRRECOVERABLE_INTEREST: '1305',
  
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

    // Run on-demand accruals to ensure reports are real-time
    await performOnDemandAccrual(companyId);

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Cache key (kept for write, but skip read so EquityEntry is always fresh)
    const cacheKey = `accountant:balance-sheet:${companyId}:${year || 'current'}`;
    // Note: cache read disabled — Owner's Capital must always be fresh from EquityEntry table

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

    // Calculate actual outstanding online loans
    const onlineLoans = await db.loanApplication.findMany({
      where: {
        companyId,
        status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED', 'CLOSED'] }
      },
      select: {
        disbursedAmount: true,
        status: true,
        emiSchedules: {
          select: { paidPrincipal: true }
        }
      }
    });
    const actualOnlineLoans = onlineLoans.reduce((sum, loan) => {
      if (loan.status === 'CLOSED') return sum;
      const disbursed = loan.disbursedAmount || 0;
      const paidPrincipal = loan.emiSchedules.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
      return sum + Math.max(0, disbursed - paidPrincipal);
    }, 0);

    // Calculate actual outstanding offline loans
    const offlineLoans = await db.offlineLoan.findMany({
      where: {
        companyId,
        status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED', 'CLOSED'] }
      },
      select: {
        loanAmount: true,
        status: true,
        emis: {
          select: { paidPrincipal: true }
        }
      }
    });
    const actualOfflineLoans = offlineLoans.reduce((sum, loan) => {
      if (loan.status === 'CLOSED') return sum;
      const disbursed = loan.loanAmount || 0;
      const paidPrincipal = loan.emis.reduce((s, emi) => s + (emi.paidPrincipal || 0), 0);
      return sum + Math.max(0, disbursed - paidPrincipal);
    }, 0);

    // Helper function to get account balance by code
    const getAccountBalance = (code: string): number => {
      // For Bank Account (1102) and Cash in Hand (1101), use actual balances
      if (code === '1101') return actualCashBalance;
      if (code === '1102') return actualBankBalance;
      if (code === '1201') return actualOnlineLoans;
      if (code === '1210') return actualOfflineLoans;
      if (code === '1200') return actualOnlineLoans + actualOfflineLoans;
      
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
    // ─── Owner's Capital: READ FROM EquityEntry table (source of truth) ─────
    // ChartOfAccount.currentBalance for 3002 may be stale if Fix-Imbalance
    // hasn't run yet.  EquityEntry is ALWAYS written when capital is added.
    const equityEntries = await db.equityEntry.findMany({ where: { companyId } });
    const ownersCapitalFromEquity = equityEntries.reduce(
      (s, e) => e.entryType === 'WITHDRAWAL' ? s - (e.amount || 0) : s + (e.amount || 0),
      0
    );

    // Also check ChartOfAccount balances for 3001-3004 as a fallback
    const coaCapital3002 = getAccountBalance(ACCOUNT_CODES.OWNERS_CAPITAL);
    const coaCapital3001 = getAccountBalance(ACCOUNT_CODES.OPENING_BALANCE_EQUITY);

    // Use EquityEntry if it has data, otherwise fall back to CoA
    const ownersCapital       = ownersCapitalFromEquity !== 0 ? ownersCapitalFromEquity : coaCapital3002;
    const openingBalanceEquity = coaCapital3001;
    const currentYearProfit   = getAccountBalance(ACCOUNT_CODES.CURRENT_YEAR_PROFIT);

    // Calculate total income and expenses for P&L
    const incomeAccounts = accounts.filter(a => a.accountType === 'INCOME');
    const expenseAccounts = accounts.filter(a => a.accountType === 'EXPENSE');
    
    const totalIncome = incomeAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
    const totalExpenses = expenseAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
    const profitLoss = totalIncome - totalExpenses;

    // ── DYNAMIC RETAINED EARNINGS COMPUTATION ──────────────────────────────
    // After we compute totalAssets below, we plug Retained Earnings so
    // the Balance Sheet ALWAYS balances: Assets = L + E exactly.

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
    const processingFeeReceivable = getAccountBalance(ACCOUNT_CODES.PROCESSING_FEE_RECEIVABLE);
    const penaltyReceivable = getAccountBalance(ACCOUNT_CODES.PENALTY_RECEIVABLE);
    const overdueInterestReceivable = getAccountBalance(ACCOUNT_CODES.IRRECOVERABLE_INTEREST);

    // ============================================
    // BUILD BALANCE SHEET ITEMS
    // ============================================

        // Left Side Items (Liabilities & Equity) — Retained Earnings will be added AFTER assets are totaled
    const leftSideItems: Array<{name: string; amount: number; type: string; accountCode?: string; description?: string; isCalculated?: boolean; formula?: string; details?: any[]}> = [
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
        name: 'Current Year Profit/Loss',
        amount: profitLoss,
        type: 'PROFIT_LOSS',
        accountCode: ACCOUNT_CODES.CURRENT_YEAR_PROFIT,
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
    ];

    // Dynamically append any other liability or equity accounts not handled above
    const handledLeftCodes = new Set([
      ACCOUNT_CODES.OWNERS_CAPITAL,
      ACCOUNT_CODES.OPENING_BALANCE_EQUITY,
      ACCOUNT_CODES.RETAINED_EARNINGS,
      ACCOUNT_CODES.CURRENT_YEAR_PROFIT,
      ACCOUNT_CODES.BANK_LOANS,
      ACCOUNT_CODES.INVESTOR_CAPITAL,
      ACCOUNT_CODES.BORROWED_FUNDS,
    ]);

    const otherLeftAccounts = accounts.filter(a => 
      (a.accountType === 'LIABILITY' || a.accountType === 'EQUITY') &&
      !handledLeftCodes.has(a.accountCode) &&
      a.accountCode !== '9999' // Exclude Suspense account
    );

    for (const acc of otherLeftAccounts) {
      leftSideItems.push({
        name: acc.accountName,
        amount: acc.currentBalance,
        type: acc.accountType,
        accountCode: acc.accountCode,
        description: `Other ${acc.accountType === 'LIABILITY' ? 'Liability' : 'Equity'} account: ${acc.accountName}`
      });
    }

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
        description: 'Interest accrued but not yet received'
      },
      {
        name: 'Processing Fee Receivable',
        amount: Math.max(0, processingFeeReceivable),
        type: 'ASSET',
        accountCode: ACCOUNT_CODES.PROCESSING_FEE_RECEIVABLE,
        description: 'Processing fees due from customers'
      },
      {
        name: 'Penalty Receivable',
        amount: Math.max(0, penaltyReceivable),
        type: 'ASSET',
        accountCode: ACCOUNT_CODES.PENALTY_RECEIVABLE,
        description: 'Late payment penalties due'
      },
      {
        name: 'Overdue Interest Receivable',
        amount: Math.max(0, overdueInterestReceivable),
        type: 'ASSET',
        accountCode: ACCOUNT_CODES.IRRECOVERABLE_INTEREST,
        description: 'Interest reclassified to overdue (unpaid past due date)'
      }
    ];

    // Dynamically append any other asset accounts not handled above
    const handledRightCodes = new Set([
      ACCOUNT_CODES.CASH_IN_HAND,
      ACCOUNT_CODES.BANK_MAIN,
      ACCOUNT_CODES.LOANS_RECEIVABLE,
      ACCOUNT_CODES.ONLINE_LOANS_RECEIVABLE,
      ACCOUNT_CODES.OFFLINE_LOANS_RECEIVABLE,
      ACCOUNT_CODES.INTEREST_RECEIVABLE,
      ACCOUNT_CODES.PROCESSING_FEE_RECEIVABLE,
      ACCOUNT_CODES.PENALTY_RECEIVABLE,
      ACCOUNT_CODES.IRRECOVERABLE_INTEREST,
      '1102' // Exclude generic bank code
    ]);

    const otherRightAccounts = accounts.filter(a =>
      a.accountCode.startsWith('1') &&
      !handledRightCodes.has(a.accountCode) &&
      a.accountCode !== '1200' && // Exclude parent Loans Receivable (avoids double counting)
      !a.accountCode.startsWith('14') && // Exclude custom bank accounts starting with 14
      !a.accountCode.startsWith('1102') &&
      !a.accountCode.startsWith('1103') &&
      !a.accountCode.startsWith('1104')
    );

    for (const acc of otherRightAccounts) {
      rightSideItems.push({
        name: acc.accountName,
        amount: acc.currentBalance,
        type: 'ASSET',
        accountCode: acc.accountCode,
        description: `Other Asset account: ${acc.accountName}`
      });
    }

    // ============================================
    // CALCULATE TOTALS — Retained Earnings as dynamic plug
    // ============================================

    // Step 1: Total all assets
    const rightTotal = rightSideItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

    // Step 2: Total L&E WITHOUT Retained Earnings (it's not in the array yet)
    const leftTotalBeforeRE = leftSideItems.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

    // Step 3: Retained Earnings = Assets − everything else on L&E
    // This GUARANTEES Balance Sheet difference = ₹0.00 always
    const dynamicRetainedEarnings = rightTotal - leftTotalBeforeRE;

    // Step 4: Insert Retained Earnings into leftSideItems (position 2 = after Opening Balance Equity)
    leftSideItems.splice(2, 0, {
      name: 'Retained Earnings',
      amount: dynamicRetainedEarnings,
      type: 'EQUITY',
      accountCode: ACCOUNT_CODES.RETAINED_EARNINGS,
      description: 'Accumulated profits from previous years (auto-computed)'
    });

    // Step 5: Final left total = rightTotal exactly
    const leftTotal = rightTotal;

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
        totalEquity: ownersCapital + openingBalanceEquity + dynamicRetainedEarnings + profitLoss,
        totalLiabilities: bankLoans + investorCapital + borrowedFunds,
        totalAssets: rightTotal, profitLoss, totalIncome, totalExpenses,
        equitySource: ownersCapitalFromEquity > 0 ? 'EquityEntry' : 'ChartOfAccount',
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
