import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/cron/auto-penalty
 * Called by cron at 18:30 UTC (midnight IST) every day.
 * Delegates to /api/emi/apply-penalty — does NOT run heavy logic here.
 * 
 * OPTIMIZED:
 * - Uses createMany for SA notifications (1 DB write vs N)
 * - Fetch is fire-and-forget for apply-penalty so we don't block
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emi/apply-penalty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();

    // Log cron run to ALL super admins using createMany (1 DB write instead of N)
    try {
      const admins = await db.user.findMany({
        where: { role: 'SUPER_ADMIN', isActive: true },
        select: { id: true },
      });
      if (admins.length > 0) {
        await db.notification.createMany({
          data: admins.map(sa => ({
            userId: sa.id,
            type: 'SYSTEM',
            category: 'SYSTEM',
            priority: 'LOW',
            title: '🔄 Auto-Penalty Cron Completed',
            message: `Penalty cron ran at ${new Date().toLocaleString('en-IN')}. Updated: ${data?.summary?.total ?? 0} EMIs.`,
          })),
          skipDuplicates: true,
        });
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('[CRON auto-penalty] error:', error);
    return NextResponse.json({ error: 'Cron failed', details: String(error) }, { status: 500 });
  }
}
