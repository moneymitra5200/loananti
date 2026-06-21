const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmq0sdvhy0001owes4zr8gemk';
  const cashBook = await db.cashBook.findFirst({ where: { companyId } });
  console.log('CashBook:', cashBook);

  const cbCredits = await db.cashBookEntry.aggregate({
    where: { cashBook: { companyId }, entryType: 'CREDIT' },
    _sum: { amount: true }
  });
  const cbDebits = await db.cashBookEntry.aggregate({
    where: { cashBook: { companyId }, entryType: 'DEBIT' },
    _sum: { amount: true }
  });
  console.log('Credits:', cbCredits._sum.amount);
  console.log('Debits:', cbDebits._sum.amount);
}

main().catch(console.error).finally(() => db.$disconnect());
