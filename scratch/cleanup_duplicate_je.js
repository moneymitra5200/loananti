const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const duplicateId = 'cmqrnxnga005732ym8z2xwlmw';
  
  // Delete lines first
  const deletedLines = await db.journalEntryLine.deleteMany({
    where: { journalEntryId: duplicateId }
  });
  console.log(`Deleted ${deletedLines.count} journal entry lines.`);

  // Delete journal entry
  const deletedJE = await db.journalEntry.deleteMany({
    where: { id: duplicateId }
  });
  console.log(`Deleted ${deletedJE.count} journal entries.`);
}

main().catch(console.error).finally(() => db.$disconnect());
