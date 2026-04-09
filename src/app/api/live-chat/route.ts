import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get or create active chat session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    // Find active session or create new one
    let session = await db.liveChatSession.findFirst({
      where: {
        customerId,
        status: { in: ['WAITING', 'ACTIVE'] }
      },
      include: {
        admin: { select: { id: true, name: true, role: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100
        }
      }
    });

    if (!session) {
      // Create new session
      session = await db.liveChatSession.create({
        data: {
          customerId,
          status: 'WAITING'
        },
        include: {
          admin: { select: { id: true, name: true, role: true } },
          messages: true
        }
      });
    }

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error('Error fetching chat session:', error);
    return NextResponse.json({ error: 'Failed to fetch chat session' }, { status: 500 });
  }
}

// POST - Create new chat session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, subject } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    // Check for existing active session
    const existingSession = await db.liveChatSession.findFirst({
      where: {
        customerId,
        status: { in: ['WAITING', 'ACTIVE'] }
      }
    });

    if (existingSession) {
      return NextResponse.json({ success: true, data: existingSession });
    }

    const session = await db.liveChatSession.create({
      data: {
        customerId,
        status: 'WAITING'
      }
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json({ error: 'Failed to create chat session' }, { status: 500 });
  }
}

// PUT - Update session (assign admin, close, etc.)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, adminId, status } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (adminId !== undefined) updateData.adminId = adminId;
    if (status) {
      updateData.status = status;
      if (status === 'CLOSED') updateData.endedAt = new Date();
    }

    const session = await db.liveChatSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        admin: { select: { id: true, name: true, role: true } }
      }
    });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error('Error updating chat session:', error);
    return NextResponse.json({ error: 'Failed to update chat session' }, { status: 500 });
  }
}
