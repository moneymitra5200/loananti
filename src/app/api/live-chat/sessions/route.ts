import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all active/waiting chat sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    
    const where: Record<string, unknown> = {};
    if (status !== 'all') {
      where.status = status;
    } else {
      where.status = { in: ['WAITING', 'ACTIVE'] };
    }

    const sessions = await db.liveChatSession.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        admin: { select: { id: true, name: true, role: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
