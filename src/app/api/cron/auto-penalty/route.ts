import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/cron/auto-penalty
 * Called by Vercel Cron at 18:30 UTC (midnight IST) every day.
 * Secured by Vercel Authorization header or optional CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  // Vercel sets Authorization: Bearer <CRON_SECRET> on cron calls
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Delegate to existing penalty logic inline (keep it DRY by calling the same code)
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/emi/apply-penalty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();

    // Log cron run
    try {
      const sa = await db.user.findFirst({ where: { role: 'SUPER_ADMIN', isActive: true }, select: { id: true } });
      if (sa) {
        await db.notification.create({
          data: {
            userId: sa.id,
            type: 'SYSTEM',
            category: 'SYSTEM',
            priority: 'LOW',
            title: '🔄 Auto-Penalty Cron Completed',
            message: `Penalty cron ran at ${new Date().toLocaleString('en-IN')}. Updated: ${data?.summary?.total ?? 0} EMIs. ₹${data?.summary?.penaltyPerDay ?? 100}/day applied to all overdue EMIs.`,
          },
        });
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('[CRON auto-penalty] error:', error);
    return NextResponse.json({ error: 'Cron failed', details: String(error) }, { status: 500 });
  }
}
