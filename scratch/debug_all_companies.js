require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companies = await db.company.findMany();
  for (const c of companies) {
    console.log(`\n=== COMPANY: ${c.name} (${c.id}) ===`);
    const offlineLoans = await db.offlineLoan.findMany({
      where: { companyId: c.id }
    });
    console.log(`Offline loans count: ${offlineLoans.length}`);
    for (const l of offlineLoans) {
      console.log(`  Loan: ${l.loanNumber}, Status: ${l.status}, Amount: ${l.loanAmount}`);
      const emis = await db.offlineLoanEMI.findMany({
        where: { offlineLoanId: l.id }
      });
      for (const e of emis) {
        console.log(`    EMI: status=${e.paymentStatus}, paidPrincipal=${e.paidPrincipal}, paidInterest=${e.paidInterest}`);
      }
    }

    const coa = await db.chartOfAccount.findMany({
      where: { companyId: c.id }
    });
    const a1210 = coa.find(a => a.accountCode === '1210');
    console.log(`CoA 1210 CurrentBalance: ${a1210?.currentBalance}, OpeningBalance: ${a1210?.openingBalance}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
