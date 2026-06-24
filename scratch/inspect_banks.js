const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const banks = await db.bankAccount.findMany();
  console.log(`Found ${banks.length} bank accounts:`);
  for (const b of banks) {
    console.log(`- Bank: ${b.accountName} (${b.bankName})`);
    console.log(`  ID: ${b.id}`);
    console.log(`  Company ID: ${b.companyId}`);
    console.log(`  Current Balance: ${b.currentBalance}`);
    console.log(`  Is Active: ${b.isActive}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
