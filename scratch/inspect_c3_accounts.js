const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const companyId = 'cmq0sdura0000oweseq4j4xkj';
  console.log(`=== COMPANY C3 (${companyId}) ===`);
  
  // 1. ChartOfAccount
  const accounts = await db.chartOfAccount.findMany({
    where: { companyId, isActive: true },
    orderBy: { accountCode: 'asc' }
  });
  console.log('ChartOfAccount active records:');
  for (const a of accounts) {
    console.log(`- ${a.accountCode}: ${a.accountName} | type: ${a.accountType} | openingBal: ${a.openingBalance} | currentBal: ${a.currentBalance}`);
  }

  // 2. Bank Accounts
  const banks = await db.bankAccount.findMany({ where: { companyId } });
  console.log('BankAccount records:');
  for (const b of banks) {
    console.log(`- ID: ${b.id} | ${b.bankName} | openingBal: ${b.openingBalance} | currentBal: ${b.currentBalance}`);
  }

  // 3. CashBook
  const cash = await db.cashBook.findUnique({ where: { companyId } });
  console.log('CashBook record:', cash);

  // 4. Equity entries
  const equities = await db.equityEntry.findMany({ where: { companyId } });
  console.log('Equity entries:');
  for (const e of equities) {
    console.log(`- type: ${e.entryType} | amount: ${e.amount}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
