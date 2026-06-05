const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const loan = await db.offlineLoan.findUnique({
    where: { id: 'cmoindie9000gnc1wot8wnejg' },
    include: { emis: { orderBy: { installmentNumber: 'asc' } } }
  });
  console.log('Loan details:', JSON.stringify(loan, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
