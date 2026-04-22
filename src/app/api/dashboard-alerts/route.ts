import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/dashboard-alerts
 * Returns role-based daily briefing counts for the DashboardAlertPopup.
 * Each sub-query runs independently via Promise.allSettled so one DB
 * timeout cannot crash the whole endpoint.
 *
 * Query params:
 *   date      – ISO date string (defaults to today, UTC)
 *   agentId   – filter by agent (for AGENT role)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const agentId = searchParams.get('agentId') || undefined;

    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd   = new Date(`${dateStr}T23:59:59.999Z`);

    // Optionally scope EMI / loan queries to a specific agent
    const loanWhere: any = agentId ? { agentId } : {};

    // Run all queries in parallel; individual failures return safe defaults
    const [
      todayEMIsResult,
      overdueEMIsResult,
      newAppsOnlineResult,
      newAppsOfflineResult,
      pendingDisbOnlineResult,
      pendingDisbOfflineResult,
      offlineTodayEMIsResult,
      offlineOverdueEMIsResult,
    ] = await Promise.allSettled([

      // 1. Online EMIs due today
      db.eMISchedule.findMany({
        where: {
          dueDate: { gte: dayStart, lte: dayEnd },
          paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] as any[] },
          loanApplication: loanWhere,
        },
        select: { totalAmount: true },
      }),

      // 2. Online overdue EMIs (dueDate < today, still unpaid)
      db.eMISchedule.findMany({
        where: {
          dueDate: { lt: dayStart },
          paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] as any[] },
          loanApplication: loanWhere,
        },
        select: { totalAmount: true },
      }),

      // 3. New online applications today
      // NOTE: LoanStatus enum uses SUBMITTED (not PENDING)
      db.loanApplication.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
          status: { in: ['SUBMITTED', 'SA_APPROVED', 'COMPANY_APPROVED', 'AGENT_APPROVED_STAGE1'] as any[] },
          ...loanWhere,
        },
      }),

      // 4. New offline applications today
      db.offlineLoan.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
          status: 'PENDING_APPROVAL' as any,
        },
      }),

      // 5. Online loans pending disbursement
      db.loanApplication.count({
        where: {
          status: 'FINAL_APPROVED' as any,
          ...loanWhere,
        },
      }),

      // 6. Offline loans pending disbursement
      db.offlineLoan.count({
        where: { status: 'PENDING_APPROVAL' as any },
      }),

      // 7. Offline EMIs due today
      db.offlineLoanEMI.findMany({
        where: {
          dueDate: { gte: dayStart, lte: dayEnd },
          paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] as any[] },
          offlineLoan: Object.keys(loanWhere).length > 0 ? loanWhere : undefined,
        },
        select: { totalAmount: true, paidAmount: true },
      }),

      // 8. Offline overdue EMIs
      db.offlineLoanEMI.findMany({
        where: {
          dueDate: { lt: dayStart },
          paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] as any[] },
          offlineLoan: Object.keys(loanWhere).length > 0 ? loanWhere : undefined,
        },
        select: { totalAmount: true, paidAmount: true },
      }),
    ]);

    // Safely extract — default to [] / 0 if DB query failed
    const todayEMIs          = todayEMIsResult.status          === 'fulfilled' ? todayEMIsResult.value          : [];
    const overdueEMIs        = overdueEMIsResult.status        === 'fulfilled' ? overdueEMIsResult.value        : [];
    const newAppsOnline      = newAppsOnlineResult.status      === 'fulfilled' ? newAppsOnlineResult.value      : 0;
    const newAppsOffline     = newAppsOfflineResult.status     === 'fulfilled' ? newAppsOfflineResult.value     : 0;
    const pendingDisbOnline  = pendingDisbOnlineResult.status  === 'fulfilled' ? pendingDisbOnlineResult.value  : 0;
    const pendingDisbOffline = pendingDisbOfflineResult.status === 'fulfilled' ? pendingDisbOfflineResult.value : 0;
    const offlineTodayEMIs   = offlineTodayEMIsResult.status   === 'fulfilled' ? offlineTodayEMIsResult.value   : [];
    const offlineOverdueEMIs = offlineOverdueEMIsResult.status === 'fulfilled' ? offlineOverdueEMIsResult.value : [];

    // Log any individual failures for debugging
    [todayEMIsResult, overdueEMIsResult, newAppsOnlineResult, newAppsOfflineResult,
     pendingDisbOnlineResult, pendingDisbOfflineResult, offlineTodayEMIsResult, offlineOverdueEMIsResult
    ].forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[Dashboard Alerts] Query ${i + 1} failed:`, (r as any).reason?.message);
      }
    });

    return NextResponse.json({
      success:              true,
      date:                 dateStr,
      todayDueEMIs:         todayEMIs.length + offlineTodayEMIs.length,
      todayDueAmount:       todayEMIs.reduce((s, e) => s + (e.totalAmount || 0), 0)
                          + offlineTodayEMIs.reduce((s, e) => s + ((e.totalAmount || 0) - (Number(e.paidAmount) || 0)), 0),
      overdueEMIs:          overdueEMIs.length + offlineOverdueEMIs.length,
      overdueAmount:        overdueEMIs.reduce((s, e) => s + (e.totalAmount || 0), 0)
                          + offlineOverdueEMIs.reduce((s, e) => s + ((e.totalAmount || 0) - (Number(e.paidAmount) || 0)), 0),
      newApplications:      newAppsOnline + newAppsOffline,
      pendingDisbursements: pendingDisbOnline + pendingDisbOffline,
    });

  } catch (error: any) {
    console.error('[Dashboard Alerts] Fatal error:', error.message);
    // Return zeros so the dashboard UI does not break / show a crash
    return NextResponse.json({
      success:              false,
      error:                error.message,
      todayDueEMIs:         0,
      todayDueAmount:       0,
      overdueEMIs:          0,
      overdueAmount:        0,
      newApplications:      0,
      pendingDisbursements: 0,
    });
  }
}
