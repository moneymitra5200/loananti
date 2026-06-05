const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companies = await db.company.findMany();
  console.log(`Found ${companies.length} companies:`);
  for (const c of companies) {
    console.log(`ID: ${c.id} | Name: ${c.name} | Code: ${c.code} | AccountingType: ${c.accountingType}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
