import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/emi/apply-penalty
 * 
 * Called by a cron job or manually.
 * For every PENDING/PARTIALLY_PAID EMI whose dueDate has passed:
 *  1. Calculate days overdue
 *  2. Apply penaltyPerDay * daysOverdue (capped if maxAmount set)
 *  3. Notify the customer if sendPenaltyNotify is enabled
 *  4. Notify the roles that handled that loan
 */
export async function POST(request: NextRequest) {
  try {
    // Get system settings
    let settings: any = await (db as any).systemSettings.findFirst();
    if (!settings) {
      settings = { penaltyPerDay: 100, penaltyGraceDays: 0, penaltyMaxAmount: null, sendPenaltyNotify: true };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let updatedOnline = 0;
    let updatedOffline = 0;

    // ── Online EMIs (EMISchedule) ──────────────────────────────────────────────
    const overdueOnlineEMIs = await db.eMISchedule.findMany({
      where: {
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
        dueDate: { lt: today }
      },
      include: {
        loanApplication: {
          select: {
            id: true, applicationNo: true, customerId: true, companyId: true,
            customer: { select: { id: true, name: true } }
          }
        }
      }
    });

    for (const emi of overdueOnlineEMIs) {
      const dueDate = new Date(emi.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / msPerDay) - settings.penaltyGraceDays);

      if (daysOverdue <= 0) continue;

      let newPenalty = daysOverdue * settings.penaltyPerDay;
      if (settings.penaltyMaxAmount) {
        newPenalty = Math.min(newPenalty, settings.penaltyMaxAmount);
      }

      // Only update if penalty changed
      if (Math.abs(newPenalty - emi.penaltyAmount) > 0.01) {
        await db.eMISchedule.update({
          where: { id: emi.id },
          data: {
            penaltyAmount: newPenalty,
            daysOverdue,
            paymentStatus: 'OVERDUE'
          }
        });

        // Notify customer if penalty increased
        if (settings.sendPenaltyNotify && emi.loanApplication?.customerId) {
          const existingNotif = await db.notification.findFirst({
            where: {
              userId: emi.loanApplication.customerId,
              type: 'PENALTY_ADDED',
              data: { contains: emi.id },
              createdAt: { gte: new Date(Date.now() - settings.penaltyNotifyIntervalHrs * 3600000) }
            }
          });

          if (!existingNotif) {
            await db.notification.create({
              data: {
                userId: emi.loanApplication.customerId,
                type: 'PENALTY_ADDED',
                category: 'EMI',
                priority: 'HIGH',
                title: `⚠️ EMI Penalty Updated — ${emi.loanApplication.applicationNo}`,
                message: `Your EMI #${emi.installmentNumber} is ${daysOverdue} day(s) overdue. Current penalty: ₹${newPenalty.toLocaleString('en-IN')}. Total due: ₹${(emi.totalAmount - emi.paidAmount + newPenalty).toLocaleString('en-IN')}. Please pay immediately to avoid further penalty.`,
                data: JSON.stringify({ emiId: emi.id, loanId: emi.loanApplicationId, daysOverdue, penaltyAmount: newPenalty }),
                actionUrl: `/loan/${emi.loanApplicationId}`,
                actionText: 'Pay Now'
              }
            });
          }
        }
        updatedOnline++;
      }
    }

    // ── Offline EMIs (OfflineLoanEMI) ─────────────────────────────────────────
    const overdueOfflineEMIs = await (db as any).offlineLoanEMI.findMany({
      where: {
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
        dueDate: { lt: today }
      },
      include: {
        offlineLoan: {
          select: {
            id: true, loanNumber: true, customerId: true, companyId: true, customerName: true, customerPhone: true
          }
        }
      }
    });

    for (const emi of overdueOfflineEMIs) {
      const dueDate = new Date(emi.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / msPerDay) - settings.penaltyGraceDays);

      if (daysOverdue <= 0) continue;

      let newPenalty = daysOverdue * settings.penaltyPerDay;
      if (settings.penaltyMaxAmount) {
        newPenalty = Math.min(newPenalty, settings.penaltyMaxAmount);
      }

      if (Math.abs(newPenalty - emi.penaltyAmount) > 0.01) {
        await (db as any).offlineLoanEMI.update({
          where: { id: emi.id },
          data: { penaltyAmount: newPenalty, daysOverdue, paymentStatus: 'OVERDUE' }
        });

        // Notify if linked customer
        if (settings.sendPenaltyNotify && emi.offlineLoan?.customerId) {
          const existingNotif = await db.notification.findFirst({
            where: {
              userId: emi.offlineLoan.customerId,
              type: 'PENALTY_ADDED',
              data: { contains: emi.id },
              createdAt: { gte: new Date(Date.now() - settings.penaltyNotifyIntervalHrs * 3600000) }
            }
          });

          if (!existingNotif) {
            await db.notification.create({
              data: {
                userId: emi.offlineLoan.customerId,
                type: 'PENALTY_ADDED',
                category: 'EMI',
                priority: 'HIGH',
                title: `⚠️ EMI Penalty — ${emi.offlineLoan.loanNumber}`,
                message: `Your EMI #${emi.installmentNumber} is ${daysOverdue} day(s) overdue. Penalty: ₹${newPenalty.toLocaleString('en-IN')}. Pay immediately to avoid further charges.`,
                data: JSON.stringify({ emiId: emi.id, offlineLoanId: emi.offlineLoanId, daysOverdue, penaltyAmount: newPenalty }),
                actionUrl: `/offline-loan/${emi.offlineLoanId}`,
                actionText: 'Pay Now'
              }
            });
          }
        }
        updatedOffline++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        updatedOnline,
        updatedOffline,
        total: updatedOnline + updatedOffline,
        penaltyPerDay: settings.penaltyPerDay
      }
    });
  } catch (error) {
    console.error('[ApplyPenalty] Error:', error);
    return NextResponse.json({ error: 'Failed to apply penalties', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}

// GET — Check penalty for a specific EMI
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const emiId = searchParams.get('emiId');
  const type = searchParams.get('type') || 'online'; // online | offline

  if (!emiId) return NextResponse.json({ error: 'emiId required' }, { status: 400 });

  try {
    let settings: any = await (db as any).systemSettings.findFirst();
    if (!settings) settings = { penaltyPerDay: 100, penaltyGraceDays: 0, penaltyMaxAmount: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let emi: any;
    if (type === 'offline') {
      emi = await (db as any).offlineLoanEMI.findUnique({ where: { id: emiId } });
    } else {
      emi = await db.eMISchedule.findUnique({ where: { id: emiId } });
    }

    if (!emi) return NextResponse.json({ error: 'EMI not found' }, { status: 404 });

    const dueDate = new Date(emi.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / msPerDay) - settings.penaltyGraceDays);
    const calculatedPenalty = Math.min(
      daysOverdue * settings.penaltyPerDay,
      settings.penaltyMaxAmount || Infinity
    );

    return NextResponse.json({
      success: true,
      emiId,
      daysOverdue,
      storedPenalty: emi.penaltyAmount,
      calculatedPenalty,
      penaltyPerDay: settings.penaltyPerDay,
      total: (emi.totalAmount - (emi.paidAmount || 0)) + calculatedPenalty
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate penalty' }, { status: 500 });
  }
}
