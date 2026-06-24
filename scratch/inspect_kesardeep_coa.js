const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmp4w8dxa0008100655jq7ywo';
  const accounts = await db.chartOfAccount.findMany({
    where: { companyId },
    orderBy: { accountCode: 'asc' }
  });
  console.log('CHART OF ACCOUNTS:');
  for (const a of accounts) {
    console.log(`- [${a.accountCode}] ${a.accountName} (${a.accountType}): currentBalance = ${a.currentBalance}, openingBalance = ${a.openingBalance || 0}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
