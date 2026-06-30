const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, plainPassword: true }
  });
  console.log('=== USERS ===');
  for (const u of users) {
    console.log(`- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Password: ${u.plainPassword}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
