const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companies = await db.company.findMany();
  console.log('COMPANIES:', companies.map(c => ({ id: c.id, name: c.name, code: c.code, isMirror: c.isMirrorCompany })));

  for (const comp of companies) {
    if (comp.name.toUpperCase().includes('MONEY') || comp.code.toUpperCase().includes('MONEY')) {
      console.log(`\nBalance Sheet for ${comp.name} (${comp.id}):`);
      // Run the balance sheet calculation logic directly
      const companyId = comp.id;
      const dateFilter = new Date();

      const accounts = await db.chartOfAccount.findMany({
        where: { companyId, isActive: true },
        orderBy: { accountCode: 'asc' },
      });

      const journalLines = await db.journalEntryLine.findMany({
        where: {
          journalEntry: {
            companyId,
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
        db.cashBook.findUnique({ where: { companyId } }),
        db.bankAccount.findMany({ where: { companyId, isActive: true } }),
        db.equityEntry.findMany({ where: { companyId } }),
        db.loanApplication.findMany({
          where: {
            companyId,
            status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED'] },
            disbursedAt: { lte: dateFilter }
          },
          select: {
            id: true,
            disbursedAmount: true,
            emiSchedules: {
              where: { paidDate: { lte: dateFilter } },
              select: { paidPrincipal: true }
            }
          }
        }),
        db.offlineLoan.findMany({
          where: {
            companyId,
            status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED'] },
            disbursementDate: { lte: dateFilter }
          },
          select: {
            id: true,
            loanAmount: true,
            emis: {
              where: { paidDate: { lte: dateFilter } },
              select: { paidPrincipal: true }
            }
          }
        })
      ]);

      const mirrorMappings = await db.mirrorLoanMapping.findMany({
        select: { originalLoanId: true }
      });
      const mirroredOriginalIds = new Set(mirrorMappings.map(m => m.originalLoanId));

      const cbWhere = { entryDate: { lte: dateFilter }, cashBook: { companyId } };
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
          return { ...bank, currentBalance: historicalBalance };
        })
      );

      const actualCapital = equityEntries
        .filter(e => new Date(e.entryDate || e.createdAt) <= dateFilter)
        .reduce((s, e) => e.entryType === 'WITHDRAWAL' ? s - (e.amount || 0) : s + (e.amount || 0), 0);

      const actualOnlineLoans = onlineLoans
        .filter(loan => !mirroredOriginalIds.has(loan.id))
        .reduce((sum, loan) => {
          const disbursed = loan.disbursedAmount || 0;
          const paidPrincipal = loan.emiSchedules.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
          return sum + Math.max(0, disbursed - paidPrincipal);
        }, 0);

      const actualOfflineLoans = offlineLoans
        .filter(loan => !mirroredOriginalIds.has(loan.id))
        .reduce((sum, loan) => {
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
        if (acc.accountCode === '3002') balance = actualCapital !== 0 ? actualCapital : balance;
        if (acc.accountCode === '1200') balance = 0;

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

      const liabilities = accounts
        .filter(a => a.accountType === 'LIABILITY')
        .map(a => ({ accountCode: a.accountCode, accountName: a.accountName, amount: accountBalances[a.accountCode] || 0 }));
      liabilities.push({ accountCode: '3002', accountName: "Owner's Capital", amount: accountBalances['3002'] || 0 });

      const equity = accounts
        .filter(a => a.accountType === 'EQUITY' && !['3004', '3002'].includes(a.accountCode))
        .map(a => ({ accountCode: a.accountCode, accountName: a.accountName, amount: accountBalances[a.accountCode] || 0 }));

      // P&L
      const incomeAccounts = accounts.filter(a => a.accountType === 'INCOME');
      const expenseAccounts = accounts.filter(a => a.accountType === 'EXPENSE');
      
      const drMapPL = {};
      const crMapPL = {};
      for (const line of journalLines) {
        drMapPL[line.accountId] = (drMapPL[line.accountId] || 0) + line.debitAmount;
        crMapPL[line.accountId] = (crMapPL[line.accountId] || 0) + line.creditAmount;
      }

      const totalIncome = incomeAccounts.reduce((sum, a) => {
        const dr = drMapPL[a.id] || 0;
        const cr = crMapPL[a.id] || 0;
        const amt = cr - dr;
        return sum + (amt !== 0 ? amt : a.currentBalance);
      }, 0);
      
      const totalExpenses = expenseAccounts.reduce((sum, a) => {
        const dr = drMapPL[a.id] || 0;
        const cr = crMapPL[a.id] || 0;
        const amt = dr - cr;
        return sum + (amt !== 0 ? amt : a.currentBalance);
      }, 0);

      const currentYearProfit = totalIncome - totalExpenses;

      equity.push({ accountCode: 'PL', accountName: 'Current Year Profit/(Loss)', amount: currentYearProfit });

      const totalAssets = assets.reduce((s, a) => s + (a.amount || 0), 0);
      const totalLiabilities = liabilities.reduce((s, a) => s + (a.amount || 0), 0);
      const totalEquityWithoutRE = equity.filter(e => e.accountCode !== '3003').reduce((s, e) => s + (e.amount || 0), 0);
      const dynamicRetainedEarnings = totalAssets - (totalLiabilities + totalEquityWithoutRE);

      console.log('Calculated Assets Total:', totalAssets);
      console.log('Calculated Liabilities Total (incl Owner Capital):', totalLiabilities);
      console.log('Calculated Equity without RE Total:', totalEquityWithoutRE);
      console.log('dynamicRetainedEarnings:', dynamicRetainedEarnings);
      console.log('equity array:', equity);
      console.log('liabilities array:', liabilities);
      console.log('assets array:', assets);
      console.log('currentYearProfit (netProfit):', currentYearProfit);
      console.log('totalIncome:', totalIncome, 'totalExpenses:', totalExpenses);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
