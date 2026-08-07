const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCapitalRoll() {
  console.log("=== CAPITAL & PROFIT ROLLOVER AUDIT ===");

  const moneyMitra = await prisma.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });
  const companyId = moneyMitra.id;

  // 1. FY 2025-26 (ending 31-Mar-2026)
  const fy2025End = new Date("2026-03-31T23:59:59.999Z");
  const pnl2025 = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: { companyId, isApproved: true, isReversed: false, entryDate: { lte: fy2025End } },
      account: { accountType: { in: ['INCOME', 'EXPENSE'] } }
    },
    include: { account: true }
  });

  let inc2025 = 0, exp2025 = 0;
  pnl2025.forEach(l => {
    if (l.account.accountType === 'INCOME') inc2025 += (l.creditAmount - l.debitAmount);
    if (l.account.accountType === 'EXPENSE') exp2025 += (l.debitAmount - l.creditAmount);
  });

  const profit2025 = inc2025 - exp2025;
  const ownerCapital2025 = 3000000.00;
  const totalEndingCapital2025 = ownerCapital2025 + profit2025;

  console.log("FY 2025-26 Summary:");
  console.log(`- Owner's Capital: ₹${ownerCapital2025.toLocaleString('en-IN')}`);
  console.log(`- Net Profit: ₹${profit2025.toLocaleString('en-IN')}`);
  console.log(`- Total Ending Capital (FY 2025-26): ₹${totalEndingCapital2025.toLocaleString('en-IN')}`);

  // 2. FY 2026-27 (Opening 01-Apr-2026)
  const fy2026Start = new Date("2026-04-01T00:00:00.000Z");
  const fy2026End = new Date("2027-03-31T23:59:59.999Z");

  const pnl2026 = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: { companyId, isApproved: true, isReversed: false, entryDate: { gte: fy2026Start, lte: fy2026End } },
      account: { accountType: { in: ['INCOME', 'EXPENSE'] } }
    },
    include: { account: true }
  });

  let inc2026 = 0, exp2026 = 0;
  pnl2026.forEach(l => {
    if (l.account.accountType === 'INCOME') inc2026 += (l.creditAmount - l.debitAmount);
    if (l.account.accountType === 'EXPENSE') exp2026 += (l.debitAmount - l.creditAmount);
  });

  const profit2026 = inc2026 - exp2026;
  const openingCapital2026 = totalEndingCapital2025; // ₹30,00,971.93
  const totalEndingCapital2026 = openingCapital2026 + profit2026; // ₹31,02,021.41

  console.log("\nFY 2026-27 Summary:");
  console.log(`- Opening Capital (Base Capital + Prior Profit): ₹${openingCapital2026.toLocaleString('en-IN')}`);
  console.log(`- Current Year Profit (FY 2026-27): ₹${profit2026.toLocaleString('en-IN')}`);
  console.log(`- Total Ending Capital for FY 2026-27: ₹${totalEndingCapital2026.toLocaleString('en-IN')}`);

  await prisma.$disconnect();
}

testCapitalRoll();
