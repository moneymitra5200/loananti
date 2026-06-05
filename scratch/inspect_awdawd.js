const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const loans = await db.offlineLoan.findMany({
    where: {
      OR: [
        { loanNumber: { contains: 'AWDAWD' } },
        { customerName: { contains: 'AWDAWD' } }
      ]
    },
    include: { emis: { orderBy: { installmentNumber: 'asc' } } }
  });

  console.log(`Found ${loans.length} loans matching 'AWDAWD':`);
  for (const loan of loans) {
    console.log(`Loan ID: ${loan.id}`);
    console.log(`Loan Number: ${loan.loanNumber}`);
    console.log(`Loan Amount: ${loan.loanAmount}`);
    console.log(`Customer: ${loan.customerName}`);
    console.log(`Company ID: ${loan.companyId}`);
    console.log(`EMIs:`);
    for (const emi of loan.emis) {
      console.log(`  EMI #${emi.installmentNumber}: Due: ${emi.dueDate.toISOString().split('T')[0]}, Interest: ₹${emi.interestAmount}, Principal: ₹${emi.principalAmount}, Total: ₹${emi.totalAmount}, Status: ${emi.paymentStatus}`);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
