const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const originalLoan = await db.offlineLoan.findFirst({
    where: { loanNumber: 'C3-PERSONAL-00001' },
    include: { emis: { orderBy: { installmentNumber: 'asc' } } }
  });

  const mirrorLoan = await db.offlineLoan.findFirst({
    where: { loanNumber: 'C2-PERSONAL-00001' },
    include: { emis: { orderBy: { installmentNumber: 'asc' } } }
  });

  const mapping = await db.mirrorLoanMapping.findFirst({
    where: { originalLoanId: originalLoan?.id }
  });

  console.log('--- Original Loan ---');
  if (originalLoan) {
    console.log(`ID: ${originalLoan.id}, Loan No: ${originalLoan.loanNumber}, Status: ${originalLoan.status}, Company: ${originalLoan.companyId}`);
    for (const e of originalLoan.emis) {
      console.log(`  EMI #${e.installmentNumber}: Status=${e.paymentStatus}, P=${e.principalAmount}, I=${e.interestAmount}, Total=${e.totalAmount}, Paid=${e.paidAmount}`);
    }
  } else {
    console.log('Original loan not found.');
  }

  console.log('\n--- Mirror Loan ---');
  if (mirrorLoan) {
    console.log(`ID: ${mirrorLoan.id}, Loan No: ${mirrorLoan.loanNumber}, Status: ${mirrorLoan.status}, Company: ${mirrorLoan.companyId}`);
    for (const e of mirrorLoan.emis) {
      console.log(`  EMI #${e.installmentNumber}: Status=${e.paymentStatus}, P=${e.principalAmount}, I=${e.interestAmount}, Total=${e.totalAmount}, Paid=${e.paidAmount}`);
    }
  } else {
    console.log('Mirror loan not found.');
  }

  console.log('\n--- Mapping ---');
  console.log(mapping);
}

main().catch(console.error).finally(() => db.$disconnect());
