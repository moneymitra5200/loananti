import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/analytics/emi-collection
 * Returns month-wise EMI payment breakdown (cash / online / cheque) for the last 12 months.
 * Used by AnalyticsSection → EMI Collection tab.
 */
export async function GET(_request: NextRequest) {
  try {
    const now = new Date();

    // Build 12-month buckets
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const end   = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 1);
      return {
        label: start.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        start,
        end,
      };
    });

    // Fetch all paid EMIs in the 12-month window
    const fromDate = buckets[0].start;
    const payments = await db.eMISchedule.findMany({
      where: {
        paymentStatus: { in: ['PAID', 'PARTIALLY_PAID', 'INTEREST_ONLY_PAID'] },
        paidDate: { gte: fromDate },
      },
      select: {
        paidDate:    true,
        paidAmount:  true,
        paymentMode: true,
      },
    });

    // Aggregate into buckets
    const monthly = buckets.map(({ label, start, end }) => {
      const slice = payments.filter(p => {
        if (!p.paidDate) return false;
        return p.paidDate >= start && p.paidDate < end;
      });

      const cash   = slice.filter(p => p.paymentMode === 'CASH').reduce((s, p) => s + (p.paidAmount || 0), 0);
      const online = slice.filter(p => p.paymentMode === 'ONLINE').reduce((s, p) => s + (p.paidAmount || 0), 0);
      const cheque = slice.filter(p => p.paymentMode === 'CHEQUE').reduce((s, p) => s + (p.paidAmount || 0), 0);
      const total  = cash + online + cheque;

      return { month: label, count: slice.length, cash, online, cheque, total };
    });

    // Overall summary
    const summary = {
      totalCollected: monthly.reduce((s, m) => s + m.total, 0),
      totalCash:      monthly.reduce((s, m) => s + m.cash, 0),
      totalOnline:    monthly.reduce((s, m) => s + m.online, 0),
      totalCheque:    monthly.reduce((s, m) => s + m.cheque, 0),
      totalEMIs:      monthly.reduce((s, m) => s + m.count, 0),
    };

    return NextResponse.json({ success: true, monthly, summary });
  } catch (error) {
    console.error('[analytics/emi-collection] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch EMI collection data' }, { status: 500 });
  }
}
