require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const loans = await db.offlineLoan.findMany({
    include: {
      emis: true
    }
  });

  console.log('=== OFFLINE LOANS AND EMIS ===');
  for (const loan of loans) {
    console.log(`Loan ID: ${loan.id}`);
    console.log(`Loan Number: ${loan.loanNumber}`);
    console.log(`Company ID: ${loan.companyId}`);
    console.log(`Status: ${loan.status}`);
    console.log(`Loan Amount: ${loan.loanAmount}`);
    console.log(`Disbursement Date: ${loan.disbursementDate}`);
    console.log(`EMIs count: ${loan.emis.length}`);
    for (const emi of loan.emis) {
      console.log(`  - EMI #${emi.emiNumber} (ID: ${emi.id})`);
      console.log(`    Status: ${emi.paymentStatus}`);
      console.log(`    Paid Amount: ${emi.paidAmount}`);
      console.log(`    Paid Principal: ${emi.paidPrincipal}`);
      console.log(`    Paid Interest: ${emi.paidInterest}`);
      console.log(`    Penalty Paid: ${emi.penaltyPaid}`);
      console.log(`    Paid Date: ${emi.paidDate}`);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
