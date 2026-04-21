import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendPushNotification } from '@/lib/firebase-admin';

/**
 * POST /api/debug/test-notification
 * Body: { userId: string }
 * Tests push notification delivery to a specific user's phone.
 * Check server logs for result.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, fcmToken: true, notificationEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.fcmToken) {
      return NextResponse.json({
        success: false,
        message: '❌ No FCM token saved for this user. The user must open the app and allow notifications first.',
        user: { id: user.id, name: user.name, hasToken: false },
      });
    }

    // Send a test push notification
    const result = await sendPushNotification(
      user.fcmToken,
      {
        title: '🔔 Test Notification',
        body: `Hello ${user.name}! Push notifications are working correctly.`,
      },
      {
        type: 'TEST',
        actionUrl: '/',
      }
    );

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? '✅ Test notification sent successfully! Check your phone.'
        : `❌ Push failed: ${result.error}`,
      user: {
        id: user.id,
        name: user.name,
        hasToken: true,
        tokenPreview: user.fcmToken.substring(0, 20) + '...',
        notificationEnabled: user.notificationEnabled,
      },
      pushResult: result,
    });
  } catch (error: any) {
    console.error('[Test Notification] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/debug/test-notification?userId=xxx
 * Check if user has FCM token without sending notification
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId query param required' }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, fcmToken: true, notificationEnabled: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    userId: user.id,
    name: user.name,
    role: user.role,
    hasToken: !!user.fcmToken,
    tokenPreview: user.fcmToken ? user.fcmToken.substring(0, 30) + '...' : null,
    notificationEnabled: user.notificationEnabled,
    status: user.fcmToken
      ? '✅ Ready to receive push notifications'
      : '❌ No FCM token — user must open app and allow notifications',
  });
}
