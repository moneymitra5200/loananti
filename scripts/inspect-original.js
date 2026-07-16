const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("--- DOUBLE INSPECTION START ---");

  // Fetch C3PL00001
  const orig = await prisma.loanApplication.findFirst({
    where: { applicationNo: 'C3PL00001' }
  });
  console.log(`Original: ID=${orig?.id}, AppNo=${orig?.applicationNo}`);

  // Fetch C2PL00001
  const mirror = await prisma.loanApplication.findFirst({
    where: { applicationNo: 'C2PL00001' }
  });
  console.log(`Mirror: ID=${mirror?.id}, AppNo=${mirror?.applicationNo}`);

  const ids = [orig?.id, mirror?.id].filter(Boolean);

  // Fetch ALL journal entries for these ids
  const jes = await prisma.journalEntry.findMany({
    where: {
      lines: { some: { loanId: { in: ids } } }
    },
    include: {
      lines: {
        include: {
          account: { select: { accountName: true, accountCode: true } }
        }
      },
      company: { select: { name: true } }
    },
    orderBy: { entryDate: 'asc' }
  });

  console.log(`\nJournal Entries Count: ${jes.length}`);
  jes.forEach(je => {
    console.log(`\n[${je.company?.name}] JE ID: ${je.id} | No: ${je.entryNumber} | RefType: ${je.referenceType} | Date: ${je.entryDate} | Narration: ${je.narration}`);
    je.lines.forEach(l => {
      console.log(`  * Line: Account=${l.account?.accountName} (${l.account?.accountCode}) | Debit=${l.debitAmount} | Credit=${l.creditAmount} | LoanID=${l.loanId} | Narration=${l.narration}`);
    });
  });

  console.log("\n--- DOUBLE INSPECTION END ---");
}

main()
  .catch(err => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
