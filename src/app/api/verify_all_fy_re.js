const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAllFY() {
  console.log("=== COMPREHENSIVE FINANCIAL YEAR AUDIT FOR RETAINED EARNINGS ===");

  const moneyMitra = await prisma.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });
  const companyId = moneyMitra.id;

  const yearsToTest = ['2020', '2021', '2022', '2023', '2024', '2025', '2026', 'ALL'];

  for (const year of yearsToTest) {
    let url = `http://localhost:3000/api/accounting/reports?type=balance-sheet&companyId=${companyId}`;
    if (year !== 'ALL') url += `&year=${year}`;

    // Direct mathematical check
    let dateFilter;
    if (year !== 'ALL') {
      const yNum = parseInt(year);
      dateFilter = new Date(Date.UTC(yNum + 1, 2, 31, 23, 59, 59, 999));
    } else {
      dateFilter = new Date();
    }

    const journalLines = await prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          companyId,
          isApproved: true,
          isReversed: false,
          entryDate: { lte: dateFilter }
        }
      },
      include: { account: true, journalEntry: true }
    });

    let totalInc = 0, totalExp = 0;
    journalLines.forEach(l => {
      if (l.account.accountType === 'INCOME') totalInc += (l.creditAmount - l.debitAmount);
      if (l.account.accountType === 'EXPENSE') totalExp += (l.debitAmount - l.creditAmount);
    });

    console.log(`\nFY ${year === 'ALL' ? 'ALL TIME' : `${year}-${(parseInt(year)+1).toString().slice(-2)}`}:`);
    console.log(`- Journal Entries Count: ${journalLines.length}`);
    console.log(`- Total Income: ₹${totalInc.toFixed(2)}`);
    console.log(`- Total Expense: ₹${totalExp.toFixed(2)}`);
    console.log(`- Net Profit: ₹${(totalInc - totalExp).toFixed(2)}`);
  }

  await prisma.$disconnect();
}

verifyAllFY();
