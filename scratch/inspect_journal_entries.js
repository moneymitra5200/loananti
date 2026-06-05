const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const loans = await db.offlineLoan.findMany({
    where: { loanNumber: { contains: 'AWDAWD' } }
  });
  console.log(`Matching loans: ${loans.length}`);
  for (const loan of loans) {
    console.log(`\nLoan: ${loan.loanNumber} | ID: ${loan.id} | Company: ${loan.companyId}`);
    
    const journalEntries = await db.journalEntry.findMany({
      where: {
        lines: {
          some: { loanId: loan.id }
        }
      },
      include: {
        lines: {
          include: {
            account: { select: { accountCode: true, accountName: true } }
          }
        }
      }
    });
    console.log(`Journal Entries found: ${journalEntries.length}`);
    for (const je of journalEntries) {
      console.log(`  JE ID: ${je.id} | Company ID: ${je.companyId} | ReferenceType: ${je.referenceType} | EntryDate: ${je.entryDate.toISOString()}`);
      for (const line of je.lines) {
        console.log(`    Line: ${line.account.accountCode} (${line.account.accountName}) | Dr: ${line.debitAmount} | Cr: ${line.creditAmount} | LoanID: ${line.loanId}`);
      }
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
