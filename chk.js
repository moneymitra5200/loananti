const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const accounts = await db.chartOfAccount.findMany({
    where: { accountCode: '4125' },
    select: { companyId: true }
  });
  console.log("Account 4125 found in companies:", accounts.map(a => a.companyId));
  await db.$disconnect();
}
main();
