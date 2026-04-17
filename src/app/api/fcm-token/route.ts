import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saveUserFCMToken, removeUserFCMToken } from '@/lib/push-notification-service';

/**
 * POST /api/fcm-token
 * Save or update FCM token for a user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, fcmToken } = body;

    if (!userId || !fcmToken) {
      return NextResponse.json({ error: 'userId and fcmToken are required' }, { status: 400 });
    }

    const result = await saveUserFCMToken(userId, fcmToken);

    if (result.success) {
      return NextResponse.json({ success: true, message: 'FCM token saved successfully' });
    } else {
      return NextResponse.json({ error: result.error || 'Failed to save FCM token' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[FCM Token API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/fcm-token
 * Remove FCM token for a user (on logout)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const result = await removeUserFCMToken(userId);

    if (result.success) {
      return NextResponse.json({ success: true, message: 'FCM token removed successfully' });
    } else {
      return NextResponse.json({ error: 'Failed to remove FCM token' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[FCM Token API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/fcm-token
 * Check if user has FCM token registered
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true, notificationEnabled: true },
    });

    return NextResponse.json({
      hasToken: !!user?.fcmToken,
      notificationEnabled: user?.notificationEnabled ?? true,
    });
  } catch (error: any) {
    console.error('[FCM Token API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
