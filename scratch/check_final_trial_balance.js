const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkTrialBalance(companyId) {
  console.log(`\n========================================`);
  console.log(`Checking Trial Balance for: ${companyId}`);
  console.log(`========================================`);

  // Fetch all accounts
  const accounts = await db.chartOfAccount.findMany({
    where: { companyId, isActive: true },
    orderBy: { accountCode: 'asc' }
  });

  const rows = accounts.map(acc => {
    const isDebitNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
    let balance = acc.currentBalance || 0;

    // Apply exact same logic as trial-balance route
    if (acc.accountCode === '1200') {
      // 1200 should be offline + online
      const online = accounts.find(a => a.accountCode === '1201')?.currentBalance || 0;
      const offline = accounts.find(a => a.accountCode === '1210')?.currentBalance || 0;
      balance = online + offline;
    }

    let debitBalance = 0;
    let creditBalance = 0;

    if (isDebitNormal) {
      if (balance >= 0) debitBalance = balance;
      else creditBalance = Math.abs(balance);
    } else {
      if (balance >= 0) creditBalance = balance;
      else debitBalance = Math.abs(balance);
    }

    return {
      accountCode: acc.accountCode,
      accountName: acc.accountName,
      debitBalance,
      creditBalance
    };
  }).filter(row => row.debitBalance !== 0 || row.creditBalance !== 0);

  const totalDebitBalance  = rows.filter(r => r.accountCode !== '1200').reduce((s, r) => s + r.debitBalance,  0);
  const totalCreditBalance = rows.filter(r => r.accountCode !== '1200').reduce((s, r) => s + r.creditBalance, 0);
  const difference         = Math.abs(totalDebitBalance - totalCreditBalance);

  console.log('Rows:');
  rows.forEach(r => {
    console.log(`- ${r.accountCode} ${r.accountName}: Dr = ₹${r.debitBalance.toFixed(2)}, Cr = ₹${r.creditBalance.toFixed(2)}`);
  });

  console.log('\nSummary:');
  console.log(`- Total Debit Balance (excl. 1200): ₹${totalDebitBalance.toFixed(2)}`);
  console.log(`- Total Credit Balance (excl. 1200): ₹${totalCreditBalance.toFixed(2)}`);
  console.log(`- Difference: ₹${difference.toFixed(2)}`);
  console.log(`- Balanced: ${difference < 1}`);
}

async function main() {
  const c1 = 'cmq0sdvhy0001owes4zr8gemk';
  const c3 = 'cmq0sdura0000oweseq4j4xkj';

  await checkTrialBalance(c1);
  await checkTrialBalance(c3);
}

main().catch(console.error).finally(() => db.$disconnect());
