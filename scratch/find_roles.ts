import { db } from '../src/lib/db';

async function main() {
  const roles = ['SUPER_ADMIN', 'COMPANY', 'AGENT', 'STAFF', 'CASHIER', 'CUSTOMER', 'ACCOUNTANT'];
  console.log('Listing users by role:');
  for (const role of roles) {
    const user = await db.user.findFirst({ where: { role: role as any } });
    if (user) {
      console.log(`- Role: ${role} | Name: ${user.name} | ID: ${user.id} | Phone: ${user.phone}`);
    } else {
      console.log(`- Role: ${role} | NONE FOUND`);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
