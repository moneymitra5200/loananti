import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendPushNotificationToUser } from '@/lib/push-notification-service';

/**
 * GET /api/cron/overdue-notify
 * Runs 3x daily (Morning 8AM IST, Afternoon 1PM IST, Evening 7PM IST)
 * Finds all overdue EMIs (online + offline) and sends notifications to:
 *   1. Customer — EMI amount + penalty + days overdue
 *   2. Agent / Creator of the loan
 *   3. Company associated with the loan
 *   4. All Super Admins
 */
export async function GET(request: NextRequest) {
  // Security: Vercel sets Authorization: Bearer <CRON_SECRET> on cron calls
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

  // ── Helper: send notification to a user ──────────────────────────────────
  async function notify(userId: string, title: string, body: string, actionUrl: string, data?: Record<string, string>) {
    try {
      await sendPushNotificationToUser({ userId, title, body, actionUrl, data });
    } catch (err: any) {
      stats.errors.push(`User ${userId}: ${err.message}`);
    }
  }

  // ── Fetch Super Admin user IDs (for batch notification) ──────────────────
  const superAdmins = await db.user.findMany({
    where: { role: 'SUPER_ADMIN', isActive: true },
    select: { id: true },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ONLINE LOANS — Overdue EMISchedule records
  // ═══════════════════════════════════════════════════════════════════════════
  try {
    const overdueOnlineEMIs = await db.eMISchedule.findMany({
      where: {
        paymentStatus: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { lt: todayStart }, // due date has passed
      },
      include: {
        loanApplication: {
          select: {
            id: true,
            applicationNo: true,
            customerId: true,
            companyId: true,
            currentHandlerId: true,
            customer: {
              select: { id: true, name: true, fcmToken: true, notificationEnabled: true },
            },
            company: {
              select: {
                id: true,
                name: true,
                users: {
                  where: { isActive: true, role: 'COMPANY' },
                  select: { id: true },
                  take: 3,
                },
              },
            },
          },
        },
      },
      take: 200, // Process max 200 per cron run
    });

    stats.onlineOverdue = overdueOnlineEMIs.length;

    for (const emi of overdueOnlineEMIs) {
      const loan = emi.loanApplication;
      if (!loan) continue;

      const daysOverdue = emi.daysOverdue || Math.floor((now.getTime() - new Date(emi.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const emiAmt = Number(emi.totalAmount);
      const penalty = Number(emi.penaltyAmount || 0);
      const totalDue = emiAmt + penalty;
      const dueDateStr = new Date(emi.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      // ── Customer notification ──
      if (loan.customerId) {
        const title = daysOverdue <= 1
          ? `⚠️ EMI Overdue — Loan ${loan.applicationNo}`
          : `🔴 EMI Overdue ${daysOverdue} Days — Loan ${loan.applicationNo}`;
        const body = penalty > 0
          ? `EMI #${emi.installmentNumber} due ${dueDateStr} is overdue.\nEMI: ₹${emiAmt.toLocaleString('en-IN')} + Penalty: ₹${penalty.toLocaleString('en-IN')}\nTotal Due: ₹${totalDue.toLocaleString('en-IN')}. Pay now to avoid more charges.`
          : `EMI #${emi.installmentNumber} of ₹${emiAmt.toLocaleString('en-IN')} was due on ${dueDateStr} and is still unpaid. Please pay immediately.`;
        
        await notify(loan.customerId, title, body, `/customer/loan/${loan.id}`, {
          type: 'EMI_OVERDUE',
          loanId: loan.id,
          emiId: emi.id,
          daysOverdue: daysOverdue.toString(),
          penalty: penalty.toString(),
        });
        stats.customerNotifications++;
      }

      // ── Agent / current handler notification ──
      if (loan.currentHandlerId) {
        const title = `📋 Overdue EMI — ${loan.applicationNo}`;
        const body = `Customer EMI #${emi.installmentNumber} is ${daysOverdue} day(s) overdue. Total due: ₹${totalDue.toLocaleString('en-IN')}${penalty > 0 ? ` (incl. ₹${penalty.toLocaleString('en-IN')} penalty)` : ''}. Follow up required.`;
        await notify(loan.currentHandlerId, title, body, `/dashboard?tab=emi-collection`, { type: 'STAFF_OVERDUE_ALERT', loanId: loan.id });
        stats.staffNotifications++;
      }

      // ── Company users notification ──
      if (loan.company?.users) {
        for (const companyUser of loan.company.users) {
          const title = `⚠️ Overdue EMI — ${loan.applicationNo}`;
          const body = `EMI #${emi.installmentNumber} (₹${totalDue.toLocaleString('en-IN')}) is ${daysOverdue} day(s) overdue. Loan: ${loan.applicationNo}.`;
          await notify(companyUser.id, title, body, `/dashboard?tab=emi-collection`, { type: 'COMPANY_OVERDUE_ALERT', loanId: loan.id });
          stats.staffNotifications++;
        }
      }

      // ── Super Admin notification ──
      for (const sa of superAdmins) {
        const title = `🔴 Overdue EMI — ${loan.applicationNo}`;
        const body = `EMI #${emi.installmentNumber} — ${daysOverdue}d overdue. Due: ₹${totalDue.toLocaleString('en-IN')}${penalty > 0 ? ` (₹${penalty.toLocaleString('en-IN')} penalty)` : ''}.`;
        await notify(sa.id, title, body, `/dashboard?tab=emi-collection`, { type: 'SA_OVERDUE_ALERT', loanId: loan.id });
        stats.staffNotifications++;
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
      where: {
        paymentStatus: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { lt: todayStart },
      },
      include: {
        offlineLoan: {
          select: {
            id: true,
            loanNumber: true,
            customerId: true,
            createdById: true,
            companyId: true,
            customerName: true,
            customerPhone: true,
            company: {
              select: {
                users: {
                  where: { isActive: true, role: 'COMPANY' },
                  select: { id: true },
                  take: 3,
                },
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

      const daysOverdue = emi.daysOverdue || Math.floor((now.getTime() - new Date(emi.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const emiAmt = Number(emi.totalAmount);
      const penalty = Number(emi.penaltyAmount || 0);
      const totalDue = emiAmt + penalty;
      const dueDateStr = new Date(emi.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      // ── Customer (if linked to a user account) ──
      if (loan.customerId) {
        const title = daysOverdue <= 1
          ? `⚠️ EMI Overdue — Loan ${loan.loanNumber}`
          : `🔴 EMI Overdue ${daysOverdue} Days — Loan ${loan.loanNumber}`;
        const body = penalty > 0
          ? `EMI #${emi.installmentNumber} due ${dueDateStr} is overdue.\nEMI: ₹${emiAmt.toLocaleString('en-IN')} + Penalty: ₹${penalty.toLocaleString('en-IN')}\nTotal Due: ₹${totalDue.toLocaleString('en-IN')}. Please pay immediately.`
          : `EMI #${emi.installmentNumber} of ₹${emiAmt.toLocaleString('en-IN')} was due on ${dueDateStr} and is still unpaid. Please pay immediately.`;
        
        await notify(loan.customerId, title, body, `/dashboard`, {
          type: 'OFFLINE_EMI_OVERDUE',
          offlineLoanId: loan.id,
          emiId: emi.id,
          daysOverdue: daysOverdue.toString(),
          penalty: penalty.toString(),
        });
        stats.customerNotifications++;
      }

      // ── Loan Creator (Agent / Super Admin who created the loan) ──
      if (loan.createdById) {
        const title = `📋 Offline Loan Overdue — ${loan.loanNumber}`;
        const body = `${loan.customerName} (${loan.customerPhone}) — EMI #${emi.installmentNumber} is ${daysOverdue} day(s) overdue. Total Due: ₹${totalDue.toLocaleString('en-IN')}${penalty > 0 ? ` (incl. ₹${penalty.toLocaleString('en-IN')} penalty)` : ''}. Follow up immediately.`;
        await notify(loan.createdById, title, body, `/dashboard?tab=offline-loans`, { type: 'OFFLINE_STAFF_OVERDUE', offlineLoanId: loan.id });
        stats.staffNotifications++;
      }

      // ── Company users ──
      if (loan.company?.users) {
        for (const companyUser of loan.company.users) {
          const title = `⚠️ Offline Loan Overdue — ${loan.loanNumber}`;
          const body = `EMI #${emi.installmentNumber} (₹${totalDue.toLocaleString('en-IN')}) is ${daysOverdue} day(s) overdue. Customer: ${loan.customerName}.`;
          await notify(companyUser.id, title, body, `/dashboard?tab=offline-loans`, { type: 'COMPANY_OFFLINE_OVERDUE', offlineLoanId: loan.id });
          stats.staffNotifications++;
        }
      }

      // ── Super Admin ──
      for (const sa of superAdmins) {
        const title = `🔴 Offline Overdue — ${loan.loanNumber}`;
        const body = `${loan.customerName}: EMI #${emi.installmentNumber} — ${daysOverdue}d overdue. Due: ₹${totalDue.toLocaleString('en-IN')}${penalty > 0 ? ` (₹${penalty.toLocaleString('en-IN')} penalty)` : ''}.`;
        await notify(sa.id, title, body, `/dashboard?tab=offline-loans`, { type: 'SA_OFFLINE_OVERDUE', offlineLoanId: loan.id });
        stats.staffNotifications++;
      }
    }
  } catch (err: any) {
    stats.errors.push(`Offline loans error: ${err.message}`);
  }

  // ── Log cron run to SA notifications panel ────────────────────────────────
  const slot = now.getUTCHours() < 8
    ? '🌅 Morning'
    : now.getUTCHours() < 14
    ? '☀️ Afternoon'
    : '🌆 Evening';

  try {
    for (const sa of superAdmins) {
      await db.notification.create({
        data: {
          userId: sa.id,
          type: 'SYSTEM',
          category: 'SYSTEM',
          priority: 'LOW',
          title: `${slot} Overdue Alert Cron Completed`,
          message: `Ran at ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST. Online overdue: ${stats.onlineOverdue}, Offline overdue: ${stats.offlineOverdue}. Customer notifications: ${stats.customerNotifications}, Staff notifications: ${stats.staffNotifications}.${stats.errors.length > 0 ? ` Errors: ${stats.errors.length}` : ' ✅ No errors.'}`,
        },
      });
    }
  } catch { /* non-critical */ }

  return NextResponse.json({
    success: true,
    timestamp: now.toISOString(),
    slot,
    stats,
  });
}
