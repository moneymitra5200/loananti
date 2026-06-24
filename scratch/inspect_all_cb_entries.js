const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const entries = await db.cashBookEntry.findMany({
    include: {
      cashBook: {
        include: {
          company: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Total CashBookEntries in DB: ${entries.length}`);
  entries.forEach(e => {
    console.log(`- ID: ${e.id}`);
    console.log(`  Company: ${e.cashBook?.company?.name} (${e.cashBook?.company?.code})`);
    console.log(`  EntryType: ${e.entryType}, Amount: ₹${e.amount}, BalanceAfter: ₹${e.balanceAfter}`);
    console.log(`  Description: ${e.description}`);
    console.log(`  RefType: ${e.referenceType}, RefId: ${e.referenceId}`);
    console.log(`  CreatedAt: ${e.createdAt}`);
  });
}

main().catch(console.error).finally(() => db.$disconnect());
