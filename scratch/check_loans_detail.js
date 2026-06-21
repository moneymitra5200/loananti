const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const onlineLoans = await db.loanApplication.findMany({
    include: { company: true }
  });
  console.log(`Found ${onlineLoans.length} online loans:`);
  for (const l of onlineLoans) {
    console.log(`- ID: ${l.id} | AppNo: ${l.applicationNo} | Status: ${l.status} | Amount: ${l.loanAmount} (Disbursed: ${l.disbursedAmount}) | Company: ${l.company?.name}`);
  }

  const offlineLoans = await db.offlineLoan.findMany({
    include: { company: true }
  });
  console.log(`Found ${offlineLoans.length} offline loans:`);
  for (const l of offlineLoans) {
    console.log(`- ID: ${l.id} | LoanNo: ${l.loanNumber} | Status: ${l.status} | Amount: ${l.loanAmount} | Company: ${l.company?.name}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
