import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/dashboard-alerts
 * Returns role-based daily briefing counts for the DashboardAlertPopup.
 * Query params:
 *   date      – ISO date string (defaults to today)
 *   agentId   – filter by agent (for AGENT role)
 *   cashierId – filter by cashier (for CASHIER role, no-op currently)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const agentId = searchParams.get('agentId') || undefined;

    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd   = new Date(`${dateStr}T23:59:59.999Z`);
    const now      = new Date();

    // ── Base filters (optionally scoped to an agent) ──────────────
    const loanWhere: any = agentId ? { agentId } : {};

    // 1. Today's due EMIs (PENDING/PARTIALLY_PAID with dueDate = today)
    const todayEMIs = await db.eMISchedule.findMany({
      where: {
        dueDate: { gte: dayStart, lte: dayEnd },
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] },
        loanApplication: loanWhere,
      },
      select: { totalAmount: true },
    });

    // 2. Overdue EMIs (dueDate < today, still unpaid)
    const overdueEMIs = await db.eMISchedule.findMany({
      where: {
        dueDate: { lt: dayStart },
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
        loanApplication: loanWhere,
      },
      select: { totalAmount: true },
    });

    // 3. New applications submitted today (PENDING / SA_APPROVED, not yet disbursed)
    const newApplications = await db.loanApplication.count({
      where: {
        createdAt: { gte: dayStart, lte: dayEnd },
        status: { in: ['PENDING', 'SA_APPROVED', 'AGENT_APPROVED_STAGE1'] },
        ...loanWhere,
      },
    });

    // 4. Pending disbursements (FINAL_APPROVED but not yet DISBURSED)
    const pendingDisbursements = await db.loanApplication.count({
      where: {
        status: 'FINAL_APPROVED',
        ...loanWhere,
      },
    });

    return NextResponse.json({
      success: true,
      date: dateStr,
      todayDueEMIs:         todayEMIs.length,
      todayDueAmount:       todayEMIs.reduce((s, e) => s + (e.totalAmount || 0), 0),
      overdueEMIs:          overdueEMIs.length,
      overdueAmount:        overdueEMIs.reduce((s, e) => s + (e.totalAmount || 0), 0),
      newApplications,
      pendingDisbursements,
    });
  } catch (error: any) {
    console.error('[Dashboard Alerts] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
