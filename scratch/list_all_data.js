const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const JEs = await db.journalEntry.findMany({
    include: {
      company: true,
      lines: true
    }
  });
  console.log(`Total JEs in DB: ${JEs.length}`);
  const companyCounts = {};
  for (const je of JEs) {
    const key = je.company?.name || 'Unknown';
    companyCounts[key] = (companyCounts[key] || 0) + 1;
  }
  console.log('JEs per company:', companyCounts);
}

main().catch(console.error).finally(() => db.$disconnect());
