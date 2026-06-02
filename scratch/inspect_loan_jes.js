const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const loanNumber = 'C3-PERSONAL-MONEYMITRA-002';
  const loan = await db.offlineLoan.findFirst({
    where: { loanNumber },
  });
  if (!loan) {
    console.log(`Loan ${loanNumber} not found.`);
    return;
  }
  console.log('Loan found:', loan);

  const jEs = await db.journalEntry.findMany({
    where: {
      lines: {
        some: { loanId: loan.id }
      }
    },
    include: {
      lines: {
        include: { account: true }
      }
    }
  });

  console.log(`\nJournal Entries for loan ID ${loan.id}:`);
  for (const je of jEs) {
    console.log(`JE ID: ${je.id}, Date: ${je.entryDate}, RefType: ${je.referenceType}, Narration: ${je.narration}`);
    for (const line of je.lines) {
      console.log(`  Line: Account ${line.account?.accountCode} (${line.account?.accountName}), Dr: ${line.debitAmount}, Cr: ${line.creditAmount}, loanId: ${line.loanId}`);
    }
  }
}

main().catch(err => {
  console.error(err);
}).finally(() => db.$disconnect());
