import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: 'mysql://u366636586_new_loan:Mahadev%406163@77.37.35.177:3306/u366636586_new_loan'
});

async function main() {
  // Check all bank accounts
  const bankAccounts = await prisma.bankAccount.findMany({
    select: {
      id: true,
      bankName: true,
      accountNumber: true,
      currentBalance: true,
      companyId: true,
      isActive: true,
      company: {
        select: { id: true, name: true, code: true }
      }
    }
  });
  
  console.log('=== ALL BANK ACCOUNTS ===');
  console.log(JSON.stringify(bankAccounts, null, 2));
  
  // Check company 1 user
  const company1User = await prisma.user.findUnique({
    where: { email: 'company1@test.com' },
    select: {
      id: true,
      email: true,
      name: true,
      companyId: true,
      company: {
        select: { id: true, name: true, code: true, isMirrorCompany: true }
      }
    }
  });
  
  console.log('\n=== COMPANY 1 USER ===');
  console.log(JSON.stringify(company1User, null, 2));
  
  // Check bank accounts for company 1's companyId
  if (company1User?.companyId) {
    const company1BankAccounts = await prisma.bankAccount.findMany({
      where: { companyId: company1User.companyId },
      select: {
        id: true,
        bankName: true,
        accountNumber: true,
        currentBalance: true,
        companyId: true
      }
    });
    
    console.log('\n=== BANK ACCOUNTS FOR COMPANY 1 (companyId: ' + company1User.companyId + ') ===');
    console.log(JSON.stringify(company1BankAccounts, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
