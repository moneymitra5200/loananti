const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmp4w8dxa0008100655jq7ywo';
  const accounts = await db.chartOfAccount.findMany({
    where: { companyId, accountCode: { in: ['1200', '1201', '1210'] } }
  });
  const accountIds = accounts.map(a => a.id);

  const lines = await db.journalEntryLine.findMany({
    where: {
      accountId: { in: accountIds },
      journalEntry: { companyId, isApproved: true, isReversed: false }
    },
    include: {
      journalEntry: true,
      account: true
    },
    orderBy: { journalEntry: { entryDate: 'asc' } }
  });

  console.log(`Found ${lines.length} JE lines for LR accounts in C2:`);
  lines.forEach(l => {
    console.log(`- JE ID: ${l.journalEntryId}, Date: ${l.journalEntry.entryDate}`);
    console.log(`  Account: ${l.account.accountCode} - ${l.account.accountName}`);
    console.log(`  Debit: ${l.debitAmount}, Credit: ${l.creditAmount}`);
    console.log(`  RefType: ${l.journalEntry.referenceType}, RefId: ${l.journalEntry.referenceId}`);
    console.log(`  Narration: ${l.journalEntry.narration}`);
  });
}

main().catch(console.error).finally(() => db.$disconnect());
