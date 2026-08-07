const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit25609() {
  console.log("=== DEEP AUDIT FOR ₹25,609.00 CASH DIFFERENCE ===");

  const moneyMitra = await prisma.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });
  const companyId = moneyMitra.id;

  const cashAccount = await prisma.chartOfAccount.findFirst({
    where: { companyId, accountCode: '1101' }
  });

  // 1. Journal Lines for Account 1101
  const jLines = await prisma.journalEntryLine.findMany({
    where: {
      accountId: cashAccount.id,
      journalEntry: { isApproved: true, isReversed: false }
    },
    include: { journalEntry: true },
    orderBy: { journalEntry: { entryDate: 'asc' } }
  });

  let totalDr = 0, totalCr = 0;
  jLines.forEach(l => {
    totalDr += l.debitAmount;
    totalCr += l.creditAmount;
  });
  const glCash = totalDr - totalCr;
  console.log(`GL Cash (1101) Total Debit: ₹${totalDr.toFixed(2)}`);
  console.log(`GL Cash (1101) Total Credit: ₹${totalCr.toFixed(2)}`);
  console.log(`GL Cash (1101) Net Balance: ₹${glCash.toFixed(2)}`);

  // 2. CashBook Table
  const cb = await prisma.cashBook.findUnique({ where: { companyId } });
  console.log(`\nCashBook Table currentBalance: ₹${cb.currentBalance.toFixed(2)}`);
  console.log(`Difference (GL Cash - CashBook): ₹${(glCash - cb.currentBalance).toFixed(2)}`);

  // 3. Compare CashBook entries vs Journal Entries
  const cbEntries = await prisma.cashBookEntry.findMany({
    where: { cashBookId: cb.id },
    orderBy: { entryDate: 'asc' }
  });

  let cbDr = 0, cbCr = 0;
  cbEntries.forEach(e => {
    if (e.entryType === 'CREDIT') cbCr += e.amount; // Inflow
    if (e.entryType === 'DEBIT') cbDr += e.amount;   // Outflow
  });

  console.log(`\nCashBook Entries Total Inflows (Credit): ₹${cbCr.toFixed(2)}`);
  console.log(`CashBook Entries Total Outflows (Debit): ₹${cbDr.toFixed(2)}`);
  console.log(`CashBook Net Balance (In - Out): ₹${(cbCr - cbDr).toFixed(2)}`);

  // Let's find entries with amount 25609 or sum of entries equal to 25609
  console.log("\nSearching for entries related to ₹25,609.00...");
  const matchingJEs = jLines.filter(l => l.debitAmount === 25609 || l.creditAmount === 25609);
  console.log(`Matching JEs count: ${matchingJEs.length}`);
  matchingJEs.forEach(l => {
    console.log(`- [JE ${l.journalEntry.entryNumber}] Date: ${l.journalEntry.entryDate.toISOString().split('T')[0]}, Dr: ${l.debitAmount}, Cr: ${l.creditAmount}, Ref: ${l.journalEntry.referenceType || 'N/A'}, Desc: ${l.journalEntry.description}`);
  });

  const matchingCBs = cbEntries.filter(e => e.amount === 25609);
  console.log(`Matching CashBook entries count: ${matchingCBs.length}`);

  // Let's list all Journal Entries that do NOT have a CashBook entry or vice-versa
  console.log("\nRecent Journal Entries on Account 1101:");
  jLines.slice(-15).forEach(l => {
    console.log(`  [JE ${l.journalEntry.entryNumber}] ${l.journalEntry.entryDate.toISOString().split('T')[0]} | Dr: ₹${l.debitAmount} | Cr: ₹${l.creditAmount} | Ref: ${l.journalEntry.referenceType || 'N/A'} | ${l.journalEntry.description}`);
  });

  await prisma.$disconnect();
}

audit25609();
