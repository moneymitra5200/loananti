const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const offlineLoans = await db.offlineLoan.findMany();
  console.log(`Offline loans count: ${offlineLoans.length}`);
  for (const l of offlineLoans) {
    console.log(`- ID: ${l.id}, Loan Number: ${l.loanNumber}, CompanyId: ${l.companyId}`);
  }

  const onlineLoans = await db.loanApplication.findMany();
  console.log(`Online loans count: ${onlineLoans.length}`);
  for (const l of onlineLoans) {
    console.log(`- ID: ${l.id}, App No: ${l.applicationNo}, CompanyId: ${l.companyId}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
