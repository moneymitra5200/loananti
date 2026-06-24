const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

// Account code constants
const ACCOUNT_CODES = {
  CASH_IN_HAND: '1101',
  BANK_MAIN: '1103',
  LOANS_RECEIVABLE: '1200',
  ONLINE_LOANS_RECEIVABLE: '1201',
  OFFLINE_LOANS_RECEIVABLE: '1210',
  INTEREST_RECEIVABLE: '1301',
  PROCESSING_FEE_RECEIVABLE: '1302',
  PENALTY_RECEIVABLE: '1303',
  IRRECOVERABLE_INTEREST: '1305',
  BANK_LOANS: '2101',
  INVESTOR_CAPITAL: '2110',
  BORROWED_FUNDS: '2120',
  OPENING_BALANCE_EQUITY: '3001',
  OWNERS_CAPITAL: '3002',
  RETAINED_EARNINGS: '3003',
  CURRENT_YEAR_PROFIT: '3004',
  INTEREST_INCOME: '4110',
  PROCESSING_FEE_INCOME: '4121',
  LATE_FEE_INCOME: '4122',
  OPERATING_EXPENSES: '5100',
  INTEREST_EXPENSE: '5201',
  BANK_CHARGES: '5203',
};

async function main() {
  const companyId = 'cmp4w8dxa0008100655jq7ywo';
  const year = null;

  const now = new Date();
  const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyStart = new Date(currentYear, 3, 1);
  const fyEnd = new Date(currentYear + 1, 2, 31);

  const company = await db.company.findUnique({
    where: { id: companyId }
  });

  const accounts = await db.chartOfAccount.findMany({
    where: { companyId, isActive: true },
    orderBy: { accountCode: 'asc' }
  });

  const bankAccountsData = await db.bankAccount.findMany({
    where: { companyId, isActive: true }
  });
  const actualBankBalance = bankAccountsData.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
  const actualBankOpening = bankAccountsData.reduce((sum, b) => sum + (b.openingBalance || 0), 0);
  
  const cashBookData = await db.cashBook.findUnique({
    where: { companyId }
  });
  const actualCashBalance = cashBookData?.currentBalance || 0;
  const actualCashOpening = cashBookData?.openingBalance || 0;

  const mirrorMappings = await db.mirrorLoanMapping.findMany();
  const mirroredOriginalIds = new Set(mirrorMappings.map(m => m.originalLoanId));

  const onlineLoans = await db.loanApplication.findMany({
    where: {
      companyId,
      status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED'] }
    },
    include: { emiSchedules: true }
  });
  const actualOnlineLoans = onlineLoans
    .filter(loan => !mirroredOriginalIds.has(loan.id))
    .reduce((sum, loan) => {
      const disbursed = loan.disbursedAmount || 0;
      const paidPrincipal = loan.emiSchedules.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
      return sum + Math.max(0, disbursed - paidPrincipal);
    }, 0);

  const offlineLoans = await db.offlineLoan.findMany({
    where: {
      companyId,
      status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED'] }
    },
    include: { emis: true }
  });
  const actualOfflineLoans = offlineLoans
    .filter(loan => !mirroredOriginalIds.has(loan.id))
    .reduce((sum, loan) => {
      const disbursed = loan.loanAmount || 0;
      const paidPrincipal = loan.emis.reduce((s, emi) => s + (emi.paidPrincipal || 0), 0);
      return sum + Math.max(0, disbursed - paidPrincipal);
    }, 0);

  const journalLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        companyId,
        entryDate: { lte: fyEnd },
        isApproved: true,
        isReversed: false
      }
    }
  });

  const accountBalancesMap = new Map();
  for (const line of journalLines) {
    const existing = accountBalancesMap.get(line.accountId) || { debit: 0, credit: 0 };
    existing.debit += line.debitAmount || 0;
    existing.credit += line.creditAmount || 0;
    accountBalancesMap.set(line.accountId, existing);
  }

  const getAccountGLBalance = (accountId, accountType, openingBalance) => {
    const entry = accountBalancesMap.get(accountId) || { debit: 0, credit: 0 };
    if (['ASSET', 'EXPENSE'].includes(accountType)) {
      return openingBalance + entry.debit - entry.credit;
    } else {
      return openingBalance + entry.credit - entry.debit;
    }
  };

  for (const account of accounts) {
    account.currentBalance = getAccountGLBalance(account.id, account.accountType, account.openingBalance || 0);
  }

  const actualCashBalanceFromGL = accounts.find(a => a.accountCode === '1101')?.currentBalance || 0;
  const actualBankBalanceFromGL = accounts
    .filter(a => a.accountCode.startsWith('1102') || a.accountCode.startsWith('1103') || a.accountCode.startsWith('1104') || a.accountCode.startsWith('14'))
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const actualOnlineLoansFromGL = accounts.find(a => a.accountCode === '1201')?.currentBalance || 0;
  const actualOfflineLoansFromGL = accounts.find(a => a.accountCode === '1210')?.currentBalance || 0;
  const totalLoansReceivableFromGL = accounts.find(a => a.accountCode === '1200')?.currentBalance || 0;

  const getAccountBalance = (code) => {
    if (code === '1101') return actualCashBalanceFromGL;
    if (code === '1102') return actualBankBalanceFromGL;
    if (code === '1201') return actualOnlineLoansFromGL !== 0 ? actualOnlineLoansFromGL : actualOnlineLoans;
    if (code === '1210') return actualOfflineLoansFromGL !== 0 ? actualOfflineLoansFromGL : actualOfflineLoans;
    if (code === '1200') return totalLoansReceivableFromGL !== 0 ? totalLoansReceivableFromGL : (actualOnlineLoans + actualOfflineLoans);
    
    const account = accounts.find(a => a.accountCode === code);
    return account?.currentBalance || 0;
  };

  const getAccountsByPrefix = (prefix) => {
    return accounts.filter(a => a.accountCode.startsWith(prefix));
  };

  const equityEntries = await db.equityEntry.findMany({ 
    where: { 
      companyId,
      createdAt: { lte: fyEnd }
    } 
  });
  const ownersCapitalFromEquity = equityEntries.reduce(
    (s, e) => e.entryType === 'WITHDRAWAL' ? s - (e.amount || 0) : s + (e.amount || 0),
    0
  );

  const coaCapital3002 = getAccountBalance(ACCOUNT_CODES.OWNERS_CAPITAL);
  const coaCapital3001 = getAccountBalance(ACCOUNT_CODES.OPENING_BALANCE_EQUITY);

  const ownersCapital = ownersCapitalFromEquity !== 0 ? ownersCapitalFromEquity : coaCapital3002;
  const openingBalanceEquity = coaCapital3001;

  const incomeAccounts = accounts.filter(a => a.accountType === 'INCOME');
  const expenseAccounts = accounts.filter(a => a.accountType === 'EXPENSE');
  
  const totalIncome = incomeAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const totalExpenses = expenseAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const profitLoss = totalIncome - totalExpenses;

  const bankLoans = Math.abs(getAccountBalance(ACCOUNT_CODES.BANK_LOANS));
  const investorCapital = Math.abs(getAccountBalance(ACCOUNT_CODES.INVESTOR_CAPITAL));
  const borrowedFunds = Math.abs(getAccountBalance(ACCOUNT_CODES.BORROWED_FUNDS));

  const leftSideItems = [
    { name: "Owner's Capital", amount: ownersCapital, type: 'EQUITY', accountCode: ACCOUNT_CODES.OWNERS_CAPITAL },
    { name: 'Opening Balance Equity', amount: openingBalanceEquity, type: 'OPENING_EQUITY', accountCode: ACCOUNT_CODES.OPENING_BALANCE_EQUITY },
    { name: 'Current Year Profit/Loss', amount: profitLoss, type: 'PROFIT_LOSS', accountCode: ACCOUNT_CODES.CURRENT_YEAR_PROFIT },
    { name: 'Bank Loans', amount: bankLoans, type: 'LIABILITY', accountCode: ACCOUNT_CODES.BANK_LOANS },
    { name: 'Investor Capital', amount: investorCapital, type: 'LIABILITY', accountCode: ACCOUNT_CODES.INVESTOR_CAPITAL },
    { name: 'Borrowed Funds', amount: borrowedFunds, type: 'LIABILITY', accountCode: ACCOUNT_CODES.BORROWED_FUNDS }
  ];

  const cashInHand = getAccountBalance(ACCOUNT_CODES.CASH_IN_HAND);
  const bankMain = getAccountBalance(ACCOUNT_CODES.BANK_MAIN);
  const bankAccounts = getAccountsByPrefix('110').filter(a => 
    a.accountCode !== '1101' && 
    (a.accountCode.startsWith('1102') || a.accountCode.startsWith('1103') || a.accountCode.startsWith('1104'))
  );
  const totalBankBalance = bankAccounts.reduce((sum, a) => sum + a.currentBalance, 0) + bankMain;

  const onlineLoansReceivable = getAccountBalance(ACCOUNT_CODES.ONLINE_LOANS_RECEIVABLE);
  const offlineLoansReceivable = getAccountBalance(ACCOUNT_CODES.OFFLINE_LOANS_RECEIVABLE);
  const totalLoansReceivable = getAccountBalance(ACCOUNT_CODES.LOANS_RECEIVABLE) || 
    (onlineLoansReceivable + offlineLoansReceivable);

  const interestReceivable = getAccountBalance(ACCOUNT_CODES.INTEREST_RECEIVABLE);
  const processingFeeReceivable = getAccountBalance(ACCOUNT_CODES.PROCESSING_FEE_RECEIVABLE);
  const penaltyReceivable = getAccountBalance(ACCOUNT_CODES.PENALTY_RECEIVABLE);
  const overdueInterestReceivable = getAccountBalance(ACCOUNT_CODES.IRRECOVERABLE_INTEREST);

  const rightSideItems = [
    { name: 'Cash in Hand', amount: cashInHand, type: 'ASSET', accountCode: ACCOUNT_CODES.CASH_IN_HAND },
    { name: 'Bank Accounts', amount: totalBankBalance, type: 'ASSET', accountCode: ACCOUNT_CODES.BANK_MAIN },
    { name: 'Loans Portfolio', amount: totalLoansReceivable, type: 'ASSET', accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE },
    { name: 'Interest Receivable', amount: interestReceivable, type: 'ASSET', accountCode: ACCOUNT_CODES.INTEREST_RECEIVABLE },
    { name: 'Processing Fee Receivable', amount: processingFeeReceivable, type: 'ASSET', accountCode: ACCOUNT_CODES.PROCESSING_FEE_RECEIVABLE },
    { name: 'Penalty Receivable', amount: penaltyReceivable, type: 'ASSET', accountCode: ACCOUNT_CODES.PENALTY_RECEIVABLE },
    { name: 'Overdue Interest Receivable', amount: overdueInterestReceivable, type: 'ASSET', accountCode: ACCOUNT_CODES.IRRECOVERABLE_INTEREST }
  ];

  const rightTotal = rightSideItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const leftTotalBeforeRE = leftSideItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const dynamicRetainedEarnings = rightTotal - leftTotalBeforeRE;

  console.log('--- OUTPUTS ---');
  console.log(`cashInHand (1101): ${cashInHand}`);
  console.log(`totalBankBalance (1102/Main): ${totalBankBalance}`);
  console.log(`totalLoansReceivable: ${totalLoansReceivable}`);
  console.log(`interestReceivable: ${interestReceivable}`);
  console.log(`rightTotal (Assets): ${rightTotal}`);
  console.log(`ownersCapital (3002): ${ownersCapital}`);
  console.log(`openingBalanceEquity (3001): ${openingBalanceEquity}`);
  console.log(`profitLoss (P&L): ${profitLoss}`);
  console.log(`leftTotalBeforeRE: ${leftTotalBeforeRE}`);
  console.log(`dynamicRetainedEarnings: ${dynamicRetainedEarnings}`);
}

main().catch(console.error).finally(() => db.$disconnect());
