import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check journal entries
  const journalEntries = await prisma.journalEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      entryNumber: true,
      entryDate: true,
      referenceType: true,
      referenceId: true,
      narration: true,
      totalDebit: true,
      totalCredit: true,
      companyId: true,
      createdAt: true
    }
  });
  console.log('\n=== RECENT JOURNAL ENTRIES ===');
  console.log(JSON.stringify(journalEntries, null, 2));
  
  // Check bank transactions
  const bankTransactions = await prisma.bankTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  console.log('\n=== RECENT BANK TRANSACTIONS ===');
  console.log(JSON.stringify(bankTransactions, null, 2));
  
  // Check cash book entries
  const cashBookEntries = await prisma.cashBookEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  console.log('\n=== RECENT CASH BOOK ENTRIES ===');
  console.log(JSON.stringify(cashBookEntries, null, 2));
  
  // Check cash books
  const cashBooks = await prisma.cashBook.findMany();
  console.log('\n=== CASH BOOKS ===');
  console.log(JSON.stringify(cashBooks, null, 2));
  
  // Check bank accounts
  const bankAccounts = await prisma.bankAccount.findMany({
    select: {
      id: true,
      accountName: true,
      bankName: true,
      accountNumber: true,
      companyId: true,
      currentBalance: true,
      isDefault: true
    }
  });
  console.log('\n=== BANK ACCOUNTS ===');
  console.log(JSON.stringify(bankAccounts, null, 2));
  
  // Check chart of accounts for mirror company
  const mirrorCompanyId = 'cmnpw7qj60000112y5v5k6ckm';
  const chartOfAccounts = await prisma.chartOfAccount.findMany({
    where: { companyId: mirrorCompanyId },
    select: {
      id: true,
      accountCode: true,
      accountName: true,
      accountType: true,
      currentBalance: true
    }
  });
  console.log('\n=== CHART OF ACCOUNTS FOR MIRROR COMPANY (MONEY MITRA) ===');
  console.log(JSON.stringify(chartOfAccounts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
