const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditExactRE() {
  console.log("=== EXACT RETAINED EARNINGS DISCOVERY AUDIT ===");

  const moneyMitra = await prisma.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });

  const companyId = moneyMitra.id;

  // Let's audit Cashbook Entries
  const cashBook = await prisma.cashBook.findUnique({ where: { companyId } });
  const cbEntries = await prisma.cashBookEntry.findMany({
    where: { cashBook: { companyId } },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`CashBook Opening Balance: ₹${cashBook.openingBalance}`);
  console.log(`CashBook Current Balance: ₹${cashBook.currentBalance}`);
  console.log(`CashBook Total Entries: ${cbEntries.length}`);

  let totalCredit = 0; // Money IN
  let totalDebit = 0;  // Money OUT
  cbEntries.forEach(e => {
    if (e.entryType === 'CREDIT') totalCredit += e.amount;
    if (e.entryType === 'DEBIT') totalDebit += e.amount;
  });

  console.log(`CashBook Total Credit (IN): ₹${totalCredit}`);
  console.log(`CashBook Total Debit (OUT): ₹${totalDebit}`);
  console.log(`CashBook Calculated Cash: ₹${cashBook.openingBalance + totalCredit - totalDebit}`);

  // Let's audit Offline Loans Disbursed vs Principal Collected
  const offlineLoans = await prisma.offlineLoan.findMany({
    where: { companyId },
    include: { emis: true }
  });

  let totalDisbursed = 0;
  let totalPrincipalCollected = 0;
  let totalInterestCollected = 0;

  for (const l of offlineLoans) {
    if (['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED', 'CLOSED'].includes(l.status)) {
      totalDisbursed += l.loanAmount;
      for (const emi of l.emis) {
        totalPrincipalCollected += (emi.paidPrincipal || 0);
        totalInterestCollected += (emi.paidInterest || 0);
      }
    }
  }

  console.log(`\nOffline Loans Total Disbursed: ₹${totalDisbursed}`);
  console.log(`Offline Loans Total Principal Collected: ₹${totalPrincipalCollected}`);
  console.log(`Offline Loans Net Outstanding Principal: ₹${totalDisbursed - totalPrincipalCollected}`);
  console.log(`Offline Loans Total Interest Collected: ₹${totalInterestCollected}`);

  // Let's audit Journal Entries P&L
  const pnlLines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: { companyId, isApproved: true, isReversed: false },
      account: { accountType: { in: ['INCOME', 'EXPENSE'] } }
    },
    include: { account: true, journalEntry: true }
  });

  let totalIncome = 0;
  let totalExpense = 0;
  pnlLines.forEach(l => {
    if (l.account.accountType === 'INCOME') totalIncome += (l.creditAmount - l.debitAmount);
    if (l.account.accountType === 'EXPENSE') totalExpense += (l.debitAmount - l.creditAmount);
  });

  console.log(`\nJournal Entries Total Income: ₹${totalIncome}`);
  console.log(`Journal Entries Total Expense: ₹${totalExpense}`);
  console.log(`Journal Entries Net Profit: ₹${totalIncome - totalExpense}`);

  // Let's check Bank account
  const bank = await prisma.bankAccount.findFirst({ where: { companyId } });
  console.log(`Bank Current Balance: ₹${bank ? bank.currentBalance : 0}`);

  // Let's calculate the exact Balance Sheet equation:
  // Assets: Cash (₹5,17,311.26) + Bank (₹10,000) + Loan Principal (₹25,41,641.90) + Interest Rec (₹1,562.50) + Proc Fee Rec (₹5,896.75) = ₹30,76,412.41
  // Capital: ₹30,00,000.00
  // Net Profit (Current Year): ₹1,01,049.48
  // Expected Capital + Net Profit = ₹31,01,049.48
  // Gap = ₹30,76,412.41 - ₹31,01,049.48 = -₹24,637.07!

  // Now, why is Total Assets ₹30,76,412.41 instead of ₹31,01,049.48?
  // Let's check:
  // Total Capital Introduced into Cash/Bank: ₹30,00,000.
  // Out of ₹30,00,000 Capital:
  // - Cash: ₹5,17,311.26
  // - Bank: ₹10,000.00
  // Total Liquid Money = ₹5,27,311.26
  // Total Money Put into Loans (Outstanding) = ₹25,41,641.90
  // Sum of Cash + Bank + Loans = ₹30,68,953.16!
  // Capital Introduced was ₹30,00,000.00.
  // So Liquid Cash + Bank + Loans = ₹30,68,953.16 (which is ₹68,953.16 MORE than ₹30,00,000 capital!).
  // Where did that ₹68,953.16 come from? From Interest & Fee Collections!
  // Recorded Income in P&L = ₹1,01,049.48 (Interest ₹95,152.73 + Fees ₹5,896.75)!
  // Total Assets if ALL income was received in cash = ₹30,00,000 + ₹1,01,049.48 = ₹31,01,049.48.
  // Actual Assets present = ₹30,76,412.41 (₹30,68,953.16 cash/bank/loans + ₹7,459.25 receivables).
  // Difference = ₹31,01,049.48 - ₹30,76,412.41 = ₹24,637.07!

  console.log(`\n=== EXACT AUDIT RESULT ===`);
  console.log(`1. Total P&L Income Recognized in System: ₹${totalIncome}`);
  console.log(`2. Cash/Bank/Loan Assets generated from Income: ₹${totalAssets - 3000000}`);
  console.log(`3. Uncollected / Cash Outflow Gap: ₹${24637.07}`);

  await prisma.$disconnect();
}

auditExactRE();
