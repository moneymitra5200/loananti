import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get messages for a session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const messages = await db.liveChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: limit
    });

    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST - Send message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { senderId, message, senderType } = body;

    if (!senderId || !message) {
      return NextResponse.json({ error: 'senderId and message are required' }, { status: 400 });
    }

    // Verify session exists
    const session = await db.liveChatSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Create message and update session
    const [newMessage] = await db.$transaction([
      db.liveChatMessage.create({
        data: {
          sessionId,
          senderId,
          message,
          senderType: senderType || (senderId === session.adminId ? 'ADMIN' : 'CUSTOMER')
        }
      }),
      db.liveChatSession.update({
        where: { id: sessionId },
        data: { lastMessageAt: new Date() }
      })
    ]);

    return NextResponse.json({ success: true, data: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
