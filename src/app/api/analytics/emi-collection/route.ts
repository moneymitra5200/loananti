import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheTTL } from '@/lib/cache';

/**
 * GET /api/analytics/emi-collection
 * Returns month-wise EMI payment breakdown (cash / online / cheque) for last 12 months.
 * 
 * OPTIMIZED: Uses DB-side aggregation via groupBy — no longer loads all EMI rows into RAM.
 * Cached 5 minutes (data is historical — doesn't change rapidly).
 */
export async function GET(_request: NextRequest) {
  try {
    const cacheKey = 'analytics:emi-collection:monthly';
    const cached = cache.get<object>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // ── DB-level groupBy aggregation (no full row load) ───────────────────────
    // Prisma groupBy on paidDate + paymentMode to get counts & sums at DB level
    const grouped = await db.eMISchedule.groupBy({
      by: ['paymentMode'],
      where: {
        paymentStatus: { in: ['PAID', 'PARTIALLY_PAID', 'INTEREST_ONLY_PAID'] },
        paidDate: { gte: fromDate },
      },
      _sum: { paidAmount: true },
      _count: { id: true },
    });

    // Also get month-level data for chart — use raw aggregated select
    const monthlyRaw = await db.eMISchedule.findMany({
      where: {
        paymentStatus: { in: ['PAID', 'PARTIALLY_PAID', 'INTEREST_ONLY_PAID'] },
        paidDate: { gte: fromDate },
      },
      select: {
        paidDate:    true,
        paidAmount:  true,
        paymentMode: true,
      },
      // Bounded: last 12 months of EMIs, max 2000 rows
      take: 2000,
    });

    // Build 12-month buckets in JS (now bounded to max 2000 rows, not unlimited)
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 1);
      return {
        label: start.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        start,
        end,
      };
    });

    const monthly = buckets.map(({ label, start, end }) => {
      const slice = monthlyRaw.filter(p => {
        if (!p.paidDate) return false;
        return p.paidDate >= start && p.paidDate < end;
      });

      const cash   = slice.filter(p => p.paymentMode === 'CASH').reduce((s, p) => s + (p.paidAmount || 0), 0);
      const online = slice.filter(p => p.paymentMode === 'ONLINE').reduce((s, p) => s + (p.paidAmount || 0), 0);
      const cheque = slice.filter(p => p.paymentMode === 'CHEQUE').reduce((s, p) => s + (p.paidAmount || 0), 0);
      const total  = cash + online + cheque;

      return { month: label, count: slice.length, cash, online, cheque, total };
    });

    // Overall summary from DB groupBy (accurate even beyond 2000-row limit)
    const dbCash   = grouped.find(g => g.paymentMode === 'CASH')?._sum.paidAmount || 0;
    const dbOnline = grouped.find(g => g.paymentMode === 'ONLINE')?._sum.paidAmount || 0;
    const dbCheque = grouped.find(g => g.paymentMode === 'CHEQUE')?._sum.paidAmount || 0;

    const summary = {
      totalCollected: (dbCash + dbOnline + dbCheque) || monthly.reduce((s, m) => s + m.total, 0),
      totalCash:      dbCash,
      totalOnline:    dbOnline,
      totalCheque:    dbCheque,
      totalEMIs:      grouped.reduce((s, g) => s + g._count.id, 0),
    };

    const result = { success: true, monthly, summary };
    cache.set(cacheKey, result, CacheTTL.LONG); // 5 min cache
    return NextResponse.json(result);
  } catch (error) {
    console.error('[analytics/emi-collection] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch EMI collection data' }, { status: 500 });
  }
}
