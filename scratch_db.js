const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();

  for (const company of companies) {
    console.log(`\n========================================`);
    console.log(`Company: ${company.name} (${company.code}) ID: ${company.id}`);
    const accounts = await prisma.chartOfAccount.findMany({
      where: { companyId: company.id }
    });
    for (const acc of accounts) {
      if (acc.openingBalance !== 0 || acc.currentBalance !== 0) {
        console.log(`- ${acc.accountCode} ${acc.accountName} | type: ${acc.accountType} | openingBalance: ${acc.openingBalance} | currentBalance: ${acc.currentBalance}`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
