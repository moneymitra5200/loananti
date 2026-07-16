const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== LISTING ALL ONLINE LOAN APPLICATIONS ===");
  const applications = await prisma.loanApplication.findMany({
    include: {
      customer: true,
      company: true,
      emiSchedules: { orderBy: { installmentNumber: 'asc' } }
    }
  });
  console.log(`Total online applications: ${applications.length}`);
  for (const app of applications) {
    console.log(`Application ID: ${app.id}, AppNo: ${app.applicationNo}, Status: ${app.status}, Customer: ${app.customer?.name}, Company: ${app.company?.name}`);
    console.log(`EMIs: ${app.emiSchedules.length}`);
    for (const emi of app.emiSchedules) {
      console.log(`  EMI #${emi.installmentNumber}: status=${emi.paymentStatus}, interestAmount=${emi.interestAmount}, principalAmount=${emi.principalAmount}, interestAccrued=${emi.interestAccrued}`);
    }
  }

  console.log("\n=== LISTING ALL MIRROR MAPPINGS FOR ONLINE ===");
  const mappings = await prisma.mirrorLoanMapping.findMany({
    where: { isOfflineLoan: false }
  });
  console.log(`Total online mirror mappings: ${mappings.length}`);
  for (const m of mappings) {
    console.log(`Mapping ID: ${m.id}`);
    console.log(`- Original Loan ID: ${m.originalLoanId}`);
    console.log(`- Mirror Loan ID: ${m.mirrorLoanId}`);
    console.log(`- Original Company ID: ${m.originalCompanyId}`);
    console.log(`- Mirror Company ID: ${m.mirrorCompanyId}`);
    console.log(`- Original Interest Rate: ${m.originalInterestRate}, Mirror Interest Rate: ${m.mirrorInterestRate}`);
    console.log(`- Original Tenure: ${m.originalTenure}, Mirror Tenure: ${m.mirrorTenure}`);
    console.log(`- processingFeeRecorded: ${m.processingFeeRecorded}`);
    console.log(`- mirrorProcessingFee: ${m.mirrorProcessingFee}`);
  }

  console.log("\n=== JOURNAL ENTRIES ===");
  const jes = await prisma.journalEntry.findMany({
    include: { lines: { include: { account: true } } },
    orderBy: { entryDate: 'asc' }
  });
  console.log(`Total Journal Entries: ${jes.length}`);
  for (const je of jes) {
    console.log(`JE: ID=${je.id}, date=${je.entryDate.toISOString()}, refType=${je.referenceType}, refId=${je.referenceId}, narration="${je.narration}"`);
    for (const l of je.lines) {
      console.log(`  Line: accountCode=${l.accountCode} (${l.account?.name}), Debit=${l.debitAmount}, Credit=${l.creditAmount}, loanId=${l.loanId}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
