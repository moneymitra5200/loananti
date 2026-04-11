import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');
    const take = parseInt(searchParams.get('take') || '100');
    const threadId = searchParams.get('threadId');
    const withUserId = searchParams.get('withUserId');
    const conversation = searchParams.get('conversation') === 'true';
    const contacts = searchParams.get('contacts') === 'true';

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // ── Conversation thread between two specific users ─────────────────────
    if (conversation && withUserId) {
      const messages = await (db as any).message.findMany({
        where: {
          OR: [
            { fromUserId: userId, toUserId: withUserId },
            { fromUserId: withUserId, toUserId: userId },
          ],
        },
        orderBy: { createdAt: 'asc' },
        take,
        include: {
          fromUser: { select: { id: true, name: true, role: true, profilePicture: true } },
        },
      });

      // Auto-mark incoming messages as read
      await (db as any).message.updateMany({
        where: { fromUserId: withUserId, toUserId: userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      return NextResponse.json({ success: true, messages });
    }

    // ── Contacts list (all users this person has exchanged messages with) ──
    if (contacts) {
      const sent = await (db as any).message.findMany({
        where: { fromUserId: userId, toUserId: { not: null } },
        select: { toUserId: true },
        distinct: ['toUserId'],
      });
      const received = await (db as any).message.findMany({
        where: { toUserId: userId },
        select: { fromUserId: true },
        distinct: ['fromUserId'],
      });

      const partnerIds = [
        ...new Set([
          ...sent.map((m: any) => m.toUserId),
          ...received.map((m: any) => m.fromUserId),
        ]),
      ].filter(Boolean);

      if (partnerIds.length === 0) return NextResponse.json({ success: true, contacts: [] });

      const users = await db.user.findMany({
        where: { id: { in: partnerIds as string[] } },
        select: { id: true, name: true, role: true, profilePicture: true, phone: true },
      });

      const contactsWithMeta = await Promise.all(
        users.map(async (u) => {
          const lastMsg = await (db as any).message.findFirst({
            where: {
              OR: [
                { fromUserId: userId, toUserId: u.id },
                { fromUserId: u.id, toUserId: userId },
              ],
            },
            orderBy: { createdAt: 'desc' },
            select: { body: true, createdAt: true, fromUserId: true },
          });
          const unread = await (db as any).message.count({
            where: { fromUserId: u.id, toUserId: userId, isRead: false },
          });
          return {
            ...u,
            lastMessage: lastMsg?.body || '',
            lastMessageAt: lastMsg?.createdAt || null,
            unreadCount: unread,
          };
        })
      );

      contactsWithMeta.sort((a, b) =>
        new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
      );

      return NextResponse.json({ success: true, contacts: contactsWithMeta });
    }

    // ── Default inbox ─────────────────────────────────────────────────────
    const where: any = {
      parentId: threadId || null,
      OR: [
        { toUserId: userId },
        { fromUserId: userId },
        { toRole: role },
        { toRole: 'ALL' },
      ],
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
            fromUser: { select: { id: true, name: true, role: true, profilePicture: true } },
          },
        },
      },
    });

    const unreadCount = await (db as any).message.count({
      where: {
        OR: [{ toUserId: userId }, { toRole: role }, { toRole: 'ALL' }],
        isRead: false,
        fromUserId: { not: userId },
      },
    });

    return NextResponse.json({ success: true, messages, unreadCount });
  } catch (error) {
    console.error('[Messages] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/messages — Send a direct message + fire notification
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
        parentId,
      },
      include: {
        fromUser: { select: { id: true, name: true, role: true } },
        toUser: { select: { id: true, name: true, role: true } },
      },
    });

    // Fire in-app notification for the recipient
    if (toUserId) {
      const sender = await db.user.findUnique({
        where: { id: fromUserId },
        select: { name: true, role: true },
      });
      await db.notification.create({
        data: {
          userId: toUserId,
          type: 'MESSAGE',
          category: 'SYSTEM',
          priority: 'NORMAL',
          title: `💬 New message from ${sender?.name || 'Team member'}`,
          message: msgBody.substring(0, 200),
          actionUrl: '/messages',
          actionText: 'View Message',
          data: JSON.stringify({ messageId: message.id, fromUserId }),
        },
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
        data: { isRead: true, readAt: new Date() },
      });
    } else if (userId) {
      await (db as any).message.updateMany({
        where: { toUserId: userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}
