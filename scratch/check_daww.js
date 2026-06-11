const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function run() {
  console.log("=== CHECKING ALL OFFLINE LOANS ===");
  const loans = await db.offlineLoan.findMany({
    select: {
      id: true,
      loanNumber: true,
      customerName: true,
      status: true,
      isMirrorLoan: true,
      originalLoanId: true,
      company: { select: { name: true } }
    }
  });
  console.log("All offline loans:", JSON.stringify(loans, null, 2));
}

run()
  .catch(e => console.error(e))
  .finally(() => db.$disconnect());
