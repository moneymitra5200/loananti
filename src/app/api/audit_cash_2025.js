const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const company = await db.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });
  const companyId = company.id;
  const cashBook = await db.cashBook.findUnique({ where: { companyId } });

  // Date filter for FY 2025-26 end (2026-03-31)
  const dateFilter2025 = new Date('2026-03-31T23:59:59.999Z');

  const cbWhere = {
    entryDate: { lte: dateFilter2025 },
    cashBookId: cashBook.id
  };

  const [cbCredits, cbDebits] = await Promise.all([
    db.cashBookEntry.aggregate({ where: { ...cbWhere, entryType: 'CREDIT' }, _sum: { amount: true } }),
    db.cashBookEntry.aggregate({ where: { ...cbWhere, entryType: 'DEBIT' }, _sum: { amount: true } })
  ]);

  const openingCash = cashBook?.openingBalance || 0;
  const historicalCash2025 = openingCash + (cbCredits._sum.amount || 0) - (cbDebits._sum.amount || 0);

  console.log('=== CASH BALANCE AS OF MARCH 31, 2026 (FY 2025-26 END) ===');
  console.log('cbCredits as of 2026-03-31:', cbCredits._sum.amount);
  console.log('cbDebits as of 2026-03-31:', cbDebits._sum.amount);
  console.log('historicalCash as of 2026-03-31:', historicalCash2025);

  // Check journal entry cash lines as of 2026-03-31
  const coaCash = await db.chartOfAccount.findFirst({ where: { companyId, accountCode: '1101' } });
  const lines = await db.journalEntryLine.findMany({
    where: { accountId: coaCash.id, journalEntry: { entryDate: { lte: dateFilter2025 }, isApproved: true, isReversed: false } }
  });
  let glCash2025 = coaCash.openingBalance || 0;
  lines.forEach(l => glCash2025 += (l.debitAmount - l.creditAmount));
  console.log('GL Cash (1101) as of 2026-03-31:', glCash2025);
}

main().finally(() => db.$disconnect());
