import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayStr = dateParam || nowIST.toISOString().split('T')[0];

    const todayStart = new Date(`${todayStr}T00:00:00+05:30`);
    const todayEnd   = new Date(`${todayStr}T23:59:59+05:30`);

    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd   = new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000);

    const paidStatuses = ['PAID', 'INTEREST_ONLY_PAID', 'WAIVED'];

    const mirrorMappings = await db.mirrorLoanMapping.findMany({
      where: { mirrorLoanId: { not: null } },
      select: { mirrorLoanId: true }
    });
    const mirrorLoanIds = mirrorMappings.map(m => m.mirrorLoanId).filter(Boolean) as string[];

    const onlineBaseWhere: Record<string, unknown> = {
      paymentStatus: { notIn: paidStatuses as any },
      loanApplication: {
        status: { in: ['ACTIVE', 'DISBURSED', 'ACTIVE_INTEREST_ONLY'] }
      }
    };
    if (mirrorLoanIds.length > 0) {
      onlineBaseWhere.loanApplicationId = { notIn: mirrorLoanIds };
    }

    const offlineBaseWhere: Record<string, unknown> = {
      paymentStatus: { notIn: paidStatuses as any },
      offlineLoan: {
        isMirrorLoan: false,
        status: { in: ['ACTIVE', 'INTEREST_ONLY'] }
      }
    };

    const [
      onlineToday,
      offlineToday,
      onlineTomorrow,
      offlineTomorrow,
      onlineOverdue,
      offlineOverdue,
      pendingApps,
      approvedApps
    ] = await Promise.all([
      // Today's online EMIs
      db.eMISchedule.findMany({
        where: {
          ...onlineBaseWhere,
          dueDate: { gte: todayStart, lte: todayEnd },
        },
        select: { totalAmount: true, paidAmount: true }
      }),
      // Today's offline EMIs
      db.offlineLoanEMI.findMany({
        where: {
          ...offlineBaseWhere,
          dueDate: { gte: todayStart, lte: todayEnd },
        },
        select: { totalAmount: true, paidAmount: true }
      }),
      // Tomorrow's online EMIs
      db.eMISchedule.findMany({
        where: {
          ...onlineBaseWhere,
          dueDate: { gte: tomorrowStart, lte: tomorrowEnd },
        },
        select: { totalAmount: true, paidAmount: true }
      }),
      // Tomorrow's offline EMIs
      db.offlineLoanEMI.findMany({
        where: {
          ...offlineBaseWhere,
          dueDate: { gte: tomorrowStart, lte: tomorrowEnd },
        },
        select: { totalAmount: true, paidAmount: true }
      }),
      // Overdue online EMIs
      db.eMISchedule.findMany({
        where: {
          ...onlineBaseWhere,
          dueDate: { lt: todayStart },
        },
        select: { totalAmount: true, paidAmount: true }
      }),
      // Overdue offline EMIs
      db.offlineLoanEMI.findMany({
        where: {
          ...offlineBaseWhere,
          dueDate: { lt: todayStart },
        },
        select: { totalAmount: true, paidAmount: true }
      }),
      // New Applications pending review
      db.loanApplication.count({
        where: { status: 'SUBMITTED' }
      }),
      // Approved loans pending disbursement
      db.loanApplication.count({
        where: { status: 'FINAL_APPROVED' }
      })
    ]);

    const todayDueEMIs = onlineToday.length + offlineToday.length;
    const todayDueAmount = [...onlineToday, ...offlineToday].reduce((sum, e) => sum + (e.totalAmount - (e.paidAmount || 0)), 0);

    const tomorrowDueEMIs = onlineTomorrow.length + offlineTomorrow.length;
    const tomorrowDueAmount = [...onlineTomorrow, ...offlineTomorrow].reduce((sum, e) => sum + (e.totalAmount - (e.paidAmount || 0)), 0);

    const overdueEMIs = onlineOverdue.length + offlineOverdue.length;
    const overdueAmount = [...onlineOverdue, ...offlineOverdue].reduce((sum, e) => sum + (e.totalAmount - (e.paidAmount || 0)), 0);

    return NextResponse.json({
      success: true,
      todayDueEMIs,
      todayDueAmount,
      tomorrowDueEMIs,
      tomorrowDueAmount,
      overdueEMIs,
      overdueAmount,
      newApplications: pendingApps,
      pendingDisbursements: approvedApps
    });
  } catch (error) {
    console.error('Error fetching dashboard alerts:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch dashboard alerts' }, { status: 500 });
  }
}
