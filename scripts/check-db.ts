import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get companies
  const companies = await prisma.company.findMany({ 
    select: { id: true, name: true, isMirrorCompany: true } 
  });
  console.log('=== COMPANIES ===');
  console.log(JSON.stringify(companies, null, 2));
  
  // Get recent offline loans - correct fields
  const offlineLoans = await prisma.offlineLoan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      loanNumber: true,
      customerName: true,
      companyId: true,
      status: true,
      loanType: true,
      loanAmount: true,
      isMirrorLoan: true,
      originalLoanId: true,
      disbursementMode: true,
      bankAccountId: true,
      createdAt: true
    }
  });
  console.log('\n=== RECENT OFFLINE LOANS ===');
  console.log(JSON.stringify(offlineLoans, null, 2));
  
  // Get mirror loan mappings
  const mirrorMappings = await prisma.mirrorLoanMapping.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  console.log('\n=== MIRROR LOAN MAPPINGS ===');
  console.log(JSON.stringify(mirrorMappings, null, 2));
  
  // Check daybook entries for recent loans
  const daybookEntries = await prisma.daybookEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      entryNumber: true,
      entryDate: true,
      accountHeadName: true,
      accountType: true,
      particular: true,
      referenceType: true,
      referenceId: true,
      debit: true,
      credit: true,
      sourceType: true,
      sourceId: true,
      loanNo: true,
      customerName: true,
      paymentMode: true,
      companyId: true,
      createdAt: true
    }
  });
  console.log('\n=== RECENT DAYBOOK ENTRIES ===');
  console.log(JSON.stringify(daybookEntries, null, 2));
  
  // Check bank book entries
  const bankBookEntries = await prisma.bankBookEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  console.log('\n=== RECENT BANK BOOK ENTRIES ===');
  console.log(JSON.stringify(bankBookEntries, null, 2));
  
  // Check cash book entries
  const cashBookEntries = await prisma.cashBookEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  console.log('\n=== RECENT CASH BOOK ENTRIES ===');
  console.log(JSON.stringify(cashBookEntries, null, 2));
  
  // Check bank accounts
  const bankAccounts = await prisma.bankAccount.findMany({
    select: {
      id: true,
      accountName: true,
      bankName: true,
      accountNumber: true,
      companyId: true,
      currentBalance: true
    }
  });
  console.log('\n=== BANK ACCOUNTS ===');
  console.log(JSON.stringify(bankAccounts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
