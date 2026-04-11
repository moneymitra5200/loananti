import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import NotificationService from '@/lib/notification-service';

// ==================== GET NOTIFICATIONS ====================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Initialize default templates
    if (action === 'init-templates') {
      const result = await NotificationService.initializeDefaultTemplates();
      return NextResponse.json(result);
    }

    // Get templates
    if (action === 'templates') {
      const category = searchParams.get('category') as any;
      const result = await NotificationService.getTemplates({
        category: category || undefined,
        activeOnly: searchParams.get('activeOnly') === 'true',
      });
      return NextResponse.json(result);
    }

    // Get single template
    if (action === 'template') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
      }
      const template = await db.notificationTemplate.findUnique({
        where: { id },
      });
      return NextResponse.json({ success: true, template });
    }

    // Get recipient counts for different segments
    if (action === 'recipient-counts') {
      const [
        totalUsers,
        customers,
        agents,
        staff,
        companies,
        cashiers,
        customersWithActiveLoans,
        customersWithOverdueEMI,
      ] = await Promise.all([
        db.user.count({ where: { isActive: true } }),
        db.user.count({ where: { isActive: true, role: 'CUSTOMER' } }),
        db.user.count({ where: { isActive: true, role: 'AGENT' } }),
        db.user.count({ where: { isActive: true, role: 'STAFF' } }),
        db.user.count({ where: { isActive: true, role: 'COMPANY' } }),
        db.user.count({ where: { isActive: true, role: 'CASHIER' } }),
        db.user.count({
          where: {
            isActive: true,
            role: 'CUSTOMER',
            loanApplications: { some: { status: { in: ['ACTIVE', 'DISBURSED'] } } },
          },
        }),
        db.eMISchedule.count({
          where: {
            paymentStatus: { in: ['OVERDUE', 'PARTIALLY_PAID'] },
            dueDate: { lt: new Date() },
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        counts: {
          totalUsers,
          customers,
          agents,
          staff,
          companies,
          cashiers,
          customersWithActiveLoans,
          customersWithOverdueEMI,
        },
      });
    }

    // Get users by role for recipient selection
    if (action === 'users-by-role') {
      const role = searchParams.get('role') as any;
      if (!role) {
        return NextResponse.json({ error: 'Role required' }, { status: 400 });
      }

      const users = await db.user.findMany({
        where: { isActive: true, role: role as any },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({ success: true, users });
    }

    // Get user notifications (default)
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const category = searchParams.get('category') as any;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const result = await NotificationService.getUserNotifications(userId, {
      limit,
      offset,
      unreadOnly,
      category: category || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Notification GET error:', error);
    return NextResponse.json({ 
      error: 'Failed to process request', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// ==================== CREATE NOTIFICATION ====================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Auth guard for admin-only send actions ─────────────────────────────
    const adminOnlyActions = ['from-template', 'send-to-role', 'send-to-segment', 'send-to-users'];
    if (adminOnlyActions.includes(action)) {
      const session = await getServerSession();
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const sessionUser = await db.user.findUnique({
        where: { email: session.user.email! },
        select: { role: true },
      });
      const allowedRoles = ['SUPER_ADMIN', 'STAFF'];
      if (!sessionUser || !allowedRoles.includes(sessionUser.role)) {
        return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    // Create notification from template
    if (action === 'from-template') {
      const { templateId, userId, variables, actionUrl, actionText } = body;

      if (!templateId || !userId) {
        return NextResponse.json(
          { error: 'Template ID and User ID are required' },
          { status: 400 }
        );
      }

      const template = await db.notificationTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      const { title, message } = NotificationService.processTemplate(template, variables);

      const result = await NotificationService.createNotification({
        userId,
        type: template.code as any,
        category: template.category as any,
        title,
        message,
        templateId,
        actionUrl,
        actionText,
      });

      return NextResponse.json(result);
    }

    // Send to role (all users with specific role)
    if (action === 'send-to-role') {
      const { role, title, message, priority, actionUrl, actionText } = body;

      if (!role || !title || !message) {
        return NextResponse.json(
          { error: 'Role, title, and message are required' },
          { status: 400 }
        );
      }

      const userIds = await NotificationService.getUserIdsByRole(role);

      if (userIds.length === 0) {
        return NextResponse.json({ error: 'No users found with this role' }, { status: 400 });
      }

      const result = await NotificationService.createNotificationsForUsers(userIds, {
        type: 'GENERAL',
        category: 'SYSTEM',
        title,
        message,
        priority: priority || 'NORMAL',
        actionUrl,
        actionText,
      });

      return NextResponse.json({
        success: true,
        sentCount: result.count,
        totalUsers: userIds.length,
      });
    }

    // Send to segment (users matching condition)
    if (action === 'send-to-segment') {
      const { segment, title, message, priority, actionUrl, actionText } = body;

      if (!segment || !title || !message) {
        return NextResponse.json(
          { error: 'Segment, title, and message are required' },
          { status: 400 }
        );
      }

      let userIds: string[] = [];

      switch (segment) {
        case 'ACTIVE_LOANS':
          userIds = await NotificationService.getUserIdsByCondition({ hasActiveLoans: true });
          break;
        case 'OVERDUE_EMI':
          userIds = await NotificationService.getCustomersWithOverdueEMI();
          break;
        case 'CREDIT_LOW':
          userIds = await NotificationService.getUserIdsByCondition({ creditBelow: 1000 });
          break;
        default:
          return NextResponse.json({ error: 'Invalid segment' }, { status: 400 });
      }

      if (userIds.length === 0) {
        return NextResponse.json({ error: 'No users found in this segment' }, { status: 400 });
      }

      const result = await NotificationService.createNotificationsForUsers(userIds, {
        type: 'GENERAL',
        category: 'SYSTEM',
        title,
        message,
        priority: priority || 'NORMAL',
        actionUrl,
        actionText,
      });

      return NextResponse.json({
        success: true,
        sentCount: result.count,
        totalUsers: userIds.length,
      });
    }

    // Send to specific users
    if (action === 'send-to-users') {
      const { userIds, title, message, priority, actionUrl, actionText } = body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 });
      }

      if (!title || !message) {
        return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
      }

      const result = await NotificationService.createNotificationsForUsers(userIds, {
        type: 'GENERAL',
        category: 'SYSTEM',
        title,
        message,
        priority: priority || 'NORMAL',
        actionUrl,
        actionText,
      });

      return NextResponse.json({
        success: true,
        sentCount: result.count,
        totalUsers: userIds.length,
      });
    }

    // Create single notification (default)
    const { userId, type, category, title, message, priority, data, actionUrl, actionText } = body;

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: 'User ID, title, and message are required' },
        { status: 400 }
      );
    }

    const result = await NotificationService.createNotification({
      userId,
      type: type || 'GENERAL',
      category: category || 'SYSTEM',
      title,
      message,
      priority: priority || 'NORMAL',
      data,
      actionUrl,
      actionText,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Notification POST error:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// ==================== UPDATE NOTIFICATION ====================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Update template
    if (action === 'update-template') {
      const { id, ...data } = body;

      if (!id) {
        return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
      }

      const result = await NotificationService.updateTemplate(id, data);
      return NextResponse.json(result);
    }

    // Toggle template active status
    if (action === 'toggle-template') {
      const { id, isActive } = body;

      if (!id) {
        return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
      }

      const template = await db.notificationTemplate.update({
        where: { id },
        data: { isActive },
      });

      return NextResponse.json({ success: true, template });
    }

    // Mark notification as read (default)
    const { id, isRead, markAllRead, userId } = body;

    if (markAllRead && userId) {
      const result = await NotificationService.markAllNotificationsAsRead(userId);
      return NextResponse.json(result);
    }

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const result = await NotificationService.markNotificationAsRead(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Notification PUT error:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// ==================== DELETE NOTIFICATION ====================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Delete template
    if (action === 'template') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
      }

      const result = await NotificationService.deleteTemplate(id);
      return NextResponse.json(result);
    }

    // Delete all read notifications for user
    if (action === 'read') {
      const userId = searchParams.get('userId');
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const result = await NotificationService.deleteReadNotifications(userId);
      return NextResponse.json(result);
    }

    // Delete single notification (default)
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const result = await NotificationService.deleteNotification(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Notification DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
