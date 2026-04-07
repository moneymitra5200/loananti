import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: 'mysql://u366636586_new_loan:Mahadev%406163@77.37.35.177:3306/u366636586_new_loan'
});

async function main() {
  const companyId = 'cmnol82e50000im20xengy3nk';
  
  console.log('=== CHECKING FOR COMPANY ID:', companyId, '===\n');
  
  // Check bank accounts
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { 
      companyId,
      isActive: true 
    },
    orderBy: { isDefault: 'desc' },
    select: {
      id: true,
      bankName: true,
      accountNumber: true,
      accountName: true,
      ownerName: true,
      currentBalance: true,
      companyId: true,
      isDefault: true,
      ifscCode: true,
      upiId: true,
      qrCodeUrl: true,
      branchName: true,
      accountType: true,
      isActive: true,
      company: {
        select: { id: true, name: true, code: true }
      }
    }
  });
  
  console.log('=== BANK ACCOUNTS ===');
  console.log('Count:', bankAccounts.length);
  console.log(JSON.stringify(bankAccounts, null, 2));
  
  // Check bank transactions
  const bankAccountIds = bankAccounts.map(ba => ba.id);
  
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      bankAccountId: { in: bankAccountIds }
    },
    include: {
      bankAccount: {
        select: { bankName: true, accountNumber: true }
      }
    },
    orderBy: { transactionDate: 'desc' },
    take: 100
  });
  
  console.log('\n=== BANK TRANSACTIONS ===');
  console.log('Count:', transactions.length);
  console.log(JSON.stringify(transactions, null, 2));
  
  // Check if company exists
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });
  
  console.log('\n=== COMPANY DETAILS ===');
  console.log(JSON.stringify(company, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
