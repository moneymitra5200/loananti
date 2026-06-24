const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const loanId = 'cmqqtj8c50010oqfi6x0nvkbk';
  const loan = await db.offlineLoan.findUnique({
    where: { id: loanId },
    include: {
      emis: true
    }
  });

  console.log('Loan details:', {
    id: loan.id,
    loanNumber: loan.loanNumber,
    loanAmount: loan.loanAmount,
    status: loan.status
  });

  console.log('\nEMIs:');
  loan.emis.forEach(e => {
    console.log(`- ID: ${e.id}, EMI No: ${e.installmentNo}`);
    console.log(`  Principal: ${e.principalAmount}, PaidPrincipal: ${e.paidPrincipal}`);
    console.log(`  Interest: ${e.interestAmount}, PaidInterest: ${e.paidInterest}`);
    console.log(`  Total: ${e.installmentAmount}, PaidAmount: ${e.paidAmount}`);
    console.log(`  Status: ${e.paymentStatus}`);
  });
}

main().catch(console.error).finally(() => db.$disconnect());
