const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('   DEEP ACCOUNTING AUDIT: MONEY MITRA FINANCIAL ADVISOR');
  console.log('====================================================\n');

  const company = await db.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });

  if (!company) {
    console.log('Company MONEY MITRA not found.');
    return;
  }
  const companyId = company.id;

  // 1. Audit Journal Entries Balance (Debit vs Credit)
  const journalEntries = await db.journalEntry.findMany({
    where: { companyId, isApproved: true, isReversed: false },
    include: { lines: true }
  });

  let unbalancedJEs = [];
  let totalJEDebit = 0;
  let totalJECredit = 0;

  journalEntries.forEach(je => {
    let dr = 0, cr = 0;
    je.lines.forEach(l => {
      dr += l.debitAmount || 0;
      cr += l.creditAmount || 0;
    });
    totalJEDebit += dr;
    totalJECredit += cr;
    if (Math.abs(dr - cr) > 0.01) {
      unbalancedJEs.push({ id: je.id, entryNumber: je.entryNumber, dr, cr, diff: dr - cr });
    }
  });

  console.log(`[1] JOURNAL ENTRIES AUDIT (${journalEntries.length} total entries):`);
  console.log(`    Total Approved Debit:  ₹${totalJEDebit.toFixed(2)}`);
  console.log(`    Total Approved Credit: ₹${totalJECredit.toFixed(2)}`);
  console.log(`    Difference:            ₹${(totalJEDebit - totalJECredit).toFixed(2)}`);
  if (unbalancedJEs.length > 0) {
    console.log(`    ⚠️ Found ${unbalancedJEs.length} unbalanced journal entries!`, unbalancedJEs);
  } else {
    console.log('    ✓ All Journal Entries are 100% mathematically balanced (Debit == Credit).');
  }

  // 2. Audit CashBook vs Journal Entries for Cash (1101)
  const cashBook = await db.cashBook.findUnique({ where: { companyId } });
  const cashLines = await db.journalEntryLine.findMany({
    where: { account: { companyId, accountCode: '1101' }, journalEntry: { isApproved: true, isReversed: false } }
  });
  let cashGLBal = 0;
  cashLines.forEach(l => cashGLBal += (l.debitAmount - l.creditAmount));

  console.log(`\n[2] CASH AUDIT:`);
  console.log(`    CashBook Table Balance: ₹${cashBook?.currentBalance?.toFixed(2)}`);
  console.log(`    Cash GL (1101) Balance: ₹${cashGLBal.toFixed(2)}`);
  console.log(`    Difference:             ₹${((cashBook?.currentBalance || 0) - cashGLBal).toFixed(2)}`);

  // 3. Audit Bank Accounts vs Journal Entries for Bank (1102 / 1401)
  const bankAccounts = await db.bankAccount.findMany({ where: { companyId, isActive: true } });
  const bankTotal = bankAccounts.reduce((s, b) => s + (b.currentBalance || 0), 0);

  const bankLines = await db.journalEntryLine.findMany({
    where: {
      account: { companyId, OR: [{ accountCode: '1102' }, { accountCode: '1401' }, { accountCode: { startsWith: '110' } }] },
      journalEntry: { isApproved: true, isReversed: false }
    }
  });
  let bankGLBal = 0;
  bankLines.forEach(l => bankGLBal += (l.debitAmount - l.creditAmount));

  console.log(`\n[3] BANK AUDIT:`);
  console.log(`    BankAccount Table Total: ₹${bankTotal.toFixed(2)}`);
  console.log(`    Bank GL Balances:       ₹${bankGLBal.toFixed(2)}`);

  // 4. Audit Offline Loans Principal Outstanding vs GL Loans (1200 / 1210)
  const offlineLoans = await db.offlineLoan.findMany({
    where: { companyId, status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED'] } },
    select: { loanNumber: true, loanAmount: true, emis: { select: { paidPrincipal: true } } }
  });
  let offlinePrincipalOut = 0;
  offlineLoans.forEach(l => {
    const paidP = l.emis.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
    offlinePrincipalOut += Math.max(0, l.loanAmount - paidP);
  });

  const onlineLoans = await db.loanApplication.findMany({
    where: { companyId, status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED'] } },
    select: { applicationNo: true, disbursedAmount: true, emiSchedules: { select: { paidPrincipal: true } } }
  });
  let onlinePrincipalOut = 0;
  onlineLoans.forEach(l => {
    const paidP = l.emiSchedules.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
    onlinePrincipalOut += Math.max(0, (l.disbursedAmount || 0) - paidP);
  });

  console.log(`\n[4] LOAN PORTFOLIO AUDIT:`);
  console.log(`    Active Offline Loans Count: ${offlineLoans.length}`);
  console.log(`    Offline Loans Principal Outstanding: ₹${offlinePrincipalOut.toFixed(2)}`);
  console.log(`    Active Online Loans Count:  ${onlineLoans.length}`);
  console.log(`    Online Loans Principal Outstanding:  ₹${onlinePrincipalOut.toFixed(2)}`);
  console.log(`    Total Loan Portfolio:                ₹${(offlinePrincipalOut + onlinePrincipalOut).toFixed(2)}`);

  // 5. Audit Chart of Accounts Balance Integrity
  console.log(`\n[5] CHART OF ACCOUNTS AUDIT:`);
  const coa = await db.chartOfAccount.findMany({ where: { companyId } });
  let coaDiffCount = 0;

  for (const acc of coa) {
    const lines = await db.journalEntryLine.findMany({
      where: { accountId: acc.id, journalEntry: { isApproved: true, isReversed: false } }
    });
    const dr = lines.reduce((s, l) => s + (l.debitAmount || 0), 0);
    const cr = lines.reduce((s, l) => s + (l.creditAmount || 0), 0);
    const op = acc.openingBalance || 0;
    const isDrNormal = ['ASSET', 'EXPENSE'].includes(acc.accountType);
    const calculatedBal = isDrNormal ? op + dr - cr : op + cr - dr;

    if (Math.abs((acc.currentBalance || 0) - calculatedBal) > 0.01) {
      coaDiffCount++;
      console.log(`    ⚠️ Account ${acc.accountCode} (${acc.accountName}): Stale currentBalance=₹${acc.currentBalance}, GL calculated=₹${calculatedBal}`);
    }
  }

  if (coaDiffCount === 0) {
    console.log('    ✓ All Chart of Account currentBalances match GL calculations 100%.');
  } else {
    console.log(`    ℹ️ ${coaDiffCount} accounts have stale currentBalance in DB table, but GL calculations in API routes use dynamic line calculation.`);
  }

  console.log('\n====================================================');
  console.log('   AUDIT COMPLETE');
  console.log('====================================================');
}

main().finally(() => db.$disconnect());
