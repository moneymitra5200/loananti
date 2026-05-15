const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const accounts = await prisma.chartOfAccount.findMany();
  let dr = 0;
  let cr = 0;
  for (const a of accounts) {
    if (a.accountType === 'ASSET' || a.accountType === 'EXPENSE') {
      if (a.currentBalance >= 0) dr += a.currentBalance;
      else cr += Math.abs(a.currentBalance);
    } else {
      if (a.currentBalance >= 0) cr += a.currentBalance;
      else dr += Math.abs(a.currentBalance);
    }
  }
  console.log('Total Dr:', dr);
  console.log('Total Cr:', cr);
  console.log('Diff:', dr - cr);
}
check().finally(() => prisma.$disconnect());
