import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/messages — Fetch messages for the calling user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const take = parseInt(searchParams.get('take') || '50');
    const threadId = searchParams.get('threadId');

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const where: any = {
      parentId: threadId || null, // top-level messages only unless in thread
      OR: [
        { toUserId: userId },
        { fromUserId: userId },
        { toRole: role },
        { toRole: 'ALL' },
      ]
    };

    const messages = await (db as any).message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        fromUser: { select: { id: true, name: true, role: true, profilePicture: true } },
        toUser: { select: { id: true, name: true, role: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            fromUser: { select: { id: true, name: true, role: true, profilePicture: true } }
          }
        }
      }
    });

    const unreadCount = await (db as any).message.count({
      where: {
        OR: [{ toUserId: userId }, { toRole: role }, { toRole: 'ALL' }],
        isRead: false,
        fromUserId: { not: userId }
      }
    });

    return NextResponse.json({ success: true, messages, unreadCount });
  } catch (error) {
    console.error('[Messages] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/messages — Send a message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromUserId, toUserId, toRole, subject, body: msgBody, loanId, offlineLoanId, parentId } = body;

    if (!fromUserId || !msgBody) {
      return NextResponse.json({ error: 'fromUserId and body are required' }, { status: 400 });
    }

    const message = await (db as any).message.create({
      data: {
        fromUserId,
        toUserId: toUserId || null,
        toRole: toRole || null,
        subject,
        body: msgBody,
        loanId,
        offlineLoanId,
        parentId
      },
      include: {
        fromUser: { select: { id: true, name: true, role: true } },
        toUser: { select: { id: true, name: true, role: true } }
      }
    });

    // If targeting a specific user, create an in-app notification for them
    if (toUserId) {
      const sender = await db.user.findUnique({ where: { id: fromUserId }, select: { name: true, role: true } });
      await db.notification.create({
        data: {
          userId: toUserId,
          type: 'MESSAGE',
          category: 'SYSTEM',
          priority: 'NORMAL',
          title: `New message from ${sender?.name || 'Team member'}`,
          message: msgBody.substring(0, 200),
          actionUrl: '/messages',
          actionText: 'View Message',
          data: JSON.stringify({ messageId: message.id, fromUserId })
        }
      });
    }

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('[Messages] POST error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

// PATCH /api/messages — Mark as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, userId } = body;

    if (messageId) {
      await (db as any).message.update({
        where: { id: messageId },
        data: { isRead: true, readAt: new Date() }
      });
    } else if (userId) {
      // Mark all as read for this user
      await (db as any).message.updateMany({
        where: { toUserId: userId, isRead: false },
        data: { isRead: true, readAt: new Date() }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}
