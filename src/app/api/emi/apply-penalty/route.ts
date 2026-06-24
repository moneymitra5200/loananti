import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withRetry } from '@/lib/db-utils';


/**
 * Returns the penalty per day based on the loan's disbursed/approved amount.
 *
 * Tier table:
 *   ≤ 1,00,000 (1 L)             → ₹100 / day
 *   1,00,001 – 3,00,000 (1-3 L)  → ₹200 / day
 *   > 3,00,000 (3 L+)            → ₹100 × ceil(amount / 1,00,000) per day
 *                                   (so 3L=₹300, 4L=₹400, 5L=₹500 …)
 */
function getPenaltyPerDay(loanAmount: number): number {
  const lakhs = loanAmount / 100_000;
  if (lakhs <= 1) return 100;
  if (lakhs <= 3) return 200;
  return Math.ceil(lakhs) * 100;
}

/**
 * POST /api/emi/apply-penalty
 *
 * Called by a cron job or manually.
 * For every PENDING/PARTIALLY_PAID EMI whose dueDate has passed:
 *  1. Calculate days overdue
 *  2. Apply tiered penaltyPerDay * daysOverdue (capped if maxAmount set)
 *  3. Notify the customer if sendPenaltyNotify is enabled
 */
export async function POST(request: NextRequest) {
  try {
    // Get system settings (grace days, max cap, notify flags)
    let settings: any = await (db as any).systemSettings.findFirst();
    if (!settings) {
      settings = {
        penaltyGraceDays: 0,
        penaltyMaxAmount: null,
        sendPenaltyNotify: true,
        penaltyNotifyIntervalHrs: 24,
      };
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
            customer: { select: { id: true, name: true } },
            sessionForm: { select: { approvedAmount: true } }
          }
        }
      }
    });

    for (const emi of overdueOnlineEMIs) {
      const dueDate = new Date(emi.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysOverdue = Math.max(
        0,
        Math.floor((today.getTime() - dueDate.getTime()) / msPerDay) - (settings.penaltyGraceDays || 0)
      );

      if (daysOverdue <= 0) continue;

      // Determine tiered rate from the sanctioned loan amount
      const loanAmount = emi.loanApplication?.sessionForm?.approvedAmount || emi.totalAmount;
      const ratePerDay = getPenaltyPerDay(loanAmount);

      let newPenalty = daysOverdue * ratePerDay;
      if (settings.penaltyMaxAmount) {
        newPenalty = Math.min(newPenalty, settings.penaltyMaxAmount);
      }

      // Only update if penalty changed
      if (Math.abs(newPenalty - emi.penaltyAmount) > 0.01) {
        // ACID: update + notify atomically — if notify fails, penalty rollsback too
        await withRetry(() => db.$transaction(async (tx) => {
          await tx.eMISchedule.update({
            where: { id: emi.id },
            data: { penaltyAmount: newPenalty, daysOverdue, paymentStatus: 'OVERDUE' }
          });

          // Interest Reclassification (Dr 1305 / Cr 1301)
          if (emi.interestAccrued && emi.loanApplication?.companyId) {
            const unpaidAccrued = (emi.interestAmount || 0) - (emi.paidInterest || 0);
            if (unpaidAccrued > 0) {
              const existingReclass = await tx.journalEntry.findFirst({
                where: {
                  referenceType: 'INTEREST_RECLASSIFICATION',
                  referenceId: emi.id
                }
              });
              if (!existingReclass) {
                const { AccountingService } = await import('@/lib/accounting-service');
                const accSvc = new AccountingService(emi.loanApplication.companyId);
                await accSvc.initializeChartOfAccounts();
                await accSvc.recordInterestReclassification({
                  loanId: emi.loanApplicationId,
                  customerId: emi.loanApplication.customerId,
                  customerName: emi.loanApplication.customer?.name || 'Customer',
                  emiId: emi.id,
                  interestAmount: unpaidAccrued,
                  reclassDate: new Date(),
                  createdById: 'SYSTEM'
                }, tx);
                console.log(`[ApplyPenalty] Reclassified overdue interest of ₹${unpaidAccrued} to code 1305 for EMI ${emi.id}`);
              }
            }
          }

          if (settings.sendPenaltyNotify && emi.loanApplication?.customerId) {
            const existingNotif = await tx.notification.findFirst({
              where: {
                userId: emi.loanApplication.customerId,
                type: 'PENALTY_ADDED',
                data: { contains: emi.id },
                createdAt: { gte: new Date(Date.now() - (settings.penaltyNotifyIntervalHrs || 24) * 3600000) }
              }
            });
            if (!existingNotif) {
              await tx.notification.create({
                data: {
                  userId: emi.loanApplication.customerId,
                  type: 'PENALTY_ADDED',
                  category: 'EMI',
                  priority: 'HIGH',
                  title: `⚠️ EMI Penalty Updated — ${emi.loanApplication.applicationNo}`,
                  message: `Your EMI #${emi.installmentNumber} is ${daysOverdue} day(s) overdue. Penalty: ₹${newPenalty.toLocaleString('en-IN')} (₹${ratePerDay}/day).`,
                  data: JSON.stringify({ emiId: emi.id, loanId: emi.loanApplicationId, daysOverdue, penaltyAmount: newPenalty, ratePerDay }),
                  actionUrl: `/loan/${emi.loanApplicationId}`,
                  actionText: 'Pay Now'
                }
              });
            }
          }
        }));
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
            id: true, loanNumber: true, customerId: true, companyId: true,
            customerName: true, customerPhone: true,
            loanAmount: true
          }
        }
      }
    });

    for (const emi of overdueOfflineEMIs) {
      const dueDate = new Date(emi.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysOverdue = Math.max(
        0,
        Math.floor((today.getTime() - dueDate.getTime()) / msPerDay) - (settings.penaltyGraceDays || 0)
      );

      if (daysOverdue <= 0) continue;

      const loanAmount = emi.offlineLoan?.loanAmount || emi.totalAmount;
      const ratePerDay = getPenaltyPerDay(loanAmount);

      let newPenalty = daysOverdue * ratePerDay;
      if (settings.penaltyMaxAmount) {
        newPenalty = Math.min(newPenalty, settings.penaltyMaxAmount);
      }

      if (Math.abs(newPenalty - emi.penaltyAmount) > 0.01) {
        // ACID: update + notify atomically
        await withRetry(() => db.$transaction(async (tx) => {
          await (tx as any).offlineLoanEMI.update({
            where: { id: emi.id },
            data: { penaltyAmount: newPenalty, daysOverdue, paymentStatus: 'OVERDUE' }
          });
          if (settings.sendPenaltyNotify && emi.offlineLoan?.customerId) {
            const existingNotif = await tx.notification.findFirst({
              where: {
                userId: emi.offlineLoan.customerId,
                type: 'PENALTY_ADDED',
                data: { contains: emi.id },
                createdAt: { gte: new Date(Date.now() - (settings.penaltyNotifyIntervalHrs || 24) * 3600000) }
              }
            });
            if (!existingNotif) {
              await tx.notification.create({
                data: {
                  userId: emi.offlineLoan.customerId,
                  type: 'PENALTY_ADDED',
                  category: 'EMI',
                  priority: 'HIGH',
                  title: `⚠️ EMI Penalty — ${emi.offlineLoan.loanNumber}`,
                  message: `Your EMI #${emi.installmentNumber} is ${daysOverdue} day(s) overdue. Penalty: ₹${newPenalty.toLocaleString('en-IN')} (₹${ratePerDay}/day).`,
                  data: JSON.stringify({ emiId: emi.id, offlineLoanId: emi.offlineLoanId, daysOverdue, penaltyAmount: newPenalty, ratePerDay }),
                  actionUrl: `/offline-loan/${emi.offlineLoanId}`,
                  actionText: 'Pay Now'
                }
              });
            }
          }
        }));
        updatedOffline++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        updatedOnline,
        updatedOffline,
        total: updatedOnline + updatedOffline,
        tierFormula: '≤1L=₹100/day, 1-3L=₹200/day, >3L=₹100×ceil(lakhs)/day'
      }
    });
  } catch (error) {
    console.error('[ApplyPenalty] Error:', error);
    return NextResponse.json({
      error: 'Failed to apply penalties',
      details: error instanceof Error ? error.message : 'Unknown'
    }, { status: 500 });
  }
}

// GET — Check penalty for a specific EMI (useful for debugging)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const emiId = searchParams.get('emiId');
  const type = searchParams.get('type') || 'online'; // online | offline

  if (!emiId) return NextResponse.json({ error: 'emiId required' }, { status: 400 });

  try {
    let settings: any = await (db as any).systemSettings.findFirst();
    if (!settings) settings = { penaltyGraceDays: 0, penaltyMaxAmount: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let emi: any;
    if (type === 'offline') {
      emi = await (db as any).offlineLoanEMI.findUnique({
        where: { id: emiId },
        include: { offlineLoan: { select: { loanAmount: true } } }
      });
    } else {
      emi = await db.eMISchedule.findUnique({
        where: { id: emiId },
        include: { loanApplication: { select: { sessionForm: { select: { approvedAmount: true } } } } }
      });
    }

    if (!emi) return NextResponse.json({ error: 'EMI not found' }, { status: 404 });

    const dueDate = new Date(emi.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysOverdue = Math.max(
      0,
      Math.floor((today.getTime() - dueDate.getTime()) / msPerDay) - (settings.penaltyGraceDays || 0)
    );

    const loanAmount = type === 'offline'
      ? (emi.offlineLoan?.loanAmount || emi.totalAmount)
      : (emi.loanApplication?.sessionForm?.approvedAmount || emi.totalAmount);
    const ratePerDay = getPenaltyPerDay(loanAmount);
    const calculatedPenalty = Math.min(
      daysOverdue * ratePerDay,
      settings.penaltyMaxAmount || Infinity
    );

    return NextResponse.json({
      success: true,
      emiId,
      daysOverdue,
      storedPenalty: emi.penaltyAmount,
      calculatedPenalty,
      ratePerDay,
      loanAmount,
      tierFormula: '≤1L=₹100/day, 1-3L=₹200/day, >3L=₹100×ceil(lakhs)/day',
      total: (emi.totalAmount - (emi.paidAmount || 0)) + calculatedPenalty
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate penalty' }, { status: 500 });
  }
}
