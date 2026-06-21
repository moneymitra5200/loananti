const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmq0sdvhy0001owes4zr8gemk';
  const dateFilter = new Date();

  // 1. Cash Balance
  const cashBook = await db.cashBook.findFirst({ where: { companyId } });
  const cbWhere = { cashBook: { companyId }, entryDate: { lte: dateFilter } };
  const cbCredits = await db.cashBookEntry.aggregate({ where: { ...cbWhere, entryType: 'CREDIT' }, _sum: { amount: true } });
  const cbDebits = await db.cashBookEntry.aggregate({ where: { ...cbWhere, entryType: 'DEBIT' }, _sum: { amount: true } });
  const openingCash = cashBook?.openingBalance || 0;
  const actualCash = openingCash + (cbCredits._sum.amount || 0) - (cbDebits._sum.amount || 0);

  // 2. Bank Balance
  const bankAccounts = await db.bankAccount.findMany({ where: { companyId, isActive: true } });
  let actualBankTotal = 0;
  for (const bank of bankAccounts) {
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
  }

  // 3. Capital
  const equityEntries = await db.equityEntry.findMany({ where: { companyId } });
  const actualCapital = equityEntries
    .filter(e => new Date(e.entryDate || e.createdAt) <= dateFilter)
    .reduce((s, e) => e.entryType === 'WITHDRAWAL' ? s - (e.amount || 0) : s + (e.amount || 0), 0);

  // 4. Online Loans
  const onlineLoans = await db.loanApplication.findMany({
    where: {
      companyId,
      status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED', 'CLOSED'] },
      disbursedAt: { lte: dateFilter }
    },
    select: {
      disbursedAmount: true,
      emiSchedules: {
        where: { paymentStatus: 'PAID', paidDate: { lte: dateFilter } },
        select: { paidPrincipal: true }
      }
    }
  });
  const actualOnlineLoans = onlineLoans.reduce((sum, loan) => {
    const disbursed = loan.disbursedAmount || 0;
    const paidPrincipal = loan.emiSchedules.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
    return sum + Math.max(0, disbursed - paidPrincipal);
  }, 0);

  // 5. Offline Loans
  const offlineLoans = await db.offlineLoan.findMany({
    where: {
      companyId,
      status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED', 'CLOSED'] },
      disbursementDate: { lte: dateFilter }
    },
    select: {
      loanAmount: true,
      emis: {
        where: { paymentStatus: 'PAID', paidDate: { lte: dateFilter } },
        select: { paidPrincipal: true }
      }
    }
  });
  const actualOfflineLoans = offlineLoans.reduce((sum, loan) => {
    const disbursed = loan.loanAmount || 0;
    const paidPrincipal = loan.emis.reduce((s, emi) => s + (emi.paidPrincipal || 0), 0);
    return sum + Math.max(0, disbursed - paidPrincipal);
  }, 0);

  console.log({
    actualCash,
    actualBankTotal,
    actualCapital,
    actualOnlineLoans,
    actualOfflineLoans
  });
}

main().catch(console.error).finally(() => db.$disconnect());
