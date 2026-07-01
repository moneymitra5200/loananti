const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== OFFLINE LOANS ===");
  const offlineLoans = await prisma.offlineLoan.findMany({
    select: {
      id: true,
      loanNumber: true,
      customerName: true,
      loanAmount: true,
      status: true,
      startDate: true,
      isMirrorLoan: true,
      emis: {
        select: {
          id: true,
          installmentNumber: true,
          dueDate: true,
          totalAmount: true,
          paymentStatus: true
        }
      }
    }
  });

  console.log(`Total offline loans in DB: ${offlineLoans.length}`);
  for (const loan of offlineLoans) {
    console.log(`Loan: ${loan.loanNumber}, Cust: ${loan.customerName}, Status: ${loan.status}, Start: ${loan.startDate}, IsMirror: ${loan.isMirrorLoan}, EMIs count: ${loan.emis.length}`);
  }

  console.log("\n=== ONLINE LOANS ===");
  const onlineLoans = await prisma.loanApplication.findMany({
    where: {
      status: 'ACTIVE'
    },
    select: {
      id: true,
      applicationNo: true,
      firstName: true,
      lastName: true,
      loanAmount: true,
      status: true,
      loanStartedAt: true,
      emiSchedules: {
        select: {
          id: true,
          installmentNumber: true,
          dueDate: true,
          totalAmount: true,
          paymentStatus: true
        }
      }
    }
  });

  console.log(`Total active online loans in DB: ${onlineLoans.length}`);
  for (const loan of onlineLoans) {
    console.log(`Loan: ${loan.applicationNo}, Cust: ${loan.firstName} ${loan.lastName}, Status: ${loan.status}, Start: ${loan.loanStartedAt}, EMIs count: ${loan.emiSchedules.length}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
