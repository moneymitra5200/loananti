const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companies = await db.company.findMany();
  for (const c of companies) {
    console.log(`\n========================================`);
    console.log(`Company: ${c.name} (Code: ${c.code}, ID: ${c.id})`);
    
    const cashBook = await db.cashBook.findUnique({ where: { companyId: c.id } });
    console.log(`CashBook balance: ${cashBook ? cashBook.currentBalance : 'None'}`);

    const bankAccounts = await db.bankAccount.findMany({ where: { companyId: c.id } });
    const bankTotal = bankAccounts.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
    console.log(`Bank Accounts total: ${bankTotal} (${bankAccounts.length} accounts)`);
    for (const b of bankAccounts) {
      console.log(`  - ${b.bankName}: ${b.currentBalance}`);
    }

    const equityEntries = await db.equityEntry.findMany({ where: { companyId: c.id } });
    const equityTotal = equityEntries.reduce((sum, e) => e.entryType === 'WITHDRAWAL' ? sum - e.amount : sum + e.amount, 0);
    console.log(`Equity Entries total: ${equityTotal} (${equityEntries.length} entries)`);

    const offlineLoans = await db.offlineLoan.findMany({ where: { companyId: c.id } });
    const offlineTotal = offlineLoans.reduce((sum, l) => sum + l.loanAmount, 0);
    console.log(`Offline Loans total: ${offlineTotal} (${offlineLoans.length} loans)`);

    const chartOfAccounts = await db.chartOfAccount.findMany({ where: { companyId: c.id } });
    console.log(`Chart of Accounts size: ${chartOfAccounts.length}`);
    for (const coa of chartOfAccounts) {
      if (coa.currentBalance !== 0) {
        console.log(`  - ${coa.accountCode} ${coa.accountName}: balance=${coa.currentBalance}, opening=${coa.openingBalance}`);
      }
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
