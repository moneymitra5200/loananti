import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Check all users with tokens and when they last updated
const users = await db.user.findMany({
  where: { fcmToken: { not: null } },
  select: {
    id: true,
    name: true,
    role: true,
    fcmToken: true,
    updatedAt: true,
    notificationEnabled: true,
  },
  orderBy: { updatedAt: 'desc' }
});

console.log('\n=== FCM TOKEN STATUS ===\n');
const now = new Date();
users.forEach(u => {
  const daysSince = Math.floor((now - new Date(u.updatedAt)) / (1000 * 60 * 60 * 24));
  const freshness = daysSince < 7 ? '🟢 Fresh' : daysSince < 30 ? '🟡 Old' : '🔴 Very Old (likely stale)';
  console.log(`${u.role.padEnd(12)} | ${(u.name || '').padEnd(25)} | Last updated: ${daysSince} days ago | ${freshness}`);
  console.log(`              Token: ${u.fcmToken.substring(0, 40)}...`);
  console.log();
});

await db.$disconnect();
