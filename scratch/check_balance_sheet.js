const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

// Inline the logic of getProfitAndLoss and getBalanceSheet from reports/route.ts
async function getProfitAndLoss(companyId, startDate, endDate) {
  const where = companyId ? { companyId, isActive: true } : { isActive: true };
  const journalEntryWhere = { isApproved: true, isReversed: false };
  if (companyId) journalEntryWhere.companyId = companyId;

  const [incomeAccounts, expenseAccounts] = await Promise.all([
    db.chartOfAccount.findMany({
      where: { ...where, accountType: 'INCOME' },
      include: {
        journalLines: {
          where: { journalEntry: journalEntryWhere },
          select: { debitAmount: true, creditAmount: true },
        },
      },
    }),
    db.chartOfAccount.findMany({
      where: { ...where, accountType: 'EXPENSE' },
      include: {
        journalLines: {
          where: { journalEntry: journalEntryWhere },
          select: { debitAmount: true, creditAmount: true },
        },
      },
    }),
  ]);

  const income = incomeAccounts.map(account => {
    const totalCredit = account.journalLines.reduce((s, l) => s + (l.creditAmount || 0), 0);
    const totalDebit  = account.journalLines.reduce((s, l) => s + (l.debitAmount  || 0), 0);
    const amount = totalCredit - totalDebit;
    return { accountCode: account.accountCode, accountName: account.accountName, amount };
  });

  const expenses = expenseAccounts.map(account => {
    const totalDebit  = account.journalLines.reduce((s, l) => s + (l.debitAmount  || 0), 0);
    const totalCredit = account.journalLines.reduce((s, l) => s + (l.creditAmount || 0), 0);
    const amount = totalDebit - totalCredit;
    return { accountCode: account.accountCode, accountName: account.accountName, amount };
  });

  const totalIncome   = income.reduce((sum, acc) => sum + acc.amount, 0);
  const totalExpenses = expenses.reduce((sum, acc) => sum + acc.amount, 0);

  return {
    income,
    expenses,
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
  };
}

async function getBalanceSheet(companyId, asOfDate) {
  const dateFilter = asOfDate || new Date();
  const where = companyId ? { companyId, isActive: true } : { isActive: true };

  const accounts = await db.chartOfAccount.findMany({
    where,
    orderBy: { accountCode: 'asc' },
  });

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

  const [cashBook, bankAccountsData, equityEntries, onlineLoans, offlineLoans] = await Promise.all([
    companyId ? db.cashBook.findUnique({ where: { companyId } }) : null,
    db.bankAccount.findMany({ where: { ...(companyId ? { companyId } : {}), isActive: true } }),
    db.equityEntry.findMany({ where: { ...(companyId ? { companyId } : {}) } }),
    db.loanApplication.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED', 'CLOSED'] },
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
    db.offlineLoan.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED', 'CLOSED'] },
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

  const cbWhere = { entryDate: { lte: dateFilter } };
  if (companyId) cbWhere.cashBook = { companyId };
  const [cbCredits, cbDebits] = await Promise.all([
    db.cashBookEntry.aggregate({ where: { ...cbWhere, entryType: 'CREDIT' }, _sum: { amount: true } }),
    db.cashBookEntry.aggregate({ where: { ...cbWhere, entryType: 'DEBIT' }, _sum: { amount: true } })
  ]);
  const openingCash = cashBook?.openingBalance || 0;
  const actualCash = openingCash + (cbCredits._sum.amount || 0) - (cbDebits._sum.amount || 0);

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

  const actualCapital = equityEntries
    .filter(e => new Date(e.entryDate || e.createdAt) <= dateFilter)
    .reduce((s, e) => e.entryType === 'WITHDRAWAL' ? s - (e.amount || 0) : s + (e.amount || 0), 0);

  const actualOnlineLoans = onlineLoans.reduce((sum, loan) => {
    const disbursed = loan.disbursedAmount || 0;
    const paidPrincipal = loan.emiSchedules.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
    return sum + Math.max(0, disbursed - paidPrincipal);
  }, 0);

  const actualOfflineLoans = offlineLoans.reduce((sum, loan) => {
    const disbursed = loan.loanAmount || 0;
    const paidPrincipal = loan.emis.reduce((s, emi) => s + (emi.paidPrincipal || 0), 0);
    return sum + Math.max(0, disbursed - paidPrincipal);
  }, 0);

  const drMap = {};
  const crMap = {};
  for (const line of journalLines) {
    drMap[line.accountId] = (drMap[line.accountId] || 0) + line.debitAmount;
    crMap[line.accountId] = (crMap[line.accountId] || 0) + line.creditAmount;
  }

  const accountBalances = {};
  for (const acc of accounts) {
    const dr = drMap[acc.id] || 0;
    const cr = crMap[acc.id] || 0;
    const op = acc.openingBalance || 0;
    const isDrNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
    
    let balance = isDrNormal ? op + dr - cr : op + cr - dr;

    if (acc.accountCode === '1101') balance = actualCash;
    if (acc.accountCode === '1102') balance = actualBankTotal;
    if (acc.accountCode === '1201') balance = actualOnlineLoans;
    if (acc.accountCode === '1210') balance = actualOfflineLoans;
    if (acc.accountCode === '3002') {
      balance = actualCapital > 0 || actualCapital < 0 ? actualCapital : balance;
    }
    if (acc.accountCode === '1200') balance = actualOnlineLoans + actualOfflineLoans;

    accountBalances[acc.accountCode] = balance;
  }

  const assets = [
    { accountCode: '1101', accountName: 'Cash in Hand', amount: accountBalances['1101'] || 0 },
    { accountCode: '1102', accountName: 'Bank Accounts', amount: actualBankTotal },
    { accountCode: '1201', accountName: 'Online Loans Given', amount: accountBalances['1201'] || 0 },
    { accountCode: '1210', accountName: 'Offline Loans Given', amount: accountBalances['1210'] || 0 },
    { accountCode: '1301', accountName: 'Interest Receivable', amount: accountBalances['1301'] || 0 },
    { accountCode: '1302', accountName: 'Processing Fee Receivable', amount: accountBalances['1302'] || 0 },
    { accountCode: '1303', accountName: 'Penalty Receivable', amount: accountBalances['1303'] || 0 },
    { accountCode: '1305', accountName: 'Overdue Interest Receivable', amount: accountBalances['1305'] || 0 }
  ];

  const otherAssetAccounts = accounts.filter(a => 
    a.accountType === 'ASSET' && 
    !['1101', '1102', '1200', '1201', '1210', '1301', '1302', '1303', '1305'].includes(a.accountCode) &&
    !a.accountCode.startsWith('110') &&
    !a.accountCode.startsWith('14')
  );
  otherAssetAccounts.forEach(a => {
    assets.push({ accountCode: a.accountCode, accountName: a.accountName, amount: accountBalances[a.accountCode] || 0 });
  });

  const liabilities = accounts
    .filter(a => a.accountType === 'LIABILITY')
    .map(a => ({ accountCode: a.accountCode, accountName: a.accountName, amount: accountBalances[a.accountCode] || 0 }));
    
  liabilities.push({
    accountCode: '3002',
    accountName: "Owner's Capital",
    amount: accountBalances['3002'] || 0
  });

  const equity = accounts
    .filter(a => a.accountType === 'EQUITY' && !['3004', '3002'].includes(a.accountCode))
    .map(a => ({ accountCode: a.accountCode, accountName: a.accountName, amount: accountBalances[a.accountCode] || 0 }));

  const pnlData = await getProfitAndLoss(companyId, null, dateFilter);
  const currentYearProfit = pnlData.netProfit || 0;
  equity.push({ accountCode: 'PL', accountName: 'Current Year Profit/(Loss)', amount: currentYearProfit });

  const totalAssets = assets.reduce((s, a) => s + (a.amount || 0), 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + (a.amount || 0), 0);
  const totalEquity = equity.reduce((s, a) => s + (a.amount || 0), 0);

  return {
    assets, liabilities, equity,
    totalAssets, totalLiabilities, totalEquity,
    netProfit: currentYearProfit,
    balanceCheck: {
      assets: totalAssets,
      liabilitiesAndEquity: totalLiabilities + totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
      difference: Math.abs(totalAssets - (totalLiabilities + totalEquity))
    }
  };
}

async function main() {
  const result = await getBalanceSheet('cmq0sdvhy0001owes4zr8gemk', new Date());
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
