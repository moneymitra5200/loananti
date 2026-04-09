import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get the most recent active chatbot session for the user
    const chatSession = await db.chatbotSession.findFirst({
      where: {
        customerId: userId,
        status: { in: ['ACTIVE'] },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (!chatSession) {
      return NextResponse.json({ session: null });
    }

    // Format messages for the frontend
    const messages = chatSession.messages.map(msg => ({
      id: msg.id,
      role: msg.senderType === 'CUSTOMER' ? 'user' : 'assistant',
      content: msg.message,
      intent: msg.intent,
      suggestedActions: msg.suggestedActions ? JSON.parse(msg.suggestedActions) : null,
      timestamp: msg.createdAt,
    }));

    return NextResponse.json({
      session: {
        id: chatSession.id,
        status: chatSession.status,
        messages,
        startedAt: chatSession.startedAt,
        lastMessageAt: chatSession.lastMessageAt,
      },
    });
  } catch (error) {
    console.error('Chatbot history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}
