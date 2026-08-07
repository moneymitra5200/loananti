const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const company = await db.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });

  const penaltyAcc = await db.chartOfAccount.findFirst({
    where: { companyId: company.id, accountCode: '4125' }
  });

  const lines = await db.journalEntryLine.findMany({
    where: { accountId: penaltyAcc.id },
    include: { journalEntry: { include: { lines: { include: { account: true } } } } }
  });

  console.log('=== PENALTY JOURNAL ENTRIES ===');
  lines.forEach(l => {
    console.log('JE:', l.journalEntry.entryNumber, l.journalEntry.narration, 'Date:', l.journalEntry.entryDate);
    l.journalEntry.lines.forEach(sub => {
      console.log('  ->', sub.account.accountCode, sub.account.accountName, 'Dr:', sub.debitAmount, 'Cr:', sub.creditAmount);
    });
  });
}

main().finally(() => db.$disconnect());
