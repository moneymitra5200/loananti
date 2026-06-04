import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { performOnDemandAccrual } from '@/lib/accrual-helper';

/**
 * GET /api/cron/accrue-interest
 * Called by cron daily.
 * Accrues interest at the start of each EMI month (accrualTriggerDate <= today).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { processedCount } = await performOnDemandAccrual();

    // Log cron run to super admins
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
            title: '💰 Interest Accrual Cron Completed',
            message: `Accrual cron ran at ${new Date().toLocaleString('en-IN')}. Accrued interest for ${processedCount} EMIs (online/offline).`,
          })),
          skipDuplicates: true,
        });
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ 
      success: true, 
      processed: processedCount
    });
  } catch (error) {
    console.error('[CRON accrue-interest] error:', error);
    return NextResponse.json({ error: 'Cron failed', details: String(error) }, { status: 500 });
  }
}
