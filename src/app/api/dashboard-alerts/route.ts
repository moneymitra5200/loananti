import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const agentId = searchParams.get('agentId') || undefined;

    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd   = new Date(`${dateStr}T23:59:59.999Z`);

    // Optionally scope EMI / loan queries to a specific agent
    const onlineLoanWhere: any = agentId ? { 
      OR: [
        { currentHandlerId: agentId },
        { sessionForm: { agentId: agentId } }
      ]
    } : {};

    const offlineLoanWhere: any = agentId ? { createdById: agentId } : {};

    // Run all queries SEQUENTIALLY — prevents connection starvation on connection_limit=3
    // Each query has its own try-catch for fault tolerance (same as Promise.allSettled)
    const todayEMIs = await db.eMISchedule.findMany({
      where: {
        dueDate: { gte: dayStart, lte: dayEnd },
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] as any[] },
        loanApplication: onlineLoanWhere,
      },
      select: { totalAmount: true },
    }).catch(() => [] as any[]);

    const overdueEMIs = await db.eMISchedule.findMany({
      where: {
        dueDate: { lt: dayStart },
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] as any[] },
        loanApplication: onlineLoanWhere,
      },
      select: { totalAmount: true },
    }).catch(() => [] as any[]);

    const newAppsOnline = await db.loanApplication.count({
      where: {
        createdAt: { gte: dayStart, lte: dayEnd },
        status: { in: ['SUBMITTED', 'SA_APPROVED', 'COMPANY_APPROVED', 'AGENT_APPROVED_STAGE1'] as any[] },
        ...onlineLoanWhere,
      },
    }).catch(() => 0);

    const newAppsOffline = await db.offlineLoan.count({
      where: {
        createdAt: { gte: dayStart, lte: dayEnd },
        status: 'PENDING_APPROVAL' as any,
        ...offlineLoanWhere,
      },
    }).catch(() => 0);

    const pendingDisbOnline = await db.loanApplication.count({
      where: {
        status: 'FINAL_APPROVED' as any,
        ...onlineLoanWhere,
      },
    }).catch(() => 0);

    const pendingDisbOffline = await db.offlineLoan.count({
      where: { 
        status: 'PENDING_APPROVAL' as any,
        ...offlineLoanWhere,
      },
    }).catch(() => 0);

    const offlineTodayEMIs = await db.offlineLoanEMI.findMany({
      where: {
        dueDate: { gte: dayStart, lte: dayEnd },
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] as any[] },
        offlineLoan: Object.keys(offlineLoanWhere).length > 0 ? offlineLoanWhere : undefined,
      },
      select: { totalAmount: true, paidAmount: true },
    }).catch(() => [] as any[]);

    const offlineOverdueEMIs = await db.offlineLoanEMI.findMany({
      where: {
        dueDate: { lt: dayStart },
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] as any[] },
        offlineLoan: Object.keys(offlineLoanWhere).length > 0 ? offlineLoanWhere : undefined,
      },
      select: { totalAmount: true, paidAmount: true },
    }).catch(() => [] as any[]);



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
