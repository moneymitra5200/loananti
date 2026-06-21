const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmq0sdvhy0001owes4zr8gemk';
  const entries = await db.journalEntry.findMany({
    where: { companyId },
    include: {
      lines: {
        include: {
          account: true
        }
      }
    },
    orderBy: { entryDate: 'asc' }
  });

  console.log(`Found ${entries.length} journal entries:`);
  for (const entry of entries) {
    console.log(`\nEntry: ${entry.id} | Date: ${entry.entryDate} | Ref: ${entry.referenceType} / ${entry.referenceId} | Approved: ${entry.isApproved} | Reversed: ${entry.isReversed} | Narration: ${entry.narration}`);
    for (const line of entry.lines) {
      console.log(`  - ${line.account.accountCode} (${line.account.accountName}): Dr: ${line.debitAmount} | Cr: ${line.creditAmount} | Narration: ${line.narration}`);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
