import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const users = await db.user.findMany({
  where: { role: { in: ['CUSTOMER', 'AGENT', 'CASHIER', 'STAFF', 'COMPANY', 'SUPER_ADMIN'] } },
  select: { id: true, name: true, email: true, phone: true, role: true, fcmToken: true },
  orderBy: { createdAt: 'desc' },
  take: 30,
});

console.log('\n=== ALL USERS (recent 30) ===\n');
console.log('ROLE'.padEnd(15), 'NAME'.padEnd(25), 'EMAIL/PHONE'.padEnd(30), 'HAS_FCM_TOKEN', 'USER_ID');
console.log('-'.repeat(120));

users.forEach(u => {
  const contact = u.email || u.phone || 'N/A';
  const hasToken = u.fcmToken ? '✅ YES' : '❌ NO ';
  console.log(
    u.role.padEnd(15),
    (u.name || 'N/A').padEnd(25),
    contact.padEnd(30),
    hasToken.padEnd(13),
    u.id
  );
});

const withToken = users.filter(u => u.fcmToken);
console.log(`\n✅ ${withToken.length} users have FCM token (can receive notifications)`);
console.log(`❌ ${users.length - withToken.length} users do NOT have FCM token\n`);

await db.$disconnect();
