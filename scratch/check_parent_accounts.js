const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmq0sdvhy0001owes4zr8gemk';
  const accounts = await db.chartOfAccount.findMany({
    where: { companyId }
  });
  console.log('Accounts with parent info:');
  for (const a of accounts) {
    if (a.parentAccountId || ['1200', '1201', '1210'].includes(a.accountCode)) {
      console.log(`- Code: ${a.accountCode} | Name: ${a.accountName} | ParentID: ${a.parentAccountId}`);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
