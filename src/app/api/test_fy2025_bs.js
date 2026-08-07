const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFY2025BS() {
  console.log("=== FY 2025-26 BALANCE SHEET CALCULATIONS ===");

  const moneyMitra = await prisma.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });
  const companyId = moneyMitra.id;

  const dateFilter = new Date("2026-03-31T23:59:59.999Z");

  const accounts = await prisma.chartOfAccount.findMany({
    where: { companyId, isActive: true },
    orderBy: { accountCode: 'asc' }
  });

  const journalLines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: {
        companyId,
        isApproved: true,
        isReversed: false,
        entryDate: { lte: dateFilter }
      }
    },
    select: { accountId: true, debitAmount: true, creditAmount: true }
  });

  const drMap = {};
  const crMap = {};
  for (const l of journalLines) {
    drMap[l.accountId] = (drMap[l.accountId] || 0) + l.debitAmount;
    crMap[l.accountId] = (crMap[l.accountId] || 0) + l.creditAmount;
  }

  console.log(`Approved Journal Lines count for FY 2025-26: ${journalLines.length}`);

  for (const acc of accounts) {
    const dr = drMap[acc.id] || 0;
    const cr = crMap[acc.id] || 0;
    const op = acc.openingBalance || 0;
    const isDrNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
    const balance = isDrNormal ? op + dr - cr : op + cr - dr;

    if (balance !== 0) {
      console.log(`- Account ${acc.accountCode} (${acc.accountName}) [${acc.accountType}]: ₹${balance}`);
    }
  }

  await prisma.$disconnect();
}

testFY2025BS();
