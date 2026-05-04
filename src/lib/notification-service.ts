/**
 * Notification Service - Comprehensive In-App Notification System
 * 
 * This service handles all notification operations:
 * - Create notifications (manual & automated)
 * - Send to individual users, roles, or segments
 * - Manage templates
 * - Track delivery and read status
 * - Push notifications via FCM
 */

import { db } from '@/lib/db';
import { sendPushNotificationToUser, sendPushNotificationToRole } from './push-notification-service';
import { emitNotification, emitToUser } from './socket-emit';

// ==================== TYPES ====================

export type NotificationCategory = 'EMI' | 'LOAN' | 'PAYMENT' | 'SYSTEM' | 'CREDIT';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type NotificationType = 
  | 'EMI_REMINDER' 
  | 'EMI_OVERDUE' 
  | 'EMI_PAYMENT_SUCCESS'
  | 'LOAN_SUBMITTED'
  | 'LOAN_APPROVED' 
  | 'LOAN_REJECTED' 
  | 'LOAN_DISBURSED'
  | 'LOAN_STATUS_UPDATE'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'CREDIT_LOW'
  | 'CREDIT_ADDED'
  | 'CREDIT_SETTLEMENT'
  | 'SYSTEM_ANNOUNCEMENT'
  | 'GENERAL';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: Record<string, any>;
  actionUrl?: string;
  actionText?: string;
  templateId?: string;
}

export interface NotificationTemplateData {
  code: string;
  name: string;
  category: NotificationCategory;
  title: string;
  message: string;
  variables?: string[];
  isSystem?: boolean;
}

// ==================== CORE NOTIFICATION FUNCTIONS ====================

/**
 * Create a single notification (in-app + push)
 */
export async function createNotification(data: CreateNotificationData) {
  try {
    const notification = await db.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        category: data.category,
        title: data.title,
        message: data.message,
        priority: data.priority || 'NORMAL',
        data: data.data ? JSON.stringify(data.data) : null,
        actionUrl: data.actionUrl,
        actionText: data.actionText,
        templateId: data.templateId,
      },
    });

    // ── Instant WebSocket push (no polling needed) ─────────────────────────
    emitNotification(data.userId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      category: notification.category,
      priority: notification.priority,
      actionUrl: notification.actionUrl,
      createdAt: notification.createdAt,
    });
    // Also trigger dashboard refresh for the user
    emitToUser(data.userId, 'dashboard:refresh');
    // ──────────────────────────────────────────────────────────────────────

    // Push notification: fire-and-forget (non-blocking)
    // Previously awaited — this caused 200-500ms delay per notification
    sendPushNotificationToUser({
      userId: data.userId,
      title: data.title,
      body: data.message,
      actionUrl: data.actionUrl,
      data: data.data,
    }).catch(() => { /* non-critical — push fails silently */ });

    // Auto-cleanup: if user has >150 notifications, delete oldest read ones in background
    // Prevents table growing to 500k+ rows over months
    db.notification.count({ where: { userId: data.userId } }).then(count => {
      if (count > 150) {
        db.notification.findMany({
          where: { userId: data.userId, isRead: true },
          orderBy: { createdAt: 'asc' },
          take: 50,
          select: { id: true },
        }).then(old => {
          if (old.length > 0) {
            db.notification.deleteMany({
              where: { id: { in: old.map(n => n.id) } },
            }).catch(() => { /* non-critical */ });
          }
        }).catch(() => { /* non-critical */ });
      }
    }).catch(() => { /* non-critical */ });

    return { success: true, notification };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: 'Failed to create notification' };
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationsForUsers(
  userIds: string[],
  data: Omit<CreateNotificationData, 'userId'>
) {
  try {
    const notifications = await db.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type: data.type,
        category: data.category,
        title: data.title,
        message: data.message,
        priority: data.priority || 'NORMAL',
        data: data.data ? JSON.stringify(data.data) : null,
        actionUrl: data.actionUrl,
        actionText: data.actionText,
        templateId: data.templateId,
      })),
    });
    return { success: true, count: notifications.count };
  } catch (error) {
    console.error('Error creating notifications:', error);
    return { success: false, error: 'Failed to create notifications' };
  }
}

/**
 * Get user notifications
 */
export async function getUserNotifications(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    category?: NotificationCategory;
  }
) {
  try {
    const where: any = { userId };
    if (options?.unreadOnly) where.isRead = false;
    if (options?.category) where.category = options.category;

    const [notifications, unreadCount, totalCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      db.notification.count({ where: { userId, isRead: false } }),
      db.notification.count({ where: { userId } }),
    ]);

    return {
      success: true,
      notifications,
      unreadCount,
      totalCount,
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { success: false, error: 'Failed to fetch notifications' };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const notification = await db.notification.update({
      where: { id: notificationId },
      data: { 
        isRead: true, 
        readAt: new Date() 
      },
    });
    return { success: true, notification };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: 'Failed to mark notification as read' };
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const result = await db.notification.updateMany({
      where: { userId, isRead: false },
      data: { 
        isRead: true, 
        readAt: new Date() 
      },
    });
    return { success: true, count: result.count };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: 'Failed to mark all notifications as read' };
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string) {
  try {
    await db.notification.delete({
      where: { id: notificationId },
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { success: false, error: 'Failed to delete notification' };
  }
}

/**
 * Delete all read notifications for a user
 */
export async function deleteReadNotifications(userId: string) {
  try {
    const result = await db.notification.deleteMany({
      where: { userId, isRead: true },
    });
    return { success: true, count: result.count };
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    return { success: false, error: 'Failed to delete read notifications' };
  }
}

// ==================== RECIPIENT HELPERS ====================

/**
 * Get user IDs by role
 */
export async function getUserIdsByRole(role: string) {
  const users = await db.user.findMany({
    where: { role: role as any, isActive: true },
    select: { id: true },
  });
  return users.map(u => u.id);
}

/**
 * Get user IDs by condition
 */
export async function getUserIdsByCondition(condition: {
  hasActiveLoans?: boolean;
  hasOverdueEMI?: boolean;
  companyId?: string;
  agentId?: string;
  creditBelow?: number;
}) {
  const where: any = { isActive: true };
  
  if (condition.companyId) where.companyId = condition.companyId;
  if (condition.agentId) where.agentId = condition.agentId;
  
  if (condition.hasActiveLoans) {
    where.loanApplications = {
      some: { status: { in: ['ACTIVE', 'DISBURSED'] } }
    };
  }
  
  if (condition.creditBelow !== undefined) {
    where.OR = [
      { companyCredit: { lt: condition.creditBelow } },
      { personalCredit: { lt: condition.creditBelow } }
    ];
  }
  
  const users = await db.user.findMany({
    where,
    select: { id: true },
  });
  
  return users.map(u => u.id);
}

/**
 * Get customers with overdue EMIs
 */
export async function getCustomersWithOverdueEMI() {
  const overdueEMIs = await db.eMISchedule.findMany({
    where: {
      paymentStatus: { in: ['OVERDUE', 'PARTIALLY_PAID'] },
      dueDate: { lt: new Date() },
    },
    select: { loanApplication: { select: { customerId: true } } },
  });
  
  return [...new Set(overdueEMIs.map(e => e.loanApplication.customerId))];
}

// ==================== TEMPLATE FUNCTIONS ====================

/**
 * Create notification template
 */
export async function createTemplate(data: NotificationTemplateData) {
  try {
    const template = await db.notificationTemplate.create({
      data: {
        code: data.code,
        name: data.name,
        category: data.category,
        title: data.title,
        message: data.message,
        variables: data.variables ? JSON.stringify(data.variables) : null,
        isSystem: data.isSystem || false,
      },
    });
    return { success: true, template };
  } catch (error) {
    console.error('Error creating template:', error);
    return { success: false, error: 'Failed to create template' };
  }
}

/**
 * Get all templates
 */
export async function getTemplates(options?: { category?: NotificationCategory; activeOnly?: boolean }) {
  try {
    const where: any = {};
    if (options?.category) where.category = options.category;
    if (options?.activeOnly) where.isActive = true;

    const templates = await db.notificationTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return { success: true, templates };
  } catch (error) {
    console.error('Error fetching templates:', error);
    return { success: false, error: 'Failed to fetch templates' };
  }
}

/**
 * Update template
 */
export async function updateTemplate(id: string, data: Partial<NotificationTemplateData>) {
  try {
    const template = await db.notificationTemplate.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.name && { name: data.name }),
        ...(data.category && { category: data.category }),
        ...(data.title && { title: data.title }),
        ...(data.message && { message: data.message }),
        ...(data.variables && { variables: JSON.stringify(data.variables) }),
      },
    });
    return { success: true, template };
  } catch (error) {
    console.error('Error updating template:', error);
    return { success: false, error: 'Failed to update template' };
  }
}

/**
 * Delete template (only if not system template)
 */
export async function deleteTemplate(id: string) {
  try {
    const template = await db.notificationTemplate.findUnique({
      where: { id },
    });
    
    if (template?.isSystem) {
      return { success: false, error: 'Cannot delete system template' };
    }
    
    await db.notificationTemplate.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting template:', error);
    return { success: false, error: 'Failed to delete template' };
  }
}

/**
 * Process template with variables
 */
export function processTemplate(template: { title: string; message: string }, variables: Record<string, any>) {
  let title = template.title;
  let message = template.message;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    title = title.replace(regex, String(value));
    message = message.replace(regex, String(value));
  }
  
  return { title, message };
}

// ==================== AUTOMATED NOTIFICATION HELPERS ====================

/**
 * Send EMI reminder notification
 */
export async function sendEMIReminderNotification(
  userId: string,
  emiData: {
    emiAmount: number;
    dueDate: Date;
    loanId: string;
    applicationNo: string;
  }
) {
  return createNotification({
    userId,
    type: 'EMI_REMINDER',
    category: 'EMI',
    priority: 'HIGH',
    title: 'EMI Reminder',
    message: `Your EMI of ₹${emiData.emiAmount.toLocaleString()} is due on ${emiData.dueDate.toLocaleDateString()}. Please make the payment to avoid late fees.`,
    data: { loanId: emiData.loanId, emiAmount: emiData.emiAmount },
    actionUrl: `/customer/loan/${emiData.loanId}`,
    actionText: 'Pay Now',
  });
}

/**
 * Send loan status notification
 */
export async function sendLoanStatusNotification(
  userId: string,
  loanData: {
    status: string;
    applicationNo: string;
    loanId: string;
    amount?: number;
    message?: string;
  }
) {
  const statusMessages: Record<string, { title: string; message: string }> = {
    SA_APPROVED: {
      title: 'Application In Progress',
      message: `Your loan application ${loanData.applicationNo} is being processed.`,
    },
    COMPANY_APPROVED: {
      title: 'Application Approved',
      message: `Your loan application ${loanData.applicationNo} has been approved by the company.`,
    },
    AGENT_APPROVED_STAGE1: {
      title: 'Application Processing',
      message: `Your loan application ${loanData.applicationNo} is being processed.`,
    },
    FINAL_APPROVED: {
      title: 'Loan Approved!',
      message: `Congratulations! Your loan application ${loanData.applicationNo} has been fully approved.`,
    },
    DISBURSED: {
      title: 'Loan Disbursed!',
      message: `₹${loanData.amount?.toLocaleString() || 'N/A'} has been disbursed to your bank account for loan ${loanData.applicationNo}.`,
    },
    REJECTED_BY_SA: {
      title: 'Application Update',
      message: loanData.message || `Your loan application ${loanData.applicationNo} was not approved.`,
    },
    REJECTED_BY_COMPANY: {
      title: 'Application Update',
      message: loanData.message || `Your loan application ${loanData.applicationNo} was not approved.`,
    },
  };

  const statusInfo = statusMessages[loanData.status] || {
    title: 'Application Status Update',
    message: `Your loan application ${loanData.applicationNo} status has been updated.`,
  };

  return createNotification({
    userId,
    type: 'LOAN_STATUS_UPDATE',
    category: 'LOAN',
    priority: loanData.status === 'DISBURSED' ? 'CRITICAL' : 'HIGH',
    title: statusInfo.title,
    message: statusInfo.message,
    data: { loanId: loanData.loanId, status: loanData.status },
    actionUrl: `/customer/loan/${loanData.loanId}`,
    actionText: 'View Details',
  });
}

/**
 * Send payment confirmation notification
 */
export async function sendPaymentConfirmationNotification(
  userId: string,
  paymentData: {
    amount: number;
    paymentId: string;
    loanId: string;
    applicationNo: string;
  }
) {
  return createNotification({
    userId,
    type: 'PAYMENT_RECEIVED',
    category: 'PAYMENT',
    priority: 'HIGH',
    title: 'Payment Received',
    message: `Your payment of ₹${paymentData.amount.toLocaleString()} for loan ${paymentData.applicationNo} has been received successfully.`,
    data: { paymentId: paymentData.paymentId, loanId: paymentData.loanId },
    actionUrl: `/customer/loan/${paymentData.loanId}`,
    actionText: 'View Receipt',
  });
}

/**
 * Send credit notification
 */
export async function sendCreditNotification(
  userId: string,
  creditData: {
    type: 'LOW' | 'ADDED' | 'SETTLEMENT';
    amount?: number;
    threshold?: number;
  }
) {
  const notifications = {
    LOW: {
      title: 'Credit Low',
      message: `Your credit is running low. Please add funds to continue operations smoothly.`,
    },
    ADDED: {
      title: 'Credit Added',
      message: `₹${creditData.amount?.toLocaleString()} has been added to your credit balance.`,
    },
    SETTLEMENT: {
      title: 'Credit Settlement',
      message: `Your credit settlement of ₹${creditData.amount?.toLocaleString()} has been processed.`,
    },
  };

  const info = notifications[creditData.type];

  return createNotification({
    userId,
    type: creditData.type === 'LOW' ? 'CREDIT_LOW' : 
          creditData.type === 'ADDED' ? 'CREDIT_ADDED' : 'CREDIT_SETTLEMENT',
    category: 'CREDIT',
    priority: creditData.type === 'LOW' ? 'HIGH' : 'NORMAL',
    title: info.title,
    message: info.message,
  });
}

// ==================== SYSTEM INITIALIZATION ====================

/**
 * Initialize default notification templates
 */
export async function initializeDefaultTemplates() {
  const defaultTemplates: NotificationTemplateData[] = [
    // EMI Templates
    {
      code: 'EMI_DUE_TOMORROW',
      name: 'EMI Due Tomorrow',
      category: 'EMI',
      title: 'EMI Reminder - Due Tomorrow',
      message: 'Dear {{customer_name}}, your EMI of ₹{{emi_amount}} for loan {{application_no}} is due tomorrow ({{due_date}}). Please ensure sufficient balance in your account.',
      variables: ['customer_name', 'emi_amount', 'application_no', 'due_date'],
      isSystem: true,
    },
    {
      code: 'EMI_DUE_TODAY',
      name: 'EMI Due Today',
      category: 'EMI',
      title: 'EMI Due Today',
      message: 'Dear {{customer_name}}, your EMI of ₹{{emi_amount}} for loan {{application_no}} is due TODAY. Please make the payment to avoid late fees.',
      variables: ['customer_name', 'emi_amount', 'application_no'],
      isSystem: true,
    },
    {
      code: 'EMI_OVERDUE',
      name: 'EMI Overdue',
      category: 'EMI',
      title: 'EMI Overdue - Immediate Action Required',
      message: 'Dear {{customer_name}}, your EMI of ₹{{emi_amount}} for loan {{application_no}} is overdue by {{days_overdue}} days. Please pay immediately to avoid additional charges.',
      variables: ['customer_name', 'emi_amount', 'application_no', 'days_overdue'],
      isSystem: true,
    },
    // Loan Templates
    {
      code: 'LOAN_APPROVED',
      name: 'Loan Approved',
      category: 'LOAN',
      title: 'Congratulations! Loan Approved',
      message: 'Dear {{customer_name}}, your loan application {{application_no}} for ₹{{loan_amount}} has been approved! The amount will be disbursed shortly.',
      variables: ['customer_name', 'application_no', 'loan_amount'],
      isSystem: true,
    },
    {
      code: 'LOAN_REJECTED',
      name: 'Loan Rejected',
      category: 'LOAN',
      title: 'Loan Application Update',
      message: 'Dear {{customer_name}}, we regret to inform you that your loan application {{application_no}} could not be approved at this time. {{rejection_reason}}',
      variables: ['customer_name', 'application_no', 'rejection_reason'],
      isSystem: true,
    },
    {
      code: 'LOAN_DISBURSED',
      name: 'Loan Disbursed',
      category: 'LOAN',
      title: 'Loan Disbursed Successfully',
      message: 'Dear {{customer_name}}, ₹{{loan_amount}} has been disbursed to your bank account for loan {{application_no}}. Your first EMI of ₹{{emi_amount}} is due on {{first_emi_date}}.',
      variables: ['customer_name', 'loan_amount', 'application_no', 'emi_amount', 'first_emi_date'],
      isSystem: true,
    },
    // Payment Templates
    {
      code: 'PAYMENT_SUCCESS',
      name: 'Payment Success',
      category: 'PAYMENT',
      title: 'Payment Received',
      message: 'Dear {{customer_name}}, we have received your payment of ₹{{amount}} for loan {{application_no}}. Thank you for your payment!',
      variables: ['customer_name', 'amount', 'application_no'],
      isSystem: true,
    },
    {
      code: 'PAYMENT_FAILED',
      name: 'Payment Failed',
      category: 'PAYMENT',
      title: 'Payment Failed',
      message: 'Dear {{customer_name}}, your payment of ₹{{amount}} for loan {{application_no}} could not be processed. Please try again.',
      variables: ['customer_name', 'amount', 'application_no'],
      isSystem: true,
    },
    // Credit Templates
    {
      code: 'CREDIT_LOW',
      name: 'Credit Low Alert',
      category: 'CREDIT',
      title: 'Credit Balance Low',
      message: 'Dear {{user_name}}, your credit balance is running low (₹{{current_credit}}). Please add funds to continue operations.',
      variables: ['user_name', 'current_credit'],
      isSystem: true,
    },
    {
      code: 'CREDIT_ADDED',
      name: 'Credit Added',
      category: 'CREDIT',
      title: 'Credit Added Successfully',
      message: 'Dear {{user_name}}, ₹{{amount}} has been added to your credit balance. Current balance: ₹{{current_credit}}',
      variables: ['user_name', 'amount', 'current_credit'],
      isSystem: true,
    },
    // System Templates
    {
      code: 'SYSTEM_ANNOUNCEMENT',
      name: 'System Announcement',
      category: 'SYSTEM',
      title: '{{title}}',
      message: '{{message}}',
      variables: ['title', 'message'],
      isSystem: true,
    },
  ];

  let created = 0;
  for (const template of defaultTemplates) {
    const existing = await db.notificationTemplate.findUnique({
      where: { code: template.code },
    });
    
    if (!existing) {
      await createTemplate(template);
      created++;
    }
  }
  
  return { success: true, created, total: defaultTemplates.length };
}

// Export a default object with all functions
const notificationService = {
  createNotification,
  createNotificationsForUsers,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteReadNotifications,
  getUserIdsByRole,
  getUserIdsByCondition,
  getCustomersWithOverdueEMI,
  createTemplate,
  getTemplates,
  updateTemplate,
  deleteTemplate,
  processTemplate,
  sendEMIReminderNotification,
  sendLoanStatusNotification,
  sendPaymentConfirmationNotification,
  sendCreditNotification,
  initializeDefaultTemplates,
};

export default notificationService;
