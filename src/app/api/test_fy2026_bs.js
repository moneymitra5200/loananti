const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFY2026() {
  console.log("=== COMPREHENSIVE FY 2026-27 BALANCE SHEET TEST ===");

  const moneyMitra = await prisma.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });

  const res = await fetch(`http://localhost:3000/api/accounting/reports?type=balance-sheet&companyId=${moneyMitra.id}&year=2026`);
  const data = await res.json();

  console.log("\n--- ASSETS ---");
  data.assets.forEach(a => {
    if (a.amount !== 0) console.log(`${a.accountName}: ₹${a.amount.toLocaleString('en-IN')}`);
  });
  console.log(`TOTAL ASSETS: ₹${data.totalAssets.toLocaleString('en-IN')}`);

  console.log("\n--- EQUITY ---");
  data.equity.forEach(e => {
    console.log(`${e.accountName}: ₹${e.amount.toLocaleString('en-IN')}`);
  });
  console.log(`TOTAL EQUITY: ₹${data.totalEquity.toLocaleString('en-IN')}`);
  console.log(`TOTAL LIABILITIES & EQUITY: ₹${(data.totalLiabilities + data.totalEquity).toLocaleString('en-IN')}`);
  console.log(`IS BALANCED: ${data.balanceCheck.isBalanced}`);

  await prisma.$disconnect();
}

testFY2026();
