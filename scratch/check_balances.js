const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companies = await db.company.findMany();
  for (const c of companies) {
    console.log(`\n========================================`);
    console.log(`Company: ${c.name} (Code: ${c.code}, ID: ${c.id})`);
    
    // Check if the Chart of Accounts is balanced
    const accounts = await db.chartOfAccount.findMany({
      where: { companyId: c.id, isActive: true },
    });
    
    let totalDr = 0;
    let totalCr = 0;
    for (const acc of accounts) {
      const isDebitNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
      if (isDebitNormal) {
        totalDr += acc.currentBalance || 0;
      } else {
        totalCr += acc.currentBalance || 0;
      }
    }
    
    console.log(`Chart of Accounts Totals:`);
    console.log(`- Total Debit: ${totalDr.toFixed(2)}`);
    console.log(`- Total Credit: ${totalCr.toFixed(2)}`);
    console.log(`- Difference: ${(totalDr - totalCr).toFixed(2)}`);
    
    // Check for unbalanced journal entries
    const journalEntries = await db.journalEntry.findMany({
      where: { companyId: c.id },
      include: { lines: true },
    });
    
    let unbalancedCount = 0;
    for (const entry of journalEntries) {
      const dr = entry.lines.reduce((s, l) => s + l.debitAmount, 0);
      const cr = entry.lines.reduce((s, l) => s + l.creditAmount, 0);
      if (Math.abs(dr - cr) > 0.005) {
        unbalancedCount++;
      }
    }
    console.log(`Journal Entries:`);
    console.log(`- Total JEs: ${journalEntries.length}`);
    console.log(`- Unbalanced JEs: ${unbalancedCount}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
