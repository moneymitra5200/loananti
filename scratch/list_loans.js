const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const offlineLoans = await prisma.offlineLoan.findMany({
    include: { customer: true }
  });
  console.log("Offline Loans count:", offlineLoans.length);
  for (const l of offlineLoans) {
    console.log(`- ID: ${l.id} | LoanNo: ${l.loanNumber} | Customer: ${l.customer?.name} | Amount: ${l.loanAmount}`);
  }

  const onlineLoans = await prisma.loanApplication.findMany({
    include: { customer: true }
  });
  console.log("\nOnline Loans count:", onlineLoans.length);
  for (const l of onlineLoans) {
    console.log(`- ID: ${l.id} | AppNo: ${l.applicationNo} | Customer: ${l.customer?.name} | Amount: ${l.loanAmount || l.requestedAmount}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
