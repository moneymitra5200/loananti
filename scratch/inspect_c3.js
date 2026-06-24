const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmq0sdura0000oweseq4j4xkj';
  const cashBook = await db.cashBook.findUnique({
    where: { companyId }
  });
  console.log('CashBook:', cashBook);

  const coa = await db.chartOfAccount.findMany({
    where: { companyId }
  });
  console.log('Chart of Accounts balances:');
  coa.forEach(a => {
    if (a.currentBalance !== 0) {
      console.log(`  ${a.accountCode} - ${a.accountName}: ${a.currentBalance}`);
    }
  });

  const entries = await db.cashBookEntry.findMany({
    where: { cashBookId: cashBook?.id },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`CashBookEntries count: ${entries.length}`);
  entries.forEach(e => {
    console.log(`  ${e.entryType} - ₹${e.amount} - ${e.description} - RefType: ${e.referenceType}`);
  });
}

main().catch(console.error).finally(() => db.$disconnect());
