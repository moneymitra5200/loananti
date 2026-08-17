import { addMonthsSafe } from '@/utils/helpers';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Change EMI due date and shift all subsequent EMIs (OPTIMIZED)
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid JSON in request body' 
      }, { status: 400 });
    }
    
    const { emiId, newDueDate, reason, userId } = body;

    if (!emiId || !newDueDate || !reason) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields',
        required: ['emiId', 'newDueDate', 'reason']
      }, { status: 400 });
    }

    const actionUserId = userId || 'SYSTEM';
    let userRole = 'SYSTEM';
    if (actionUserId !== 'SYSTEM') {
      const user = await db.user.findUnique({
        where: { id: actionUserId },
        select: { role: true }
      });
      if (user) {
        userRole = user.role;
      }
    }

    console.log(`[EMI Date Change] Starting for EMI: ${emiId}, new date: ${newDueDate}`);

    // Get EMI details (check online first)
    let emi = await db.eMISchedule.findUnique({
      where: { id: emiId },
      select: { id: true, loanApplicationId: true, installmentNumber: true, dueDate: true, originalDueDate: true, paymentStatus: true }
    }) as any;

    let isOffline = false;
    if (!emi) {
      const offlineEmi = await db.offlineLoanEMI.findUnique({
        where: { id: emiId },
        select: { id: true, offlineLoanId: true, installmentNumber: true, dueDate: true, originalDueDate: true, paymentStatus: true }
      });
      if (offlineEmi) {
        isOffline = true;
        emi = {
          id: offlineEmi.id,
          loanApplicationId: offlineEmi.offlineLoanId,
          installmentNumber: offlineEmi.installmentNumber,
          dueDate: offlineEmi.dueDate,
          originalDueDate: offlineEmi.originalDueDate,
          paymentStatus: offlineEmi.paymentStatus
        };
      }
    }

    if (!emi) {
      return NextResponse.json({ success: false, error: 'EMI not found' }, { status: 404 });
    }

    if (emi.paymentStatus === 'PAID') {
      return NextResponse.json({ success: false, error: 'Cannot change date of paid EMI' }, { status: 400 });
    }

    const oldDueDate = new Date(emi.dueDate);
    const newDate = new Date(newDueDate);

    if (isNaN(newDate.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid date format' }, { status: 400 });
    }

    oldDueDate.setHours(12, 0, 0, 0);
    newDate.setHours(12, 0, 0, 0);

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysDiff = Math.round((newDate.getTime() - oldDueDate.getTime()) / msPerDay);

    console.log(`[EMI Date Change] EMI #${emi.installmentNumber}, Days diff: ${daysDiff}`);

    if (daysDiff === 0) {
      return NextResponse.json({
        success: true,
        message: 'No date change needed - same date selected',
        daysShifted: 0,
        totalEMIsUpdated: 0
      });
    }

    // Run subsequent EMIs and mirror mapping in parallel
    const [subsequentEmis, mirrorMapping] = await Promise.all([
      isOffline
        ? db.offlineLoanEMI.findMany({
            where: {
              offlineLoanId: emi.loanApplicationId,
              installmentNumber: { gt: emi.installmentNumber },
              paymentStatus: { not: 'PAID' }
            },
            select: { id: true, installmentNumber: true, dueDate: true, originalDueDate: true }
          })
        : db.eMISchedule.findMany({
            where: {
              loanApplicationId: emi.loanApplicationId,
              installmentNumber: { gt: emi.installmentNumber },
              paymentStatus: { not: 'PAID' }
            },
            select: { id: true, installmentNumber: true, dueDate: true, originalDueDate: true }
          }),
      db.mirrorLoanMapping.findFirst({
        where: isOffline 
          ? { originalLoanId: emi.loanApplicationId, isOfflineLoan: true }
          : { originalLoanId: emi.loanApplicationId },
        select: { mirrorLoanId: true }
      })
    ]);

    console.log(`[EMI Date Change] Found ${subsequentEmis.length} subsequent EMIs to shift`);

    // Update main EMI
    if (isOffline) {
      await db.offlineLoanEMI.update({
        where: { id: emiId },
        data: {
          dueDate: newDate,
          originalDueDate: emi.originalDueDate || oldDueDate,
          notes: `Date changed from ${oldDueDate.toISOString().split('T')[0]} to ${newDate.toISOString().split('T')[0]}. Reason: ${reason}`
        }
      });
    } else {
      await db.eMISchedule.update({
        where: { id: emiId },
        data: {
          dueDate: newDate,
          originalDueDate: emi.originalDueDate || oldDueDate,
          notes: `Date changed from ${oldDueDate.toISOString().split('T')[0]} to ${newDate.toISOString().split('T')[0]}. Reason: ${reason}`
        }
      });
    }

    // We compute the new dates sequentially by adding months
    function addMonths(date: Date, months: number) {
      const d = new Date(date);
      const day = d.getDate();
      d.setMonth(d.getMonth() + months);
      if (d.getDate() !== day) {
        d.setDate(0);
      }
      return d;
    }

    const updates: any[] = [];
    const mirrorUpdates: any[] = [];
    
    // Sort subsequent EMIs by installment number just to be safe
    subsequentEmis.sort((a, b) => a.installmentNumber - b.installmentNumber);

    for (let i = 0; i < subsequentEmis.length; i++) {
      const sEmi = subsequentEmis[i];
      const nextDate = addMonthsSafe(newDate, i + 1, newDate.getDate());
      nextDate.setHours(12, 0, 0, 0);
      
      updates.push(
        isOffline
          ? db.offlineLoanEMI.update({
              where: { id: sEmi.id },
              data: {
                dueDate: nextDate,
                originalDueDate: sEmi.originalDueDate || sEmi.dueDate,
                notes: `Auto-shifted to match new day of month (from EMI #${emi.installmentNumber} change)`
              }
            })
          : db.eMISchedule.update({
              where: { id: sEmi.id },
              data: {
                dueDate: nextDate,
                originalDueDate: sEmi.originalDueDate || sEmi.dueDate,
                notes: `Auto-shifted to match new day of month (from EMI #${emi.installmentNumber} change)`
              }
            })
      );
    }

    // Mirror loan sync
    let mirrorSyncCount = 0;
    if (mirrorMapping?.mirrorLoanId) {
      try {
        const mirrorEmis = isOffline
          ? await db.offlineLoanEMI.findMany({
              where: {
                offlineLoanId: mirrorMapping.mirrorLoanId,
                installmentNumber: { gte: emi.installmentNumber },
                paymentStatus: { not: 'PAID' }
              },
              orderBy: { installmentNumber: 'asc' },
              select: { id: true, installmentNumber: true, dueDate: true, originalDueDate: true }
            })
          : await db.eMISchedule.findMany({
              where: {
                loanApplicationId: mirrorMapping.mirrorLoanId,
                installmentNumber: { gte: emi.installmentNumber },
                paymentStatus: { not: 'PAID' }
              },
              orderBy: { installmentNumber: 'asc' },
              select: { id: true, installmentNumber: true, dueDate: true, originalDueDate: true }
            });
        
        for (let i = 0; i < mirrorEmis.length; i++) {
          const mEmi = mirrorEmis[i];
          const mDate = addMonthsSafe(newDate, mEmi.installmentNumber - emi.installmentNumber, newDate.getDate());
          mDate.setHours(12, 0, 0, 0);
          
          mirrorUpdates.push(
            isOffline
              ? db.offlineLoanEMI.update({
                  where: { id: mEmi.id },
                  data: {
                    dueDate: mDate,
                    originalDueDate: mEmi.originalDueDate || mEmi.dueDate,
                    notes: `Synced from original loan, shifted to new day of month`
                  }
                })
              : db.eMISchedule.update({
                  where: { id: mEmi.id },
                  data: {
                    dueDate: mDate,
                    originalDueDate: mEmi.originalDueDate || mEmi.dueDate,
                    notes: `Synced from original loan, shifted to new day of month`
                  }
                })
          );
        }
        mirrorSyncCount = mirrorUpdates.length;
      } catch (mirrorError) {
        console.error('[EMI Date Change] Mirror sync error:', mirrorError);
      }
    }

    // Execute all updates in a transaction
    await db.$transaction([...updates, ...mirrorUpdates]);

    // Create action / workflow logs
    if (isOffline) {
      db.actionLog.create({
        data: {
          userId: actionUserId,
          userRole: userRole,
          actionType: 'DATE_CHANGE',
          module: 'OFFLINE_LOAN',
          recordId: emiId,
          recordType: 'OfflineLoanEMI',
          previousData: JSON.stringify({ oldDueDate: oldDueDate.toISOString() }),
          newData: JSON.stringify({ newDueDate: newDate.toISOString(), reason }),
          description: `EMI Date globally changed! EMI #${emi.installmentNumber} moved to ${newDate.toISOString().split('T')[0]}. All remaining EMIs shifted accordingly. Reason: ${reason}`
        }
      }).catch(() => {});
    } else {
      db.workflowLog.create({
        data: {
          loanApplicationId: emi.loanApplicationId,
          action: 'EMI_DATE_CHANGE',
          previousStatus: emi.paymentStatus,
          newStatus: emi.paymentStatus,
          remarks: `EMI Date globally changed! EMI #${emi.installmentNumber} moved to ${newDate.toISOString().split('T')[0]}. All remaining EMIs shifted accordingly. Reason: ${reason}`,
          actionById: actionUserId
        }
      }).catch(() => {});
    }

    // Notify Super Admin if the person changing the date is not a SUPER_ADMIN
    db.user.findMany({
      where: { role: 'SUPER_ADMIN' }
    }).then(superAdmins => {
      const notifications = superAdmins.map(sa => ({
        userId: sa.id,
        title: 'EMI Date Changed',
        message: `EMI Date changed for ${isOffline ? 'offline loan' : 'loan'} ${emi.loanApplicationId}. New Date: ${newDate.toISOString().split('T')[0]}`,
        type: 'SYSTEM',
        isRead: false
      }));
      if (notifications.length > 0) {
        db.notification.createMany({ data: notifications }).catch(() => {});
      }
    }).catch(() => {});

    const duration = Date.now() - startTime;
    const totalUpdated = 1 + subsequentEmis.length;
    console.log(`[EMI Date Change] Completed in ${duration}ms - Updated ${totalUpdated} EMIs`);

    return NextResponse.json({
      success: true,
      message: `✅ Updated ${totalUpdated} EMIs successfully to match the new day of month${mirrorSyncCount > 0 ? ` (and ${mirrorSyncCount} mirror EMIs)` : ''}`,
      daysShifted: daysDiff,
      totalEMIsUpdated: totalUpdated,
      mirrorSynced: mirrorSyncCount,
      duration: `${(duration / 1000).toFixed(1)}s`
    });

  } catch (error) {
    console.error('[EMI Date Change] Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to change EMI date', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
