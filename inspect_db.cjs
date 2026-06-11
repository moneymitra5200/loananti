const { db } = require('./src/lib/db');

async function main() {
  const loan = await db.loanApplication.findFirst({
    where: { applicationNo: 'C2IN00001' },
    include: {
      emiSchedules: { orderBy: { installmentNumber: 'asc' } }
    }
  });

  if (!loan) {
    console.log('Loan C2IN00001 not found in loanApplication');
    return;
  }

  console.log(`FOUND ONLINE LOAN: ${loan.applicationNo} | ID: ${loan.id}`);
  console.log(`Customer ID: ${loan.customerId} | Company ID: ${loan.companyId}`);

  // Query all journal entries associated with this loan
  const journalEntries = await db.journalEntry.findMany({
    where: {
      OR: [
        { referenceId: loan.id },
        { referenceId: { in: loan.emiSchedules.map(e => e.id) } },
        { lines: { some: { loanId: loan.id } } }
      ]
    },
    include: {
      lines: {
        include: {
          account: true
        }
      }
    },
    orderBy: { entryDate: 'asc' }
  });

  console.log(`Total Journal Entries: ${journalEntries.length}`);
  for (const je of journalEntries) {
    console.log(`\nJE: ${je.entryNumber} | Date: ${je.entryDate.toISOString()} | RefType: ${je.referenceType} | RefId: ${je.referenceId} | Narration: ${je.narration}`);
    for (const l of je.lines) {
      console.log(`   - Account: ${l.account?.accountCode} (${l.account?.accountName}) | Dr: ${l.debitAmount} | Cr: ${l.creditAmount} | LoanId: ${l.loanId}`);
    }
  }
  await db.$disconnect();
}

main().catch(console.error);
