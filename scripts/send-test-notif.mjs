import { PrismaClient } from '@prisma/client';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Load env manually
const envFile = readFileSync('.env', 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
}

const projectId    = env['FIREBASE_PROJECT_ID'];
const clientEmail  = env['FIREBASE_CLIENT_EMAIL'];
const privateKey   = env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n');

console.log('Firebase Project:', projectId);
console.log('Client Email:', clientEmail);

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Missing Firebase credentials in .env');
  process.exit(1);
}

// Init firebase admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  });
}

const db = new PrismaClient();

const user = await db.user.findUnique({
  where: { id: 'cmocf84630000fgg023cz7po5' },
  select: { id: true, name: true, fcmToken: true }
});

if (!user?.fcmToken) {
  console.error('❌ No FCM token for user');
  await db.$disconnect();
  process.exit(1);
}

console.log('\n📱 Sending test notification to:', user.name);
console.log('Token preview:', user.fcmToken.substring(0, 30) + '...');

const message = {
  token: user.fcmToken,
  notification: {
    title: '🔔 Test Notification',
    body: `Hello ${user.name}! Push notifications are working! ✅`,
  },
  data: { type: 'TEST', actionUrl: '/' },
  android: {
    notification: {
      title: '🔔 Test Notification',
      body: `Hello ${user.name}! Push notifications are working! ✅`,
      sound: 'default',
      priority: 'high',
      color: '#10b981',
    },
    priority: 'high',
  },
};

try {
  const result = await admin.messaging().send(message);
  console.log('\n✅ Notification sent successfully!');
  console.log('Message ID:', result);
  console.log('\n👉 Check Dhruvil\'s phone now — notification should appear.');
} catch (err) {
  console.error('\n❌ Failed to send notification:');
  console.error('Error code:', err.errorInfo?.code);
  console.error('Error message:', err.message);
}

await db.$disconnect();
