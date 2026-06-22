const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkBalanceSheet(companyId) {
  console.log(`\n========================================`);
  console.log(`Checking Balance Sheet for: ${companyId}`);
  console.log(`========================================`);

  // Fetch all active accounts
  const accounts = await db.chartOfAccount.findMany({
    where: { companyId, isActive: true }
  });

  const accMap = {};
  accounts.forEach(a => {
    accMap[a.accountCode] = a.currentBalance || 0;
  });

  // Calculate Asset sides (Right side)
  const cash = accMap['1101'] || 0;
  const bank = accMap['1102'] || 0;
  const onlineLoans = accMap['1201'] || 0;
  const offlineLoans = accMap['1210'] || 0;
  const interestReceivable = accMap['1301'] || 0;
  const overdueInterest = accMap['1305'] || 0;

  const totalAssets = cash + bank + onlineLoans + offlineLoans + interestReceivable + overdueInterest;

  // Calculate Liabilities & Equity sides (Left side)
  // Get other accounts of type LIABILITY or EQUITY
  const otherLeft = accounts.filter(a => 
    (a.accountType === 'LIABILITY' || a.accountType === 'EQUITY') &&
    a.accountCode !== '3002' // Exclude capital which is handled separately if needed
  );
  
  let leftSideTotal = accMap['3002'] || 0; // Capital normal balance
  console.log(`- Owner's Capital (3002): ₹${leftSideTotal.toFixed(2)}`);
  
  otherLeft.forEach(a => {
    leftSideTotal += a.currentBalance || 0;
    console.log(`- ${a.accountCode} ${a.accountName}: ₹${(a.currentBalance || 0).toFixed(2)}`);
  });

  console.log('\nRight Side (Assets):');
  console.log(`- Cash: ₹${cash.toFixed(2)}`);
  console.log(`- Bank: ₹${bank.toFixed(2)}`);
  console.log(`- Online Loans: ₹${onlineLoans.toFixed(2)}`);
  console.log(`- Offline Loans: ₹${offlineLoans.toFixed(2)}`);
  console.log(`- Interest Receivable: ₹${interestReceivable.toFixed(2)}`);
  console.log(`- Overdue Interest: ₹${overdueInterest.toFixed(2)}`);
  console.log(`- Total Assets: ₹${totalAssets.toFixed(2)}`);

  console.log('\nLeft Side (Liabilities & Equity):');
  console.log(`- Total Liabilities & Equity: ₹${leftSideTotal.toFixed(2)}`);

  console.log(`- Balance Sheet Difference: ₹${Math.abs(totalAssets - leftSideTotal).toFixed(2)}`);
  console.log(`- Balanced: ${Math.abs(totalAssets - leftSideTotal) < 1}`);
}

async function main() {
  const c1 = 'cmq0sdvhy0001owes4zr8gemk';
  const c3 = 'cmq0sdura0000oweseq4j4xkj';

  await checkBalanceSheet(c1);
  await checkBalanceSheet(c3);
}

main().catch(console.error).finally(() => db.$disconnect());
