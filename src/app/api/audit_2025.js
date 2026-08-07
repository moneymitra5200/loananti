const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const company = await db.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });
  const companyId = company.id;

  const fy2025Start = new Date('2025-04-01T00:00:00.000Z');
  const fy2025End = new Date('2026-03-31T23:59:59.999Z');

  // Check all income journal entries in FY 2025-26
  const incomeLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: { companyId, entryDate: { gte: fy2025Start, lte: fy2025End }, isApproved: true, isReversed: false },
      account: { accountType: 'INCOME' }
    },
    include: { account: true, journalEntry: true }
  });

  const expenseLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: { companyId, entryDate: { gte: fy2025Start, lte: fy2025End }, isApproved: true, isReversed: false },
      account: { accountType: 'EXPENSE' }
    },
    include: { account: true, journalEntry: true }
  });

  let inc2025 = 0;
  incomeLines.forEach(l => inc2025 += (l.creditAmount - l.debitAmount));
  let exp2025 = 0;
  expenseLines.forEach(l => exp2025 += (l.debitAmount - l.creditAmount));

  console.log('=== FY 2025-26 P&L AUDIT ===');
  console.log('Income count:', incomeLines.length, 'Total Income:', inc2025);
  console.log('Expense count:', expenseLines.length, 'Total Expense:', exp2025);
  console.log('Net Profit/Loss for FY 2025-26:', inc2025 - exp2025);

  // Check offline loan interest collected before April 1, 2026
  const offlineEMIs2025 = await db.offlineLoanEMI.findMany({
    where: {
      offlineLoan: { companyId },
      paymentStatus: { in: ['PAID', 'PARTIALLY_PAID', 'INTEREST_ONLY_PAID'] },
      paidDate: { gte: fy2025Start, lte: fy2025End }
    }
  });
  console.log('Offline EMIs paid in FY 2025-26 count:', offlineEMIs2025.length);

  // Check all-time transactions before April 1, 2026
  const priorIncomeLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: { companyId, entryDate: { lt: new Date('2026-04-01T00:00:00.000Z') }, isApproved: true, isReversed: false },
      account: { accountType: 'INCOME' }
    }
  });
  let priorInc = 0;
  priorIncomeLines.forEach(l => priorInc += (l.creditAmount - l.debitAmount));
  console.log('Total Income before April 1, 2026:', priorInc);
}

main().finally(() => db.$disconnect());
