const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const c1 = 'cmq0sdvhy0001owes4zr8gemk';
  const cashBook = await db.cashBook.findFirst({
    where: { companyId: c1 },
    include: { entries: true }
  });
  console.log('CashBook:', {
    id: cashBook.id,
    currentBalance: cashBook.currentBalance,
    openingBalance: cashBook.openingBalance,
  });
  console.log('Entries:', cashBook.entries.map(e => ({
    entryType: e.entryType,
    amount: e.amount,
    balanceAfter: e.balanceAfter,
    description: e.description,
    referenceType: e.referenceType
  })));
}

main().catch(console.error).finally(() => db.$disconnect());
