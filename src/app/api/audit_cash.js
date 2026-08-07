const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const company = await db.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });
  const companyId = company.id;

  const cashBook = await db.cashBook.findUnique({ where: { companyId } });
  console.log('CashBook Table currentBalance:', cashBook?.currentBalance);

  // Let's check CashBookEntries
  const cbEntries = await db.cashBookEntry.findMany({ where: { cashBookId: cashBook.id } });
  let cbBal = cashBook.openingBalance || 0;
  cbEntries.forEach(e => {
    if (e.entryType === 'CREDIT') cbBal += e.amount;
    else if (e.entryType === 'DEBIT') cbBal -= e.amount;
  });
  console.log('Sum of CashBookEntries:', cbBal);

  // Let's check GL balance of 1101
  const coaCash = await db.chartOfAccount.findFirst({ where: { companyId, accountCode: '1101' } });
  const lines = await db.journalEntryLine.findMany({
    where: { accountId: coaCash.id, journalEntry: { isApproved: true, isReversed: false } }
  });
  let glBal = coaCash.openingBalance || 0;
  lines.forEach(l => glBal += (l.debitAmount - l.creditAmount));
  console.log('GL Balance of 1101 (Cash in Hand):', glBal);

  // Let's check why 4,94,664.29 was displayed on Balance Sheet!
  // In getBalanceSheet in reports/route.ts or balance-sheet/route.ts:
  console.log('Difference between CashBook (517,311.26) and 494,664.29:', 517311.26 - 494664.29);
}

main().finally(() => db.$disconnect());
