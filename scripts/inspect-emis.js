const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loan = await prisma.loanApplication.findFirst({
    where: { applicationNo: 'C2PL00001' }
  });

  const emis = await prisma.eMISchedule.findMany({
    where: { loanApplicationId: loan.id },
    orderBy: { installmentNumber: 'asc' }
  });

  console.log("EMI Schedules for C2PL00001:");
  emis.forEach(e => {
    console.log(`EMI #${e.installmentNumber}: outstandingPrincipal=${e.outstandingPrincipal}, principalAmount=${e.principalAmount}, interestAmount=${e.interestAmount}`);
  });
}

main()
  .catch(err => {
    console.error(err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
