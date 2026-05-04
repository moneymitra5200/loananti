/**
 * Centralized Event Notification Dispatcher
 * ─────────────────────────────────────────
 * Call notifyEvent() from any API route.
 * Sends BOTH in-app bell notification AND phone push notification.
 * All operations are fire-and-forget — never delays the API response.
 *
 * Role Mapping (who gets notified for what):
 * ─────────────────────────────────────────
 * NEW_LOAN_APPLICATION   → SUPER_ADMIN, COMPANY
 * LOAN_STATUS_CHANGED    → SUPER_ADMIN + Customer
 * EMI_PAYMENT_RECEIVED   → SUPER_ADMIN, CASHIER + Customer
 * OFFLINE_LOAN_CREATED   → SUPER_ADMIN, COMPANY
 * OFFLINE_EMI_PAYMENT    → SUPER_ADMIN, CASHIER
 * PAYMENT_REQUEST        → SUPER_ADMIN, CASHIER
 * EXPENSE_REQUEST        → SUPER_ADMIN, ACCOUNTANT
 * TICKET_CREATED         → SUPER_ADMIN, AGENT
 * TICKET_REPLIED         → SUPER_ADMIN + Ticket Owner
 * INTEREST_PAYMENT       → SUPER_ADMIN, CASHIER
 * LOAN_CLOSED            → SUPER_ADMIN
 * NEW_USER_REGISTERED    → SUPER_ADMIN
 * SETTLEMENT_CREATED     → SUPER_ADMIN, ACCOUNTANT
 * OFFLINE_LOAN_CLOSED    → SUPER_ADMIN
 */

import { sendPushNotificationToRole, sendPushNotificationToUser } from '@/lib/push-notification-service';

export type NotifyEventType =
  | 'NEW_LOAN_APPLICATION'
  | 'LOAN_STATUS_CHANGED'
  | 'EMI_PAYMENT_RECEIVED'
  | 'OFFLINE_LOAN_CREATED'
  | 'OFFLINE_EMI_PAYMENT'
  | 'PAYMENT_REQUEST'
  | 'EXPENSE_REQUEST'
  | 'TICKET_CREATED'
  | 'TICKET_REPLIED'
  | 'INTEREST_PAYMENT'
  | 'LOAN_CLOSED'
  | 'NEW_USER_REGISTERED'
  | 'SETTLEMENT_CREATED'
  | 'OFFLINE_LOAN_CLOSED';

export interface NotifyEventPayload {
  event: NotifyEventType;
  title: string;
  body: string;
  data?: Record<string, string>;
  actionUrl?: string;           // Deep-link section for STAFF roles (e.g. /?section=pending)
  customerActionUrl?: string;   // Deep-link section for CUSTOMER (e.g. /?section=loans)
  // Optional: specific user IDs to also notify individually (e.g. customer)
  notifyUserIds?: string[];
}

/**
 * Maps each event type to which roles should receive notifications
 */
const ROLE_MAP: Record<NotifyEventType, string[]> = {
  NEW_LOAN_APPLICATION:  ['SUPER_ADMIN', 'COMPANY'],
  LOAN_STATUS_CHANGED:   ['SUPER_ADMIN'],
  EMI_PAYMENT_RECEIVED:  ['SUPER_ADMIN', 'CASHIER'],
  OFFLINE_LOAN_CREATED:  ['SUPER_ADMIN', 'COMPANY'],
  OFFLINE_EMI_PAYMENT:   ['SUPER_ADMIN', 'CASHIER'],
  PAYMENT_REQUEST:       ['SUPER_ADMIN', 'CASHIER'],
  EXPENSE_REQUEST:       ['SUPER_ADMIN', 'ACCOUNTANT'],
  TICKET_CREATED:        ['SUPER_ADMIN', 'AGENT'],
  TICKET_REPLIED:        ['SUPER_ADMIN'],
  INTEREST_PAYMENT:      ['SUPER_ADMIN', 'CASHIER'],
  LOAN_CLOSED:           ['SUPER_ADMIN'],
  NEW_USER_REGISTERED:   ['SUPER_ADMIN'],
  SETTLEMENT_CREATED:    ['SUPER_ADMIN', 'ACCOUNTANT'],
  OFFLINE_LOAN_CLOSED:   ['SUPER_ADMIN'],
};

/**
 * Emit socket event to all roles and specific user IDs
 */
function emitSocketEvent(event: NotifyEventType, roles: string[], userIds: string[], data: Record<string, string> = {}) {
  try {
    const io = (global as any).io;
    if (!io) return;

    // Map event types to socket event names
    const socketEvent = event === 'EMI_PAYMENT_RECEIVED' || event === 'OFFLINE_EMI_PAYMENT' || event === 'INTEREST_PAYMENT' || event === 'PAYMENT_REQUEST'
      ? 'payment:received'
      : event === 'TICKET_CREATED' || event === 'TICKET_REPLIED'
      ? 'ticket:update'
      : 'dashboard:refresh';

    // Notify all relevant roles
    for (const role of roles) {
      io.to(`role:${role}`).emit(socketEvent, data);
      io.to(`role:${role}`).emit('dashboard:refresh');
    }

    // Notify specific users
    for (const uid of userIds) {
      io.to(`user:${uid}`).emit(socketEvent, data);
    }
  } catch { /* socket not critical */ }
}

/**
 * Main dispatcher — call this from any API route.
 * Fire-and-forget by design.
 */
export function notifyEvent(payload: NotifyEventPayload): void {
  const roles = ROLE_MAP[payload.event] ?? ['SUPER_ADMIN'];

  // Run everything async, never block the caller
  Promise.resolve().then(async () => {
    try {
      const notificationData = payload.data ?? {};
      const actionUrl = payload.actionUrl ?? '/';

      // 1. Send push notification to each role SEQUENTIALLY
      //    (avoid concurrent DB queries that cause Prisma panic on connection_limit=1)
      for (const role of roles) {
        await sendPushNotificationToRole(role, {
          title: payload.title,
          body: payload.body,
          data: { ...notificationData, type: payload.event, actionUrl },
          actionUrl,
        }).catch(() => { /* non-critical */ });
      }

      // 2. Send push notification to specific users (e.g. customers) — use customerActionUrl
      if (payload.notifyUserIds?.length) {
        // Customers always land on /?section=loans (their My Loans tab)
        const customerUrl = payload.customerActionUrl ?? '/?section=loans';
        for (const uid of payload.notifyUserIds) {
          await sendPushNotificationToUser({
            userId: uid,
            title: payload.title,
            body: payload.body,
            data: { ...notificationData, type: payload.event, actionUrl: customerUrl },
            actionUrl: customerUrl,
          }).catch(() => { /* non-critical */ });
        }
      }

      // 3. Emit socket events for real-time UI update (no DB queries)
      emitSocketEvent(
        payload.event,
        roles,
        payload.notifyUserIds ?? [],
        { ...notificationData, type: payload.event }
      );
    } catch {
      // Notification failure must never crash the API
    }
  });
}
