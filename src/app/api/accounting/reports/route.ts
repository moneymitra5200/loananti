import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LoanStatus, EMIPaymentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LoanStatusConst = {
  ACTIVE: LoanStatus.ACTIVE,
  ACTIVE_INTEREST_ONLY: LoanStatus.ACTIVE_INTEREST_ONLY,
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
        return await getTrialBalance(companyId, endDate ? new Date(endDate) : undefined);
      case 'profit-loss':
        return await getProfitAndLoss(companyId, startDate, endDate);
      case 'balance-sheet':
        return await getBalanceSheet(companyId, endDate ? new Date(endDate) : undefined);
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
async function getTrialBalance(companyId: string | null, asOfDate?: Date) {
  const where = companyId ? { companyId, isActive: true } : { isActive: true };
  
  const accounts = await db.chartOfAccount.findMany({
    where,
    orderBy: { accountCode: 'asc' },
  });

  const lines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        ...(companyId ? { companyId } : {}),
        isApproved: true,
        isReversed: false,
        ...(asOfDate ? { entryDate: { lte: asOfDate } } : {})
      }
    },
    select: {
      accountId: true,
      debitAmount: true,
      creditAmount: true
    }
  });

  const balanceMap = new Map<string, { debit: number; credit: number }>();
  for (const line of lines) {
    const existing = balanceMap.get(line.accountId) || { debit: 0, credit: 0 };
    existing.debit += line.debitAmount;
    existing.credit += line.creditAmount;
    balanceMap.set(line.accountId, existing);
  }

  const trialBalance = accounts.map(account => {
    const balances = balanceMap.get(account.id) || { debit: 0, credit: 0 };
    
    let balance = 0;
    if (account.accountType === 'ASSET' || account.accountType === 'EXPENSE') {
      balance = account.openingBalance + balances.debit - balances.credit;
    } else {
      balance = account.openingBalance + balances.credit - balances.debit;
    }

    let debitBalance = 0;
    let creditBalance = 0;

    if (account.accountType === 'ASSET' || account.accountType === 'EXPENSE') {
      if (balance >= 0) {
        debitBalance = balance;
      } else {
        creditBalance = Math.abs(balance);
      }
    } else {
      if (balance >= 0) {
        creditBalance = balance;
      } else {
        debitBalance = Math.abs(balance);
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
    // NOTE: Only include cashbook types that do NOT have a corresponding journal entry.
    // PENALTY_INCOME is intentionally excluded here because the penalty flow ALWAYS
    // creates a journal entry (DR Cash / CR Penalty Income) — the cashbook entry is
    // just a subsidiary record. Including it here would double-count penalty in P&L.
    const cbWhere: any = {
      cashBook: { companyId },
      entryType: 'CREDIT',
      referenceType: { in: ['PROCESSING_FEE', 'MIRROR_INTEREST_INCOME', 'EXTRA_EMI_PROFIT', 'INTEREST_INCOME', 'LATE_FEE'] }
    };
    if (Object.keys(cbDateFilter).length > 0) cbWhere.entryDate = cbDateFilter;

    const cbEntries = await db.cashBookEntry.findMany({
      where: cbWhere,
      select: { amount: true, referenceType: true, referenceId: true }
    });

    const existingJournals = await db.journalEntry.findMany({
      where: { companyId, isReversed: false },
      select: { referenceId: true }
    });
    const journalRefIds = new Set(existingJournals.map(j => j.referenceId).filter(Boolean));
    
    // Map cashbook types to standard account codes
    const cbMapping: Record<string, string> = {
      'PROCESSING_FEE': '4121', // Processing Fees
      'LATE_FEE': '4122',
      'INTEREST_INCOME': '4110',
      'MIRROR_INTEREST_INCOME': '4110',
      'EXTRA_EMI_PROFIT': '4110'
    };
    
    cbEntries.forEach(entry => {
      // Skip if there's already a journal entry for this transaction (avoids double counting)
      if (entry.referenceId) {
        const cleanRefId = entry.referenceId.replace(/-JE$/, '');
        if (
          journalRefIds.has(entry.referenceId) ||
          journalRefIds.has(`${entry.referenceId}-JE`) ||
          journalRefIds.has(cleanRefId)
        ) {
          return;
        }
      }
      
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
// Balance Sheet — full heads including Loans Given, Cash in Hand, Interest Receivable
async function getBalanceSheet(companyId: string | null, asOfDate?: Date) {
  const dateFilter = asOfDate || new Date();
  const where = companyId ? { companyId, isActive: true } : { isActive: true };

  // ─── 1. FETCH ALL ACCOUNTS ──────────────────────────────────────────────
  const accounts = await db.chartOfAccount.findMany({
    where,
    orderBy: { accountCode: 'asc' },
  });

  // ─── 2. FETCH ALL APPROVED JOURNAL LINES (Up to date) ──────────────────
  const journalLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        ...(companyId ? { companyId } : {}),
        isApproved: true,
        isReversed: false,
        entryDate: { lte: dateFilter }
      }
    },
    select: {
      accountId: true,
      debitAmount: true,
      creditAmount: true
    }
  });

  // ─── 3. FETCH GROUND TRUTH DATA FOR CRITICAL ACCOUNTS ───────────────────
  // Note: All ground truth sub-queries must respect the dateFilter to prevent live leakage!
  const [cashBook, bankAccountsData, equityEntries, onlineLoans, offlineLoans] = await Promise.all([
    companyId ? db.cashBook.findUnique({ where: { companyId } }) : null,
    db.bankAccount.findMany({ where: { ...(companyId ? { companyId } : {}), isActive: true } }),
    db.equityEntry.findMany({ where: { ...(companyId ? { companyId } : {}) } }),
    // Online loans — disbursed on or before dateFilter (exclude CLOSED = fully recovered)
    db.loanApplication.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED'] }, // CLOSED excluded — ₹0 outstanding
        disbursedAt: { lte: dateFilter }
      },
      select: {
        disbursedAmount: true,
        emiSchedules: {
          where: {
            paymentStatus: 'PAID',
            paidDate: { lte: dateFilter }
          },
          select: { paidPrincipal: true }
        }
      }
    }),
    // Offline loans — companyId filter already ensures each company sees only its own loans.
    // Mirror loans in the mirror company ARE that company's real funded assets.
    db.offlineLoan.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED'] }, // CLOSED excluded — fully recovered
        disbursementDate: { lte: dateFilter }
      },
      select: {
        loanAmount: true,
        emis: {
          where: {
            paymentStatus: 'PAID',
            paidDate: { lte: dateFilter }
          },
          select: { paidPrincipal: true }
        }
      }
    })
  ]);

  // Compute historical ground truths up to dateFilter
  
  // 1. Cash Balance up to dateFilter
  const cbWhere: any = { entryDate: { lte: dateFilter } };
  if (companyId) cbWhere.cashBook = { companyId };
  const [cbCredits, cbDebits] = await Promise.all([
    db.cashBookEntry.aggregate({ where: { ...cbWhere, entryType: 'CREDIT' }, _sum: { amount: true } }),
    db.cashBookEntry.aggregate({ where: { ...cbWhere, entryType: 'DEBIT' }, _sum: { amount: true } })
  ]);
  const openingCash = cashBook?.openingBalance || 0;
  const actualCash = openingCash + (cbCredits._sum.amount || 0) - (cbDebits._sum.amount || 0);

  // 2. Bank Balance up to dateFilter
  let actualBankTotal = 0;
  const bankAccountsDataWithHistorical = await Promise.all(
    bankAccountsData.map(async (bank) => {
      const txCredits = await db.bankTransaction.aggregate({
        where: { bankAccountId: bank.id, transactionDate: { lte: dateFilter }, transactionType: 'CREDIT' },
        _sum: { amount: true }
      });
      const txDebits = await db.bankTransaction.aggregate({
        where: { bankAccountId: bank.id, transactionDate: { lte: dateFilter }, transactionType: 'DEBIT' },
        _sum: { amount: true }
      });
      const historicalBalance = bank.openingBalance + (txCredits._sum.amount || 0) - (txDebits._sum.amount || 0);
      actualBankTotal += historicalBalance;
      return {
        ...bank,
        currentBalance: historicalBalance
      };
    })
  );

  // 3. Capital (Equity) up to dateFilter
  const actualCapital = equityEntries
    .filter(e => new Date(e.entryDate || e.createdAt) <= dateFilter)
    .reduce((s, e) => e.entryType === 'WITHDRAWAL' ? s - (e.amount || 0) : s + (e.amount || 0), 0);

  // 4. Online Loans outstanding principal up to dateFilter
  const actualOnlineLoans = onlineLoans.reduce((sum, loan) => {
    const disbursed = loan.disbursedAmount || 0;
    const paidPrincipal = loan.emiSchedules.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
    return sum + Math.max(0, disbursed - paidPrincipal);
  }, 0);

  // 5. Offline Loans outstanding principal up to dateFilter
  const actualOfflineLoans = offlineLoans.reduce((sum, loan) => {
    const disbursed = loan.loanAmount || 0;
    const paidPrincipal = loan.emis.reduce((s, emi) => s + (emi.paidPrincipal || 0), 0);
    return sum + Math.max(0, disbursed - paidPrincipal);
  }, 0);

  // ─── 4. AGGREGATE JOURNAL ACTIVITY ──────────────────────────────────────
  const drMap: Record<string, number> = {};
  const crMap: Record<string, number> = {};
  for (const line of journalLines) {
    drMap[line.accountId] = (drMap[line.accountId] || 0) + line.debitAmount;
    crMap[line.accountId] = (crMap[line.accountId] || 0) + line.creditAmount;
  }

  // ─── 5. COMPUTE BALANCES FOR ALL ACCOUNTS ───────────────────────────────
  const accountBalances: Record<string, number> = {};
  for (const acc of accounts) {
    const dr = drMap[acc.id] || 0;
    const cr = crMap[acc.id] || 0;
    const op = acc.openingBalance || 0;
    const isDrNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
    
    let balance = isDrNormal ? op + dr - cr : op + cr - dr;

    // Apply ground truth overrides
    if (acc.accountCode === '1101') balance = actualCash;
    if (acc.accountCode === '1102') balance = actualBankTotal;
    if (acc.accountCode === '1201') balance = actualOnlineLoans;
    if (acc.accountCode === '1210') balance = actualOfflineLoans;
    if (acc.accountCode === '3002') {
      // Always use EquityEntry-derived actualCapital (source of truth) instead of stale CoA balance
      balance = actualCapital !== 0 ? actualCapital : balance;
    }
    if (acc.accountCode === '1200') balance = actualOnlineLoans + actualOfflineLoans;

    accountBalances[acc.accountCode] = balance;
  }

  // ─── 6. BUILD BALANCE SHEET SECTIONS ────────────────────────────────────
  const assets: any[] = [
    { accountCode: 'SEC_CA', accountName: '── Current Assets ──', amount: 0, isSection: true },
    { accountCode: '1101', accountName: 'Cash in Hand', amount: accountBalances['1101'] || 0 },
    {
      accountCode: '1102', accountName: 'Bank Accounts', amount: actualBankTotal, isHead: true,
      subAccounts: bankAccountsDataWithHistorical.map(b => ({
        accountCode: b.id,
        accountName: `${b.bankName} \u2013 ${b.accountNumber?.slice(-4) || 'XXXX'}`,
        amount: b.currentBalance, isSubHead: true
      }))
    },
    { accountCode: 'SEC_LP', accountName: '── Loans Portfolio ──', amount: 0, isSection: true },
    { accountCode: '1201', accountName: 'Online Loans Given', amount: accountBalances['1201'] || 0 },
    { accountCode: '1210', accountName: 'Offline Loans Given', amount: accountBalances['1210'] || 0 },
    { accountCode: '1301', accountName: 'Interest Receivable', amount: accountBalances['1301'] || 0 },
    { accountCode: '1302', accountName: 'Processing Fee Receivable', amount: accountBalances['1302'] || 0 },
    { accountCode: '1303', accountName: 'Penalty Receivable', amount: accountBalances['1303'] || 0 },
    { accountCode: '1305', accountName: 'Overdue Interest Receivable', amount: accountBalances['1305'] || 0 }
  ];

  // Add other assets (Fixed Assets, etc)
  const bankNamesToExclude = new Set(
    bankAccountsData.flatMap(b => [
      b.bankName,
      b.accountName,
      `${b.bankName} - ${b.accountNumber?.slice(-4) || 'XXXX'}`,
      `${b.bankName} \u2013 ${b.accountNumber?.slice(-4) || 'XXXX'}`,
      `${b.bankName} - ${b.accountNumber}`
    ].filter(Boolean))
  );

  const otherAssetAccounts = accounts.filter(a => 
    a.accountType === 'ASSET' && 
    !['1101', '1102', '1200', '1201', '1210', '1301', '1302', '1303', '1305'].includes(a.accountCode) &&
    !a.accountCode.startsWith('110') &&
    !a.accountCode.startsWith('14') && // Exclude custom bank accounts starting with 14
    !bankNamesToExclude.has(a.accountName) &&
    !a.accountName.toUpperCase().includes('BANK OF BARODA')
  );
  if (otherAssetAccounts.length > 0) {
    assets.push({ accountCode: 'SEC_OA', accountName: '── Other Assets ──', amount: 0, isSection: true });
    otherAssetAccounts.forEach(a => {
      assets.push({ accountCode: a.accountCode, accountName: a.accountName, amount: accountBalances[a.accountCode] || 0 });
    });
  }

  // LIABILITIES (Keep structure permanent even if 0)
  const liabilities: any[] = accounts
    .filter(a => a.accountType === 'LIABILITY') // Include all liabilities (including Investor Capital 2110)
    .map(a => ({ accountCode: a.accountCode, accountName: a.accountName, amount: accountBalances[a.accountCode] || 0 }));
    
  // Add Owner's Capital to Liabilities instead of Equity
  liabilities.push({
    accountCode: '3002',
    accountName: "Owner's Capital",
    amount: accountBalances['3002'] || 0
  });

  // EQUITY (Keep structure permanent even if 0)
  const equity: any[] = accounts
    .filter(a => a.accountType === 'EQUITY' && !['3004', '3002'].includes(a.accountCode))
    .map(a => ({ accountCode: a.accountCode, accountName: a.accountName, amount: accountBalances[a.accountCode] || 0 }));

  // Current Year P&L
  const pnlRes = await getProfitAndLoss(companyId, null, dateFilter.toISOString());
  const pnlData = await pnlRes.json();
  const currentYearProfit = pnlData.netProfit || 0;
  equity.push({ accountCode: 'PL', accountName: 'Current Year Profit/(Loss)', amount: currentYearProfit });

  // ── TOTALS ────────────────────────────────────────────────────────────────────
  const totalAssets = assets.filter(a => !a.isSection).reduce((s, a) => s + (a.amount || 0), 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + (a.amount || 0), 0);
  const totalEquity = equity.reduce((s, a) => s + (a.amount || 0), 0);

  return NextResponse.json({
    assets, liabilities, equity,
    totalAssets, totalLiabilities, totalEquity,
    summary: { 
      totalIncome: pnlData.totalIncome || 0, 
      totalExpenses: pnlData.totalExpenses || 0, 
      currentYearProfit 
    },
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
      ? { companyId, status: { in: [LoanStatusConst.ACTIVE, LoanStatusConst.ACTIVE_INTEREST_ONLY, LoanStatusConst.DISBURSED, LoanStatusConst.CLOSED] } } 
      : { status: { in: [LoanStatusConst.ACTIVE, LoanStatusConst.ACTIVE_INTEREST_ONLY, LoanStatusConst.DISBURSED, LoanStatusConst.CLOSED] } };
    
    const activeLoanWhere = companyId 
      ? { companyId, status: { in: [LoanStatusConst.ACTIVE, LoanStatusConst.ACTIVE_INTEREST_ONLY, LoanStatusConst.DISBURSED] } } 
      : { status: { in: [LoanStatusConst.ACTIVE, LoanStatusConst.ACTIVE_INTEREST_ONLY, LoanStatusConst.DISBURSED] } };

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
