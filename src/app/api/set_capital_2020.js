const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setCapitalTo2020() {
  console.log("=== UPDATING CAPITAL ENTRIES TO 2020 ===");

  const targetDate = new Date("2020-04-01T00:00:00.000Z");

  // Get admin user
  const adminUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }) || await prisma.user.findFirst();
  const createdById = adminUser ? adminUser.id : 'system';

  // 1. Find all Journal entries with referenceType = EQUITY_INVESTMENT or touching account 3002
  const capitalAccounts = await prisma.chartOfAccount.findMany({
    where: { accountCode: '3002' }
  });

  const accountIds = capitalAccounts.map(a => a.id);

  const lines = await prisma.journalEntryLine.findMany({
    where: { accountId: { in: accountIds } },
    select: { journalEntryId: true }
  });

  const jeIds = Array.from(new Set(lines.map(l => l.journalEntryId)));

  console.log(`Found ${jeIds.length} Journal Entries for Owner's Capital.`);

  // Update entryDate to 2020-04-01
  const updateResult = await prisma.journalEntry.updateMany({
    where: {
      OR: [
        { id: { in: jeIds } },
        { referenceType: 'EQUITY_INVESTMENT' }
      ]
    },
    data: {
      entryDate: targetDate
    }
  });

  console.log(`Updated ${updateResult.count} Journal Entries entryDate to 2020-04-01.`);

  // 2. Also populate EquityEntry table so actualCapital calculations match
  const companies = await prisma.company.findMany();
  for (const c of companies) {
    const capitalLines = await prisma.journalEntryLine.findMany({
      where: {
        account: { companyId: c.id, accountCode: '3002' },
        journalEntry: { isApproved: true, isReversed: false }
      },
      include: { journalEntry: true }
    });

    for (const line of capitalLines) {
      const existing = await prisma.equityEntry.findFirst({
        where: {
          companyId: c.id,
          amount: line.creditAmount || line.debitAmount
        }
      });

      if (!existing && (line.creditAmount > 0)) {
        await prisma.equityEntry.create({
          data: {
            companyId: c.id,
            amount: line.creditAmount,
            entryType: 'INVESTMENT',
            entryDate: targetDate,
            createdAt: targetDate,
            description: 'Initial Capital Contribution (2020)',
            createdById: createdById
          }
        });
        console.log(`Created EquityEntry for ${c.name}: ₹${line.creditAmount} on 2020-04-01`);
      } else if (existing) {
        await prisma.equityEntry.update({
          where: { id: existing.id },
          data: { entryDate: targetDate, createdAt: targetDate }
        });
        console.log(`Updated existing EquityEntry for ${c.name} to 2020-04-01`);
      }
    }
  }

  console.log("=== CAPITAL DATES SET TO 2020 SUCCESSFULLY ===");
  await prisma.$disconnect();
}

setCapitalTo2020();
