import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { performOnDemandAccrual } from '@/lib/accrual-helper';

export const dynamic = 'force-dynamic';

/**
 * Helper to calculate Indian Financial Year dates
 */
function getIndianFY(year: number): { fyStart: Date; fyEnd: Date; label: string } {
  const fyStart = new Date(year, 3, 1, 0, 0, 0, 0); // April 1
  const fyEnd   = new Date(year + 1, 2, 31, 23, 59, 59, 999); // March 31
  return { fyStart, fyEnd, label: `FY ${year}-${String(year + 1).slice(-2)}` };
}

/**
 * Format Date/Time in IST (Asia/Kolkata) timezone
 */
function formatIST(date: Date | null | undefined, formatStr: 'date' | 'time' | 'datetime' = 'datetime'): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const dateFormatted = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  const timeFormatted = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const isDefaultTime = timeFormatted === '05:30:00' || timeFormatted === '00:00:00';

  if (formatStr === 'date' || (formatStr === 'datetime' && isDefaultTime)) {
    return dateFormatted;
  }

  if (formatStr === 'time') {
    return isDefaultTime ? '' : timeFormatted;
  }

  return `${dateFormatted} ${timeFormatted}`;
}

/**
 * Escape string for CSV format
 */
function toCSV(rows: Record<string, any>[]): string {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

/**
 * Clean string for safe filenames
 */
function cleanFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

const LR_CODES = ['1200', '1201', '1210', '1301', '1305', '1302'];

function isInitialSetup(entryType: string, entryDate: Date | string, disbursementDate: Date | string | null | undefined): boolean {
  if (!disbursementDate) return true;
  const diffTime = Math.abs(new Date(entryDate).getTime() - new Date(disbursementDate).getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 3;
}

function toLoanGivenLabel(accountName: string, customerName?: string): string {
  const base = accountName.replace(/loans? receivable/gi, 'Loan Given');
  if (customerName && base.toLowerCase().includes('loan given') && !base.includes(customerName)) {
    return `Loan Given — ${customerName}`;
  }
  return base;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const yearParam = searchParams.get('year');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    // Run on-demand accruals to ensure reports are real-time
    await performOnDemandAccrual(companyId);

    const yearNum = yearParam ? parseInt(yearParam) : (() => {
      const now = new Date();
      return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    })();

    const { fyStart, fyEnd, label } = getIndianFY(yearNum);

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { name: true, code: true }
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // ==========================================
    // 1. CHART OF ACCOUNTS
    // ==========================================
    const accounts = await db.chartOfAccount.findMany({
      where: { companyId, isActive: true },
      orderBy: { accountCode: 'asc' }
    });

    // ==========================================
    // 2. JOURNAL ENTRIES & LINES (Daybook source)
    // ==========================================
    const journalEntries = await db.journalEntry.findMany({
      where: { companyId, entryDate: { gte: fyStart, lte: fyEnd }, isReversed: false },
      include: {
        lines: {
          include: { account: { select: { accountCode: true, accountName: true } } }
        }
      },
      orderBy: { entryDate: 'asc' }
    });

    const jeRows = journalEntries.map(je => ({
      entry_number: je.entryNumber,
      entry_date: formatIST(je.entryDate, 'date'),
      entry_time: formatIST(je.entryDate, 'time'),
      entry_date_time: formatIST(je.entryDate, 'datetime'),
      reference_type: je.referenceType || '',
      reference_id: je.referenceId || '',
      narration: je.narration || '',
      total_debit: je.totalDebit,
      total_credit: je.totalCredit,
      is_approved: je.isApproved ? 'Yes' : 'No',
      created_at: formatIST(je.createdAt, 'datetime')
    }));

    const jeLineRows = journalEntries.flatMap(je =>
      je.lines.map(l => ({
        entry_number: je.entryNumber,
        entry_date: formatIST(je.entryDate, 'date'),
        entry_time: formatIST(je.entryDate, 'time'),
        entry_date_time: formatIST(je.entryDate, 'datetime'),
        account_code: l.account?.accountCode || '',
        account_name: l.account?.accountName || '',
        debit_amount: l.debitAmount || 0,
        credit_amount: l.creditAmount || 0,
        narration: l.narration || ''
      }))
    );

    // ==========================================
    // 3. DAYBOOK TRANSACTIONS
    // ==========================================
    const daybookRows = journalEntries.flatMap(je =>
      je.lines.map(l => ({
        date: formatIST(je.entryDate, 'date'),
        time: formatIST(je.entryDate, 'time'),
        date_time: formatIST(je.entryDate, 'datetime'),
        entry_number: je.entryNumber,
        particulars: l.account?.accountName || '',
        account_code: l.account?.accountCode || '',
        narration: l.narration || je.narration || '',
        debit: l.debitAmount || 0,
        credit: l.creditAmount || 0,
        reference_type: je.referenceType || '',
        reference_id: je.referenceId || ''
      }))
    );

    // ==========================================
    // 4. CASHBOOK ENTRIES
    // ==========================================
    const cashBook = await db.cashBook.findUnique({ where: { companyId } });
    const cashEntries = cashBook ? await db.cashBookEntry.findMany({
      where: {
        cashBookId: cashBook.id,
        entryDate: { gte: fyStart, lte: fyEnd }
      },
      orderBy: { entryDate: 'asc' }
    }) : [];

    const cashRows = cashEntries.map(e => ({
      date: formatIST(e.entryDate, 'date'),
      time: formatIST(e.entryDate, 'time'),
      date_time: formatIST(e.entryDate, 'datetime'),
      type: e.entryType,
      amount: e.amount,
      balance_after: e.balanceAfter,
      description: e.description || '',
      reference_type: e.referenceType || '',
      reference_id: e.referenceId || ''
    }));

    // ==========================================
    // 5. BANK TRANSACTIONS
    // ==========================================
    const bankAccounts = await db.bankAccount.findMany({
      where: { companyId, isActive: true },
      select: { id: true, bankName: true, accountNumber: true, currentBalance: true, openingBalance: true }
    });

    const bankAccountMap = new Map(bankAccounts.map(ba => [ba.id, ba]));
    const allBankTxns = bankAccounts.length > 0 ? await db.bankTransaction.findMany({
      where: {
        bankAccountId: { in: bankAccounts.map(ba => ba.id) },
        transactionDate: { gte: fyStart, lte: fyEnd }
      },
      orderBy: { transactionDate: 'asc' }
    }) : [];

    const bankTxRows = allBankTxns.map(t => {
      const ba = bankAccountMap.get(t.bankAccountId);
      return {
        bank_name: ba?.bankName || '',
        account_number: ba?.accountNumber || '',
        date: formatIST(t.transactionDate, 'date'),
        time: formatIST(t.transactionDate, 'time'),
        date_time: formatIST(t.transactionDate, 'datetime'),
        type: t.transactionType,
        amount: t.amount,
        balance_after: t.balanceAfter,
        description: t.description || '',
        reference_type: t.referenceType || '',
        reference_id: t.referenceId || ''
      };
    });

    // ==========================================
    // 6. LOAN PORTFOLIO
    // ==========================================
    const onlineLoansForPortfolio = await db.loanApplication.findMany({
      where: {
        companyId,
        createdAt: { gte: fyStart, lte: fyEnd },
        status: { in: ['DISBURSED', 'ACTIVE', 'ACTIVE_INTEREST_ONLY', 'CLOSED'] }
      },
      select: {
        applicationNo: true, firstName: true, lastName: true, loanAmount: true,
        interestRate: true, status: true, createdAt: true, disbursedAt: true,
        isInterestOnlyLoan: true, tenure: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const offlineLoansForPortfolio = await db.offlineLoan.findMany({
      where: {
        companyId,
        isMirrorLoan: false,
        createdAt: { gte: fyStart, lte: fyEnd },
        status: { in: ['ACTIVE', 'CLOSED', 'DEFAULTED', 'RESTRUCTURED', 'INTEREST_ONLY'] }
      },
      select: {
        loanNumber: true, customerName: true, loanAmount: true,
        interestRate: true, status: true, createdAt: true,
        disbursementDate: true, isInterestOnlyLoan: true, tenure: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const loanRows = [
      ...onlineLoansForPortfolio.map(l => ({
        loan_number: l.applicationNo,
        type: 'ONLINE',
        customer_name: [l.firstName, l.lastName].filter(Boolean).join(' ') || '',
        loan_amount: l.loanAmount || 0,
        interest_rate: l.interestRate || 0,
        tenure_months: l.tenure || 'IO',
        status: l.status,
        disbursement_date: formatIST(l.disbursedAt, 'date'),
        disbursement_time: formatIST(l.disbursedAt, 'time'),
        is_interest_only: l.isInterestOnlyLoan ? 'Yes' : 'No'
      })),
      ...offlineLoansForPortfolio.map(l => ({
        loan_number: l.loanNumber,
        type: 'OFFLINE',
        customer_name: l.customerName || '',
        loan_amount: l.loanAmount || 0,
        interest_rate: l.interestRate || 0,
        tenure_months: l.tenure || 'IO',
        status: l.status,
        disbursement_date: formatIST(l.disbursementDate, 'date'),
        disbursement_time: formatIST(l.disbursementDate, 'time'),
        is_interest_only: l.isInterestOnlyLoan ? 'Yes' : 'No'
      }))
    ];

    // ==========================================
    // 7. EMI COLLECTIONS
    // ==========================================
    const emiCollections = await db.offlineLoanEMI.findMany({
      where: {
        offlineLoan: { companyId, isMirrorLoan: false },
        paymentStatus: 'PAID',
        paidDate: { gte: fyStart, lte: fyEnd }
      },
      select: {
        offlineLoan: { select: { loanNumber: true, customerName: true } },
        installmentNumber: true,
        totalAmount: true,
        paidAmount: true,
        principalAmount: true,
        interestAmount: true,
        paidDate: true,
        paymentMode: true
      },
      orderBy: { paidDate: 'asc' }
    });

    const emiRows = emiCollections.map(e => ({
      loan_number: e.offlineLoan.loanNumber,
      customer_name: e.offlineLoan.customerName,
      installment_no: e.installmentNumber,
      emi_amount: e.totalAmount,
      paid_amount: e.paidAmount,
      principal: e.principalAmount,
      interest: e.interestAmount,
      paid_date: formatIST(e.paidDate, 'date'),
      paid_time: formatIST(e.paidDate, 'time'),
      payment_mode: e.paymentMode || ''
    }));

    // ==========================================
    // 8. PROFIT & LOSS STATEMENT (FY ACCURATE)
    // ==========================================
    const [incomeAccounts, expenseAccounts] = await Promise.all([
      db.chartOfAccount.findMany({
        where: { companyId, accountType: 'INCOME', isActive: true },
        select: { id: true, accountCode: true, accountName: true }
      }),
      db.chartOfAccount.findMany({
        where: { companyId, accountType: 'EXPENSE', isActive: true },
        select: { id: true, accountCode: true, accountName: true }
      })
    ]);

    const incomeIds  = incomeAccounts.map(a => a.id);
    const expenseIds = expenseAccounts.map(a => a.id);

    const [fyIncomeLines, fyExpenseLines] = await Promise.all([
      incomeIds.length > 0 ? db.journalEntryLine.findMany({
        where: {
          accountId: { in: incomeIds },
          journalEntry: { companyId, entryDate: { gte: fyStart, lte: fyEnd }, isReversed: false }
        },
        select: { accountId: true, debitAmount: true, creditAmount: true }
      }) : [],
      expenseIds.length > 0 ? db.journalEntryLine.findMany({
        where: {
          accountId: { in: expenseIds },
          journalEntry: { companyId, entryDate: { gte: fyStart, lte: fyEnd }, isReversed: false }
        },
        select: { accountId: true, debitAmount: true, creditAmount: true }
      }) : []
    ]);

    const incomeSummary = new Map(incomeAccounts.map(a => [a.id, { ...a, net: 0 }]));
    for (const l of fyIncomeLines) {
      const s = incomeSummary.get(l.accountId);
      if (s) s.net += (l.creditAmount || 0) - (l.debitAmount || 0);
    }

    const expenseSummary = new Map(expenseAccounts.map(a => [a.id, { ...a, net: 0 }]));
    for (const l of fyExpenseLines) {
      const s = expenseSummary.get(l.accountId);
      if (s) s.net += (l.debitAmount || 0) - (l.creditAmount || 0);
    }

    const totalIncome  = [...incomeSummary.values()].reduce((s, a) => s + a.net, 0);
    const totalExpense = [...expenseSummary.values()].reduce((s, a) => s + a.net, 0);
    const netProfitLoss = totalIncome - totalExpense;

    const plSummary = [
      `PROFIT & LOSS STATEMENT`,
      `Company: ${company.name} (${company.code})`,
      `Financial Year: ${label} (${fyStart.toDateString()} - ${fyEnd.toDateString()})`,
      `Generated: ${formatIST(new Date(), 'datetime')}`,
      `Basis: Journal entries posted within FY (not cumulative all-time balances)`,
      ``,
      `INCOME`,
      ...[...incomeSummary.values()].filter(a => a.net !== 0)
        .map(a => `  ${a.accountCode} - ${a.accountName}: ₹${a.net.toFixed(2)}`),
      `  TOTAL INCOME: ₹${totalIncome.toFixed(2)}`,
      ``,
      `EXPENSES`,
      ...[...expenseSummary.values()].filter(a => a.net !== 0)
        .map(a => `  ${a.accountCode} - ${a.accountName}: ₹${a.net.toFixed(2)}`),
      `  TOTAL EXPENSES: ₹${totalExpense.toFixed(2)}`,
      ``,
      `NET ${netProfitLoss >= 0 ? 'PROFIT' : 'LOSS'}: ₹${Math.abs(netProfitLoss).toFixed(2)}`
    ].join('\n');

    const plRows: any[] = [];
    plRows.push({ section: 'INCOME', account_code: '', account_name: '--- INCOME ---', amount: '' });
    for (const item of [...incomeSummary.values()].filter(a => a.net !== 0)) {
      plRows.push({ section: 'INCOME', account_code: item.accountCode, account_name: item.accountName, amount: item.net });
    }
    plRows.push({ section: 'TOTAL INCOME', account_code: '', account_name: 'TOTAL INCOME', amount: totalIncome });

    plRows.push({ section: 'EXPENSES', account_code: '', account_name: '--- EXPENSES ---', amount: '' });
    for (const item of [...expenseSummary.values()].filter(a => a.net !== 0)) {
      plRows.push({ section: 'EXPENSES', account_code: item.accountCode, account_name: item.accountName, amount: item.net });
    }
    plRows.push({ section: 'TOTAL EXPENSES', account_code: '', account_name: 'TOTAL EXPENSES', amount: totalExpense });
    plRows.push({ section: 'NET PROFIT/LOSS', account_code: '', account_name: netProfitLoss >= 0 ? 'NET PROFIT' : 'NET LOSS', amount: netProfitLoss });

    // ==========================================
    // 9. CHART OF ACCOUNTS (Real-time current balance)
    // ==========================================
    // Fetch all journal lines globally up to fyEnd to compute balance sheet and current balances
    const allJournalLinesUpToFYEnd = await db.journalEntryLine.findMany({
      where: {
        journalEntry: { companyId, entryDate: { lte: fyEnd }, isApproved: true, isReversed: false }
      },
      select: { accountId: true, debitAmount: true, creditAmount: true }
    });

    const accountGLBalances = new Map<string, number>();
    for (const l of allJournalLinesUpToFYEnd) {
      const cur = accountGLBalances.get(l.accountId) || 0;
      accountGLBalances.set(l.accountId, cur + (l.debitAmount || 0) - (l.creditAmount || 0));
    }

    const coaRows = accounts.map(a => {
      const glNet = accountGLBalances.get(a.id) || 0;
      const isDebitNormal = ['ASSET', 'EXPENSE'].includes(a.accountType);
      const computedBalance = isDebitNormal
        ? (a.openingBalance || 0) + glNet
        : (a.openingBalance || 0) - glNet;
      return {
        account_code: a.accountCode,
        account_name: a.accountName,
        account_type: a.accountType,
        opening_balance: a.openingBalance || 0,
        current_balance: computedBalance,
        status: a.isActive ? 'Active' : 'Inactive'
      };
    });

    // ==========================================
    // 10. TRIAL BALANCE SHEET
    // ==========================================
    const trialBalanceRows: any[] = [];
    let totalTBDebit = 0;
    let totalTBCredit = 0;

    for (const a of accounts) {
      const glNet = accountGLBalances.get(a.id) || 0;
      const isDebitNormal = ['ASSET', 'EXPENSE'].includes(a.accountType);

      // Debit = sum of debits, Credit = sum of credits in FY
      const fyLines = journalEntries.flatMap(je => je.lines.filter(l => l.accountId === a.id));
      const totalDebit = fyLines.reduce((s, l) => s + (l.debitAmount || 0), 0);
      const totalCredit = fyLines.reduce((s, l) => s + (l.creditAmount || 0), 0);

      // Closing balance based on double-entry rules
      const closing = isDebitNormal ? totalDebit - totalCredit : totalCredit - totalDebit;
      let debitBalance = 0;
      let creditBalance = 0;

      if (isDebitNormal) {
        if (closing >= 0) {
          debitBalance = closing;
          totalTBDebit += closing;
        } else {
          creditBalance = Math.abs(closing);
          totalTBCredit += Math.abs(closing);
        }
      } else {
        if (closing >= 0) {
          creditBalance = closing;
          totalTBCredit += closing;
        } else {
          debitBalance = Math.abs(closing);
          totalTBDebit += Math.abs(closing);
        }
      }

      trialBalanceRows.push({
        account_code: a.accountCode,
        account_name: a.accountName,
        account_type: a.accountType,
        opening_balance: 0,
        total_debit: totalDebit,
        total_credit: totalCredit,
        debit_balance: debitBalance,
        credit_balance: creditBalance
      });
    }

    // ==========================================
    // 11. BALANCE SHEET
    // ==========================================
    // Fetch actual cash and bank balances
    const bankAccountBalances = bankAccounts.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
    const cashBookData = await db.cashBook.findUnique({
      where: { companyId },
      select: { currentBalance: true }
    });
    const cashBalance = cashBookData?.currentBalance || 0;

    // Fetch mirror mappings
    const mirrorMappings = await db.mirrorLoanMapping.findMany({ select: { originalLoanId: true } });
    const mirroredOriginalIds = new Set(mirrorMappings.map(m => m.originalLoanId));

    // Online outstanding loans
    const onlineLoans = await db.loanApplication.findMany({
      where: {
        companyId,
        status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED'] }
      },
      select: {
        id: true, disbursedAmount: true, status: true,
        emiSchedules: { select: { paidPrincipal: true } }
      }
    });
    const actualOnlineLoans = onlineLoans
      .filter(loan => !mirroredOriginalIds.has(loan.id))
      .reduce((sum, loan) => {
        const disbursed = loan.disbursedAmount || 0;
        const paidPrincipal = loan.emiSchedules.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
        return sum + Math.max(0, disbursed - paidPrincipal);
      }, 0);

    // Offline outstanding loans
    const offlineLoans = await db.offlineLoan.findMany({
      where: {
        companyId,
        status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED'] }
      },
      select: {
        id: true, loanAmount: true, status: true,
        emis: { select: { paidPrincipal: true } }
      }
    });
    const actualOfflineLoans = offlineLoans
      .filter(loan => !mirroredOriginalIds.has(loan.id))
      .reduce((sum, loan) => {
        const disbursed = loan.loanAmount || 0;
        const paidPrincipal = loan.emis.reduce((s, emi) => s + (emi.paidPrincipal || 0), 0);
        return sum + Math.max(0, disbursed - paidPrincipal);
      }, 0);

    const getAccountBalance = (code: string): number => {
      if (code === '1101') return cashBalance;
      if (code === '1102') return bankAccountBalances;
      if (code === '1201') return actualOnlineLoans;
      if (code === '1210') return actualOfflineLoans;
      if (code === '1200') return actualOnlineLoans + actualOfflineLoans;

      const acc = coaRows.find(a => a.account_code === code);
      return acc?.current_balance || 0;
    };

    // Left Side (Liabilities & Equity)
    const equityEntries = await db.equityEntry.findMany({ where: { companyId, createdAt: { lte: fyEnd } } });
    const ownersCapital = equityEntries.reduce((s, e) => e.entryType === 'WITHDRAWAL' ? s - (e.amount || 0) : s + (e.amount || 0), 0)
      || getAccountBalance('3002');
    const openingBalanceEquity = getAccountBalance('3001');
    const currentYearProfit = netProfitLoss;
    const bankLoans = Math.abs(getAccountBalance('2101'));
    const investorCapital = Math.abs(getAccountBalance('2110'));
    const borrowedFunds = Math.abs(getAccountBalance('2120'));

    // Right Side (Assets)
    const rightSideItems = [
      { name: 'Cash in Hand', amount: cashBalance, accountCode: '1101' },
      { name: 'Bank Balance', amount: bankAccountBalances, accountCode: '1102' },
      { name: 'Loans Receivable (Online)', amount: actualOnlineLoans, accountCode: '1201' },
      { name: 'Loans Receivable (Offline)', amount: actualOfflineLoans, accountCode: '1210' },
      { name: 'Interest Receivable', amount: Math.max(0, getAccountBalance('1301')), accountCode: '1301' },
      { name: 'Processing Fee Receivable', amount: Math.max(0, getAccountBalance('1302')), accountCode: '1302' },
      { name: 'Penalty Receivable', amount: Math.max(0, getAccountBalance('1303')), accountCode: '1303' },
      { name: 'Overdue Interest Receivable', amount: Math.max(0, getAccountBalance('1305')), accountCode: '1305' }
    ];

    const rightTotal = rightSideItems.reduce((sum, item) => sum + item.amount, 0);

    const leftSideItems = [
      { name: "Owner's Capital", amount: ownersCapital, accountCode: '3002' },
      { name: 'Opening Balance Equity', amount: openingBalanceEquity, accountCode: '3001' },
      { name: 'Current Year Profit/Loss', amount: currentYearProfit, accountCode: '3004' },
      { name: 'Bank Loans', amount: bankLoans, accountCode: '2101' },
      { name: 'Investor Capital', amount: investorCapital, accountCode: '2110' },
      { name: 'Borrowed Funds', amount: borrowedFunds, accountCode: '2120' }
    ];

    const leftTotalBeforeRE = leftSideItems.reduce((sum, item) => sum + item.amount, 0);
    const dynamicRetainedEarnings = rightTotal - leftTotalBeforeRE;

    leftSideItems.splice(2, 0, {
      name: 'Retained Earnings',
      amount: dynamicRetainedEarnings,
      accountCode: '3003'
    });

    const leftTotal = rightTotal;

    const bsRows: any[] = [];
    bsRows.push({ section: 'ASSETS', account_code: '', account_name: '--- ASSETS ---', amount: '' });
    for (const item of rightSideItems) {
      bsRows.push({ section: 'ASSETS', account_code: item.accountCode, account_name: item.name, amount: item.amount });
    }
    bsRows.push({ section: 'ASSETS TOTAL', account_code: '', account_name: 'TOTAL ASSETS', amount: rightTotal });

    bsRows.push({ section: 'LIABILITIES & EQUITY', account_code: '', account_name: '--- LIABILITIES & EQUITY ---', amount: '' });
    for (const item of leftSideItems) {
      bsRows.push({ section: 'LIABILITIES & EQUITY', account_code: item.accountCode, account_name: item.name, amount: item.amount });
    }
    bsRows.push({ section: 'LIABILITIES & EQUITY TOTAL', account_code: '', account_name: 'TOTAL LIABILITIES & EQUITY', amount: leftTotal });


    // ==========================================
    // 12. INDIVIDUAL CUSTOMER PERSONAL LEDGERS
    // ==========================================
    // Fetch unique contacts/customers who have loans or ledger entries in the company
    const allRegisteredUsers = await db.user.findMany({ select: { id: true, name: true, phone: true, email: true } });
    const userMapByContact = new Map<string, { id: string; name: string; phone: string; email: string }>();
    for (const u of allRegisteredUsers) {
      if (u.name && u.phone) {
        const cleanDigits = u.phone.trim().replace(/\D/g, '');
        const phoneKey = cleanDigits || u.phone.trim().toLowerCase();
        const key = `${u.name.trim().toLowerCase()}_${phoneKey}`;
        userMapByContact.set(key, { id: u.id, name: u.name, phone: u.phone, email: u.email || '' });
      }
    }

    // Direct online loans
    const directOnlineLoans = await db.loanApplication.findMany({
      where: { companyId, status: { notIn: ['REJECTED_BY_SA', 'REJECTED_BY_COMPANY', 'REJECTED_FINAL', 'SESSION_REJECTED'] } },
      select: {
        id: true, applicationNo: true, status: true, companyId: true, requestedAmount: true, disbursedAt: true, closedAt: true,
        sessionForm: { select: { approvedAmount: true, interestRate: true, tenure: true } },
        customer: { select: { id: true, name: true, phone: true, email: true } },
        emiSchedules: { select: { id: true, installmentNumber: true, dueDate: true, paidDate: true, paidAmount: true, interestAmount: true, outstandingPrincipal: true, paidPrincipal: true, paidInterest: true } }
      }
    });

    // Direct offline loans
    const directOfflineLoans = await db.offlineLoan.findMany({
      where: { companyId, status: { in: ['ACTIVE', 'INTEREST_ONLY', 'CLOSED', 'DEFAULTED', 'RESTRUCTURED'] } },
      select: {
        id: true, loanNumber: true, status: true, companyId: true, loanAmount: true, disbursementDate: true, interestRate: true, tenure: true,
        customerName: true, customerPhone: true, customerEmail: true, customerId: true, closedAt: true,
        emis: { select: { id: true, installmentNumber: true, dueDate: true, paidDate: true, paidAmount: true, interestAmount: true, outstandingPrincipal: true, paidPrincipal: true, paidInterest: true } }
      }
    });

    // Resolve mirror loan mappings for cross-company mirror records
    const allCompanyMirrorMappings = await db.mirrorLoanMapping.findMany({
      where: { mirrorCompanyId: companyId }
    });

    const mirrorOnlineLoanIds = allCompanyMirrorMappings.filter(m => !m.isOfflineLoan).map(m => m.mirrorLoanId).filter(Boolean) as string[];
    const extraMirrorOnlineLoans = mirrorOnlineLoanIds.length > 0 ? await db.loanApplication.findMany({
      where: { id: { in: mirrorOnlineLoanIds } },
      select: {
        id: true, applicationNo: true, status: true, companyId: true, requestedAmount: true, disbursedAt: true, closedAt: true,
        sessionForm: { select: { approvedAmount: true, interestRate: true, tenure: true } },
        customer: { select: { id: true, name: true, phone: true, email: true } },
        emiSchedules: { select: { id: true, installmentNumber: true, dueDate: true, paidDate: true, paidAmount: true, interestAmount: true, outstandingPrincipal: true, paidPrincipal: true, paidInterest: true } }
      }
    }) : [];

    const mirrorOfflineLoanIds = allCompanyMirrorMappings.filter(m => m.isOfflineLoan).map(m => m.mirrorLoanId).filter(Boolean) as string[];
    const extraMirrorOfflineLoans = mirrorOfflineLoanIds.length > 0 ? await db.offlineLoan.findMany({
      where: { id: { in: mirrorOfflineLoanIds } },
      select: {
        id: true, loanNumber: true, status: true, companyId: true, loanAmount: true, disbursementDate: true, interestRate: true, tenure: true,
        customerName: true, customerPhone: true, customerEmail: true, customerId: true, closedAt: true,
        emis: { select: { id: true, installmentNumber: true, dueDate: true, paidDate: true, paidAmount: true, interestAmount: true, outstandingPrincipal: true, paidPrincipal: true, paidInterest: true } }
      }
    }) : [];

    // Combine direct and mirror loans, deduplicating by ID
    const uniqueLoansMap = new Map<string, any>();
    for (const l of directOnlineLoans) {
      uniqueLoansMap.set(l.id, { ...l, type: 'ONLINE' as const, _isMirror: false });
    }
    for (const l of extraMirrorOnlineLoans) {
      const existing = uniqueLoansMap.get(l.id);
      uniqueLoansMap.set(l.id, { ...(existing || l), type: 'ONLINE' as const, _isMirror: true });
    }
    for (const l of directOfflineLoans) {
      uniqueLoansMap.set(l.id, { ...l, type: 'OFFLINE' as const, _isMirror: false });
    }
    for (const l of extraMirrorOfflineLoans) {
      const existing = uniqueLoansMap.get(l.id);
      uniqueLoansMap.set(l.id, { ...(existing || l), type: 'OFFLINE' as const, _isMirror: true });
    }
    const allLoansList = Array.from(uniqueLoansMap.values());

    // Group loans by normalized customer identity (name + phone)
    const customerLoansMap = new Map<string, { customerInfo: { name: string; phone: string; email: string }; loans: typeof allLoansList }>();

    for (const l of allLoansList) {
      let custName = '';
      let custPhone = '';
      let custEmail = '';

      if (l.type === 'ONLINE') {
        const onlineL = l as any;
        custName = onlineL.customer?.name || '';
        custPhone = onlineL.customer?.phone || '';
        custEmail = onlineL.customer?.email || '';
      } else {
        const offlineL = l as any;
        custName = offlineL.customerName || offlineL.customer?.name || '';
        custPhone = offlineL.customerPhone || offlineL.customer?.phone || '';
        custEmail = offlineL.customerEmail || offlineL.customer?.email || '';
      }

      if (!custName || !custPhone) continue;

      const cleanDigits = custPhone.replace(/\D/g, '');
      const phoneKey = cleanDigits || custPhone.trim().toLowerCase();
      const key = `${custName.trim().toLowerCase()}_${phoneKey}`;

      if (!customerLoansMap.has(key)) {
        customerLoansMap.set(key, {
          customerInfo: { name: custName, phone: custPhone, email: custEmail },
          loans: []
        });
      }
      customerLoansMap.get(key)!.loans.push(l);
    }

    const lrAccountIds = accounts.filter(a => LR_CODES.includes(a.accountCode)).map(a => a.id);
    const targetAccountIds = accounts.filter(a => ['1200', '1201', '1210', '1301', '1305', '1302', '4110', '4100', '4001', '4002'].includes(a.accountCode)).map(a => a.id);

    const personalLedgerFiles: { name: string; content: string; count: number }[] = [];

    // Pre-fetch payment / EMI installment numbers for faster lookup
    const allLoanIds = allLoansList.map(l => l.id);
    const paymentToEmiNumber = new Map<string, number>();
    const offlineEmiIdToNumber = new Map<string, number>();

    if (allLoanIds.length > 0) {
      const [payments, offlineEmis] = await Promise.all([
        db.payment.findMany({
          where: { loanApplicationId: { in: allLoanIds } },
          select: { id: true, emiSchedule: { select: { installmentNumber: true } } }
        }),
        db.offlineLoanEMI.findMany({
          where: { offlineLoanId: { in: allLoanIds } },
          select: { id: true, installmentNumber: true }
        })
      ]);
      for (const p of payments) {
        if (p.emiSchedule?.installmentNumber) paymentToEmiNumber.set(p.id, p.emiSchedule.installmentNumber);
      }
      for (const e of offlineEmis) {
        offlineEmiIdToNumber.set(e.id, e.installmentNumber);
      }
    }

    // Loop through each customer to build their personal ledger
    for (const [key, record] of customerLoansMap.entries()) {
      const { customerInfo, loans } = record;
      const customerLoanIds = loans.map(l => l.id);

      // Fetch approved, non-reversed journal entries touching LR or Interest for these loans
      const customerJournalEntries = await db.journalEntry.findMany({
        where: {
          isReversed: false,
          companyId,
          lines: { some: { accountId: { in: targetAccountIds }, loanId: { in: customerLoanIds } } }
        },
        include: { lines: { include: { account: true } } },
        orderBy: { entryDate: 'asc' }
      });

      // Also get Interest Accruals globally by loanId (mirror loans might have accruals in other companies)
      const customerAccrualEntries = await db.journalEntry.findMany({
        where: {
          isReversed: false,
          companyId,
          referenceType: { in: ['INTEREST_ACCRUAL', 'INTEREST_RECLASSIFICATION', 'PROCESSING_FEE_ACCRUAL', 'PROCESSING_FEE_COLLECTION', 'PROCESSING_FEE'] },
          lines: { some: { loanId: { in: customerLoanIds } } }
        },
        include: { lines: { include: { account: true } } },
        orderBy: { entryDate: 'asc' }
      });

      // Merge unique journal entries
      const jeMap = new Map<string, any>();
      for (const je of [...customerJournalEntries, ...customerAccrualEntries]) {
        jeMap.set(je.id, je);
      }

      const mergedJEs = [...jeMap.values()];

      const ENTRY_ORDER: Record<string, number> = {
        LOAN_DISBURSEMENT: 0, MIRROR_LOAN_DISBURSEMENT: 0,
        PROCESSING_FEE_ACCRUAL: 1,
        PROCESSING_FEE_COLLECTION: 2, PROCESSING_FEE: 2,
        INTEREST_ACCRUAL: 4, INTEREST_RECLASSIFICATION: 4,
        EMI_PAYMENT: 5, MIRROR_EMI_PAYMENT: 5,
        INTEREST_ONLY_PAYMENT: 5, PARTIAL_EMI_PAYMENT: 5,
        PRINCIPAL_ONLY_PAYMENT: 6, OFFLINE_LOAN_FORECLOSURE: 7, LOAN_FORECLOSURE: 7, LOSS_WRITE_OFF: 7,
      };

      // Sort chronological with disbursement/processing fee first
      mergedJEs.sort((a, b) => {
        const oA = ENTRY_ORDER[a.referenceType] ?? 9;
        const oB = ENTRY_ORDER[b.referenceType] ?? 9;
        if (oA <= 1 || oB <= 1) {
          if (oA !== oB) return oA - oB;
        }
        const dateA = new Date(a.entryDate).getTime();
        const dateB = new Date(b.entryDate).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.entryNumber.localeCompare(b.entryNumber, undefined, { numeric: true });
      });

      const ledgerEntries: any[] = [];

      for (const loan of loans) {
        const loanJEs = mergedJEs.filter(je => je.lines.some((l: any) => l.loanId === loan.id));
        const hasDisbursement = loanJEs.some(je =>
          (je.referenceType === 'LOAN_DISBURSEMENT' || je.referenceType === 'MIRROR_LOAN_DISBURSEMENT') &&
          je.lines.some((l: any) => lrAccountIds.includes(l.accountId) && l.debitAmount > 0 && l.loanId === loan.id)
        );

        const loanAmount = loan.type === 'ONLINE'
          ? ((loan as any).sessionForm?.approvedAmount || loan.requestedAmount || 0)
          : (loan as any).loanAmount || 0;

        const disbursementDate = loan.type === 'ONLINE' ? loan.disbursedAt : (loan as any).disbursementDate;
        const loanNumber = loan.type === 'ONLINE' ? loan.applicationNo : (loan as any).loanNumber;

        // Synthetic disbursement row if missing
        if (!hasDisbursement && loanAmount > 0) {
          ledgerEntries.push({
            id: `synth-disb-${loan.id}`,
            date: disbursementDate || new Date(),
            referenceType: 'LOAN_DISBURSEMENT',
            loanId: loan.id,
            loanNumber,
            entryNumber: 'Auto',
            narration: `Loan Disbursed — ${loanNumber}`,
            description: `Loan Disbursed — ${loanNumber}`,
            debit: loanAmount,
            credit: 0
          });
        }

        // Add standard journal entry mappings
        for (const je of loanJEs) {
          const isLineForThisLoan = (l: any) => l.loanId === loan.id;
          const loanLines = je.lines.filter(isLineForThisLoan);
          if (loanLines.length === 0) continue;

          const isPFAccrual = je.referenceType === 'PROCESSING_FEE_ACCRUAL';
          const isPFPayment = je.referenceType === 'PROCESSING_FEE_COLLECTION' || je.referenceType === 'PROCESSING_FEE';
          const isAccrual = je.referenceType === 'INTEREST_ACCRUAL' || je.referenceType === 'INTEREST_RECLASSIFICATION';
          const isPayment = je.referenceType === 'EMI_PAYMENT' || je.referenceType === 'MIRROR_EMI_PAYMENT' || je.referenceType === 'INTEREST_ONLY_PAYMENT' || je.referenceType === 'PARTIAL_EMI_PAYMENT';
          const isClose = je.referenceType === 'PRINCIPAL_ONLY_PAYMENT' || je.referenceType === 'OFFLINE_LOAN_FORECLOSURE' || je.referenceType === 'LOAN_FORECLOSURE' || je.referenceType === 'LOSS_WRITE_OFF';
          const isDisbursement = je.referenceType === 'LOAN_DISBURSEMENT' || je.referenceType === 'MIRROR_LOAN_DISBURSEMENT';

          let debit = 0;
          let credit = 0;

          if (isDisbursement) {
            const lrLines = loanLines.filter((l: any) => ['1200', '1201', '1210'].includes(l.account?.accountCode || ''));
            debit = lrLines.reduce((s: number, l: any) => s + l.debitAmount, 0);
          } else if (isPFAccrual) {
            const pfLines = loanLines.filter((l: any) => l.account?.accountCode === '1302');
            debit = pfLines.reduce((s: number, l: any) => s + l.debitAmount, 0);
          } else if (isPFPayment) {
            const pfLines = loanLines.filter((l: any) => l.account?.accountCode === '1302');
            credit = pfLines.reduce((s: number, l: any) => s + l.creditAmount, 0);
          } else if (isAccrual) {
            const interestLines = loanLines.filter((l: any) => ['1301', '1305'].includes(l.account?.accountCode || ''));
            debit = interestLines.reduce((s: number, l: any) => s + l.debitAmount, 0);
          } else if (isPayment || isClose) {
            const lrLines = loanLines.filter((l: any) => ['1200', '1201', '1210'].includes(l.account?.accountCode || ''));
            credit = lrLines.reduce((s: number, l: any) => s + l.creditAmount, 0);

            const intLines = loanLines.filter((l: any) => ['1301', '1305'].includes(l.account?.accountCode || ''));
            credit += intLines.reduce((s: number, l: any) => s + l.creditAmount, 0);
          } else {
            // General lines
            const debitLines = loanLines.filter((l: any) => ['1200', '1201', '1210', '1301', '1305', '1302'].includes(l.account?.accountCode || ''));
            debit = debitLines.reduce((s: number, l: any) => s + l.debitAmount, 0);
            credit = debitLines.reduce((s: number, l: any) => s + l.creditAmount, 0);
          }

          const emiMatch = je.narration?.match(/#(\d+)/);
          let emiNumber = emiMatch ? parseInt(emiMatch[1]) : undefined;
          if (!emiNumber && je.referenceId) {
            emiNumber = paymentToEmiNumber.get(je.referenceId) || offlineEmiIdToNumber.get(je.referenceId);
          }

          let desc = je.narration || je.referenceType || 'Transaction';
          if (je.referenceType === 'EMI_PAYMENT' || je.referenceType === 'MIRROR_EMI_PAYMENT') {
            desc = `EMI Payment #${emiNumber || ''} — ${loanNumber}`;
          } else if (je.referenceType === 'INTEREST_ACCRUAL') {
            desc = `Interest Charged #${emiNumber || ''} — ${loanNumber}`;
          } else if (isDisbursement) {
            desc = `Loan Disbursed — ${loanNumber}`;
          }

          ledgerEntries.push({
            id: je.id,
            date: je.entryDate,
            referenceType: je.referenceType,
            loanId: loan.id,
            loanNumber,
            entryNumber: je.entryNumber,
            narration: je.narration || '',
            description: desc,
            debit,
            credit
          });
        }

        // Add synthetic accruals for interest not in JEs
        const emiList = loan.type === 'ONLINE' ? loan.emiSchedules : (loan as any).emis || [];
        const todaySynthUTC = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 23, 59, 59, 999));

        for (const emi of emiList) {
          const hasRealAccrual = loanJEs.some(je =>
            (je.referenceType === 'INTEREST_ACCRUAL' || je.referenceType === 'INTEREST_RECLASSIFICATION') &&
            (je.referenceId === emi.id || je.narration?.includes(`#${emi.installmentNumber}`))
          );

          const emiDueDateUTC = new Date(emi.dueDate);
          const isDuePassed = emiDueDateUTC <= todaySynthUTC;
          const isPaidEMI = !!(emi.paidDate && Number(emi.paidAmount) > 0);
          const isAccrued = isDuePassed || isPaidEMI;

          if (!hasRealAccrual && isAccrued && emi.interestAmount > 0) {
            const displayDate = emiDueDateUTC > todaySynthUTC ? (emi.paidDate ? new Date(emi.paidDate) : new Date()) : emi.dueDate;
            ledgerEntries.push({
              id: `synth-accrual-${emi.id}`,
              date: displayDate,
              referenceType: 'INTEREST_ACCRUAL',
              loanId: loan.id,
              loanNumber,
              entryNumber: 'Auto',
              narration: `Interest Charged — Monthly EMI #${emi.installmentNumber}`,
              description: `Interest Charged #${emi.installmentNumber} — ${loanNumber}`,
              debit: emi.interestAmount,
              credit: 0
            });
          }
        }
      }

      // Sort all ledger rows chronologically
      ledgerEntries.sort((a, b) => {
        const oA = ENTRY_ORDER[a.referenceType] ?? 9;
        const oB = ENTRY_ORDER[b.referenceType] ?? 9;
        if (a.loanId === b.loanId) {
          const disbDate = loans.find(l => l.id === a.loanId)?.type === 'ONLINE'
            ? (loans.find(l => l.id === a.loanId) as any).disbursedAt
            : (loans.find(l => l.id === a.loanId) as any).disbursementDate;
          const isInitialA = oA <= 1 && (oA === 0 || isInitialSetup(a.referenceType, a.date, disbDate));
          const isInitialB = oB <= 1 && (oB === 0 || isInitialSetup(b.referenceType, b.date, disbDate));
          if (isInitialA || isInitialB) {
            if (isInitialA && isInitialB) {
              if (oA !== oB) return oA - oB;
            } else {
              return isInitialA ? -1 : 1;
            }
          }
        }
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.entryNumber.localeCompare(b.entryNumber, undefined, { numeric: true });
      });

      // Deduplicate ledger entries by JE id + loan id to prevent duplicates
      const seenEntryKeys = new Set<string>();
      const dedupedEntries = ledgerEntries.filter(entry => {
        const key = `${entry.id}-${entry.loanId}`;
        if (seenEntryKeys.has(key)) return false;
        seenEntryKeys.add(key);
        return true;
      });

      // Calculate running balance
      let balance = 0;
      const statementRows = dedupedEntries.map(row => {
        balance += (row.debit || 0) - (row.credit || 0);
        return {
          date: formatIST(row.date, 'date'),
          time: formatIST(row.date, 'time'),
          entry_no: row.entryNumber || 'Auto',
          particulars: row.description,
          debit: row.debit || 0,
          credit: row.credit || 0,
          balance: balance,
          narration: row.narration || '',
          loan_number: row.loanNumber
        };
      });

      const namePart = cleanFilename(customerInfo.name);
      const phonePart = cleanFilename(customerInfo.phone);
      personalLedgerFiles.push({
        name: `personal_ledgers/${namePart}_${phonePart}_ledger.csv`,
        content: toCSV(statementRows),
        count: statementRows.length
      });
    }

    // ==========================================
    // 13. COMBINE EVERYTHING & ASSEMBLE FILES
    // ==========================================
    const files = [
      { name: 'journal_entries.csv',     content: toCSV(jeRows),     count: jeRows.length },
      { name: 'journal_entry_lines.csv', content: toCSV(jeLineRows), count: jeLineRows.length },
      { name: 'daybook_transactions.csv', content: toCSV(daybookRows), count: daybookRows.length },
      { name: 'cashbook_entries.csv',    content: toCSV(cashRows),   count: cashRows.length },
      { name: 'bank_transactions.csv',   content: toCSV(bankTxRows), count: bankTxRows.length },
      { name: 'loan_portfolio.csv',      content: toCSV(loanRows),   count: loanRows.length },
      { name: 'emi_collections.csv',     content: toCSV(emiRows),    count: emiRows.length },
      { name: 'chart_of_accounts.csv',   content: toCSV(coaRows),    count: coaRows.length },
      { name: 'trial_balance.csv',       content: toCSV(trialBalanceRows), count: trialBalanceRows.length },
      { name: 'balance_sheet.csv',       content: toCSV(bsRows),     count: bsRows.length },
      { name: 'profit_and_loss.csv',     content: toCSV(plRows),     count: plRows.length },
      { name: 'profit_loss_summary.txt', content: plSummary,         count: null },
      ...personalLedgerFiles,
    ];

    // ==========================================
    // 14. GENERAL LEDGER PER ACCOUNT HEAD
    // ==========================================
    const accountMap = new Map(accounts.map(a => [a.id, a]));
    const generalLedgerFiles: { name: string; content: string; count: number }[] = [];

    for (const account of accounts) {
      // Find all journal lines touching this account within FY
      const accountLines = journalEntries.flatMap(je =>
        je.lines
          .filter(l => l.accountId === account.id)
          .map(l => ({
            date: formatIST(je.entryDate, 'date'),
            time: formatIST(je.entryDate, 'time'),
            entry_number: je.entryNumber,
            reference_type: je.referenceType || '',
            narration: l.narration || je.narration || '',
            debit: l.debitAmount || 0,
            credit: l.creditAmount || 0,
          }))
      );

      const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.accountType);
      let runningBalance = account.openingBalance || 0;

      // Include Opening Balance Row
      const ledgerRows: any[] = [{
        date: formatIST(fyStart, 'date'),
        time: '00:00:00',
        entry_number: 'Opening',
        reference_type: 'OPENING_BALANCE',
        narration: 'Opening Balance b/d',
        debit: isDebitNormal ? (account.openingBalance > 0 ? account.openingBalance : 0) : 0,
        credit: !isDebitNormal ? (account.openingBalance > 0 ? account.openingBalance : 0) : 0,
        balance: runningBalance,
      }];

      for (const line of accountLines) {
        if (isDebitNormal) {
          runningBalance += (line.debit || 0) - (line.credit || 0);
        } else {
          runningBalance += (line.credit || 0) - (line.debit || 0);
        }
        ledgerRows.push({
          ...line,
          balance: Math.round(runningBalance * 100) / 100,
        });
      }

      const safeName = cleanFilename(`${account.accountCode}_${account.accountName}`);
      generalLedgerFiles.push({
        name: `general_ledger/${safeName}_ledger.csv`,
        content: toCSV(ledgerRows),
        count: ledgerRows.length,
      });
    }

    // Add general ledger files to the export
    files.push(...generalLedgerFiles);

    return NextResponse.json({
      success: true,
      company: { name: company.name, code: company.code },
      fyLabel: label,
      fyStart: fyStart.toISOString(),
      fyEnd: fyEnd.toISOString(),
      generatedAt: new Date().toISOString(),
      files,
      summary: {
        journalEntries: jeRows.length,
        cashEntries: cashRows.length,
        bankTransactions: bankTxRows.length,
        loans: loanRows.length,
        emiCollections: emiRows.length,
        customersExported: personalLedgerFiles.length,
        totalIncome,
        totalExpense,
        netProfitLoss
      }
    });

  } catch (error) {
    console.error('[Export ZIP] Error:', error);
    return NextResponse.json({
      error: 'Export failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
