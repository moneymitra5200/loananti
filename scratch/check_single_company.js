const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmq0sdvhy0001owes4zr8gemk';
  
  // Recalculate
  console.log('--- RECALCULATING ---');
  const recalcRes = await fetch(`http://localhost:3000/api/accounting/recalculate-balances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId })
  });
  const recalcJson = await recalcRes.json();
  console.log('Recalculate JSON:', JSON.stringify(recalcJson, null, 2));

  // Get Balance Sheet
  console.log('\n--- FETCHING BALANCE SHEET ---');
  const bsRes = await fetch(`http://localhost:3000/api/accounting/reports?type=balance-sheet&companyId=${companyId}`);
  const bsJson = await bsRes.json();
  console.log('Balance Sheet Check:', JSON.stringify(bsJson.balanceCheck, null, 2));
  console.log('Assets:', JSON.stringify(bsJson.assets, null, 2));
  console.log('Liabilities:', JSON.stringify(bsJson.liabilities, null, 2));
  console.log('Equity:', JSON.stringify(bsJson.equity, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
