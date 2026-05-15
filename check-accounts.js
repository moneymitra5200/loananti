const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const accounts = await prisma.chartOfAccount.findMany({
    select: { accountCode: true, accountName: true, accountType: true }
  });
  console.log(accounts.map(a => a.accountCode + ': ' + a.accountName).join('\n'));
}
run().finally(() => { prisma.$disconnect() });
