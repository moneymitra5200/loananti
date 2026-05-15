import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LoanStatus, EMIPaymentStatus } from '@prisma/client';

const LoanStatusConst = {
  ACTIVE: LoanStatus.ACTIVE,
  DISBURSED: LoanStatus.DISBURSED,
  CLOSED: LoanStatus.CLOSED,
};

const EMIPaymentStatusConst = {
  OVERDUE: EMIPaymentStatus.OVERDUE,
};

// Helper to get valid company ID
async function getValidCompanyId(providedCompanyId: string): Promise<string | null> {
  if (providedCompanyId && providedCompanyId !== 'default') {
    const company = await db.company.findUnique({ where: { id: providedCompanyId } });
    if (company) return providedCompanyId;
  }
  
  // Get any company
  const anyCompany = await db.company.findFirst();
  return anyCompany?.id || null;
}

// GET - Generate various accounting reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'trial-balance';
    const providedCompanyId = searchParams.get('companyId') || 'default';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const companyId = await getValidCompanyId(providedCompanyId);

    switch (reportType) {
      case 'trial-balance':
        return await getTrialBalance(companyId);
      case 'profit-loss':
        return await getProfitAndLoss(companyId, startDate, endDate);
      case 'balance-sheet':
        return await getBalanceSheet(companyId);
      case 'portfolio':
        return await getLoanPortfolioReport(companyId);
      case 'cash-flow':
        return await getCashFlowStatement(companyId, startDate, endDate);
      case 'receivables-aging':
        return await getReceivablesAging(companyId);
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

// Trial Balance
async function getTrialBalance(companyId: string | null) {
  const where = companyId ? { companyId, isActive: true } : { isActive: true };
  
  const accounts = await db.chartOfAccount.findMany({
    where,
    orderBy: { accountCode: 'asc' },
  });

  const trialBalance = accounts.map(account => {
    let debitBalance = 0;
    let creditBalance = 0;

    // For Assets and Expenses: positive balance = debit
    // For Liabilities, Income, Equity: positive balance = credit
    if (account.accountType === 'ASSET' || account.accountType === 'EXPENSE') {
      if (account.currentBalance >= 0) {
        debitBalance = account.currentBalance;
      } else {
        creditBalance = Math.abs(account.currentBalance);
      }
    } else {
      if (account.currentBalance >= 0) {
        creditBalance = account.currentBalance;
      } else {
        debitBalance = Math.abs(account.currentBalance);
      }
    }

    return {
      accountCode: account.accountCode,
      accountName: account.accountName,
      accountType: account.accountType,
      debitBalance,
      creditBalance,
    };
  });

  return NextResponse.json(trialBalance);
}

// Profit & Loss Statement
// Reads from approved journal lines for accuracy (not from stale currentBalance).
async function getProfitAndLoss(companyId: string | null, startDate?: string | null, endDate?: string | null) {
  const where = companyId ? { companyId, isActive: true } : { isActive: true };

  // Build journal date filter
  const journalDateFilter: Record<string, unknown> = {};
  if (startDate) journalDateFilter.gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    journalDateFilter.lte = end;
  }
  const journalEntryWhere: Record<string, unknown> = { isApproved: true, isReversed: false };
  if (companyId) journalEntryWhere.companyId = companyId;
  if (Object.keys(journalDateFilter).length > 0) journalEntryWhere.entryDate = journalDateFilter;

  // Fetch income and expense accounts WITH their approved journal lines
  const [incomeAccounts, expenseAccounts] = await Promise.all([
    db.chartOfAccount.findMany({
      where: { ...where, accountType: 'INCOME' },
      orderBy: { accountCode: 'asc' },
      include: {
        journalLines: {
          where: { journalEntry: journalEntryWhere },
          select: { debitAmount: true, creditAmount: true },
        },
      },
    }),
    db.chartOfAccount.findMany({
      where: { ...where, accountType: 'EXPENSE' },
      orderBy: { accountCode: 'asc' },
      include: {
        journalLines: {
          where: { journalEntry: journalEntryWhere },
          select: { debitAmount: true, creditAmount: true },
        },
      },
    }),
  ]);

  // Income: net credits on INCOME accounts = income earned in the period
  const income = (incomeAccounts as any[]).map(account => {
    const totalCredit = account.journalLines.reduce((s: number, l: any) => s + (l.creditAmount || 0), 0);
    const totalDebit  = account.journalLines.reduce((s: number, l: any) => s + (l.debitAmount  || 0), 0);
    const journalAmt  = totalCredit - totalDebit;
    // If no date filter: fall back to currentBalance so existing data is preserved
    let amount = journalAmt !== 0 ? journalAmt : (startDate ? 0 : (account.currentBalance || 0));
    return { accountCode: account.accountCode, accountName: account.accountName, amount };
  });

  // Inject Cashbook Income for missing Journal Entries (Processing Fee, Penalties, etc)
  if (companyId) {
    const cbDateFilter: Record<string, unknown> = {};
    if (startDate) cbDateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      cbDateFilter.lte = end;
    }
    const cbWhere: any = {
      cashBook: { companyId },
      entryType: 'CREDIT',
      referenceType: { in: ['PROCESSING_FEE', 'MIRROR_INTEREST_INCOME', 'PENALTY_INCOME', 'EXTRA_EMI_PROFIT', 'INTEREST_INCOME', 'LATE_FEE'] }
    };
    if (Object.keys(cbDateFilter).length > 0) cbWhere.entryDate = cbDateFilter;

    const cbEntries = await db.cashBookEntry.findMany({
      where: cbWhere,
      select: { amount: true, referenceType: true }
    });
    
    // Map cashbook types to standard account codes
    const cbMapping: Record<string, string> = {
      'PROCESSING_FEE': '4121', // Processing Fees
      'LATE_FEE': '4122',
      'PENALTY_INCOME': '4125',
      'INTEREST_INCOME': '4110',
      'MIRROR_INTEREST_INCOME': '4110',
      'EXTRA_EMI_PROFIT': '4110'
    };
    
    cbEntries.forEach(entry => {
      const targetCode = cbMapping[entry.referenceType] || '4300';
      const existingAcct = income.find(a => a.accountCode === targetCode);
      if (existingAcct) {
        existingAcct.amount += (entry.amount || 0);
      } else {
        income.push({ accountCode: targetCode, accountName: `${entry.referenceType.replace(/_/g, ' ')} (Cash)`, amount: entry.amount || 0 });
      }
    });
  }

  // Expenses: net debits on EXPENSE accounts = expenses incurred in the period
  const expenses = (expenseAccounts as any[]).map(account => {
    const totalDebit  = account.journalLines.reduce((s: number, l: any) => s + (l.debitAmount  || 0), 0);
    const totalCredit = account.journalLines.reduce((s: number, l: any) => s + (l.creditAmount || 0), 0);
    const journalAmt  = totalDebit - totalCredit;
    // If no date filter: fall back to currentBalance
    const amount = journalAmt !== 0 ? journalAmt : (startDate ? 0 : (account.currentBalance || 0));
    return { accountCode: account.accountCode, accountName: account.accountName, amount };
  });

  const totalIncome   = income.reduce((sum, acc) => sum + acc.amount, 0);
  const totalExpenses = expenses.reduce((sum, acc) => sum + acc.amount, 0);

  return NextResponse.json({
    income,
    expenses,
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    period: { startDate: startDate || null, endDate: endDate || null },
  });
}


// Balance Sheet — full heads including Loans Given, Cash in Hand, Interest Receivable
async function getBalanceSheet(companyId: string | null) {
  const where = companyId ? { companyId, isActive: true } : { isActive: true };

  // ── 1. CASH IN HAND (CashBook table) ─────────────────────────────────────────
  const cashBook = companyId
    ? await db.cashBook.findUnique({ where: { companyId }, select: { currentBalance: true } })
    : null;
  const cashInHand = cashBook?.currentBalance || 0;

  // ── 2. BANK BALANCES (BankAccount table = source of truth) ───────────────────
  const bankAccountsData = companyId
    ? await db.bankAccount.findMany({ where: { companyId, isActive: true } })
    : await db.bankAccount.findMany({ where: { isActive: true } });
  const actualBankTotal = bankAccountsData.reduce((s, b) => s + (b.currentBalance || 0), 0);

  // ── 3. LOANS GIVEN (active outstanding principal from Ledger) ────────────────
  const loanAccounts = await db.chartOfAccount.findMany({
    where: { ...(companyId ? { companyId } : {}), accountCode: { in: ['1200', '1201', '1210'] }, isActive: true }
  });
  
  const genLoansOutstanding = Math.max(0, loanAccounts.find(a => a.accountCode === '1200')?.currentBalance || 0);
  const onlineLoansOutstanding = Math.max(0, loanAccounts.find(a => a.accountCode === '1201')?.currentBalance || 0);
  const offlineLoansOutstanding = Math.max(0, loanAccounts.find(a => a.accountCode === '1210')?.currentBalance || 0);

  // ── 4. INTEREST RECEIVABLE (ChartOfAccount 13xx) ─────────────────────────────
  const interestReceivableAcct = await db.chartOfAccount.findFirst({
    where: { ...(companyId ? { companyId } : {}), accountCode: { startsWith: '13' }, isActive: true },
    orderBy: { accountCode: 'asc' }
  });
  const interestReceivable = Math.max(0, interestReceivableAcct?.currentBalance || 0);

  // ── 5. FIXED/OTHER ASSETS from ChartOfAccount ────────────────────────────────
  // Skip 11xx (cash/bank), 12xx (loans), 13xx (receivables), 14xx (alt bank codes)
  const ASSET_SKIP_PREFIXES = ['11', '12', '13', '14'];
  const allAssetAccounts = await db.chartOfAccount.findMany({
    where: { ...where, accountType: 'ASSET' },
    orderBy: { accountCode: 'asc' }
  });
  const otherAssets = allAssetAccounts.filter(a =>
    !ASSET_SKIP_PREFIXES.some(p => a.accountCode.startsWith(p))
  );

  // ── BUILD ASSETS ──────────────────────────────────────────────────────────────
  const assets: any[] = [
    { accountCode: 'SEC_CA', accountName: '── Current Assets ──', amount: 0, isSection: true },
    { accountCode: '1101', accountName: 'Cash in Hand', amount: cashInHand },
    {
      accountCode: '1102', accountName: 'Bank Accounts', amount: actualBankTotal, isHead: true,
      subAccounts: bankAccountsData.map(b => ({
        accountCode: b.id,
        accountName: `${b.bankName} \u2013 ${b.accountNumber?.slice(-4) || 'XXXX'}`,
        amount: b.currentBalance || 0, isSubHead: true
      }))
    },
    { accountCode: 'SEC_LP', accountName: '── Loans Portfolio ──', amount: 0, isSection: true },
    ...(genLoansOutstanding > 0 ? [{ accountCode: '1200', accountName: 'Loans Given (Principal Outstanding)', amount: genLoansOutstanding }] : []),
    ...(onlineLoansOutstanding > 0 ? [{ accountCode: '1201', accountName: 'Online Loans Given', amount: onlineLoansOutstanding }] : []),
    ...(offlineLoansOutstanding > 0 ? [{ accountCode: '1210', accountName: 'Offline Loans Given', amount: offlineLoansOutstanding }] : []),
    ...(genLoansOutstanding === 0 && onlineLoansOutstanding === 0 && offlineLoansOutstanding === 0 ? [{ accountCode: 'NL', accountName: 'No Active Loans', amount: 0 }] : []),
    ...(interestReceivable > 0 ? [
      { accountCode: 'SEC_REC', accountName: '── Receivables ──', amount: 0, isSection: true },
      { accountCode: '1301', accountName: 'Interest Receivable', amount: interestReceivable }
    ] : []),
    ...(otherAssets.length > 0 ? [
      { accountCode: 'SEC_FA', accountName: '── Fixed Assets ──', amount: 0, isSection: true },
      ...otherAssets.map(a => ({ accountCode: a.accountCode, accountName: a.accountName, amount: a.currentBalance || 0 }))
    ] : []),
  ];

  // ── 6. LIABILITIES ────────────────────────────────────────────────────────────
  const liabilityAccounts = await db.chartOfAccount.findMany({
    where: { ...where, accountType: 'LIABILITY' },
    orderBy: { accountCode: 'asc' }
  });

  // Standard heads always shown (even at zero)
  const stdLiabHeads = [
    { code: '2101', name: 'Bank Loans' },
    { code: '2110', name: 'Investor Capital' },
    { code: '2120', name: 'Borrowed Funds' },
    { code: '2201', name: 'Accounts Payable' },
    { code: '2301', name: 'GST Payable' },
    { code: '2302', name: 'TDS Payable' },
    { code: '2401', name: 'Agent Commission Payable' },
  ];

  const liabilities: any[] = stdLiabHeads.map(std => {
    const acct = liabilityAccounts.find(a => a.accountCode === std.code);
    return { accountCode: std.code, accountName: std.name, amount: Math.abs(acct?.currentBalance || 0) };
  });

  // Add any extra liability accounts not in standard list
  for (const acct of liabilityAccounts) {
    if (!stdLiabHeads.find(s => s.code === acct.accountCode)) {
      liabilities.push({ accountCode: acct.accountCode, accountName: acct.accountName, amount: Math.abs(acct.currentBalance || 0) });
    }
  }



  // ── 7. EQUITY ─────────────────────────────────────────────────────────────────
  const equity: any[] = [];

  if (companyId) {
    const coaOwnerCapital = await db.chartOfAccount.findFirst({ where: { companyId, accountCode: '3002', isActive: true } });
    const coaOpeningEquity = await db.chartOfAccount.findFirst({ where: { companyId, accountCode: '3001', isActive: true } });
    
    const ownerCapital = Math.abs(coaOwnerCapital?.currentBalance || 0);
    const openingEquity = Math.abs(coaOpeningEquity?.currentBalance || 0);

    if (ownerCapital !== 0) {
      equity.push({ accountCode: '3002', accountName: "Owner's Capital (Invested)", amount: ownerCapital });
    }
    if (openingEquity !== 0) {
      equity.push({ accountCode: '3001', accountName: "Opening Balance Equity", amount: openingEquity });
    }

    const retainedAcct = await db.chartOfAccount.findFirst({ where: { companyId, accountCode: '3003', isActive: true } });
    const retainedAmt = Math.abs(retainedAcct?.currentBalance || 0);
    if (retainedAmt !== 0) {
      equity.push({ accountCode: '3003', accountName: 'Retained Earnings (Prior Years)', amount: retainedAmt });
    }
  } else {
    const eqAccounts = await db.chartOfAccount.findMany({ where: { ...where, accountType: 'EQUITY' }, orderBy: { accountCode: 'asc' } });
    eqAccounts.forEach(a => equity.push({ accountCode: a.accountCode, accountName: a.accountName, amount: a.currentBalance || 0 }));
  }

  // Current Year P&L - fetch exact calculation from getProfitAndLoss to ensure perfect match
  const pnlRes = await getProfitAndLoss(companyId);
  const pnlData = await pnlRes.json();
  const totalIncome = pnlData.totalIncome || 0;
  const totalExpenses = pnlData.totalExpenses || 0;
  const currentYearProfit = pnlData.netProfit || 0;
  equity.push({ accountCode: 'PL', accountName: 'Current Year Profit/(Loss)', amount: currentYearProfit });

  // ── TOTALS ────────────────────────────────────────────────────────────────────
  const totalAssets = assets.filter(a => !a.isSection).reduce((s, a) => s + (a.amount || 0), 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + (a.amount || 0), 0);
  const totalEquity = equity.reduce((s, a) => s + (a.amount || 0), 0);

  return NextResponse.json({
    assets, liabilities, equity,
    totalAssets, totalLiabilities, totalEquity,
    summary: { totalIncome, totalExpenses, currentYearProfit },
    balanceCheck: {
      assets: totalAssets,
      liabilitiesAndEquity: totalLiabilities + totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
      difference: Math.abs(totalAssets - (totalLiabilities + totalEquity))
    }
  });
}


// Loan Portfolio Report
async function getLoanPortfolioReport(companyId: string | null) {
  try {
    // Build where clause
    const loanWhere = companyId 
      ? { companyId, status: { in: [LoanStatusConst.ACTIVE, LoanStatusConst.DISBURSED, LoanStatusConst.CLOSED] } } 
      : { status: { in: [LoanStatusConst.ACTIVE, LoanStatusConst.DISBURSED, LoanStatusConst.CLOSED] } };
    
    const activeLoanWhere = companyId 
      ? { companyId, status: { in: [LoanStatusConst.ACTIVE, LoanStatusConst.DISBURSED] } } 
      : { status: { in: [LoanStatusConst.ACTIVE, LoanStatusConst.DISBURSED] } };

    // Get loan statistics
    const [totalDisbursed, totalOutstanding, activeLoans] = await Promise.all([
      db.loanApplication.aggregate({
        where: loanWhere,
        _sum: { disbursedAmount: true },
      }),
      db.loanApplication.aggregate({
        where: activeLoanWhere,
        _sum: { disbursedAmount: true },
      }),
      db.loanApplication.count({
        where: activeLoanWhere,
      }),
    ]);

    // Get EMI statistics
    const emiWhere = companyId 
      ? { loanApplication: { companyId } } 
      : {};
    
    const [collectedInterest, pendingEMIs, overdueEMIs] = await Promise.all([
      db.eMISchedule.aggregate({
        where: {
          ...emiWhere,
          paymentStatus: 'PAID',
        },
        _sum: { interestAmount: true },
      }),
      db.eMISchedule.count({
        where: {
          ...emiWhere,
          paymentStatus: 'PENDING',
        },
      }),
      db.eMISchedule.count({
        where: {
          ...emiWhere,
          paymentStatus: 'OVERDUE',
        },
      }),
    ]);

    return NextResponse.json({
      totalDisbursed: totalDisbursed._sum.disbursedAmount || 0,
      totalOutstanding: totalOutstanding._sum.disbursedAmount || 0,
      totalInterestCollected: collectedInterest._sum.interestAmount || 0,
      pendingEMIs,
      overdueEMIs,
      activeLoans,
    });
  } catch (error) {
    console.error('Error in portfolio report:', error);
    return NextResponse.json({
      totalDisbursed: 0,
      totalOutstanding: 0,
      totalInterestCollected: 0,
      pendingEMIs: 0,
      overdueEMIs: 0,
      activeLoans: 0,
    });
  }
}

// Cash Flow Statement
async function getCashFlowStatement(companyId: string | null, startDate?: string | null, endDate?: string | null) {
  const where = companyId ? { companyId } : {};
  
  // Simplified cash flow statement
  const bankAccount = await db.chartOfAccount.findFirst({
    where: { ...where, accountCode: '1400' },
  });

  const cashAccount = await db.chartOfAccount.findFirst({
    where: { ...where, accountCode: '1500' },
  });

  return NextResponse.json({
    period: { startDate, endDate },
    openingBalance: {
      bank: bankAccount?.openingBalance || 0,
      cash: cashAccount?.openingBalance || 0,
    },
    operatingActivities: {
      interestReceived: 0,
      processingFees: 0,
      expensesPaid: 0,
      netOperatingCash: 0,
    },
    investingActivities: {
      loanDisbursements: 0,
      principalRepaid: 0,
      netInvestingCash: 0,
    },
    closingBalance: {
      bank: bankAccount?.currentBalance || 0,
      cash: cashAccount?.currentBalance || 0,
    },
    netCashChange: (bankAccount?.currentBalance || 0) - (bankAccount?.openingBalance || 0),
  });
}

// Receivables Aging Report
async function getReceivablesAging(companyId: string | null) {
  const now = new Date();
  
  try {
    const emiWhere = companyId 
      ? { paymentStatus: EMIPaymentStatusConst.OVERDUE, loanApplication: { companyId } } 
      : { paymentStatus: EMIPaymentStatusConst.OVERDUE };
    
    const overdueEMIs = await db.eMISchedule.findMany({
      where: emiWhere,
      include: {
        loanApplication: {
          include: {
            customer: true,
          },
        },
      },
    });

    const agingBuckets = {
      current: [] as any[],
      days30: [] as any[],
      days60: [] as any[],
      days90: [] as any[],
      over90: [] as any[],
    };

    let currentTotal = 0;
    let days30Total = 0;
    let days60Total = 0;
    let days90Total = 0;
    let over90Total = 0;

    for (const emi of overdueEMIs) {
      const daysOverdue = Math.floor((now.getTime() - new Date(emi.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const item = {
        loanNo: emi.loanApplication.applicationNo,
        customer: emi.loanApplication.customer?.name || 'Unknown',
        emiNo: emi.installmentNumber,
        dueDate: emi.dueDate,
        amount: emi.totalAmount,
        daysOverdue,
      };

      if (daysOverdue <= 0) {
        agingBuckets.current.push(item);
        currentTotal += emi.totalAmount;
      } else if (daysOverdue <= 30) {
        agingBuckets.days30.push(item);
        days30Total += emi.totalAmount;
      } else if (daysOverdue <= 60) {
        agingBuckets.days60.push(item);
        days60Total += emi.totalAmount;
      } else if (daysOverdue <= 90) {
        agingBuckets.days90.push(item);
        days90Total += emi.totalAmount;
      } else {
        agingBuckets.over90.push(item);
        over90Total += emi.totalAmount;
      }
    }

    return NextResponse.json({
      agingBuckets,
      totals: {
        current: currentTotal,
        days30: days30Total,
        days60: days60Total,
        days90: days90Total,
        over90: over90Total,
        total: currentTotal + days30Total + days60Total + days90Total + over90Total,
      },
    });
  } catch (error) {
    console.error('Error in receivables aging:', error);
    return NextResponse.json({
      agingBuckets: {
        current: [],
        days30: [],
        days60: [],
        days90: [],
        over90: [],
      },
      totals: {
        current: 0,
        days30: 0,
        days60: 0,
        days90: 0,
        over90: 0,
        total: 0,
      },
    });
  }
}
