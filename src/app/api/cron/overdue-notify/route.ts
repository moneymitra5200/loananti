import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendPushNotificationToUser } from '@/lib/push-notification-service';

/**
 * GET /api/cron/overdue-notify
 * Runs 3x daily (Morning 8AM IST, Afternoon 1PM IST, Evening 7PM IST)
 * Sends in-app bell + push notifications to ALL relevant roles:
 *   1. Customer        — EMI amount + penalty + days overdue
 *   2. Agent / Handler — whoever last handled the loan
 *   3. Staff           — all active STAFF users
 *   4. Cashier         — all active CASHIER users (they collect payments)
 *   5. Company         — company users linked to the loan
 *   6. Super Admin     — all SUPER_ADMIN users
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const stats = {
    onlineOverdue: 0,
    offlineOverdue: 0,
    customerNotifications: 0,
    staffNotifications: 0,
    errors: [] as string[],
  };

  // ── Fetch role-wide recipients once (reused for every EMI) ────────────────
  const [superAdmins, allStaff, allCashiers] = await Promise.all([
    db.user.findMany({ where: { role: 'SUPER_ADMIN', isActive: true }, select: { id: true } }),
    db.user.findMany({ where: { role: 'STAFF',       isActive: true }, select: { id: true } }),
    db.user.findMany({ where: { role: 'CASHIER',     isActive: true }, select: { id: true } }),
  ]);

  /**
   * notify() — writes an in-app Notification DB record (shows in bell panel)
   * AND fires a push notification (shows on phone). DB write is awaited so
   * records appear instantly; push is fire-and-forget.
   */
  async function notify(
    userId: string,
    title: string,
    body: string,
    actionUrl: string,
    type: string,
    category: 'EMI' | 'LOAN' | 'PAYMENT' | 'SYSTEM' | 'CREDIT' = 'EMI',
    priority: 'NORMAL' | 'HIGH' | 'CRITICAL' = 'HIGH',
  ) {
    try {
      await db.notification.create({
        data: { userId, type, category, priority, title, message: body, actionUrl, isRead: false },
      });
    } catch (err: any) {
      stats.errors.push(`DB ${userId}: ${err.message}`);
    }
    sendPushNotificationToUser({ userId, title, body, actionUrl })
      .catch((err: any) => { stats.errors.push(`Push ${userId}: ${err.message}`); });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ONLINE LOANS — Overdue EMISchedule records
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const overdueOnlineEMIs = await db.eMISchedule.findMany({
      where: { paymentStatus: { in: ['PENDING', 'OVERDUE'] }, dueDate: { lt: todayStart } },
      include: {
        loanApplication: {
          select: {
            id: true, applicationNo: true, customerId: true,
            companyId: true, currentHandlerId: true,
            customer: { select: { id: true, name: true } },
            company: {
              select: {
                id: true, name: true,
                users: { where: { isActive: true, role: 'COMPANY' }, select: { id: true }, take: 3 },
              },
            },
          },
        },
      },
      take: 200,
    });

    stats.onlineOverdue = overdueOnlineEMIs.length;

    for (const emi of overdueOnlineEMIs) {
      const loan = emi.loanApplication;
      if (!loan) continue;

      const daysOverdue = emi.daysOverdue ||
        Math.floor((now.getTime() - new Date(emi.dueDate).getTime()) / 86400000);
      const emiAmt  = Number(emi.totalAmount);
      const penalty = Number(emi.penaltyAmount || 0);
      const totalDue = emiAmt + penalty;
      const dueDateStr = new Date(emi.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const penaltyStr = penalty > 0 ? ` + Penalty: ₹${penalty.toLocaleString('en-IN')}` : '';

      const seen = new Set<string>(); // prevent duplicate notifications per person

      // 1. Customer
      if (loan.customerId) {
        const t = daysOverdue <= 1
          ? `⚠️ EMI Overdue — ${loan.applicationNo}`
          : `🔴 EMI ${daysOverdue}d Overdue — ${loan.applicationNo}`;
        const b = penalty > 0
          ? `EMI #${emi.installmentNumber} due ${dueDateStr}.\nEMI: ₹${emiAmt.toLocaleString('en-IN')}${penaltyStr}\nTotal Due: ₹${totalDue.toLocaleString('en-IN')}. Pay now to avoid more charges.`
          : `EMI #${emi.installmentNumber} of ₹${emiAmt.toLocaleString('en-IN')} due ${dueDateStr} is unpaid. Pay immediately.`;
        await notify(loan.customerId, t, b, `/customer/loan/${loan.id}`, 'EMI_OVERDUE', 'EMI', 'CRITICAL');
        seen.add(loan.customerId);
        stats.customerNotifications++;
      }

      // 2. Agent / Current Handler
      if (loan.currentHandlerId && !seen.has(loan.currentHandlerId)) {
        const t = `📋 Overdue EMI — ${loan.applicationNo}`;
        const b = `EMI #${emi.installmentNumber} is ${daysOverdue}d overdue. Total due: ₹${totalDue.toLocaleString('en-IN')}${penaltyStr}. Follow up required.`;
        await notify(loan.currentHandlerId, t, b, `/dashboard?tab=emi-collection`, 'STAFF_OVERDUE_ALERT', 'EMI', 'HIGH');
        seen.add(loan.currentHandlerId);
        stats.staffNotifications++;
      }

      // 3. All STAFF
      for (const s of allStaff) {
        if (seen.has(s.id)) continue;
        await notify(s.id,
          `📋 Overdue EMI Alert — ${loan.applicationNo}`,
          `EMI #${emi.installmentNumber} is ${daysOverdue}d overdue. Due: ₹${totalDue.toLocaleString('en-IN')}${penaltyStr}. Follow up.`,
          `/dashboard?tab=emi-collection`, 'STAFF_OVERDUE_ALERT', 'EMI', 'HIGH');
        seen.add(s.id); stats.staffNotifications++;
      }

      // 4. All CASHIER
      for (const c of allCashiers) {
        if (seen.has(c.id)) continue;
        await notify(c.id,
          `💰 EMI Overdue — ${loan.applicationNo}`,
          `EMI #${emi.installmentNumber} (₹${totalDue.toLocaleString('en-IN')}) is ${daysOverdue}d overdue${penaltyStr ? ', penalty accruing' : ''}. Collect payment.`,
          `/dashboard?tab=emi-collection`, 'CASHIER_OVERDUE_ALERT', 'EMI', 'HIGH');
        seen.add(c.id); stats.staffNotifications++;
      }

      // 5. Company Users
      for (const cu of (loan.company?.users || [])) {
        if (seen.has(cu.id)) continue;
        await notify(cu.id,
          `⚠️ Overdue EMI — ${loan.applicationNo}`,
          `EMI #${emi.installmentNumber} (₹${totalDue.toLocaleString('en-IN')}) is ${daysOverdue}d overdue.`,
          `/dashboard?tab=emi-collection`, 'COMPANY_OVERDUE_ALERT', 'EMI', 'HIGH');
        seen.add(cu.id); stats.staffNotifications++;
      }

      // 6. Super Admins
      for (const sa of superAdmins) {
        if (seen.has(sa.id)) continue;
        await notify(sa.id,
          `🔴 Overdue EMI — ${loan.applicationNo}`,
          `EMI #${emi.installmentNumber} — ${daysOverdue}d overdue. Due: ₹${totalDue.toLocaleString('en-IN')}${penaltyStr}.`,
          `/dashboard?tab=emi-collection`, 'SA_OVERDUE_ALERT', 'EMI', 'CRITICAL');
        seen.add(sa.id); stats.staffNotifications++;
      }
    }
  } catch (err: any) {
    stats.errors.push(`Online loans error: ${err.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. OFFLINE LOANS — Overdue OfflineLoanEMI records
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const overdueOfflineEMIs = await db.offlineLoanEMI.findMany({
      where: { paymentStatus: { in: ['PENDING', 'OVERDUE'] }, dueDate: { lt: todayStart } },
      include: {
        offlineLoan: {
          select: {
            id: true, loanNumber: true, customerId: true,
            createdById: true, companyId: true, customerName: true, customerPhone: true,
            company: {
              select: {
                users: { where: { isActive: true, role: 'COMPANY' }, select: { id: true }, take: 3 },
              },
            },
          },
        },
      },
      take: 200,
    });

    stats.offlineOverdue = overdueOfflineEMIs.length;

    for (const emi of overdueOfflineEMIs) {
      const loan = emi.offlineLoan;
      if (!loan) continue;

      const daysOverdue = emi.daysOverdue ||
        Math.floor((now.getTime() - new Date(emi.dueDate).getTime()) / 86400000);
      const emiAmt   = Number(emi.totalAmount);
      const penalty  = Number(emi.penaltyAmount || 0);
      const totalDue = emiAmt + penalty;
      const dueDateStr = new Date(emi.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const penaltyStr = penalty > 0 ? ` + Penalty: ₹${penalty.toLocaleString('en-IN')}` : '';

      const seen = new Set<string>();

      // 1. Customer (if linked)
      if (loan.customerId) {
        const t = daysOverdue <= 1
          ? `⚠️ EMI Overdue — ${loan.loanNumber}`
          : `🔴 EMI ${daysOverdue}d Overdue — ${loan.loanNumber}`;
        const b = penalty > 0
          ? `EMI #${emi.installmentNumber} due ${dueDateStr}.\nEMI: ₹${emiAmt.toLocaleString('en-IN')}${penaltyStr}\nTotal Due: ₹${totalDue.toLocaleString('en-IN')}. Pay immediately.`
          : `EMI #${emi.installmentNumber} of ₹${emiAmt.toLocaleString('en-IN')} due ${dueDateStr} is unpaid.`;
        await notify(loan.customerId, t, b, `/dashboard?tab=my-loans`, 'OFFLINE_EMI_OVERDUE', 'EMI', 'CRITICAL');
        seen.add(loan.customerId); stats.customerNotifications++;
      }

      // 2. Loan Creator
      if (loan.createdById && !seen.has(loan.createdById)) {
        await notify(loan.createdById,
          `📋 Offline Loan Overdue — ${loan.loanNumber}`,
          `${loan.customerName} (${loan.customerPhone}) — EMI #${emi.installmentNumber} is ${daysOverdue}d overdue. Due: ₹${totalDue.toLocaleString('en-IN')}${penaltyStr}.`,
          `/dashboard?tab=offline-loans`, 'OFFLINE_STAFF_OVERDUE', 'EMI', 'HIGH');
        seen.add(loan.createdById); stats.staffNotifications++;
      }

      // 3. All STAFF
      for (const s of allStaff) {
        if (seen.has(s.id)) continue;
        await notify(s.id,
          `📋 Offline Overdue — ${loan.loanNumber}`,
          `${loan.customerName}: EMI #${emi.installmentNumber} is ${daysOverdue}d overdue. Due: ₹${totalDue.toLocaleString('en-IN')}${penaltyStr}.`,
          `/dashboard?tab=offline-loans`, 'OFFLINE_STAFF_OVERDUE', 'EMI', 'HIGH');
        seen.add(s.id); stats.staffNotifications++;
      }

      // 4. All CASHIER
      for (const c of allCashiers) {
        if (seen.has(c.id)) continue;
        await notify(c.id,
          `💰 Offline EMI Overdue — ${loan.loanNumber}`,
          `${loan.customerName}: EMI #${emi.installmentNumber} (₹${totalDue.toLocaleString('en-IN')}) is ${daysOverdue}d overdue. Collect payment.`,
          `/dashboard?tab=offline-loans`, 'CASHIER_OFFLINE_OVERDUE', 'EMI', 'HIGH');
        seen.add(c.id); stats.staffNotifications++;
      }

      // 5. Company Users
      for (const cu of (loan.company?.users || [])) {
        if (seen.has(cu.id)) continue;
        await notify(cu.id,
          `⚠️ Offline Loan Overdue — ${loan.loanNumber}`,
          `EMI #${emi.installmentNumber} (₹${totalDue.toLocaleString('en-IN')}) is ${daysOverdue}d overdue. Customer: ${loan.customerName}.`,
          `/dashboard?tab=offline-loans`, 'COMPANY_OFFLINE_OVERDUE', 'EMI', 'HIGH');
        seen.add(cu.id); stats.staffNotifications++;
      }

      // 6. Super Admins
      for (const sa of superAdmins) {
        if (seen.has(sa.id)) continue;
        await notify(sa.id,
          `🔴 Offline Overdue — ${loan.loanNumber}`,
          `${loan.customerName}: EMI #${emi.installmentNumber} — ${daysOverdue}d overdue. Due: ₹${totalDue.toLocaleString('en-IN')}${penaltyStr}.`,
          `/dashboard?tab=offline-loans`, 'SA_OFFLINE_OVERDUE', 'EMI', 'CRITICAL');
        seen.add(sa.id); stats.staffNotifications++;
      }
    }
  } catch (err: any) {
    stats.errors.push(`Offline loans error: ${err.message}`);
  }

  // ── Cron summary log (SYSTEM category — appears in SYSTEM tab of bell) ────
  const slot = now.getUTCHours() < 8 ? '🌅 Morning' : now.getUTCHours() < 14 ? '☀️ Afternoon' : '🌆 Evening';
  try {
    if (superAdmins.length > 0) {
      await db.notification.createMany({
        data: superAdmins.map(sa => ({
          userId: sa.id,
          type: 'GENERAL',
          category: 'SYSTEM',
          priority: 'LOW',
          title: `${slot} Overdue Cron Completed`,
          message: `${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST — Online: ${stats.onlineOverdue}, Offline: ${stats.offlineOverdue}. Notified: ${stats.customerNotifications + stats.staffNotifications}.${stats.errors.length > 0 ? ` Errors: ${stats.errors.length}` : ' ✅ No errors.'}`,
          isRead: false,
        })),
        skipDuplicates: true,
      });
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, timestamp: now.toISOString(), slot, stats });
}
