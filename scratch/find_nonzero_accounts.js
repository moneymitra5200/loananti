const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  console.log('Searching for accounts with balance 521200 or 471000...');
  
  const accounts = await db.chartOfAccount.findMany({
    where: {
      currentBalance: { in: [521200, 471000] }
    },
    include: {
      company: true
    }
  });

  console.log(`Found ${accounts.length} matching accounts:`);
  for (const a of accounts) {
    console.log(`- Account: ${a.accountCode} (${a.accountName}) | Company: ${a.company?.name} (ID: ${a.companyId}) | Balance: ${a.currentBalance}`);
  }

  // Search BankAccount table
  const banks = await db.bankAccount.findMany({
    where: {
      currentBalance: { in: [521200, 471000] }
    },
    include: {
      company: true
    }
  });
  console.log(`\nFound ${banks.length} matching bank accounts:`);
  for (const b of banks) {
    console.log(`- Bank: ${b.bankName} | Company: ${b.company?.name} (ID: ${b.companyId}) | Balance: ${b.currentBalance}`);
  }

  // Search CashBook table
  const cashbooks = await db.cashBook.findMany({
    where: {
      currentBalance: { in: [521200, 471000] }
    },
    include: {
      company: true
    }
  });
  console.log(`\nFound ${cashbooks.length} matching cashbooks:`);
  for (const c of cashbooks) {
    console.log(`- CashBook | Company: ${c.company?.name} (ID: ${c.companyId}) | Balance: ${c.currentBalance}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
