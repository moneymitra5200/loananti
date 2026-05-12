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
    const amount = journalAmt !== 0 ? journalAmt : (startDate ? 0 : (account.currentBalance || 0));
    return { accountCode: account.accountCode, accountName: account.accountName, amount };
  });

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


// Balance Sheet
async function getBalanceSheet(companyId: string | null) {
  const where = companyId ? { companyId, isActive: true } : { isActive: true };

  // ── ASSETS ──────────────────────────────────────────────────────────────────
  const allAssetAccounts = await db.chartOfAccount.findMany({
    where: { ...where, accountType: 'ASSET' },
    orderBy: { accountCode: 'asc' },
  });

  // ── BANK: Use BankAccount table as source of truth ───────────────────────
  const bankAccountsData = companyId
    ? await db.bankAccount.findMany({ where: { companyId, isActive: true } })
    : await db.bankAccount.findMany({ where: { isActive: true } });

  const actualBankTotal = bankAccountsData.reduce((sum, b) => sum + (b.currentBalance || 0), 0);

  const realBankNames = new Set<string>();
  for (const b of bankAccountsData) {
    if (b.bankName) realBankNames.add(b.bankName.trim().toLowerCase());
    if (b.accountName) realBankNames.add(b.accountName.trim().toLowerCase());
    if (b.bankName && b.accountNumber)
      realBankNames.add(`${b.bankName} - ${b.accountNumber.slice(-4)}`.toLowerCase());
  }

  const BANK_CODES_EXACT = new Set(['1000', '1010', '1102', '1103', '1104']);
  const BANK_CODE_PREFIXES = ['1010', '1102', '1103', '1104'];
  const isBankCode = (code: string, name: string) => {
    if (BANK_CODES_EXACT.has(code)) return true;
    if (BANK_CODE_PREFIXES.some(p => code.startsWith(p + '-') || code.startsWith(p + '.') || code === p)) return true;
    const nameLower = name.trim().toLowerCase();
    if ([...realBankNames].some(r => nameLower === r || nameLower.startsWith(r + ' ') || nameLower.startsWith(r + '-'))) return true;
    if (nameLower === 'bank' || nameLower === 'bank account' || nameLower.startsWith('bank account') || nameLower.startsWith('bank - ')) return true;
    return false;
  };

  const EXCLUDE_ASSET_NAMES = [
    'online loan receivable', 'offline loan receivable',
    'online loans receivable', 'offline loans receivable',
    'online loan', 'offline loan',
  ];
  const nonBankAssets = allAssetAccounts.filter(a => {
    if (isBankCode(a.accountCode, a.accountName)) return false;
    const nameLower = a.accountName.trim().toLowerCase();
    if (EXCLUDE_ASSET_NAMES.some(ex => nameLower.includes(ex))) return false;
    return true;
  });

  const renameAssetLabel = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('loans receivable') || lower === 'loan receivable') return 'Loan Given';
    return name;
  };

  const assets: any[] = nonBankAssets.map(account => ({
    accountCode: account.accountCode,
    accountName: renameAssetLabel(account.accountName),
    amount: account.currentBalance,
    isHead: false,
  }));

  assets.push({
    accountCode: '1102',
    accountName: 'Bank Account',
    amount: actualBankTotal,
    isHead: true,
    subAccounts: bankAccountsData.map(b => ({
      accountCode: b.id,
      accountName: `${b.bankName} – ${b.accountNumber?.slice(-4) || 'XXXX'}`,
      amount: b.currentBalance || 0,
      isSubHead: true,
    }))
  });

  // ── LIABILITIES: ChartOfAccount + BorrowedMoney table ────────────────────
  // chartOfAccount LIABILITY rows (journal-based)
  const liabilityAccounts = await db.chartOfAccount.findMany({
    where: { ...where, accountType: 'LIABILITY' },
    orderBy: { accountCode: 'asc' },
  });

  const liabilities: any[] = liabilityAccounts
    .filter(a => (a.currentBalance || 0) !== 0)
    .map(account => ({
      accountCode: account.accountCode,
      accountName: account.accountName,
      amount: account.currentBalance,
    }));

  // Also pull from BorrowedMoney table (source of truth for borrowings)
  if (companyId) {
    const borrowedRows = await db.borrowedMoney.findMany({ where: { companyId } });
    const borrowedBalance = borrowedRows.reduce((s, b) => s + ((b.amount || 0) - (b.amountRepaid || 0)), 0);
    if (borrowedBalance > 0.01) {
      // Only add if NOT already captured by chartOfAccount (avoid double-count)
      const alreadyCaptured = liabilities.reduce((s, l) => s + (l.amount || 0), 0);
      if (alreadyCaptured < borrowedBalance * 0.5) {
        // chartOfAccount is clearly stale — replace with real data
        liabilities.length = 0;
        liabilities.push({
          accountCode: '2100',
          accountName: 'Borrowed Funds',
          amount: borrowedBalance,
        });
      }
    }
  }

  // ── EQUITY: EquityEntry table is the source of truth ─────────────────────
  // chartOfAccount EQUITY currentBalance is only updated by journal entries.
  // Many equity additions go through the EquityEntry table directly.
  const equity: any[] = [];

  if (companyId) {
    const equityEntries = await db.equityEntry.findMany({ where: { companyId } });
    const ownerCapital = equityEntries.reduce((s, e) =>
      e.entryType === 'WITHDRAWAL' ? s - (e.amount || 0) : s + (e.amount || 0), 0
    );
    if (ownerCapital !== 0) {
      equity.push({
        accountCode: '3002',
        accountName: "Owner's Capital",
        amount: ownerCapital,
      });
    }
  } else {
    // Fallback: use chartOfAccount for multi-company view
    const equityAccounts = await db.chartOfAccount.findMany({
      where: { ...where, accountType: 'EQUITY' },
      orderBy: { accountCode: 'asc' },
    });
    equityAccounts.forEach(account => {
      if ((account.currentBalance || 0) !== 0) {
        equity.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: account.currentBalance,
        });
      }
    });
  }

  // ── CURRENT YEAR PROFIT: computed from journal lines (same as P&L report) ─
  // This MUST use the same method as getProfitAndLoss() so both sides match.
  const plWhere = companyId ? { companyId, isActive: true } : { isActive: true };
  const journalEntryWhere: Record<string, unknown> = { isApproved: true, isReversed: false };
  if (companyId) journalEntryWhere.companyId = companyId;

  const [incomeAccountsForPL, expenseAccountsForPL] = await Promise.all([
    db.chartOfAccount.findMany({
      where: { ...plWhere, accountType: 'INCOME' },
      include: {
        journalLines: {
          where: { journalEntry: journalEntryWhere },
          select: { debitAmount: true, creditAmount: true },
        },
      },
    }),
    db.chartOfAccount.findMany({
      where: { ...plWhere, accountType: 'EXPENSE' },
      include: {
        journalLines: {
          where: { journalEntry: journalEntryWhere },
          select: { debitAmount: true, creditAmount: true },
        },
      },
    }),
  ]);

  // Income = net credits on INCOME accounts (same formula as getProfitAndLoss)
  const journalIncome = (incomeAccountsForPL as any[]).reduce((sum, acc) => {
    const cr = acc.journalLines.reduce((s: number, l: any) => s + (l.creditAmount || 0), 0);
    const dr = acc.journalLines.reduce((s: number, l: any) => s + (l.debitAmount  || 0), 0);
    const amt = (cr - dr) !== 0 ? (cr - dr) : (acc.currentBalance || 0);
    return sum + amt;
  }, 0);

  // Expenses = net debits on EXPENSE accounts
  const journalExpenses = (expenseAccountsForPL as any[]).reduce((sum, acc) => {
    const dr = acc.journalLines.reduce((s: number, l: any) => s + (l.debitAmount  || 0), 0);
    const cr = acc.journalLines.reduce((s: number, l: any) => s + (l.creditAmount || 0), 0);
    const amt = (dr - cr) !== 0 ? (dr - cr) : (acc.currentBalance || 0);
    return sum + amt;
  }, 0);

  // Also add cashbook-based income (processing fees, penalty, mirror interest)
  // which may not appear in journal entries for all companies
  let cashbookIncome = 0;
  if (companyId) {
    const cbEntries = await db.cashBookEntry.findMany({
      where: {
        cashBook: { companyId },
        entryType: 'CREDIT',
        referenceType: { in: ['PROCESSING_FEE', 'MIRROR_INTEREST_INCOME', 'PENALTY_INCOME', 'EXTRA_EMI_PROFIT', 'INTEREST_INCOME'] }
      },
      select: { amount: true }
    });
    cashbookIncome = cbEntries.reduce((s, e) => s + (e.amount || 0), 0);
  }

  const effectiveIncome = Math.max(journalIncome, cashbookIncome);
  const currentYearProfit = effectiveIncome - journalExpenses;

  equity.push({
    accountCode: 'PL',
    accountName: 'Current Year Profit/(Loss)',
    amount: currentYearProfit,
  });

  // ── TOTALS ────────────────────────────────────────────────────────────────
  const totalAssets = assets.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalEquity = equity.reduce((sum, a) => sum + (a.amount || 0), 0);

  return NextResponse.json({
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    balanceCheck: {
      assets: totalAssets,
      liabilitiesAndEquity: totalLiabilities + totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    },
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
