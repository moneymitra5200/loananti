/**
 * Server-side Socket.io emit utility
 * Used by API routes to push instant updates to connected clients.
 * Works because we use a custom Node.js server (not serverless),
 * so `global.io` is accessible from API routes.
 */

function getIO(): any {
  return (global as any).io ?? null;
}

/** Emit to a specific user */
export function emitToUser(userId: string, event: string, data?: any) {
  try {
    getIO()?.to(`user:${userId}`).emit(event, data);
  } catch { /* non-critical */ }
}

/** Emit to all users with a specific role */
export function emitToRole(role: string, event: string, data?: any) {
  try {
    getIO()?.to(`role:${role}`).emit(event, data);
  } catch { /* non-critical */ }
}

/** Emit to all users in a company */
export function emitToCompany(companyId: string, event: string, data?: any) {
  try {
    getIO()?.to(`company:${companyId}`).emit(event, data);
  } catch { /* non-critical */ }
}

/** Emit to all connected clients */
export function emitToAll(event: string, data?: any) {
  try {
    getIO()?.emit(event, data);
  } catch { /* non-critical */ }
}

/** 
 * Emit a dashboard:refresh to all relevant parties when data changes.
 * Call this after any write operation (EMI paid, loan created, etc.)
 */
export function emitDashboardRefresh(options: {
  userId?: string;
  companyId?: string;
  roles?: string[];
}) {
  const io = getIO();
  if (!io) return;
  try {
    if (options.userId)   io.to(`user:${options.userId}`).emit('dashboard:refresh');
    if (options.companyId) io.to(`company:${options.companyId}`).emit('dashboard:refresh');
    if (options.roles) {
      for (const role of options.roles) {
        io.to(`role:${role}`).emit('dashboard:refresh');
      }
    }
  } catch { /* non-critical */ }
}

/**
 * Emit a new notification event so the NotificationBell
 * updates instantly without waiting for the next poll.
 */
export function emitNotification(userId: string, notification: {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority?: string;
  actionUrl?: string | null;
  createdAt: Date | string;
}) {
  try {
    getIO()?.to(`user:${userId}`).emit('notification', notification);
  } catch { /* non-critical */ }
}

/**
 * Emit credit update so DashboardLayout header updates instantly.
 */
export function emitCreditUpdate(userId: string, credit: {
  personalCredit: number;
  companyCredit: number;
}) {
  try {
    getIO()?.to(`user:${userId}`).emit('credit:updated', credit);
  } catch { /* non-critical */ }
}

/**
 * Emit payment received event.
 */
export function emitPaymentReceived(data: {
  loanId: string;
  amount: number;
  emiId?: string;
  companyId?: string;
}) {
  try {
    const io = getIO();
    if (!io) return;
    io.to(`role:SUPER_ADMIN`).emit('payment:received', data);
    if (data.companyId) io.to(`company:${data.companyId}`).emit('payment:received', data);
  } catch { /* non-critical */ }
}
