const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companyId = process.argv[2] || 'default';
  console.log(`Checking Trial Balance for Company: ${companyId}`);

  const accounts = await prisma.chartOfAccount.findMany({
    where: { companyId },
    orderBy: { accountCode: 'asc' }
  });

  const lines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: { companyId, isApproved: true, isReversed: false }
    }
  });

  const drMap = {};
  const crMap = {};
  lines.forEach(l => {
    drMap[l.accountId] = (drMap[l.accountId] || 0) + l.debitAmount;
    crMap[l.accountId] = (crMap[l.accountId] || 0) + l.creditAmount;
  });

  let totalDr = 0;
  let totalCr = 0;

  console.log('\nCode | Name | Type | Opening | Dr | Cr | Closing | Dr/Cr');
  console.log('------------------------------------------------------------');

  accounts.forEach(acc => {
    const dr = drMap[acc.id] || 0;
    const cr = crMap[acc.id] || 0;
    const op = acc.openingBalance || 0;
    const isDr = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
    const closing = isDr ? op + dr - cr : op + cr - dr;

    let d = 0, c = 0;
    if (isDr) {
      if (closing >= 0) d = closing; else c = -closing;
    } else {
      if (closing >= 0) c = closing; else d = -closing;
    }
    
    totalDr += d;
    totalCr += c;

    if (d !== 0 || c !== 0) {
      console.log(`${acc.accountCode.padEnd(5)} | ${acc.accountName.padEnd(20)} | ${acc.accountType.padEnd(8)} | ${op.toFixed(2).padStart(8)} | ${dr.toFixed(2).padStart(8)} | ${cr.toFixed(2).padStart(8)} | ${closing.toFixed(2).padStart(8)} | ${d > 0 ? 'Dr' : 'Cr'}`);
    }
  });

  console.log('------------------------------------------------------------');
  console.log(`TOTAL DEBIT:  ${totalDr.toFixed(2)}`);
  console.log(`TOTAL CREDIT: ${totalCr.toFixed(2)}`);
  console.log(`DIFFERENCE:   ${Math.abs(totalDr - totalCr).toFixed(2)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
