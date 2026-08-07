const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditAssetGap() {
  console.log("=== DEEP ASSET & BALANCE SHEET GAP AUDIT ===");

  const moneyMitra = await prisma.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });

  const companyId = moneyMitra.id;

  // 1. Owner's Capital
  const equityEntries = await prisma.equityEntry.findMany({ where: { companyId } });
  const totalCapital = equityEntries.reduce((s, e) => s + e.amount, 0);
  console.log(`\n1. Owner's Capital (EquityEntry table): ₹${totalCapital.toFixed(2)}`);

  // 2. CashBook Balance
  const cb = await prisma.cashBook.findUnique({ where: { companyId } });
  console.log(`2. CashBook currentBalance: ₹${cb.currentBalance.toFixed(2)}`);

  // 3. Bank Accounts
  const banks = await prisma.bankAccount.findMany({ where: { companyId } });
  const totalBank = banks.reduce((s, b) => s + b.currentBalance, 0);
  console.log(`3. Bank Accounts currentBalance: ₹${totalBank.toFixed(2)}`);

  // 4. Offline Loans Outstanding (Principal)
  const offlineLoans = await prisma.offlineLoan.findMany({
    where: { companyId, status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED'] } },
    include: { emis: { select: { paidPrincipal: true } } }
  });

  let offlineOutstanding = 0;
  for (const loan of offlineLoans) {
    const paidP = loan.emis.reduce((s, e) => s + (e.paidPrincipal || 0), 0);
    offlineOutstanding += (loan.loanAmount - paidP);
  }
  console.log(`4. Offline Loans Outstanding: ₹${offlineOutstanding.toFixed(2)}`);

  // 5. Interest & Processing Fee Receivables
  const interestRecLine = await prisma.journalEntryLine.aggregate({
    where: { account: { accountCode: '1105' }, journalEntry: { companyId, isApproved: true, isReversed: false } },
    _sum: { debitAmount: true, creditAmount: true }
  });
  const interestRec = (interestRecLine._sum.debitAmount || 0) - (interestRecLine._sum.creditAmount || 0);

  const procRecLine = await prisma.journalEntryLine.aggregate({
    where: { account: { accountCode: '1106' }, journalEntry: { companyId, isApproved: true, isReversed: false } },
    _sum: { debitAmount: true, creditAmount: true }
  });
  const procRec = (procRecLine._sum.debitAmount || 0) - (procRecLine._sum.creditAmount || 0);

  console.log(`5. Interest Receivable (1105): ₹${interestRec.toFixed(2)}`);
  console.log(`6. Processing Fee Receivable (1106): ₹${procRec.toFixed(2)}`);

  const totalAssets = cb.currentBalance + totalBank + offlineOutstanding + interestRec + procRec;
  console.log(`\nTOTAL ASSETS CALCULATED: ₹${totalAssets.toFixed(2)}`);

  // P&L Net Profit in Current FY (2026-27)
  const fy2026Start = new Date("2026-04-01T00:00:00.000Z");
  const pnlLines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: {
        companyId,
        isApproved: true,
        isReversed: false,
        entryDate: { gte: fy2026Start }
      }
    },
    include: { account: true }
  });

  let inc = 0, exp = 0;
  for (const l of pnlLines) {
    if (l.account.accountType === 'INCOME') inc += (l.creditAmount - l.debitAmount);
    if (l.account.accountType === 'EXPENSE') exp += (l.debitAmount - l.creditAmount);
  }
  const currentYearProfit = inc - exp;
  console.log(`\nCurrent Year Profit (P&L 2026-27): ₹${currentYearProfit.toFixed(2)}`);

  console.log(`Total Liabilities + Capital: ₹${totalCapital.toFixed(2)}`);
  console.log(`Liabilities + Current Profit: ₹${(totalCapital + currentYearProfit).toFixed(2)}`);

  const gap = totalAssets - (totalCapital + currentYearProfit);
  console.log(`\nGAP (Retained Earnings Plug): ₹${gap.toFixed(2)}`);

  // Let's analyze where the cash/loan money went!
  // Capital Introduced: ₹30,00,000
  // Net Income Earned:  ₹1,01,049.48
  // Total Money In:     ₹31,01,049.48
  // Where is money now?
  // - Cash in hand: ₹5,17,311.26
  // - Bank:         ₹10,000.00
  // - Outstanding Loans: ₹25,41,641.90
  // - Receivables:  ₹7,459.25
  // Total Present Money: ₹30,76,412.41
  // Missing Money: ₹31,01,049.48 - ₹30,76,412.41 = ₹24,637.07

  // WHY is ₹24,637.07 missing from Cash/Bank/Loans?
  // Let's check cashbook entries! Were there any expenses or loan disbursements recorded in cashbook that are not in P&L or Loan Outstanding?
  const cbEntries = await prisma.cashBookEntry.findMany({
    where: { cashBook: { companyId } }
  });

  let totalCbCredit = 0; // Money IN
  let totalCbDebit = 0;  // Money OUT
  cbEntries.forEach(e => {
    if (e.entryType === 'CREDIT') totalCbCredit += e.amount;
    if (e.entryType === 'DEBIT') totalCbDebit += e.amount;
  });

  console.log(`\nCashbook Total Credits (In): ₹${totalCbCredit.toFixed(2)}`);
  console.log(`Cashbook Total Debits (Out): ₹${totalCbDebit.toFixed(2)}`);
  console.log(`Cashbook Net Cash: Opening ₹${cb.openingBalance} + In ₹${totalCbCredit} - Out ₹${totalCbDebit} = ₹${(cb.openingBalance + totalCbCredit - totalCbDebit).toFixed(2)}`);

  await prisma.$disconnect();
}

auditAssetGap();
