const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companies = await db.company.findMany();
  for (const c of companies) {
    console.log(`\n========================================`);
    console.log(`Company: ${c.name} (ID: ${c.id})`);
    const cash = await db.cashBook.findUnique({ where: { companyId: c.id } });
    console.log(`CashBook:`, cash ? `Balance: ${cash.currentBalance}, Opening: ${cash.openingBalance}` : 'NULL');
    const banks = await db.bankAccount.findMany({ where: { companyId: c.id } });
    console.log(`Bank accounts (${banks.length}):`);
    for (const b of banks) {
      console.log(`- ${b.bankName}: Balance: ${b.currentBalance}, Opening: ${b.openingBalance}`);
    }
    const accounts = await db.chartOfAccount.findMany({
      where: { companyId: c.id, isActive: true, currentBalance: { not: 0 } },
    });
    console.log(`COA Non-zero accounts (${accounts.length}):`);
    for (const a of accounts) {
      console.log(`- ${a.accountCode} (${a.accountName}): ${a.currentBalance}`);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
