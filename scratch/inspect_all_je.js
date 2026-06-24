require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const jes = await db.journalEntry.findMany({
    include: {
      lines: {
        include: {
          account: true
        }
      }
    },
    orderBy: {
      entryNumber: 'asc'
    }
  });

  console.log(`=== ALL JOURNAL ENTRIES (${jes.length}) ===`);
  for (const je of jes) {
    console.log(`JE: ${je.entryNumber} | Date: ${je.entryDate.toISOString().split('T')[0]} | Company: ${je.companyId} | Approved: ${je.isApproved} | Reversed: ${je.isReversed} | Ref: ${je.referenceId}`);
    console.log(`Narration: ${je.narration}`);
    for (const l of je.lines) {
      console.log(`  - Account: ${l.account.accountCode} (${l.account.accountName}) | Dr: ${l.debitAmount} | Cr: ${l.creditAmount} | CustomerId: ${l.customerId} | LoanId: ${l.loanId}`);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
