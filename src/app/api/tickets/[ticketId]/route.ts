import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get single ticket with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;

    const ticket = await db.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profilePicture: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            profilePicture: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        activities: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 20,
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Mark unread messages as read if requester is not the sender
    // This would typically be done based on the requester's role
    // For now, we'll just return the ticket data

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

// PUT - Update ticket details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const body = await request.json();
    const { 
      subject, 
      description, 
      category, 
      priority, 
      status, 
      assignedToId,
      rating,
      feedback,
      performedBy,
    } = body;

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

    // Build update data and activities
    const updateData: any = {};
    const activities: any[] = [];

    // Track subject change
    if (subject && subject !== currentTicket.subject) {
      updateData.subject = subject;
    }

    // Track description change
    if (description && description !== currentTicket.description) {
      updateData.description = description;
    }

    // Track category change
    if (category && category !== currentTicket.category) {
      updateData.category = category;
      activities.push({
        ticketId,
        action: 'CATEGORY_CHANGED',
        description: `Category changed from ${currentTicket.category} to ${category}`,
        performedBy,
        metadata: JSON.stringify({
          oldValue: currentTicket.category,
          newValue: category,
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

    // Track status change
    if (status && status !== currentTicket.status) {
      updateData.status = status;
      
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

    // Track assignment change
    if (assignedToId !== undefined && assignedToId !== currentTicket.assignedToId) {
      updateData.assignedToId = assignedToId;
      
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

      if (!currentTicket.firstResponseAt && assignedToId) {
        updateData.firstResponseAt = new Date();
      }
    }

    // Handle satisfaction rating
    if (rating !== undefined) {
      updateData.rating = rating;
    }

    if (feedback !== undefined) {
      updateData.feedback = feedback;
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
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 10,
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

// DELETE — Permanently delete a ticket and all its messages/activities
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;

    const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Delete child records first
    await db.$transaction([
      db.ticketMessage.deleteMany({ where: { ticketId } }),
      db.ticketActivity.deleteMany({ where: { ticketId } }),
      db.supportTicket.delete({ where: { id: ticketId } }),
    ]);

    return NextResponse.json({ success: true, message: 'Ticket deleted permanently' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
  }
}
