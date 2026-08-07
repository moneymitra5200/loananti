const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditFutureJE() {
  console.log("=== FUTURE DATED JOURNAL ENTRIES AUDIT ===");

  const moneyMitra = await prisma.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });
  const companyId = moneyMitra.id;

  const now = new Date("2026-08-07T23:59:59.999Z");

  const futureLines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: {
        companyId,
        isApproved: true,
        isReversed: false,
        entryDate: { gt: now }
      }
    },
    include: { journalEntry: true, account: true }
  });

  console.log(`Future Journal Entry Lines count (entryDate > 07-Aug-2026): ${futureLines.length}`);

  let futureCashDr = 0, futureCashCr = 0;
  let futureIncome = 0;

  for (const l of futureLines) {
    if (l.account.accountCode === '1101') {
      futureCashDr += l.debitAmount;
      futureCashCr += l.creditAmount;
      console.log(`- [JE ${l.journalEntry.entryNumber}] Date: ${l.journalEntry.entryDate.toISOString().split('T')[0]}, Account: ${l.account.accountName}, Dr: ₹${l.debitAmount}, Cr: ₹${l.creditAmount}, Ref: ${l.journalEntry.referenceType}`);
    }
    if (l.account.accountType === 'INCOME') {
      futureIncome += (l.creditAmount - l.debitAmount);
    }
  }

  console.log(`\nFuture Cash Debit Total: ₹${futureCashDr.toFixed(2)}`);
  console.log(`Future Cash Credit Total: ₹${futureCashCr.toFixed(2)}`);
  console.log(`Future Cash Net Total: ₹${(futureCashDr - futureCashCr).toFixed(2)}`);
  console.log(`Future Income Total: ₹${futureIncome.toFixed(2)}`);

  await prisma.$disconnect();
}

auditFutureJE();
