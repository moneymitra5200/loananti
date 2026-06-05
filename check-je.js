const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const jes = await db.journalEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { lines: true, company: true }
  });
  console.log(JSON.stringify(jes.map(je => ({
    company: je.company?.name,
    refType: je.referenceType,
    date: je.entryDate,
    lines: je.lines.map(l => ({ dr: l.debitAmount, cr: l.creditAmount }))
  })), null, 2));
}
main().finally(() => db.$disconnect());
