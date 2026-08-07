const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCapitalDate() {
  console.log("=== CHECK CAPITAL ENTRIES & DATES ===");

  const companies = await prisma.company.findMany();
  for (const c of companies) {
    console.log(`\nCompany: ${c.name} (${c.id})`);
    
    // Check EquityEntry
    const eqEntries = await prisma.equityEntry.findMany({
      where: { companyId: c.id }
    });
    console.log(`EquityEntry count: ${eqEntries.length}`);
    eqEntries.forEach(e => {
      console.log(`  - [EquityEntry] ID: ${e.id}, Type: ${e.entryType}, Amount: ${e.amount}, Date: ${e.entryDate || e.createdAt}`);
    });

    // Check JournalEntry related to Capital (3002)
    const capitalAccount = await prisma.chartOfAccount.findFirst({
      where: { companyId: c.id, accountCode: '3002' }
    });

    if (capitalAccount) {
      console.log(`ChartOfAccount 3002: openingBalance=${capitalAccount.openingBalance}, currentBalance=${capitalAccount.currentBalance}`);
      const jLines = await prisma.journalEntryLine.findMany({
        where: { accountId: capitalAccount.id },
        include: { journalEntry: true }
      });
      console.log(`JournalEntryLines for 3002: ${jLines.length}`);
      jLines.forEach(l => {
        console.log(`  - [JE ${l.journalEntry.entryNumber}] Date: ${l.journalEntry.entryDate}, Dr: ${l.debitAmount}, Cr: ${l.creditAmount}, Ref: ${l.journalEntry.referenceType}`);
      });
    }
  }

  await prisma.$disconnect();
}

checkCapitalDate();
