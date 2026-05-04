/**
 * GET /api/system/test-notification?secret=diag-secret-2024
 *
 * Tests the ENTIRE notification pipeline in 5 steps:
 *   1. Firebase Admin env vars
 *   2. DB: find SUPER_ADMIN with FCM token
 *   3. Direct FCM send (single token)                    ← was already working
 *   4. sendPushNotificationToRoles(['SUPER_ADMIN'])      ← exact path real events use
 *   5. notifyEvent() fire-and-forget simulation
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, handlePrismaError } from '@/lib/db';
import { sendPushNotification, getFirebaseInitError } from '@/lib/firebase-admin';
import { sendPushNotificationToRoles } from '@/lib/push-notification-service';
import { notifyEvent } from '@/lib/event-notify';

const REQUIRED_SECRET = process.env.DIAGNOSTIC_SECRET || 'diag-secret-2024';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== REQUIRED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const report: Record<string, unknown> = {};

  // ── Step 1: Firebase env vars ──────────────────────────────────────────────
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY;

  report.step1_firebase_env = {
    FIREBASE_PROJECT_ID:   projectId   ? `✅ ${projectId}` : '❌ MISSING',
    FIREBASE_CLIENT_EMAIL: clientEmail ? `✅ ${clientEmail}` : '❌ MISSING',
    FIREBASE_PRIVATE_KEY:  privateKey  ? `✅ Present (${privateKey.length} chars)` : '❌ MISSING',
    all_present: !!(projectId && clientEmail && privateKey),
  };

  if (!projectId || !clientEmail || !privateKey) {
    return NextResponse.json({ status: '❌ FAILED Step 1 — missing Firebase env vars', report });
  }

  // ── Step 2: Find SUPER_ADMIN with FCM token ────────────────────────────────
  let targetUser: any = null;
  try {
    targetUser = await db.user.findFirst({
      where: { role: 'SUPER_ADMIN' as any, isActive: true, fcmToken: { not: null } },
      select: { id: true, name: true, role: true, fcmToken: true },
    });

    // Count all users with tokens
    const withToken = await db.user.count({ where: { fcmToken: { not: null } } });
    const total     = await db.user.count();

    report.step2_db = {
      found_super_admin_with_token: !!targetUser,
      name: targetUser?.name,
      token_preview: targetUser?.fcmToken?.substring(0, 25) + '...',
      total_users_with_fcm_token: `${withToken}/${total}`,
    };

    if (!targetUser?.fcmToken) {
      return NextResponse.json({
        status: '❌ FAILED Step 2 — SUPER_ADMIN has no FCM token',
        fix: 'Open the app on your phone, allow notifications, and login as SUPER_ADMIN',
        report,
      });
    }
  } catch (err: any) {
    handlePrismaError(err);
    report.step2_error = err.message;
    return NextResponse.json({ status: '❌ FAILED Step 2 (DB panic)', report });
  }

  // ── Step 3: Direct FCM send (single token) ─────────────────────────────────
  try {
    const r = await sendPushNotification(
      targetUser.fcmToken,
      { title: '🔔 Step 3 — Direct FCM', body: `Direct test at ${new Date().toLocaleTimeString('en-IN')}` },
      { type: 'TEST_DIRECT', actionUrl: '/super-admin' }
    );
    report.step3_direct_fcm = { success: r.success, messageId: r.messageId, error: r.error };
    if (!r.success) {
      return NextResponse.json({
        status: '❌ FAILED Step 3 — Direct FCM failed',
        firebase_init_error: getFirebaseInitError(),
        report,
      });
    }
  } catch (err: any) {
    report.step3_error = err.message;
    return NextResponse.json({ status: '❌ FAILED Step 3 (exception)', report });
  }

  // ── Step 4: sendPushNotificationToRoles — EXACT path that notifyEvent uses ─
  try {
    const r4 = await sendPushNotificationToRoles(['SUPER_ADMIN'], {
      title: '🔔 Step 4 — Role-based notification',
      body:  `Role test at ${new Date().toLocaleTimeString('en-IN')} — real event path`,
      data:  { type: 'TEST_ROLE', actionUrl: '/super-admin' },
      actionUrl: '/super-admin',
    });
    report.step4_role_notification = {
      success:    r4.success,
      totalSent:  r4.totalSent,
      pushSent:   r4.pushSent,
    };
    if (!r4.success || r4.totalSent === 0) {
      return NextResponse.json({
        status: r4.totalSent === 0
          ? '❌ FAILED Step 4 — No users found for SUPER_ADMIN role (DB query returned 0)'
          : '❌ FAILED Step 4 — sendPushNotificationToRoles returned failure',
        fix: r4.totalSent === 0
          ? 'The DB query role: { in: ["SUPER_ADMIN"] } returned 0 users. Check isActive flag.'
          : 'Check server Runtime Logs on Hostinger for the exact error.',
        report,
      });
    }
  } catch (err: any) {
    report.step4_error = err.message;
    return NextResponse.json({ status: '❌ FAILED Step 4 (sendPushNotificationToRoles exception)', report });
  }

  // ── Step 5: notifyEvent — fire-and-forget (simulates a real app event) ─────
  notifyEvent({
    event: 'EMI_PAYMENT_RECEIVED',
    title: '🔔 Step 5 — Real Event Simulation',
    body:  `notifyEvent() test at ${new Date().toLocaleTimeString('en-IN')}`,
    data:  { type: 'TEST_EVENT', actionUrl: '/super-admin/payments' },
    actionUrl: '/super-admin/payments',
  });
  report.step5_notify_event = 'fired (fire-and-forget — check your phone in 5 seconds)';

  // ── All steps passed ───────────────────────────────────────────────────────
  return NextResponse.json({
    status: '✅ ALL STEPS PASSED',
    message: 'Check your phone — you should get 3 notifications (Steps 3, 4, 5)',
    report,
  });
}
