require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const loans = await db.loanApplication.findMany({
    include: {
      emiSchedules: true
    }
  });

  console.log('=== ONLINE LOANS AND EMIS ===');
  for (const loan of loans) {
    console.log(`Loan ID: ${loan.id}`);
    console.log(`Application No: ${loan.applicationNo}`);
    console.log(`Company ID: ${loan.companyId}`);
    console.log(`Status: ${loan.status}`);
    console.log(`Disbursed Amount: ${loan.disbursedAmount}`);
    console.log(`Disbursed At: ${loan.disbursedAt}`);
    console.log(`EMIs count: ${loan.emiSchedules.length}`);
    for (const emi of loan.emiSchedules) {
      console.log(`  - EMI #${emi.installmentNo} (ID: ${emi.id})`);
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
