const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function testPenalty() {
  try {
    const { AccountingService, DEFAULT_CHART_OF_ACCOUNTS, ACCOUNT_CODES } = await import('./src/lib/accounting-service.ts');
    // get an existing company
    const comp = await db.company.findFirst();
    if (!comp) return console.log("No company found");
    const penSvc = new AccountingService(comp.id);
    await penSvc.initializeChartOfAccounts();
    console.log("Initialized COA.");
    
    await penSvc.createJournalEntry({
      entryDate: new Date(),
      referenceType: 'PENALTY_COLLECTION',
      referenceId: `test-pen-${Date.now()}`,
      narration: `Penalty Income test`,
      createdById: 'SYSTEM',
      isAutoEntry: true,
      lines: [
        { accountCode: ACCOUNT_CODES.CASH_IN_HAND, debitAmount: 300, creditAmount: 0, narration: `Penalty collected via CASH` },
        { accountCode: ACCOUNT_CODES.PENALTY_INCOME, debitAmount: 0, creditAmount: 300, narration: `Penalty income after waiver` },
      ],
    });
    console.log("Successfully created penalty JE!");
  } catch(e) {
    console.error("Test failed", e);
  } finally {
    await db.$disconnect();
  }
}

testPenalty();
