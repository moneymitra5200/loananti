import { db } from './db';
import { AccountingService } from './accounting-service';
import { cache } from './cache';

/**
 * Perform real-time interest accrual for all due online and offline EMIs.
 * This runs on-demand (e.g. before loading ledger statements) to ensure 
 * that interest entries are recorded instantly without waiting for a daily cron.
 */
export async function performOnDemandAccrual(filterCompanyId?: string | null): Promise<{ processedCount: number }> {
  let processedCount = 0;

  // Use UTC end-of-day to avoid IST timezone edge cases.
  // Problem: setHours(23,59,59,999) in IST = 18:29:59 UTC, while "July 10 midnight IST" = July 9 18:30:00 UTC.
  // This causes a 1-second gap where the IST end-of-day and the next month's EMI due date (in UTC) are nearly equal.
  // Fix: explicitly set to end of UTC day, ensuring a full day buffer.
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

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
          status: { in: ['ACTIVE', 'ACTIVE_INTEREST_ONLY', 'DISBURSED'] },
          ...(filterCompanyId ? { companyId: filterCompanyId } : {})
        }
      },
      include: {
        loanApplication: {
          include: {
            customer: true,
            sessionForm: {
              select: { approvedAmount: true }
            },
            emiSchedules: {
              select: { installmentNumber: true, dueDate: true, paymentStatus: true }
            }
          }
        }
      }
    });

    for (const emi of pendingEMIs) {
      try {
        const originalCompanyId = emi.loanApplication.companyId;
        if (!originalCompanyId) continue;

        // Only accrue if the due date has arrived/passed
        let accrualTriggerDate = emi.dueDate;
        if (accrualTriggerDate > today) {
          continue;
        }

        // ── Mirror-aware accrual routing for online loans ──────────────────────
        const mirrorMap = await db.mirrorLoanMapping.findFirst({
          where: { originalLoanId: emi.loanApplicationId, isOfflineLoan: false },
          select: { mirrorCompanyId: true, mirrorInterestRate: true, mirrorLoanId: true }
        });

        const hasMirror = !!(mirrorMap?.mirrorCompanyId);
        const targetCompanyId = hasMirror ? mirrorMap!.mirrorCompanyId : originalCompanyId;

        // Check if interest has already been accrued for this online EMI
        // in EITHER company to prevent duplicates across mirror/original boundaries.
        const existingAccrual = await db.journalEntry.findFirst({
          where: {
            companyId: { in: [originalCompanyId, ...(hasMirror ? [mirrorMap!.mirrorCompanyId] : [])] },
            referenceType: 'INTEREST_ACCRUAL',
            referenceId: emi.id,
            isReversed: false
          }
        });

        if (existingAccrual) {
          if (!emi.interestAccrued) {
            await db.eMISchedule.update({
              where: { id: emi.id },
              data: {
                interestAccrued: true,
                accruedAt: new Date()
              }
            });
          }
          continue; // Already accrued, skip
        }

        // For mirrored loans: use mirror interest rate if available
        const principalAmount = emi.loanApplication.sessionForm?.approvedAmount || emi.loanApplication.requestedAmount;
        const interestAmount = hasMirror && mirrorMap!.mirrorInterestRate
          ? Math.round((principalAmount * mirrorMap!.mirrorInterestRate / 100 / 12) * 100) / 100
          : emi.interestAmount;

        // loanId for JE lines: use mirror loan ID when recording in mirror company
        // so personal ledger queries can find these entries.
        const targetLoanId = hasMirror && mirrorMap!.mirrorLoanId ? mirrorMap!.mirrorLoanId : emi.loanApplicationId;

        // Perform accrual in a transaction in the TARGET company (mirror if mapped)
        await db.$transaction(async (tx) => {
          const accSvc = new AccountingService(targetCompanyId);
          // Cap accrualDate to today — NEVER create a future-dated journal entry
          const accrualDate = emi.dueDate <= new Date() ? emi.dueDate : new Date();
          await accSvc.recordInterestAccrual({
            loanId: targetLoanId,
            customerId: emi.loanApplication.customerId,
            customerName: `${emi.loanApplication.customer.name || ''}`.trim() || 'Customer',
            emiId: emi.id,
            interestAmount,
            accrualDate,   // ← EMI due date if past/today, today if EMI date is future (safety)
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
          companyId: filterCompanyId ? filterCompanyId : { not: null },
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
        const originalCompanyId = emi.offlineLoan.companyId!;

        // Only accrue if the due date has arrived/passed
        let accrualTriggerDate = emi.dueDate;
        if (accrualTriggerDate > today) {
          continue;
        }

        // ── Mirror-aware accrual routing ──────────────────────────────────────
        // For mirrored offline loans, the payment flow creates INTEREST_ACCRUAL in
        // the MIRROR company. If we only check the original company, we'll create a
        // duplicate "ghost" accrual on every personal-ledger page load.
        // Fix: resolve the mirror mapping and check BOTH companies before accruing.
        const mirrorMap = await db.mirrorLoanMapping.findFirst({
          where: { originalLoanId: emi.offlineLoanId, isOfflineLoan: true },
          select: { mirrorCompanyId: true, mirrorInterestRate: true, mirrorLoanId: true }
        });

        const hasMirror = !!(mirrorMap?.mirrorCompanyId);
        const targetCompanyId = hasMirror ? mirrorMap!.mirrorCompanyId : originalCompanyId;

        // Check if interest has already been accrued for this offline EMI
        // in EITHER company to prevent duplicates across mirror/original boundaries.
        const existingAccrual = await db.journalEntry.findFirst({
          where: {
            companyId: { in: [originalCompanyId, ...(hasMirror ? [mirrorMap!.mirrorCompanyId] : [])] },
            referenceType: 'INTEREST_ACCRUAL',
            referenceId: emi.id,
            isReversed: false
          }
        });

        if (existingAccrual) {
          continue; // Already accrued (in original or mirror company), skip
        }

        // For mirrored loans: use mirror interest rate if available
        const interestAmount = hasMirror && mirrorMap!.mirrorInterestRate
          ? Math.round((emi.offlineLoan.loanAmount * mirrorMap!.mirrorInterestRate / 100 / 12) * 100) / 100
          : emi.interestAmount;

        // loanId for JE lines: use mirror loan ID when recording in mirror company
        // so personal ledger queries (by mirrorLoanId) can find these entries.
        const targetLoanId = hasMirror && mirrorMap!.mirrorLoanId ? mirrorMap!.mirrorLoanId : emi.offlineLoanId;

        // Perform accrual in a transaction in the TARGET company (mirror if mapped)
        await db.$transaction(async (tx) => {
          const accSvc = new AccountingService(targetCompanyId);
          // Cap accrualDate to today — NEVER create a future-dated journal entry
          const accrualDate = emi.dueDate <= new Date() ? emi.dueDate : new Date();
          await accSvc.recordInterestAccrual({
            loanId: targetLoanId,
            customerId: emi.offlineLoan.customerId || `offline_${emi.offlineLoanId}`,
            customerName: emi.offlineLoan.customerName || 'Customer',
            emiId: emi.id,
            interestAmount,
            accrualDate,   // ← EMI due date if past/today, today if EMI date is future (safety)
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
