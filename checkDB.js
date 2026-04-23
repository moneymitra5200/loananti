const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function check() {
  const c = await db.cashBookEntry.findMany({
    where: {
      entryDate: { gte: new Date('2026-04-23T00:00:00.000Z') }
    },
    select: { id: true, amount: true, description: true, referenceType: true, referenceId: true }
  });
  console.log("Cashbook Entries:", c);

  const j = await db.journalEntry.findMany({
    where: {
      entryDate: { gte: new Date('2026-04-23T00:00:00.000Z') }
    },
    select: { id: true, totalDebit: true, referenceType: true, referenceId: true, narration: true }
  });
  console.log("Journal Entries:", j);

  await db.$disconnect();
}
check();
