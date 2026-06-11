const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const offlineLoans = await db.offlineLoan.findMany({
    where: { status: 'INTEREST_ONLY' },
    include: { emis: { orderBy: { installmentNumber: 'asc' } } }
  });

  console.log(`Found ${offlineLoans.length} INTEREST_ONLY offline loans.`);
  offlineLoans.forEach(loan => {
    console.log(`- Offline Loan: ${loan.loanNumber} (id=${loan.id})`);
    loan.emis.forEach(emi => {
      console.log(`  EMI #${emi.installmentNumber}: id=${emi.id} dueDate=${emi.dueDate.toISOString()} paymentStatus=${emi.paymentStatus} interestAmount=${emi.interestAmount} paidAmount=${emi.paidAmount}`);
    });
  });

  const onlineLoans = await db.loanApplication.findMany({
    where: { status: 'ACTIVE_INTEREST_ONLY' },
    include: { emiSchedules: { orderBy: { installmentNumber: 'asc' } } }
  });

  console.log(`Found ${onlineLoans.length} ACTIVE_INTEREST_ONLY online loans.`);
  onlineLoans.forEach(loan => {
    console.log(`- Online Loan: ${loan.applicationNo} (id=${loan.id})`);
  });

  await db.$disconnect();
}

main().catch(console.error);
