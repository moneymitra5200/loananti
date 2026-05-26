const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const loan = await prisma.loanApplication.findFirst({
    where: { applicationNo: 'C3PL00001' },
    include: {
      emis: {
        orderBy: { installmentNumber: 'asc' }
      }
    }
  });

  if (!loan) {
    console.log("Loan C3PL00001 not found");
    
    // Let's try C2PL00001
    const mirror = await prisma.loanApplication.findFirst({
      where: { applicationNo: 'C2PL00001' },
      include: {
        emis: {
          orderBy: { installmentNumber: 'asc' }
        }
      }
    });
    
    if (mirror) {
      console.log("Found C2PL00001");
      console.table(mirror.emis.map(e => ({
        inst: e.installmentNumber,
        P: e.principalAmount,
        I: e.interestAmount,
        status: e.paymentStatus
      })));
    }
    return;
  }

  console.log("Found C3PL00001");
  console.table(loan.emis.map(e => ({
    inst: e.installmentNumber,
    P: e.principalAmount,
    I: e.interestAmount,
    status: e.paymentStatus
  })));
  
  // Also get the mirror
  const mirror = await prisma.loanApplication.findFirst({
    where: { applicationNo: 'C2PL00001' },
    include: {
      emis: {
        orderBy: { installmentNumber: 'asc' }
      }
    }
  });
  
  if (mirror) {
    console.log("Found C2PL00001");
    console.table(mirror.emis.map(e => ({
      inst: e.installmentNumber,
      P: e.principalAmount,
      I: e.interestAmount,
      status: e.paymentStatus
    })));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
