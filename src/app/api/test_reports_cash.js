const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const company = await db.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });
  const companyId = company.id;

  const cashBook = await db.cashBook.findUnique({ where: { companyId } });
  console.log('CashBook:', cashBook);

  const dateFilter = new Date();
  const cbWhere = {
    entryDate: { lte: dateFilter },
    cashBookId: cashBook.id
  };

  const [cbCredits, cbDebits] = await Promise.all([
    db.cashBookEntry.aggregate({ where: { ...cbWhere, entryType: 'CREDIT' }, _sum: { amount: true } }),
    db.cashBookEntry.aggregate({ where: { ...cbWhere, entryType: 'DEBIT' }, _sum: { amount: true } })
  ]);

  console.log('cbCredits:', cbCredits);
  console.log('cbDebits:', cbDebits);
  const openingCash = cashBook?.openingBalance || 0;
  const actualCash = openingCash + (cbCredits._sum.amount || 0) - (cbDebits._sum.amount || 0);
  console.log('actualCash with cashBookId:', actualCash);

  // Compare with what route.ts was doing:
  const cbWhereOld = {
    entryDate: { lte: dateFilter },
    cashBook: { companyId }
  };
  const [cbCreditsOld, cbDebitsOld] = await Promise.all([
    db.cashBookEntry.aggregate({ where: { ...cbWhereOld, entryType: 'CREDIT' }, _sum: { amount: true } }),
    db.cashBookEntry.aggregate({ where: { ...cbWhereOld, entryType: 'DEBIT' }, _sum: { amount: true } })
  ]);
  console.log('actualCash with cashBook relation filter:', openingCash + (cbCreditsOld._sum.amount || 0) - (cbDebitsOld._sum.amount || 0));

  // Let's check GL balance of 1101
  const coaCash = await db.chartOfAccount.findFirst({ where: { companyId, accountCode: '1101' } });
  console.log('COA 1101 balance:', coaCash?.currentBalance);
}

main().finally(() => db.$disconnect());
