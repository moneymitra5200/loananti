const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companies = await db.company.findMany();
  console.log(`Found ${companies.length} companies:`);
  for (const c of companies) {
    console.log(`- Company: ${c.name} (ID: ${c.id})`);
    
    // Call recalculate-balances API
    console.log(`Calling recalculate-balances for ${c.name}...`);
    try {
      const recalcRes = await fetch(`http://localhost:3000/api/accounting/recalculate-balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: c.id })
      });
      const recalcJson = await recalcRes.json();
      console.log(`Recalculate Response:`, JSON.stringify(recalcJson, null, 2));

      // Call reports/route.ts API to get balance sheet
      console.log(`Fetching balance sheet for ${c.name}...`);
      const bsRes = await fetch(`http://localhost:3000/api/accounting/reports?type=balance-sheet&companyId=${c.id}`);
      const bsJson = await bsRes.json();
      console.log(`Balance Sheet Check:`, JSON.stringify(bsJson.balanceCheck || bsJson.error || bsJson, null, 2));
    } catch (err) {
      console.error(`Error processing company ${c.name}:`, err.message);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
