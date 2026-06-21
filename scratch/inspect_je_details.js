const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const jes = await db.journalEntry.findMany({
    include: {
      lines: {
        include: {
          account: true
        }
      },
      company: true
    }
  });
  console.log(`Found ${jes.length} journal entries in total.`);
  for (const je of jes) {
    console.log(`\nJE: ${je.entryNumber} | Date: ${je.entryDate} | Company: ${je.company?.name} (Code: ${je.company?.code})`);
    console.log(`RefType: ${je.referenceType} | Narration: ${je.narration} | Total Dr: ${je.totalDebit} | Total Cr: ${je.totalCredit}`);
    for (const l of je.lines) {
      console.log(`  Line: Account ${l.account?.accountCode} (${l.account?.accountName}) | Dr: ${l.debitAmount} | Cr: ${l.creditAmount} | Narration: ${l.narration}`);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
