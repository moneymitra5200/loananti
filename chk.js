const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const c = await db.company.count();
  console.log("Total companies:", c);
  await db.$disconnect();
}
main();
