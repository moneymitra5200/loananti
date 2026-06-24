const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companies = await db.company.findMany();
  console.log(`Found ${companies.length} companies:`);
  for (const c of companies) {
    const cb = await db.cashBook.findUnique({ where: { companyId: c.id } });
    const cbEntriesCount = cb ? await db.cashBookEntry.count({ where: { cashBookId: cb.id } }) : 0;
    console.log(`- Company: ${c.name} (${c.code})`);
    console.log(`  ID: ${c.id}`);
    console.log(`  CashBook ID: ${cb?.id || 'none'}, CurrentBalance: ${cb?.currentBalance || 0}, Entries count: ${cbEntriesCount}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
