/**
 * Push Notification Service - Server-side push notification functions
 * Combines in-app notifications with FCM push notifications
 */

import { db } from '@/lib/db';
import { sendPushNotification, sendPushNotificationToMany } from '@/lib/firebase-admin';

export interface PushNotificationData {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, string>;
  actionUrl?: string;
}

export interface PushNotificationResult {
  success: boolean;
  inAppNotificationId?: string;
  pushSuccess?: boolean;
  pushError?: string;
  error?: string;
}

/**
 * Send push notification to a specific user
 * This creates both in-app notification AND sends push notification
 */
export async function sendPushNotificationToUser(data: PushNotificationData): Promise<PushNotificationResult> {
  try {
    // Get user's FCM token
    const user = await db.user.findUnique({
      where: { id: data.userId },
      select: { fcmToken: true, notificationEnabled: true },
    });

    let pushSuccess = false;
    let pushError: string | undefined;

    // ── Always create an in-app notification (bell panel) ──────────────────
    let inAppNotificationId: string | undefined;
    try {
      const inApp = await db.notification.create({
        data: {
          userId: data.userId,
          type: 'GENERAL',
          category: 'SYSTEM',
          title: data.title,
          message: data.body,
          actionUrl: data.actionUrl,
          data: data.data ? JSON.stringify(data.data) : null,
          priority: 'NORMAL',
        },
      });
      inAppNotificationId = inApp.id;
    } catch (inAppErr) {
      console.error('[Push Notification Service] Failed to create in-app notification:', inAppErr);
    }

    // ── Send FCM push if user has token and notifications enabled ──────────
    if (user?.fcmToken && user.notificationEnabled !== false) {
      const pushResult = await sendPushNotification(user.fcmToken, {
        title: data.title,
        body: data.body,
        icon: data.icon,
        image: data.image,
      }, {
        ...data.data,
        actionUrl: data.actionUrl || '/',
      });

      pushSuccess = pushResult.success;
      if (!pushResult.success) {
        pushError = pushResult.error;
        // If token is invalid, clear it so we don't keep trying
        if (pushError?.includes('registration-token-not-registered')) {
          await db.user.update({
            where: { id: data.userId },
            data: { fcmToken: null },
          });
        }
      }
    }

    return {
      success: true,
      inAppNotificationId,
      pushSuccess,
      pushError,
    };
  } catch (error: any) {
    console.error('[Push Notification Service] Error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}


/**
 * Send push notification to multiple users by role
 */
export async function sendPushNotificationToRole(
  role: string,
  notification: {
    title: string;
    body: string;
    icon?: string;
    image?: string;
    data?: Record<string, string>;
    actionUrl?: string;
  }
): Promise<{ success: boolean; totalSent: number; pushSent: number; errors: string[] }> {
  try {
    // ONE query: get all active users with this role — then split in JS
    // (was 2 queries before → halves DB load per notification)
    const allUsersWithRole = await db.user.findMany({
      where: { role: role as any, isActive: true },
      select: { id: true, fcmToken: true, notificationEnabled: true },
    });

    // Split: those with FCM tokens (can receive push) vs all (get in-app bell)
    const usersWithFcm = allUsersWithRole.filter(
      u => u.fcmToken && u.notificationEnabled !== false
    );

    const errors: string[] = [];

    // Batch create in-app notifications for ALL users with this role
    if (allUsersWithRole.length > 0) {
      await db.notification.createMany({
        data: allUsersWithRole.map(u => ({
          userId: u.id,
          type: 'GENERAL',
          category: 'SYSTEM',
          title: notification.title,
          message: notification.body,
          actionUrl: notification.actionUrl,
          data: notification.data ? JSON.stringify(notification.data) : null,
          priority: 'NORMAL',
        })),
      });
    }

    // Send FCM push to users who have tokens
    let pushSent = 0;
    if (usersWithFcm.length > 0) {
      const tokens = usersWithFcm.map(u => u.fcmToken).filter(Boolean) as string[];
      const pushResult = await sendPushNotificationToMany(tokens, {
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        image: notification.image,
      }, {
        ...notification.data,
        actionUrl: notification.actionUrl || '/',
      });

      pushSent = pushResult.successCount;
      if (pushResult.errors) {
        errors.push(...pushResult.errors);
      }
    }

    return {
      success: true,
      totalSent: allUsersWithRole.length,
      pushSent,
      errors,
    };
  } catch (error: any) {
    console.error('[Push Notification Service] Error sending to role:', error);
    return {
      success: false,
      totalSent: 0,
      pushSent: 0,
      errors: [error.message],
    };
  }
}

/**
 * Save FCM token for a user
 */
export async function saveUserFCMToken(userId: string, fcmToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.user.update({
      where: { id: userId },
      data: { fcmToken, notificationEnabled: true },
    });
    return { success: true };
  } catch (error: any) {
    console.error('[Push Notification Service] Error saving FCM token:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove FCM token for a user (on logout)
 */
export async function removeUserFCMToken(userId: string): Promise<{ success: boolean }> {
  try {
    await db.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });
    return { success: true };
  } catch (error) {
    console.error('[Push Notification Service] Error removing FCM token:', error);
    return { success: false };
  }
}

/**
 * Send EMI reminder push notification to specific customer
 */
export async function sendEMIReminderPush(
  userId: string,
  emiData: {
    emiAmount: number;
    dueDate: Date;
    loanId: string;
    applicationNo: string;
  }
): Promise<PushNotificationResult> {
  return sendPushNotificationToUser({
    userId,
    title: 'EMI Reminder',
    body: `Your EMI of ₹${emiData.emiAmount.toLocaleString()} is due on ${emiData.dueDate.toLocaleDateString()}. Please make the payment to avoid late fees.`,
    data: {
      loanId: emiData.loanId,
      type: 'EMI_REMINDER',
      emiAmount: emiData.emiAmount.toString(),
    },
    actionUrl: `/customer/loan/${emiData.loanId}`,
  });
}

/**
 * Send loan status push notification to specific customer
 */
export async function sendLoanStatusPush(
  userId: string,
  loanData: {
    status: string;
    applicationNo: string;
    loanId: string;
    amount?: number;
  }
): Promise<PushNotificationResult> {
  const statusTitles: Record<string, string> = {
    DISBURSED: 'Loan Disbursed!',
    FINAL_APPROVED: 'Loan Approved!',
    REJECTED_BY_SA: 'Application Update',
    REJECTED_BY_COMPANY: 'Application Update',
  };

  const statusBodies: Record<string, string> = {
    DISBURSED: `₹${loanData.amount?.toLocaleString() || 'N/A'} has been disbursed to your account for loan ${loanData.applicationNo}.`,
    FINAL_APPROVED: `Congratulations! Your loan application ${loanData.applicationNo} has been approved.`,
    REJECTED_BY_SA: `Your loan application ${loanData.applicationNo} was not approved.`,
    REJECTED_BY_COMPANY: `Your loan application ${loanData.applicationNo} was not approved.`,
  };

  return sendPushNotificationToUser({
    userId,
    title: statusTitles[loanData.status] || 'Loan Status Update',
    body: statusBodies[loanData.status] || `Your loan application ${loanData.applicationNo} status: ${loanData.status}`,
    data: {
      loanId: loanData.loanId,
      status: loanData.status,
      type: 'LOAN_STATUS',
    },
    actionUrl: `/customer/loan/${loanData.loanId}`,
  });
}

/**
 * Send payment confirmation push notification
 */
export async function sendPaymentConfirmationPush(
  userId: string,
  paymentData: {
    amount: number;
    paymentId: string;
    loanId: string;
    applicationNo: string;
  }
): Promise<PushNotificationResult> {
  return sendPushNotificationToUser({
    userId,
    title: 'Payment Received',
    body: `Your payment of ₹${paymentData.amount.toLocaleString()} for loan ${paymentData.applicationNo} has been received successfully.`,
    data: {
      paymentId: paymentData.paymentId,
      loanId: paymentData.loanId,
      type: 'PAYMENT_RECEIVED',
      amount: paymentData.amount.toString(),
    },
    actionUrl: `/customer/loan/${paymentData.loanId}`,
  });
}

const pushNotificationService = {
  sendPushNotificationToUser,
  sendPushNotificationToRole,
  saveUserFCMToken,
  removeUserFCMToken,
  sendEMIReminderPush,
  sendLoanStatusPush,
  sendPaymentConfirmationPush,
};

export default pushNotificationService;
