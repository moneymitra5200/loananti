import { db } from './src/lib/db';

async function main() {
  // Check loans
  const loans = await db.loan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      borrower: true,
      disbursements: true
    }
  });
  
  console.log('\n=== RECENT LOANS ===');
  console.log(JSON.stringify(loans, null, 2));
  
  // Check bank accounts
  const banks = await db.bankAccount.findMany();
  console.log('\n=== BANK ACCOUNTS ===');
  console.log(JSON.stringify(banks, null, 2));
  
  // Check cash balances
  const cashBalances = await db.cashBalance.findMany({
    orderBy: { date: 'desc' },
    take: 10
  });
  console.log('\n=== CASH BALANCES ===');
  console.log(JSON.stringify(cashBalances, null, 2));
  
  // Check account entries
  const entries = await db.accountEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  console.log('\n=== RECENT ACCOUNT ENTRIES ===');
  console.log(JSON.stringify(entries, null, 2));
  
  // Check mirror loan mappings
  const mappings = await db.mirrorLoanMapping.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log('\n=== MIRROR LOAN MAPPINGS ===');
  console.log(JSON.stringify(mappings, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
