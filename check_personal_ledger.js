require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const loans = await db.offlineLoan.findMany({
    where: {
      loanNumber: { contains: '00009' }
    },
    include: {
      company: true
    }
  });

  console.log("Found loans:");
  for (const l of loans) {
    console.log(`Loan ID: ${l.id}, Loan Number: ${l.loanNumber}, Status: ${l.status}, CreatedAt: ${l.createdAt}`);
    
    // Find journal entries
    const journalEntries = await db.journalEntry.findMany({
      where: {
        OR: [
          { referenceId: l.id },
          { lines: { some: { loanId: l.id } } }
        ]
      },
      orderBy: { entryDate: 'asc' },
      include: {
        lines: {
          include: {
            account: true
          }
        }
      }
    });
    
    console.log(`Journal Entries for ${l.loanNumber}:`);
    for (const je of journalEntries) {
      console.log(`  EntryId: ${je.id}, EntryDate: ${je.entryDate}, Type: ${je.referenceType}, Narration: ${je.narration}`);
      for (const line of je.lines) {
        console.log(`    Line - Code: ${line.accountCode} (${line.account?.name}), Debit: ${line.debitAmount}, Credit: ${line.creditAmount}, Narration: ${line.narration}`);
      }
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
