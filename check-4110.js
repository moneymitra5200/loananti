const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const account = await db.chartOfAccount.findFirst({
    where: { accountCode: '4110' },
    orderBy: { currentBalance: 'desc' }
  });
  console.log(account);
}
main().finally(() => db.$disconnect());
