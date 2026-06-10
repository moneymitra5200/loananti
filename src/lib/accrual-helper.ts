import { db } from './db';
import { AccountingService } from './accounting-service';
import { cache } from './cache';

/**
 * Perform real-time interest accrual for all due online and offline EMIs.
 * This runs on-demand (e.g. before loading ledger statements) to ensure 
 * that interest entries are recorded instantly without waiting for a daily cron.
 */
export async function performOnDemandAccrual(): Promise<{ processedCount: number }> {
  let processedCount = 0;
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const date35DaysFromNow = new Date();
  date35DaysFromNow.setDate(date35DaysFromNow.getDate() + 35);

  try {
    // ── 1. Online EMIs (eMISchedule) ──────────────────────────────────────────
    const pendingEMIs = await db.eMISchedule.findMany({
      where: {
        dueDate: { lte: today },
        interestAccrued: false,
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] },
        interestAmount: { gt: 0 },
        loanApplication: {
          status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED'] }
        }
      },
      include: {
        loanApplication: {
          include: {
            customer: true,
            emiSchedules: {
              select: { installmentNumber: true, dueDate: true, paymentStatus: true }
            }
          }
        }
      }
    });

    for (const emi of pendingEMIs) {
      try {
        if (!emi.loanApplication.companyId) continue;

        // Only accrue if the due date has arrived/passed
        let accrualTriggerDate = emi.dueDate;
        if (accrualTriggerDate > today) {
          continue;
        }

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
        }, { maxWait: 25000, timeout: 50000 });

        processedCount++;
      } catch (err: any) {
        console.error(`[OnDemandAccrual] Failed for online EMI ${emi.id}:`, err);
      }
    }

    // ── 2. Offline EMIs (offlineLoanEMI) ───────────────────────────────────────
    const pendingOfflineEMIs = await db.offlineLoanEMI.findMany({
      where: {
        dueDate: { lte: today },
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] },
        interestAmount: { gt: 0 },
        offlineLoan: {
          companyId: { not: null },
          // Phase 1 INTEREST_ONLY loans ARE included — accrual must happen when due date passes
          // (the dueDate <= today filter above already guards against pre-emptive accruals).
          // Accrual rule: Dr Interest Receivable (1301) / Cr Interest Income (4110) on due date.
          status: { in: ['ACTIVE', 'INTEREST_ONLY', 'DEFAULTED', 'RESTRUCTURED'] },
          company: {
            accountingType: 'FULL'
          }
        }
      },
      include: {
        offlineLoan: {
          include: {
            company: true,
            emis: {
              select: { installmentNumber: true, dueDate: true, paymentStatus: true }
            }
          }
        }
      }
    });

    for (const emi of pendingOfflineEMIs) {
      try {
        const companyId = emi.offlineLoan.companyId!;

        // Only accrue if the due date has arrived/passed
        let accrualTriggerDate = emi.dueDate;
        if (accrualTriggerDate > today) {
          continue;
        }

        // Check if interest has already been accrued for this offline EMI
        const existingAccrual = await db.journalEntry.findFirst({
          where: {
            companyId,
            referenceType: 'INTEREST_ACCRUAL',
            referenceId: emi.id,
            isReversed: false
          }
        });

        if (existingAccrual) {
          continue; // Already accrued, skip
        }

        // Perform accrual in a transaction
        await db.$transaction(async (tx) => {
          const accSvc = new AccountingService(companyId);
          
          await accSvc.recordInterestAccrual({
            loanId: emi.offlineLoanId,
            customerId: emi.offlineLoan.customerId || `offline_${emi.offlineLoanId}`,
            customerName: emi.offlineLoan.customerName || 'Customer',
            emiId: emi.id,
            interestAmount: emi.interestAmount,
            accrualDate: emi.dueDate,
            createdById: 'SYSTEM'
          }, tx);
        }, { maxWait: 25000, timeout: 50000 });

        processedCount++;
      } catch (err: any) {
        console.error(`[OnDemandAccrual] Failed for offline EMI ${emi.id}:`, err);
      }
    }

    // Invalidate cached accountant reports if new accrual transactions were recorded
    if (processedCount > 0) {
      cache.deletePattern('accountant:');
    }
  } catch (error) {
    console.error('[OnDemandAccrual] Error during real-time accrual check:', error);
  }

  return { processedCount };
}
