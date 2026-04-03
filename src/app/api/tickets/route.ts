import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List tickets with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const assignedTo = searchParams.get('assignedTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'userId and userRole are required' },
        { status: 400 }
      );
    }

    // Build filter conditions
    const where: any = {};

    // For customers, show only their own tickets
    if (userRole === 'CUSTOMER') {
      where.customerId = userId;
    } else {
      // For admin/staff, show all tickets with optional filters
      if (status) {
        where.status = status;
      }
      if (category) {
        where.category = category;
      }
      if (assignedTo) {
        where.assignedToId = assignedTo;
      }
    }

    // Get tickets with pagination
    const [tickets, total] = await Promise.all([
      db.supportTicket.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      db.supportTicket.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// POST - Create new ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, subject, description, category, priority, source, chatbotSessionId } = body;

    if (!customerId || !subject || !description) {
      return NextResponse.json(
        { error: 'customerId, subject, and description are required' },
        { status: 400 }
      );
    }

    // Generate ticket number like TK-2024-0001
    const currentYear = new Date().getFullYear();
    const lastTicket = await db.supportTicket.findFirst({
      where: {
        ticketNumber: {
          startsWith: `TK-${currentYear}-`,
        },
      },
      orderBy: {
        ticketNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastTicket) {
      const lastSequence = parseInt(lastTicket.ticketNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    const ticketNumber = `TK-${currentYear}-${sequence.toString().padStart(4, '0')}`;

    // Create ticket with activity log
    const ticket = await db.supportTicket.create({
      data: {
        ticketNumber,
        customerId,
        subject,
        description,
        category: category || 'GENERAL',
        priority: priority || 'NORMAL',
        status: 'OPEN',
        source: source || 'APP',
        chatbotSessionId,
        activities: {
          create: {
            action: 'CREATED',
            description: `Ticket created via ${source || 'APP'}`,
            performedBy: customerId,
          },
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        activities: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: ticket,
      message: 'Ticket created successfully',
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}

// PUT - Update ticket
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, status, priority, assignedToId, performedBy, performedByRole } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: 'ticketId is required' },
        { status: 400 }
      );
    }

    // Get current ticket state
    const currentTicket = await db.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!currentTicket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};
    const activities: any[] = [];

    // Track status change
    if (status && status !== currentTicket.status) {
      updateData.status = status;
      
      // Track timestamps for status changes
      if (status === 'RESOLVED') {
        updateData.resolvedAt = new Date();
      } else if (status === 'CLOSED') {
        updateData.closedAt = new Date();
      }

      activities.push({
        ticketId,
        action: 'STATUS_CHANGED',
        description: `Status changed from ${currentTicket.status} to ${status}`,
        performedBy,
        metadata: JSON.stringify({
          oldValue: currentTicket.status,
          newValue: status,
        }),
      });
    }

    // Track priority change
    if (priority && priority !== currentTicket.priority) {
      updateData.priority = priority;
      activities.push({
        ticketId,
        action: 'PRIORITY_CHANGED',
        description: `Priority changed from ${currentTicket.priority} to ${priority}`,
        performedBy,
        metadata: JSON.stringify({
          oldValue: currentTicket.priority,
          newValue: priority,
        }),
      });
    }

    // Track assignment change
    if (assignedToId !== undefined && assignedToId !== currentTicket.assignedToId) {
      updateData.assignedToId = assignedToId;
      
      // Get assignee name for activity log
      let assigneeName = 'Unassigned';
      if (assignedToId) {
        const assignee = await db.user.findUnique({
          where: { id: assignedToId },
          select: { name: true },
        });
        assigneeName = assignee?.name || assignedToId;
      }

      activities.push({
        ticketId,
        action: 'ASSIGNED',
        description: assignedToId ? `Ticket assigned to ${assigneeName}` : 'Ticket unassigned',
        performedBy,
        metadata: JSON.stringify({
          oldAssignedToId: currentTicket.assignedToId,
          newAssignedToId: assignedToId,
        }),
      });

      // Set first response time if this is the first assignment
      if (!currentTicket.firstResponseAt && assignedToId) {
        updateData.firstResponseAt = new Date();
      }
    }

    // Update ticket and create activity logs
    const [updatedTicket] = await db.$transaction([
      db.supportTicket.update({
        where: { id: ticketId },
        data: updateData,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      ...activities.map(activity => 
        db.ticketActivity.create({ data: activity })
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: updatedTicket,
      message: 'Ticket updated successfully',
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
