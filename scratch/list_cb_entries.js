const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmq0sdvhy0001owes4zr8gemk';
  const entries = await db.cashBookEntry.findMany({
    where: { cashBook: { companyId } },
    orderBy: { entryDate: 'asc' }
  });

  console.log(`Found ${entries.length} cashbook entries:`);
  for (const entry of entries) {
    console.log(`- Date: ${entry.entryDate} | Type: ${entry.entryType} | Ref: ${entry.referenceType} / ${entry.referenceId} | Amount: ${entry.amount} | Narration: ${entry.narration}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
