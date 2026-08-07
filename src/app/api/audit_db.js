const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const company = await db.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });

  if (!company) {
    console.log('Company not found');
    return;
  }

  console.log('=== COMPANY ===');
  console.log(company.id, company.name, company.code);

  const companyId = company.id;

  // 1. CashBook
  const cashBook = await db.cashBook.findUnique({ where: { companyId } });
  console.log('\n=== CASH BOOK ===');
  console.log('Opening:', cashBook?.openingBalance, 'Current:', cashBook?.currentBalance);

  // 2. Bank Accounts
  const bankAccounts = await db.bankAccount.findMany({ where: { companyId, isActive: true } });
  console.log('\n=== BANK ACCOUNTS ===');
  bankAccounts.forEach(b => console.log(b.bankName, b.accountNumber, 'Current:', b.currentBalance));

  // 3. Equity Entries
  const equityEntries = await db.equityEntry.findMany({ where: { companyId } });
  console.log('\n=== EQUITY ENTRIES ===');
  equityEntries.forEach(e => console.log(e.entryType, e.amount, e.description, e.createdAt));

  // 4. Offline Loans
  const offlineLoans = await db.offlineLoan.findMany({
    where: { companyId, status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED'] } },
    select: { id: true, loanAmount: true, emis: { select: { paidPrincipal: true, paidInterest: true } } }
  });
  let totalOfflinePrincipalOutstanding = 0;
  offlineLoans.forEach(l => {
    const paidP = l.emis.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
    const out = Math.max(0, l.loanAmount - paidP);
    totalOfflinePrincipalOutstanding += out;
  });
  console.log('\n=== OFFLINE LOANS ===');
  console.log('Count:', offlineLoans.length, 'Total Principal Outstanding:', totalOfflinePrincipalOutstanding);

  // 5. Income & Expense Journal Entries / Payments
  const payments = await db.payment.findMany({
    where: { loanApplication: { companyId }, status: 'COMPLETED' },
    select: { amount: true, principalComponent: true, interestComponent: true, penaltyComponent: true }
  });
  console.log('\n=== PAYMENTS ===');
  console.log('Count:', payments.length);

  const offlineEMIs = await db.offlineLoanEMI.findMany({
    where: { offlineLoan: { companyId }, paymentStatus: { in: ['PAID', 'PARTIALLY_PAID', 'INTEREST_ONLY_PAID'] } },
    select: { paidPrincipal: true, paidInterest: true }
  });
  const totalInterestCollected = offlineEMIs.reduce((s, e) => s + (e.paidInterest || 0), 0);
  console.log('Offline EMI Paid Interest:', totalInterestCollected);

  // 6. Chart of Accounts & Balances
  const coa = await db.chartOfAccount.findMany({ where: { companyId } });
  console.log('\n=== CHART OF ACCOUNTS ===');
  coa.forEach(a => {
    if (a.currentBalance !== 0 || ['3001','3002','3003','1101','1102','1200','1210','4001','4110'].includes(a.accountCode)) {
      console.log(a.accountCode, a.accountName, a.accountType, 'CurrentBalance:', a.currentBalance);
    }
  });

  // 7. Journal Entry Lines
  const journalLines = await db.journalEntryLine.findMany({
    where: { journalEntry: { companyId, isApproved: true, isReversed: false } },
    include: { account: { select: { accountCode: true, accountName: true, accountType: true } } }
  });
  console.log('\n=== JOURNAL LINES SUMMARY ===');
  const sumByAccount = {};
  journalLines.forEach(l => {
    const code = l.account.accountCode + ' ' + l.account.accountName;
    if (!sumByAccount[code]) sumByAccount[code] = { dr: 0, cr: 0 };
    sumByAccount[code].dr += l.debitAmount;
    sumByAccount[code].cr += l.creditAmount;
  });
  console.log(sumByAccount);
}

main().finally(() => db.$disconnect());
