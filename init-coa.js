const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ACCOUNTS = [
  { code: '1000', name: 'Bank', type: 'ASSET' },
  { code: '1100', name: 'Cash in Hand', type: 'ASSET' },
  { code: '1200', name: 'Loans Receivable', type: 'ASSET' },
  { code: '1300', name: 'Interest Receivable', type: 'ASSET' },
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
  { code: '2100', name: 'Borrowed Money', type: 'LIABILITY' },
  { code: '3000', name: 'Interest Income', type: 'INCOME' },
  { code: '3100', name: 'Processing Fee Income', type: 'INCOME' },
  { code: '3300', name: 'Mirror Interest Income', type: 'INCOME' },
  { code: '4000', name: 'Interest Expense', type: 'EXPENSE' },
  { code: '5000', name: 'Owners Capital', type: 'EQUITY' },
];

async function main() {
  const companies = ['cmnm30fh8000a11dub37itsvd', 'cmnm2zruj000511dust5zilhm'];
  
  for (const compId of companies) {
    console.log('Creating accounts for:', compId);
    for (const acc of ACCOUNTS) {
      await prisma.chartOfAccount.create({
        data: {
          companyId: compId,
          accountCode: acc.code,
          accountName: acc.name,
          accountType: acc.type,
          currentBalance: 0,
          isActive: true,
        }
      }).catch(() => {});
    }
  }
  console.log('Done!');
  await prisma.$disconnect();
}

main();
