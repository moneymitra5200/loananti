const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const partialId = 'cmqqtqo6j';
  // Search offline loan, emi, payment, etc.
  const loans = await db.offlineLoan.findMany({ where: { id: { startsWith: partialId } } });
  const emis = await db.offlineLoanEMI.findMany({ where: { id: { startsWith: partialId } } });
  const payments = await db.payment.findMany({ where: { id: { startsWith: partialId } } });
  
  console.log('Loans:', loans);
  console.log('EMIs:', emis);
  console.log('Payments:', payments);
}

main().catch(console.error).finally(() => db.$disconnect());
