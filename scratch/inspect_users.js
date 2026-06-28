const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, companyId: true, companyCredit: true, personalCredit: true, credit: true }
  });
  console.log('=== USERS ===');
  for (const u of users) {
    console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Company ID: ${u.companyId}, CompanyCredit: ${u.companyCredit}, PersonalCredit: ${u.personalCredit}, Credit: ${u.credit}`);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
