const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmq0sdvhy0001owes4zr8gemk';
  const dateFilter = new Date();

  // Fetch all accounts
  const accounts = await db.chartOfAccount.findMany({
    where: { companyId, isActive: true },
    orderBy: { accountCode: 'asc' }
  });

  // Fetch all approved journal lines
  const lines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        companyId,
        isApproved: true,
        isReversed: false,
        entryDate: { lte: dateFilter }
      }
    }
  });

  const drMap = {};
  const crMap = {};
  for (const line of lines) {
    drMap[line.accountId] = (drMap[line.accountId] || 0) + line.debitAmount;
    crMap[line.accountId] = (crMap[line.accountId] || 0) + line.creditAmount;
  }

  console.log('Account-wise Journal Balances:');
  let totalDr = 0;
  let totalCr = 0;
  for (const acc of accounts) {
    const dr = drMap[acc.id] || 0;
    const cr = crMap[acc.id] || 0;
    const isDrNormal = acc.accountType === 'ASSET' || acc.accountType === 'EXPENSE';
    const journalBal = isDrNormal
      ? (acc.openingBalance || 0) + dr - cr
      : (acc.openingBalance || 0) + cr - dr;

    if (journalBal !== 0) {
      console.log(`- ${acc.accountCode} (${acc.accountName}): Journal: ${journalBal} (Dr: ${dr}, Cr: ${cr})`);
      if (isDrNormal) {
        totalDr += journalBal;
      } else {
        totalCr += journalBal;
      }
    }
  }
  console.log(`Total Dr: ${totalDr}, Total Cr: ${totalCr}, Diff: ${totalDr - totalCr}`);
}

main().catch(console.error).finally(() => db.$disconnect());
