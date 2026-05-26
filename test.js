const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const emis = await prisma.eMISchedule.findMany({
    where: { loanApplication: { applicationNo: 'C2PL00001' } },
    orderBy: { installmentNumber: 'asc' }
  });
  console.log(emis.map(e => ({
    inst: e.installmentNumber,
    P: Number(e.principalAmount),
    I: Number(e.interestAmount),
    status: e.paymentStatus
  })));
}

main().finally(() => prisma.$disconnect());
