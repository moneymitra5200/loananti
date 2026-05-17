const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const banks = await prisma.bankAccount.findMany({ include: { company: true } });
  console.log(banks.map(b => ({id: b.id, name: b.bankName, company: b.company.name, companyCode: b.company.code})));
  
  const companies = await prisma.company.findMany();
  console.log("Companies:", companies.map(c => ({id: c.id, name: c.name, code: c.code})));
}
main().then(() => prisma.$disconnect());
