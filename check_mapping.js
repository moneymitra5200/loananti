const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mappings = await prisma.mirrorLoanMapping.findMany();
  console.log('Mirror Loan Mappings:', JSON.stringify(mappings, null, 2));
  
  const pending = await prisma.pendingMirrorLoan.findMany();
  console.log('Pending Mirror Loans:', JSON.stringify(pending, null, 2));
}

main();
