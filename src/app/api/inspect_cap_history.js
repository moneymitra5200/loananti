const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectCapHistory() {
  console.log("=== CAPITAL & CASH HISTORICAL AUDIT ===");

  const moneyMitra = await prisma.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });
  const companyId = moneyMitra.id;

  const capitalJE = await prisma.journalEntry.findMany({
    where: { companyId, referenceType: 'EQUITY_INVESTMENT' },
    include: { lines: { include: { account: true } } }
  });

  console.log("Capital Journal Entries:");
  capitalJE.forEach(j => {
    console.log(`- Entry: ${j.entryNumber}, Date: ${j.entryDate.toISOString()}, Ref: ${j.referenceType}`);
    j.lines.forEach(l => {
      console.log(`   Account: ${l.account.accountCode} (${l.account.accountName}), Dr: ${l.debitAmount}, Cr: ${l.creditAmount}`);
    });
  });

  const eqEntries = await prisma.equityEntry.findMany({ where: { companyId } });
  console.log("\nEquity Entries:");
  eqEntries.forEach(e => {
    console.log(`- Amount: ₹${e.amount}, Date: ${e.entryDate.toISOString()}, Desc: ${e.description}`);
  });

  await prisma.$disconnect();
}

inspectCapHistory();
