const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const loans = await db.offlineLoan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { emis: true }
  });
  for (const loan of loans) {
    console.log(loan.loanNumber, loan.createdAt);
    if (loan.emis.length > 0) {
      console.log("  EMI 1 due date:", loan.emis[0].dueDate);
      console.log("  EMI 1 interest:", loan.emis[0].interestAmount);
    }
  }
}
main().finally(() => db.$disconnect());
