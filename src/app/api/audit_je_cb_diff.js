const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditJeCbDiff() {
  console.log("=== COMPARING CASHBOOK vs JOURNAL ENTRIES UP TO TODAY (07-AUG-2026) ===");

  const moneyMitra = await prisma.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });
  const companyId = moneyMitra.id;

  const today = new Date("2026-08-07T23:59:59.999Z");

  const cashAccount = await prisma.chartOfAccount.findFirst({
    where: { companyId, accountCode: '1101' }
  });

  const jLines = await prisma.journalEntryLine.findMany({
    where: {
      accountId: cashAccount.id,
      journalEntry: {
        companyId,
        isApproved: true,
        isReversed: false,
        entryDate: { lte: today }
      }
    },
    include: { journalEntry: true }
  });

  let glDr = 0, glCr = 0;
  jLines.forEach(l => {
    glDr += l.debitAmount;
    glCr += l.creditAmount;
  });

  const glCashToday = glDr - glCr;
  console.log(`GL Cash (1101) up to today (07-Aug-2026): ₹${glCashToday.toFixed(2)}`);

  const cb = await prisma.cashBook.findUnique({ where: { companyId } });
  console.log(`CashBook table currentBalance: ₹${cb.currentBalance.toFixed(2)}`);

  const diffToday = glCashToday - cb.currentBalance;
  console.log(`Difference today (GL Cash - CashBook): ₹${diffToday.toFixed(2)}`);

  await prisma.$disconnect();
}

auditJeCbDiff();
