const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companies = await db.company.findMany();
  for (const c of companies) {
    const cash = await db.cashBook.findUnique({ where: { companyId: c.id } });
    const bank = await db.bankAccount.findMany({ where: { companyId: c.id } });
    const bankSum = bank.reduce((s, b) => s + b.currentBalance, 0);
    console.log(`Company: ${c.name} (ID: ${c.id})`);
    console.log(`- CashBook Balance: ${cash?.currentBalance || 0}`);
    console.log(`- BankAccount Sum: ${bankSum}`);
    
    // Check if any ChartOfAccount has Cash in Hand close to 521200
    const coaCash = await db.chartOfAccount.findFirst({
      where: { companyId: c.id, accountCode: '1101' }
    });
    console.log(`- COA Cash (1101): ${coaCash?.currentBalance || 0}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
