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

    if (!emiId || !newDueDate || !reason || !userId) {
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields',
        required: ['emiId', 'newDueDate', 'reason', 'userId']
      }, { status: 400 });
    }

    console.log(`[EMI Date Change] Starting for EMI: ${emiId}, new date: ${newDueDate}`);

    // Get EMI details
    const emi = await db.eMISchedule.findUnique({
      where: { id: emiId },
      select: { id: true, loanApplicationId: true, installmentNumber: true, dueDate: true, originalDueDate: true, paymentStatus: true }
    });

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

    // Run all operations in parallel for maximum speed
    const [subsequentEmis, mirrorMapping] = await Promise.all([
      // Get subsequent EMIs
      db.eMISchedule.findMany({
        where: {
          loanApplicationId: emi.loanApplicationId,
          installmentNumber: { gt: emi.installmentNumber },
          paymentStatus: { not: 'PAID' }
        },
        select: { id: true, installmentNumber: true, dueDate: true, originalDueDate: true }
      }),
      // Check for mirror loan
      db.mirrorLoanMapping.findFirst({
        where: { originalLoanId: emi.loanApplicationId },
        select: { mirrorLoanId: true }
      })
    ]);

    console.log(`[EMI Date Change] Found ${subsequentEmis.length} subsequent EMIs to shift`);

    // Update main EMI
    await db.eMISchedule.update({
      where: { id: emiId },
      data: {
        dueDate: newDate,
        originalDueDate: emi.originalDueDate || oldDueDate,
        notes: `Date changed from ${oldDueDate.toISOString().split('T')[0]} to ${newDate.toISOString().split('T')[0]}. Reason: ${reason}`
      }
    });

    // Batch update all subsequent EMIs using updateMany with raw SQL for date math
    // This is MUCH faster than individual updates
    if (subsequentEmis.length > 0) {
      // SQLite: date(dueDate, '+N days') format
      const daysStr = daysDiff >= 0 ? `+${daysDiff} days` : `${daysDiff} days`;
      
      await db.$executeRaw`
        UPDATE EMISchedule 
        SET dueDate = date(dueDate, ${daysStr}),
            originalDueDate = CASE WHEN originalDueDate IS NULL THEN dueDate ELSE originalDueDate END,
            notes = 'Auto-shifted by ' || ${daysDiff} || ' days (from EMI #' || ${emi.installmentNumber} || ' change)'
        WHERE loanApplicationId = ${emi.loanApplicationId}
        AND installmentNumber > ${emi.installmentNumber}
        AND paymentStatus != 'PAID'
      `;
    }

    // Sync mirror loan in parallel
    let mirrorSyncCount = 0;
    if (mirrorMapping?.mirrorLoanId) {
      try {
        const daysStr = daysDiff >= 0 ? `+${daysDiff} days` : `${daysDiff} days`;
        const result = await db.$executeRaw`
          UPDATE EMISchedule 
          SET dueDate = date(dueDate, ${daysStr}),
              originalDueDate = CASE WHEN originalDueDate IS NULL THEN dueDate ELSE originalDueDate END,
              notes = 'Synced from original loan, shifted by ' || ${daysDiff} || ' days'
          WHERE loanApplicationId = ${mirrorMapping.mirrorLoanId}
          AND installmentNumber >= ${emi.installmentNumber}
          AND paymentStatus != 'PAID'
        `;
        mirrorSyncCount = result;
        console.log(`[EMI Date Change] Synced ${mirrorSyncCount} mirror loan EMIs`);
      } catch (mirrorError) {
        console.error('[EMI Date Change] Mirror sync error:', mirrorError);
      }
    }

    // Create workflow log (non-blocking)
    db.workflowLog.create({
      data: {
        loanApplicationId: emi.loanApplicationId,
        action: 'EMI_DATE_CHANGE',
        previousStatus: emi.paymentStatus,
        newStatus: emi.paymentStatus,
        remarks: `EMI #${emi.installmentNumber}: ${oldDueDate.toISOString().split('T')[0]} → ${newDate.toISOString().split('T')[0]} (${daysDiff > 0 ? '+' : ''}${daysDiff} days). Reason: ${reason}`,
        actionById: userId
      }
    }).catch(() => {}); // Ignore log errors

    const duration = Date.now() - startTime;
    const totalUpdated = 1 + subsequentEmis.length;
    console.log(`[EMI Date Change] Completed in ${duration}ms - Updated ${totalUpdated} EMIs`);

    return NextResponse.json({
      success: true,
      message: `✅ Updated ${totalUpdated} EMIs by ${daysDiff > 0 ? '+' : ''}${daysDiff} days${mirrorSyncCount > 0 ? ` (and ${mirrorSyncCount} mirror EMIs)` : ''}`,
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
