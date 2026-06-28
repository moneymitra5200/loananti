const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const payments = await db.payment.findMany();
  console.log('=== PAYMENTS IN DB ===');
  console.log(payments);
}

main().catch(console.error).finally(() => db.$disconnect());
