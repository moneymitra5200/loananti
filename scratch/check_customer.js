const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const count = await db.user.count({ where: { role: 'CUSTOMER' } });
  console.log(`Total CUSTOMER users: ${count}`);
  const sample = await db.user.findFirst({ where: { role: 'CUSTOMER' } });
  if (sample) {
    console.log(`Sample customer: ID: ${sample.id}, Name: ${sample.name}, Phone: ${sample.phone}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
