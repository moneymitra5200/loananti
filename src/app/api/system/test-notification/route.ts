/**
 * GET /api/system/test-notification?secret=diag-secret-2024&userId=OPTIONAL_USER_ID
 *
 * Tests the ENTIRE notification pipeline end-to-end:
 *   1. Firebase Admin SDK initialization
 *   2. Look up FCM token for SUPER_ADMIN (or specific userId)
 *   3. Send a real FCM push message
 *   4. Returns full pass/fail for each step
 *
 * Use this to verify notifications work after deploy.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendPushNotification, getFirebaseInitError } from '@/lib/firebase-admin';

const REQUIRED_SECRET = process.env.DIAGNOSTIC_SECRET || 'diag-secret-2024';

export async function GET(request: NextRequest) {
  // Auth guard
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== REQUIRED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized. Pass ?secret=diag-secret-2024' }, { status: 401 });
  }

  const targetUserId = request.nextUrl.searchParams.get('userId');
  const report: Record<string, unknown> = {};

  // ── Step 1: Check Firebase Admin env vars ─────────────────────────────
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
    return NextResponse.json({
      status: '❌ FAILED at Step 1',
      message: 'Firebase env vars missing on Hostinger. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in hPanel → Environment Variables',
      report,
    });
  }

  // ── Step 2: Find target user with FCM token ────────────────────────────
  let targetUser: { id: string; name: string | null; role: string; fcmToken: string | null } | null = null;

  try {
    if (targetUserId) {
      targetUser = await db.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, role: true, fcmToken: true },
      }) as any;
    } else {
      // Default: find SUPER_ADMIN with FCM token
      targetUser = await db.user.findFirst({
        where: { role: 'SUPER_ADMIN', isActive: true, fcmToken: { not: null } },
        select: { id: true, name: true, role: true, fcmToken: true },
      }) as any;
    }

    report.step2_target_user = targetUser ? {
      id:       targetUser.id,
      name:     targetUser.name,
      role:     targetUser.role,
      has_fcm_token: !!targetUser.fcmToken,
      token_preview: targetUser.fcmToken ? targetUser.fcmToken.substring(0, 30) + '...' : null,
    } : '❌ No user found with FCM token';

    if (!targetUser?.fcmToken) {
      // Check if there are ANY users with FCM tokens
      const countWithToken = await db.user.count({ where: { fcmToken: { not: null } } });
      const totalUsers     = await db.user.count();

      return NextResponse.json({
        status: '❌ FAILED at Step 2',
        message: `No FCM token found. ${countWithToken}/${totalUsers} users have tokens registered.`,
        fix: 'User must open the app in a browser with notifications allowed. Token is registered automatically on login.',
        report,
      });
    }
  } catch (err: any) {
    report.step2_error = err.message;
    return NextResponse.json({ status: '❌ FAILED at Step 2 (DB error)', report });
  }

  // ── Step 3: Send test FCM push ──────────────────────────────────────────
  try {
    const result = await sendPushNotification(
      targetUser.fcmToken,
      {
        title: '🔔 Test Notification',
        body:  `Pipeline test at ${new Date().toLocaleTimeString('en-IN')} — if you see this, FCM is working! ✅`,
        icon:  '/logo-circle.png',
      },
      {
        type:      'TEST',
        actionUrl: '/super-admin',
      }
    );

    report.step3_fcm_send = {
      success:    result.success,
      messageId:  result.messageId,
      error:      result.error,
    };

    if (result.success) {
      return NextResponse.json({
        status: '✅ SUCCESS — notification sent!',
        message: `Push notification sent to ${targetUser.name} (${targetUser.role}). Check your phone!`,
        messageId: result.messageId,
        report,
      });
    } else {
      const firebaseInitErr = getFirebaseInitError();
      return NextResponse.json({
        status: '❌ FAILED at Step 3 — FCM rejected the message',
        message: result.error,
        firebase_init_error: firebaseInitErr || 'No init error captured — check Runtime Logs in Hostinger',
        fix: result.error?.includes('registration-token-not-registered')
          ? 'FCM token is expired/invalid. User needs to re-open the app to refresh it.'
          : result.error?.includes('invalid-argument')
          ? 'FCM token format is wrong. User should clear browser data and re-login.'
          : firebaseInitErr?.includes('error')
          ? `Firebase private key issue: ${firebaseInitErr}. Re-paste FIREBASE_PRIVATE_KEY in Hostinger env vars — make sure to copy the FULL key including -----BEGIN/END----- lines.`
          : 'Check Firebase Admin credentials on Hostinger.',
        report,
      });
    }
  } catch (err: any) {
    report.step3_error = err.message;
    return NextResponse.json({
      status: '❌ FAILED at Step 3 (Firebase Admin exception)',
      message: err.message,
      report,
    });
  }
}
