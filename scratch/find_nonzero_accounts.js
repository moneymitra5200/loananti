const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const accounts = await db.chartOfAccount.findMany({
    where: {
      currentBalance: {
        not: 0
      }
    },
    include: {
      company: true
    }
  });
  console.log(`Found ${accounts.length} accounts with non-zero balance:`);
  for (const acc of accounts) {
    console.log(`Company: ${acc.company?.name || 'No Company'} (Code: ${acc.company?.code || 'None'}) | Account: ${acc.accountCode} ${acc.accountName} | Balance: ${acc.currentBalance}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
