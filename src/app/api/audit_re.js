const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRetainedEarnings() {
  console.log("=== RETAINED EARNINGS AUDIT ===");

  const moneyMitra = await prisma.company.findFirst({
    where: { name: { contains: 'MONEY MITRA' } }
  });

  if (!moneyMitra) {
    console.log("Money Mitra not found!");
    return;
  }

  console.log("Money Mitra ID:", moneyMitra.id);

  // FY 2025-26: 2025-04-01 to 2026-03-31
  const fy2025Start = new Date("2025-04-01T00:00:00.000Z");
  const fy2025End = new Date("2026-03-31T23:59:59.999Z");

  // FY 2026-27: 2026-04-01 to 2027-03-31
  const fy2026Start = new Date("2026-04-01T00:00:00.000Z");
  const fy2026End = new Date("2027-03-31T23:59:59.999Z");

  // Journal entries prior to 2026-04-01 (i.e. up to FY 2025-26 end)
  const priorLines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: {
        companyId: moneyMitra.id,
        isApproved: true,
        isReversed: false,
        entryDate: { lte: fy2025End }
      }
    },
    include: {
      account: true,
      journalEntry: true
    }
  });

  console.log(`Prior Journal Lines count (up to 31-Mar-2026): ${priorLines.length}`);

  let incomePrior = 0;
  let expensePrior = 0;

  for (const line of priorLines) {
    const type = line.account.accountType;
    if (type === 'INCOME') {
      incomePrior += (line.creditAmount - line.debitAmount);
    } else if (type === 'EXPENSE') {
      expensePrior += (line.debitAmount - line.creditAmount);
    }
    console.log(`[Prior JE ${line.journalEntry.entryNumber}] Date: ${line.journalEntry.entryDate.toISOString().split('T')[0]} | Account: ${line.account.accountName} (${type}) | Dr: ${line.debitAmount} | Cr: ${line.creditAmount} | Ref: ${line.journalEntry.referenceType || 'N/A'}`);
  }

  console.log("\nPrior Period (up to 31-Mar-2026) Summary:");
  console.log(`Total Income: ₹${incomePrior.toFixed(2)}`);
  console.log(`Total Expense: ₹${expensePrior.toFixed(2)}`);
  console.log(`Net Profit / (Loss) for FY 2025-26: ₹${(incomePrior - expensePrior).toFixed(2)}`);

  // FY 2026-27 lines
  const currentLines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: {
        companyId: moneyMitra.id,
        isApproved: true,
        isReversed: false,
        entryDate: { gte: fy2026Start, lte: fy2026End }
      }
    },
    include: {
      account: true
    }
  });

  let income2026 = 0;
  let expense2026 = 0;

  for (const line of currentLines) {
    const type = line.account.accountType;
    if (type === 'INCOME') {
      income2026 += (line.creditAmount - line.debitAmount);
    } else if (type === 'EXPENSE') {
      expense2026 += (line.debitAmount - line.creditAmount);
    }
  }

  console.log("\nCurrent FY 2026-27 Summary:");
  console.log(`Total Income: ₹${income2026.toFixed(2)}`);
  console.log(`Total Expense: ₹${expense2026.toFixed(2)}`);
  console.log(`Net Profit for FY 2026-27: ₹${(income2026 - expense2026).toFixed(2)}`);

  await prisma.$disconnect();
}

checkRetainedEarnings();
