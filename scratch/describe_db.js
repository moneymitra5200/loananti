const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const result = await db.$queryRawUnsafe(`
    SHOW KEYS FROM BankTransaction WHERE Non_unique = 0;
  `);
  console.log('Unique indexes on BankTransaction:', result);
}

main().catch(console.error).finally(() => db.$disconnect());
