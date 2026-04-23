const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  // Check for PENALTY_COLLECTION journal entries
  const jes = await db.journalEntry.findMany({
    where: { referenceType: 'PENALTY_COLLECTION' },
    select: { id: true, companyId: true, totalDebit: true, narration: true, referenceId: true, entryDate: true }
  });
  console.log("PENALTY_COLLECTION journal entries:", jes.length);
  if (jes.length > 0) console.log(JSON.stringify(jes, null, 2));

  // Check for PENALTY_INCOME cashbook entries
  const cbs = await db.cashBookEntry.findMany({
    where: { referenceType: 'PENALTY_INCOME' },
    select: { id: true, amount: true, description: true, referenceId: true, entryDate: true }
  });
  console.log("\nPENALTY_INCOME cashbook entries:", cbs.length);
  if (cbs.length > 0) console.log(JSON.stringify(cbs, null, 2));

  // Check for any entries with PENALTY in referenceType
  const anyPenalty = await db.cashBookEntry.findMany({
    where: { referenceType: { contains: 'PENALTY' } },
    select: { id: true, amount: true, description: true, referenceType: true, referenceId: true }
  });
  console.log("\nAny PENALTY cashbook entries:", anyPenalty.length);
  if (anyPenalty.length > 0) console.log(JSON.stringify(anyPenalty, null, 2));

  await db.$disconnect();
}
main();
