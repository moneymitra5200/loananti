const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkFYPnL() {
  const companyId = 'cmp4w8dx70005100660bx4vh8';

  const allLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: { companyId, isApproved: true, isReversed: false }
    },
    include: {
      account: true,
      journalEntry: { select: { entryDate: true, referenceType: true } }
    }
  });

  console.log(`Total Journal Lines: ${allLines.length}`);
  allLines.forEach(l => {
    console.log(`  Date: ${l.journalEntry.entryDate.toISOString().slice(0, 10)} | Acct: [${l.account.accountCode}] ${l.account.accountName} | Dr: ${l.debitAmount} | Cr: ${l.creditAmount} | Ref: ${l.journalEntry.referenceType}`);
  });
}

checkFYPnL().catch(console.error).finally(() => db.$disconnect());
