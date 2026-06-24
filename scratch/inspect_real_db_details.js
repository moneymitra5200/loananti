const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  console.log('=== MIRROR LOAN MAPPINGS ===');
  const mappings = await db.mirrorLoanMapping.findMany();
  console.log(`Found ${mappings.length} mappings:`);
  for (const m of mappings) {
    console.log(`- ID: ${m.id}`);
    console.log(`  Original Loan ID: ${m.originalLoanId}`);
    console.log(`  Mirror Loan ID: ${m.mirrorLoanId}`);
  }

  console.log('\n=== OFFLINE LOANS ===');
  const offlineLoans = await db.offlineLoan.findMany();
  console.log(`Found ${offlineLoans.length} offline loans:`);
  for (const l of offlineLoans) {
    console.log(`- ID: ${l.id}, Loan Number: ${l.loanNumber}, CompanyId: ${l.companyId}, Status: ${l.status}, Amount: ${l.loanAmount}`);
  }

  console.log('\n=== ONLINE LOANS ===');
  const onlineLoans = await db.loanApplication.findMany();
  console.log(`Found ${onlineLoans.length} online loans:`);
  for (const l of onlineLoans) {
    console.log(`- ID: ${l.id}, App No: ${l.applicationNo}, CompanyId: ${l.companyId}, Status: ${l.status}, Amount: ${l.disbursedAmount}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
