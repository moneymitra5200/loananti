import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AccountingService } from '@/lib/accounting-service';

/**
 * GET /api/cron/accrue-interest
 * Called by cron daily.
 * Accrues interest for EMIs that are due today or earlier and haven't been accrued yet.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Find EMIs that are due and haven't had interest accrued
    const dueEMIs = await db.eMISchedule.findMany({
      where: {
        dueDate: { lte: today },
        interestAccrued: false,
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] },
        interestAmount: { gt: 0 }
      },
      include: {
        loanApplication: {
          include: { customer: true }
        }
      }
    });

    let successCount = 0;
    const errors: any[] = [];

    for (const emi of dueEMIs) {
      try {
        if (!emi.loanApplication.companyId) continue;

        // Perform accrual in a transaction
        await db.$transaction(async (tx) => {
          const accSvc = new AccountingService(emi.loanApplication.companyId!);
          
          await accSvc.recordInterestAccrual({
            loanId: emi.loanApplicationId,
            customerId: emi.loanApplication.customerId,
            customerName: `${emi.loanApplication.customer.name || ''}`.trim() || 'Customer',
            emiId: emi.id,
            interestAmount: emi.interestAmount,
            accrualDate: new Date(),
            createdById: 'SYSTEM'
          }, tx);

          // Mark EMI as accrued
          await tx.eMISchedule.update({
            where: { id: emi.id },
            data: {
              interestAccrued: true,
              accruedAt: new Date()
            }
          });
        });

        successCount++;
      } catch (err: any) {
        errors.push({ emiId: emi.id, error: err.message });
        console.error(`Failed to accrue interest for EMI ${emi.id}:`, err);
      }
    }

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
            message: `Accrual cron ran at ${new Date().toLocaleString('en-IN')}. Accrued interest for ${successCount} EMIs.`,
          })),
          skipDuplicates: true,
        });
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ 
      success: true, 
      processed: successCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('[CRON accrue-interest] error:', error);
    return NextResponse.json({ error: 'Cron failed', details: String(error) }, { status: 500 });
  }
}
