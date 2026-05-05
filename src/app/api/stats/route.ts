import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheTTL } from '@/lib/cache';

/**
 * GET /api/stats
 * Returns all dashboard counters in ONE fast parallel query.
 * Cached server-side for 30 seconds.
 *
 * Query params: role, userId, companyId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'SUPER_ADMIN';
    const userId = searchParams.get('userId') || '';
    const companyId = searchParams.get('companyId') || '';

    const cacheKey = `stats:${role}:${userId}:${companyId}`;
    const cached = cache.get<object>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // ── Build role-specific filters ─────────────────────────────────────────
    const loanWhere: Record<string, unknown> = {};
    // isMirrorLoan: false — mirror loans are internal accounting duplicates and must
    // never inflate dashboard counts across any role.
    const offlineWhere: Record<string, unknown> = { status: { in: ['ACTIVE', 'INTEREST_ONLY'] }, isMirrorLoan: false };

    if (role === 'COMPANY' && companyId) {
      loanWhere.companyId = companyId;
      offlineWhere.companyId = companyId;
    } else if (role === 'AGENT' && userId) {
      loanWhere.agentId = userId;
      offlineWhere.agentId = userId;
    } else if (role === 'STAFF' && userId) {
      offlineWhere.createdById = userId;
    }

    const companyFilter = companyId ? { companyId } : {};

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // ── All counts SEQUENTIALLY — prevents connection starvation on connection_limit=3 ──
    // Slightly slower (~200ms) but NEVER exceeds connection pool
    const activeDisbursedLoans = await db.loanApplication.count({
      where: { ...loanWhere, status: { in: ['DISBURSED', 'ACTIVE', 'ACTIVE_INTEREST_ONLY'] } },
    }).catch(() => 0);

    const offlineLoanCount = await db.offlineLoan.count({ where: offlineWhere }).catch(() => 0);

    const totalCustomers = await db.user.count({ where: { role: 'CUSTOMER' } }).catch(() => 0);

    const pendingLoans = await db.loanApplication.count({
      where: { ...companyFilter, status: { in: ['SUBMITTED', 'SA_APPROVED', 'COMPANY_APPROVED', 'AGENT_APPROVED_STAGE1', 'LOAN_FORM_COMPLETED'] } },
    }).catch(() => 0);

    const closedOfflineLoans = await db.offlineLoan.count({ where: { ...companyFilter, status: 'CLOSED', isMirrorLoan: false } }).catch(() => 0);

    const closedOnlineLoans = await db.loanApplication.count({ where: { ...companyFilter, status: 'CLOSED' } }).catch(() => 0);

    const totalCompanies = role === 'SUPER_ADMIN' ? await db.company.count({ where: { isActive: true } }).catch(() => 0) : 0;
    const totalAgents = role === 'SUPER_ADMIN' ? await db.user.count({ where: { role: 'AGENT', isActive: true } }).catch(() => 0) : 0;
    const totalStaff = role === 'SUPER_ADMIN' ? await db.user.count({ where: { role: 'STAFF', isActive: true } }).catch(() => 0) : 0;

    const todayEMIs = await db.offlineLoanEMI.count({
      where: {
        dueDate: { gte: todayStart, lte: todayEnd },
        paymentStatus: { in: ['PENDING', 'OVERDUE'] },
        offlineLoan: { isMirrorLoan: false },
      },
    }).catch(() => 0);

    const overdueEMIs = await db.offlineLoanEMI.count({
      where: {
        dueDate: { lt: todayStart },
        paymentStatus: 'PENDING',
        offlineLoan: { isMirrorLoan: false },
      },
    }).catch(() => 0);


    const stats = {
      totalActiveLoans: activeDisbursedLoans + offlineLoanCount,
      onlineLoanCount: activeDisbursedLoans,
      offlineLoanCount,
      totalCustomers,
      pendingLoans,
      closedLoans: closedOfflineLoans + closedOnlineLoans, // both online + offline closed
      closedOfflineLoans,
      closedOnlineLoans,
      totalCompanies,
      totalAgents,
      totalStaff,
      todayEMIs,
      overdueEMIs,
      generatedAt: new Date().toISOString(),
    };

    cache.set(cacheKey, stats, CacheTTL.SHORT);  // 30 seconds

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
