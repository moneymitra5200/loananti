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

    // ── 1. Online EMIs (eMISchedule) ──────────────────────────────────────────
    // Query EMIs due within the next 35 days to optimize DB performance, then filter by start of period
    const date35DaysFromNow = new Date();
    date35DaysFromNow.setDate(date35DaysFromNow.getDate() + 35);

    const pendingEMIs = await db.eMISchedule.findMany({
      where: {
        dueDate: { lte: date35DaysFromNow },
        interestAccrued: false,
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] },
        interestAmount: { gt: 0 }
      },
      include: {
        loanApplication: {
          include: {
            customer: true,
            emiSchedules: {
              select: { installmentNumber: true, dueDate: true }
            }
          }
        }
      }
    });

    let successCount = 0;
    const errors: any[] = [];

    for (const emi of pendingEMIs) {
      try {
        if (!emi.loanApplication.companyId) continue;

        // Accrual trigger date is disbursement date for EMI #1, previous EMI due date for EMI #N
        let accrualTriggerDate = emi.loanApplication.disbursedAt || emi.loanApplication.createdAt || new Date();
        if (emi.installmentNumber > 1) {
          const prevEmi = emi.loanApplication.emiSchedules.find(
            e => e.installmentNumber === emi.installmentNumber - 1
          );
          if (prevEmi) {
            accrualTriggerDate = prevEmi.dueDate;
          }
        }

        // Only accrue if the period has started
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

        successCount++;
      } catch (err: any) {
        errors.push({ emiId: emi.id, error: err.message });
        console.error(`Failed to accrue interest for online EMI ${emi.id}:`, err);
      }
    }

    // ── 2. Offline EMIs (offlineLoanEMI) ───────────────────────────────────────
    // Query offline EMIs due within next 35 days that belong to FULL accounting companies
    const pendingOfflineEMIs = await db.offlineLoanEMI.findMany({
      where: {
        dueDate: { lte: date35DaysFromNow },
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] },
        interestAmount: { gt: 0 },
        offlineLoan: {
          companyId: { not: null },
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
              select: { installmentNumber: true, dueDate: true }
            }
          }
        }
      }
    });

    for (const emi of pendingOfflineEMIs) {
      try {
        const companyId = emi.offlineLoan.companyId!;

        // Accrual trigger date is disbursement date for EMI #1, previous EMI due date for EMI #N
        let accrualTriggerDate = emi.offlineLoan.disbursementDate || new Date();
        if (emi.installmentNumber > 1) {
          const prevEmi = emi.offlineLoan.emis.find(
            e => e.installmentNumber === emi.installmentNumber - 1
          );
          if (prevEmi) {
            accrualTriggerDate = prevEmi.dueDate;
          }
        }

        // Only accrue if the period has started
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
            accrualDate: new Date(),
            createdById: 'SYSTEM'
          }, tx);
        }, { maxWait: 25000, timeout: 50000 });

        successCount++;
      } catch (err: any) {
        errors.push({ emiId: emi.id, error: err.message });
        console.error(`Failed to accrue interest for offline EMI ${emi.id}:`, err);
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
            message: `Accrual cron ran at ${new Date().toLocaleString('en-IN')}. Accrued interest for ${successCount} EMIs (online/offline).`,
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
