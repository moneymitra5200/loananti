import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== COMPANIES ===');
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, code: true }
  });
  console.log(JSON.stringify(companies, null, 2));
  
  console.log('\n=== BANK ACCOUNTS ===');
  const banks = await prisma.bankAccount.findMany({
    include: { company: { select: { name: true, code: true } } }
  });
  console.log(JSON.stringify(banks, null, 2));
  
  console.log('\n=== CASH BOOKS ===');
  const cashBooks = await prisma.cashBook.findMany({
    include: { company: { select: { name: true, code: true } } }
  });
  console.log(JSON.stringify(cashBooks, null, 2));
  
  console.log('\n=== RECENT BANK TRANSACTIONS ===');
  const bankTxns = await prisma.bankTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { bankAccount: { select: { accountName: true, company: { select: { name: true } } } } }
  });
  console.log(JSON.stringify(bankTxns, null, 2));
  
  console.log('\n=== RECENT CASH BOOK ENTRIES ===');
  const cashEntries = await prisma.cashBookEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { cashBook: { select: { company: { select: { name: true } } } } }
  });
  console.log(JSON.stringify(cashEntries, null, 2));
  
  console.log('\n=== RECENT OFFLINE LOANS ===');
  const loans = await prisma.offlineLoan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      loanNumber: true,
      loanAmount: true,
      customerName: true,
      company: { select: { name: true, code: true } },
      isMirrorLoan: true,
      createdAt: true
    }
  });
  console.log(JSON.stringify(loans, null, 2));
  
  console.log('\n=== MIRROR LOAN MAPPINGS ===');
  const mappings = await prisma.mirrorLoanMapping.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(mappings, null, 2));
  
  console.log('\n=== CHART OF ACCOUNTS (1101, 1102, 1401) ===');
  const accounts = await prisma.chartOfAccount.findMany({
    where: { 
      OR: [
        { accountCode: '1101' },
        { accountCode: '1102' },
        { accountCode: '1401' }
      ]
    },
    include: { company: { select: { name: true, code: true } } }
  });
  console.log(JSON.stringify(accounts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
