const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFYs() {
  console.log("=== FY DATABASE QUERY AUDIT ===");

  const companies = await prisma.company.findMany({ select: { id: true, name: true, code: true } });
  console.log("Companies:", companies);

  const moneyMitra = companies.find(c => c.name.includes("MONEY MITRA") || c.code.endsWith("1") || c.code.endsWith("2"));
  if (!moneyMitra) {
    console.log("Money Mitra company not found!");
    return;
  }

  console.log("\nAuditing Money Mitra ID:", moneyMitra.id, moneyMitra.name);

  // FY 2025-26: 2025-04-01 to 2026-03-31
  const fy2025Start = new Date("2025-04-01T00:00:00.000Z");
  const fy2025End = new Date("2026-03-31T23:59:59.999Z");

  // FY 2026-27: 2026-04-01 to 2027-03-31
  const fy2026Start = new Date("2026-04-01T00:00:00.000Z");
  const fy2026End = new Date("2027-03-31T23:59:59.999Z");

  const entries2025 = await prisma.journalEntry.count({
    where: {
      companyId: moneyMitra.id,
      isApproved: true,
      isReversed: false,
      entryDate: { gte: fy2025Start, lte: fy2025End }
    }
  });

  const entries2026 = await prisma.journalEntry.count({
    where: {
      companyId: moneyMitra.id,
      isApproved: true,
      isReversed: false,
      entryDate: { gte: fy2026Start, lte: fy2026End }
    }
  });

  console.log(`\nJournal Entries count:`);
  console.log(`- FY 2025-26 (${fy2025Start.toISOString().split('T')[0]} to ${fy2025End.toISOString().split('T')[0]}): ${entries2025} entries`);
  console.log(`- FY 2026-27 (${fy2026Start.toISOString().split('T')[0]} to ${fy2026End.toISOString().split('T')[0]}): ${entries2026} entries`);

  // Cashbook entries count by FY
  const cb2025 = await prisma.cashBookEntry.count({
    where: {
      cashBook: { companyId: moneyMitra.id },
      createdAt: { gte: fy2025Start, lte: fy2025End }
    }
  });

  const cb2026 = await prisma.cashBookEntry.count({
    where: {
      cashBook: { companyId: moneyMitra.id },
      createdAt: { gte: fy2026Start, lte: fy2026End }
    }
  });

  console.log(`\nCashBook Entries count:`);
  console.log(`- FY 2025-26: ${cb2025} entries`);
  console.log(`- FY 2026-27: ${cb2026} entries`);

  console.log("\nFY Database check completed successfully.");
  await prisma.$disconnect();
}

checkFYs();
