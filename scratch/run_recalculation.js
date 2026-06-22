const fetch = require('node-fetch');

async function recalculate(companyId) {
  const url = 'http://localhost:3000/api/accounting/recalculate-balances';
  console.log(`Running recalculation for company: ${companyId}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId })
    });
    const data = await res.json();
    console.log('Result:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to run recalculation:', error);
  }
}

async function checkTrialBalance(companyId) {
  const url = `http://localhost:3000/api/accounting/trial-balance?companyId=${companyId}`;
  console.log(`Checking Trial Balance for company: ${companyId}...`);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Trial Balance summary for ${companyId}:`);
    console.log(`- Total Debit: ${data.data?.summary?.totalDebitBalance}`);
    console.log(`- Total Credit: ${data.data?.summary?.totalCreditBalance}`);
    console.log(`- Difference: ${data.data?.summary?.difference}`);
    console.log(`- Balanced: ${data.data?.summary?.isBalanced}`);
  } catch (error) {
    console.error('Failed to check trial balance:', error);
  }
}

async function main() {
  const c1 = 'cmq0sdvhy0001owes4zr8gemk';
  const c3 = 'cmq0sdura0000oweseq4j4xkj';

  await recalculate(c1);
  await checkTrialBalance(c1);

  console.log('\n----------------------------------------\n');

  await recalculate(c3);
  await checkTrialBalance(c3);
}

main();
