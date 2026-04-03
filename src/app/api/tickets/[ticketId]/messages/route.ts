import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get ticket messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Verify ticket exists
    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Get messages with pagination
    const [messages, total] = await Promise.all([
      db.ticketMessage.findMany({
        where: { ticketId },
        orderBy: {
          createdAt: 'asc',
        },
        skip,
        take: limit,
      }),
      db.ticketMessage.count({
        where: { ticketId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching ticket messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket messages' },
      { status: 500 }
    );
  }
}

// POST - Add new message to ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const body = await request.json();
    const { senderId, senderType, message, attachments, isInternal } = body;

    if (!senderId || !senderType || !message) {
      return NextResponse.json(
        { error: 'senderId, senderType, and message are required' },
        { status: 400 }
      );
    }

    // Verify ticket exists and get current state
    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Create message and update ticket in transaction
    const [newMessage] = await db.$transaction([
      db.ticketMessage.create({
        data: {
          ticketId,
          senderId,
          senderType, // CUSTOMER, ADMIN, SYSTEM, CHATBOT
          message,
          attachments: attachments ? JSON.stringify(attachments) : null,
          isInternal: isInternal || false,
        },
      }),
      // Update ticket status if needed
      db.supportTicket.update({
        where: { id: ticketId },
        data: {
          updatedAt: new Date(),
          // If customer replies and ticket was waiting for customer, change to in_progress
          ...(senderType === 'CUSTOMER' && ticket.status === 'WAITING_CUSTOMER'
            ? { status: 'IN_PROGRESS' }
            : {}),
          // If admin replies, set status to waiting for customer
          ...(senderType === 'ADMIN' && ticket.status === 'IN_PROGRESS'
            ? { status: 'WAITING_CUSTOMER', firstResponseAt: ticket.firstResponseAt || new Date() }
            : {}),
        },
      }),
      // Create activity log for reply
      db.ticketActivity.create({
        data: {
          ticketId,
          action: 'REPLIED',
          description: `${senderType === 'CUSTOMER' ? 'Customer' : senderType === 'ADMIN' ? 'Admin' : senderType} replied to the ticket`,
          performedBy: senderId,
          metadata: JSON.stringify({
            senderType,
            messageLength: message.length,
            hasAttachments: !!attachments,
          }),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: newMessage,
      message: 'Message added successfully',
    });
  } catch (error) {
    console.error('Error adding ticket message:', error);
    return NextResponse.json(
      { error: 'Failed to add ticket message' },
      { status: 500 }
    );
  }
}
