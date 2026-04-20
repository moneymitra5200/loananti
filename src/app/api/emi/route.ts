import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateEMI } from '@/utils/helpers';
import { createEMIPaymentEntry, AccountingService } from '@/lib/accounting-service';

// Local type definitions - Prisma schema uses strings, not enums
type EMIPaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID' | 'INTEREST_ONLY_PAID' | 'WAIVED';

// GET - Fetch EMI schedules with NPA tracking
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    const status = searchParams.get('status');
    const action = searchParams.get('action');

    // NPA status check
    if (action === 'check-npa') {
      return await checkNPAStatus(loanId);
    }

    // Get all NPA accounts
    if (action === 'all-npa') {
      const npaAccounts = await db.nPATracking.findMany({
        where: { npaStatus: { in: ['SMA1', 'SMA2', 'NPA'] } },
        include: {
          loanApplication: {
            include: {
              customer: { select: { id: true, name: true, email: true, phone: true } },
              company: { select: { name: true } },
              sessionForm: { select: { approvedAmount: true, emiAmount: true } }
            }
          }
        },
        orderBy: { daysOverdue: 'desc' }
      });
      return NextResponse.json({ success: true, npaAccounts });
    }

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { loanApplicationId: loanId };
    if (status) where.paymentStatus = status;

    const schedules = await db.eMISchedule.findMany({
      where,
      orderBy: { installmentNumber: 'asc' },
      select: {
        id: true,
        installmentNumber: true,
        dueDate: true,
        originalDueDate: true,
        principalAmount: true,
        interestAmount: true,
        totalAmount: true,
        outstandingPrincipal: true,
        outstandingInterest: true,
        paymentStatus: true,
        paidAmount: true,
        paidPrincipal: true,
        paidInterest: true,
        paidDate: true,
        penaltyAmount: true,
        daysOverdue: true,
        isPartialPayment: true,
        nextPaymentDate: true,
        isInterestOnly: true,
        principalDeferred: true,
        partialPaymentCount: true,
        remainingAmount: true,
        notes: true,
        paymentMode: true,
        paymentReference: true,
        proofUrl: true
      }
    });

    // Calculate summary
    const summary = {
      totalEMIs: schedules.length,
      paidEMIs: schedules.filter(s => s.paymentStatus === 'PAID').length,
      pendingEMIs: schedules.filter(s => s.paymentStatus === 'PENDING').length,
      overdueEMIs: schedules.filter(s => s.paymentStatus === 'OVERDUE').length,
      partiallyPaid: schedules.filter(s => s.paymentStatus === 'PARTIALLY_PAID').length,
      totalAmount: schedules.reduce((sum, s) => sum + s.totalAmount, 0),
      totalPaid: schedules.reduce((sum, s) => sum + (s.paidAmount || 0), 0),
      totalPenalty: schedules.reduce((sum, s) => sum + (s.penaltyAmount || 0), 0),
      totalOutstanding: 0,
      nextDueDate: null as Date | null,
      nextDueAmount: 0
    };

    summary.totalOutstanding = summary.totalAmount - summary.totalPaid;

    const nextPending = schedules.find(s => s.paymentStatus !== 'PAID');
    if (nextPending) {
      summary.nextDueDate = nextPending.dueDate;
      summary.nextDueAmount = nextPending.totalAmount - (nextPending.paidAmount || 0);
    }

    return NextResponse.json({ schedules, summary });
  } catch (error) {
    console.error('EMI fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch EMI schedules' }, { status: 500 });
  }
}

// POST - Create EMI schedule or update overdue status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, action, graceDays = 5 } = body;

    // Update overdue status
    if (action === 'update-overdue') {
      return await updateOverdueStatus();
    }

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    const loan = await db.loanApplication.findUnique({
      where: { id: loanId },
      include: { sessionForm: true, company: { include: { gracePeriodConfigs: true } } }
    });

    if (!loan || !loan.sessionForm) {
      return NextResponse.json({ error: 'Loan or session form not found' }, { status: 400 });
    }

    const existingSchedules = await db.eMISchedule.findMany({
      where: { loanApplicationId: loanId }
    });

    if (existingSchedules.length > 0) {
      return NextResponse.json({ error: 'EMI schedules already exist', count: existingSchedules.length }, { status: 400 });
    }

    const { approvedAmount, interestRate, interestType, tenure, emiAmount } = loan.sessionForm;
    const startDate = loan.disbursedAt || new Date();

    const emiCalculation = calculateEMI(
      approvedAmount,
      interestRate,
      tenure,
      (interestType as 'FLAT' | 'REDUCING') || 'FLAT',
      startDate
    );

    const schedules = await Promise.all(
      emiCalculation.schedule.map((item) =>
        db.eMISchedule.create({
          data: {
            loanApplicationId: loanId,
            installmentNumber: item.installmentNumber,
            dueDate: item.dueDate,
            originalDueDate: item.dueDate,
            principalAmount: item.principal,
            interestAmount: item.interest,
            totalAmount: item.totalAmount,
            outstandingPrincipal: item.outstandingPrincipal,
            outstandingInterest: 0,
            paymentStatus: 'PENDING'
          }
        })
      )
    );

    return NextResponse.json({ success: true, count: schedules.length, schedules });
  } catch (error) {
    console.error('EMI creation error:', error);
    return NextResponse.json({ error: 'Failed to generate EMI schedule' }, { status: 500 });
  }
}

// Update overdue status for all loans
async function updateOverdueStatus() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all pending EMIs that are past due date
  const overdueEmis = await db.eMISchedule.findMany({
    where: {
      paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] },
      dueDate: { lt: today }
    },
    include: {
      loanApplication: {
        include: {
          company: { include: { gracePeriodConfigs: true } }
        }
      }
    }
  });

  let updatedCount = 0;
  const npaUpdates: Array<{ loanId: string; daysOverdue: number; status: string }> = [];

  for (const emi of overdueEmis) {
    const dueDate = new Date(emi.dueDate);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get grace period config
    const graceConfig = emi.loanApplication?.company?.gracePeriodConfigs?.[0];
    const graceDays = graceConfig?.graceDays || 5;
    const dailyPenalty = graceConfig?.dailyPenalty || 0.1;

    // Calculate penalty
    let penaltyAmount = emi.penaltyAmount || 0;
    if (daysOverdue > graceDays) {
      const penaltyDays = daysOverdue - graceDays;
      penaltyAmount = (emi.totalAmount * dailyPenalty / 100) * penaltyDays;
    }

    // Update EMI status
    await db.eMISchedule.update({
      where: { id: emi.id },
      data: {
        paymentStatus: 'OVERDUE',
        daysOverdue,
        penaltyAmount
      }
    });

    updatedCount++;

    // Check for NPA status
    if (daysOverdue >= 30) {
      npaUpdates.push({
        loanId: emi.loanApplicationId,
        daysOverdue,
        status: daysOverdue >= 90 ? 'NPA' : daysOverdue >= 60 ? 'SMA2' : 'SMA1'
      });
    }
  }

  // Update NPA tracking
  for (const npa of npaUpdates) {
    const existingNpa = await db.nPATracking.findFirst({
      where: { loanApplicationId: npa.loanId }
    });

    // Calculate total overdue amount
    const loanEmis = await db.eMISchedule.findMany({
      where: { loanApplicationId: npa.loanId, paymentStatus: 'OVERDUE' }
    });
    const totalOverdue = loanEmis.reduce((sum, e) => sum + e.totalAmount - (e.paidAmount || 0) + (e.penaltyAmount || 0), 0);

    if (existingNpa) {
      await db.nPATracking.update({
        where: { id: existingNpa.id },
        data: {
          daysOverdue: npa.daysOverdue,
          npaStatus: npa.status,
          npaDate: npa.status === 'NPA' ? new Date() : existingNpa.npaDate,
          totalOverdue
        }
      });
    } else {
      await db.nPATracking.create({
        data: {
          loanApplicationId: npa.loanId,
          daysOverdue: npa.daysOverdue,
          npaStatus: npa.status,
          npaDate: npa.status === 'NPA' ? new Date() : null,
          totalOverdue
        }
      });
    }
  }

  return NextResponse.json({
    success: true,
    message: `Updated ${updatedCount} overdue EMIs`,
    npaUpdates: npaUpdates.length
  });
}

// Check NPA status for specific loan
async function checkNPAStatus(loanId: string | null) {
  if (!loanId) {
    return NextResponse.json({ error: 'Loan ID is required for NPA check' }, { status: 400 });
  }

  const npaTracking = await db.nPATracking.findFirst({
    where: { loanApplicationId: loanId },
    include: {
      loanApplication: {
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          sessionForm: { select: { approvedAmount: true, emiAmount: true } }
        }
      }
    }
  });

  // If no NPA tracking, calculate current status
  if (!npaTracking) {
    const overdueEmis = await db.eMISchedule.findMany({
      where: { loanApplicationId: loanId, paymentStatus: 'OVERDUE' },
      orderBy: { daysOverdue: 'desc' }
    });

    if (overdueEmis.length === 0) {
      return NextResponse.json({ 
        success: true, 
        npaStatus: null,
        message: 'No overdue EMIs for this loan' 
      });
    }

    const maxDaysOverdue = Math.max(...overdueEmis.map(e => e.daysOverdue || 0));
    const totalOverdue = overdueEmis.reduce((sum, e) => sum + e.totalAmount - (e.paidAmount || 0), 0);

    let status = 'SMA0';
    if (maxDaysOverdue >= 90) status = 'NPA';
    else if (maxDaysOverdue >= 60) status = 'SMA2';
    else if (maxDaysOverdue >= 30) status = 'SMA1';

    return NextResponse.json({
      success: true,
      npaStatus: {
        status,
        daysOverdue: maxDaysOverdue,
        totalOverdue,
        overdueEmiCount: overdueEmis.length
      }
    });
  }

  return NextResponse.json({ success: true, npaTracking });
}

// PUT - Pay EMI (INCREASE credit when collecting money from customer)
// CREDIT SYSTEM LOGIC:
// - When role pays EMI for customer, they COLLECT money from customer
// - Their credit INCREASES by the EMI amount
// - CASH payment → Company Credit (no proof required)
// - Non-CASH payment → Personal Credit (proof required)
// PAYMENT TYPES:
// - FULL: Pay full EMI amount
// - PARTIAL: Pay partial amount, remaining due on specified date
// - INTEREST_ONLY: Pay only interest, principal shifted to next EMI
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      emiId, action, data, loanId, paidAmount, paymentMode, paymentRef, 
      creditType, remarks, proofUrl, userId, paymentType, remainingAmount, 
      remainingPaymentDate, interestAmount, mirrorCompanyId, penaltyWaiver,
      splitCashAmount = 0, splitOnlineAmount = 0,
      // Optional staff-overridden principal/interest split for journal entry
      principalComponent: staffPrincipal, interestComponent: staffInterest
    } = body;

    // Pay EMI - This INCREASES the user's credit
    if (action === 'pay' || paidAmount !== undefined) {
      if (!emiId || !loanId || !paidAmount || !userId) {
        return NextResponse.json({ error: 'Missing required fields for payment' }, { status: 400 });
      }

      // Normalize payment type values (frontend uses different values)
      const normalizedPaymentType = paymentType === 'FULL_EMI' ? 'FULL' : 
                                    paymentType === 'PARTIAL_PAYMENT' ? 'PARTIAL' : 
                                    paymentType;

      // Validate partial payment
      if (normalizedPaymentType === 'PARTIAL') {
        if (!remainingPaymentDate) {
          return NextResponse.json({ error: 'Remaining payment date is required for partial payment' }, { status: 400 });
        }
        if (!remainingAmount || remainingAmount <= 0) {
          return NextResponse.json({ error: 'Remaining amount must be greater than 0 for partial payment' }, { status: 400 });
        }
      }

      // Get EMI details
      const emi = await db.eMISchedule.findUnique({
        where: { id: emiId },
        include: { 
          loanApplication: { 
            include: { 
              company: true,
              customer: { select: { id: true, name: true, phone: true } },
              sessionForm: { select: { emiAmount: true, interestRate: true, processingFee: true } }
            } 
          } 
        }
      });

      if (!emi) {
        return NextResponse.json({ error: 'EMI not found' }, { status: 404 });
      }

      if (emi.paymentStatus === 'PAID') {
        return NextResponse.json({ error: 'EMI already paid' }, { status: 400 });
      }

      // Get user (the one paying EMI - collecting money from customer)
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { 
          id: true,
          name: true,
          role: true,
          companyCredit: true, 
          personalCredit: true,
          credit: true,
          companyId: true
        }
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Determine payment mode
      // SPLIT is not a valid Prisma enum — store as ONLINE in DB but handle cash+online passbook separately
      const isSplitMode = paymentMode === 'SPLIT';
      const actualPaymentMode = isSplitMode ? 'ONLINE' : (paymentMode || 'CASH');
      
      // IMPORTANT: Company Credit + ONLINE = Money goes directly to bank, NO credit increase
      // This is for when customer pays directly to company bank account
      // The user (collector) did NOT collect money, so their credit should NOT increase
      const isCompanyOnlinePayment = creditType === 'COMPANY' && actualPaymentMode === 'ONLINE';
      
      // Determine credit type:
      // - If creditType is explicitly 'COMPANY' and payment is ONLINE → Company Credit (but won't increase)
      // - If creditType is explicitly 'PERSONAL' → Personal Credit
      // - If creditType not specified: CASH → Company Credit, Non-CASH → Personal Credit
      const actualCreditType = creditType === 'COMPANY' 
        ? 'COMPANY' 
        : creditType === 'PERSONAL' 
          ? 'PERSONAL' 
          : actualPaymentMode === 'CASH' 
            ? 'COMPANY' 
            : 'PERSONAL';

      // Validate proof requirements:
      // PERSONAL Credit → proof always required (agent must verify they received cash)
      // COMPANY + ONLINE → proof is optional (admin/cashier can record without attachment)
      // COMPANY + CASH   → no proof needed
      const requiresProof = actualCreditType === 'PERSONAL';
      
      if (requiresProof && !proofUrl) {
        return NextResponse.json({ 
          error: 'Proof document is required for personal credit transactions',
          requiresProof: true 
        }, { status: 400 });
      }

      // Calculate new credit balances
      // IMPORTANT: Company Credit + ONLINE does NOT increase credit
      // Money went directly to bank, user didn't collect it
      let newCompanyCredit = user.companyCredit;
      let newPersonalCredit = user.personalCredit;
      let creditIncreaseAmount = 0;
      
      if (isCompanyOnlinePayment) {
        // Company Credit + ONLINE: NO credit increase
        // Money went directly to company bank account
        console.log(`[EMI Payment] Company Online Payment: Credit NOT increased. Money went to bank directly.`);
        creditIncreaseAmount = 0;
      } else if (actualCreditType === 'COMPANY') {
        // Company Credit + CASH: Credit increases
        newCompanyCredit = user.companyCredit + paidAmount;
        creditIncreaseAmount = paidAmount;
      } else {
        // Personal Credit: Credit increases
        newPersonalCredit = user.personalCredit + paidAmount;
        creditIncreaseAmount = paidAmount;
      }
      const newTotalCredit = newCompanyCredit + newPersonalCredit;

      // Determine payment status based on payment type
      let newPaymentStatus: string = emi.paymentStatus;
      let updatedPaidAmount = (emi.paidAmount || 0) + paidAmount;
      let emiNotes = remarks || '';

      console.log(`[EMI Payment] Processing payment: paymentType=${paymentType}, normalizedPaymentType=${normalizedPaymentType}, paidAmount=${paidAmount}`);

      if (normalizedPaymentType === 'INTEREST_ONLY') {
        // Interest only - mark as INTEREST_ONLY_PAID, principal deferred to new EMI
        newPaymentStatus = 'INTEREST_ONLY_PAID';
        emiNotes = `${emiNotes}\n[INTEREST ONLY] Paid interest ₹${paidAmount}. Principal ₹${emi.principalAmount} + Interest ₹${emi.interestAmount} moved to new EMI.`;
      } else if (normalizedPaymentType === 'PARTIAL') {
        // Partial payment
        newPaymentStatus = 'PARTIALLY_PAID';
        emiNotes = `${emiNotes}\n[PARTIAL] Paid ₹${paidAmount}. Remaining ₹${remainingAmount} due on ${remainingPaymentDate}.`;
      } else {
        // Full payment
        newPaymentStatus = updatedPaidAmount >= emi.totalAmount ? 'PAID' : 'PARTIALLY_PAID';
      }

      console.log(`[EMI Payment] Setting paymentStatus to: ${newPaymentStatus}`);

      // Start transaction with extended timeout for complex operations
      const txResult = await db.$transaction(async (tx) => {
        // Prepare update data for EMI
        // FIX-26: Calculate paidPrincipal/paidInterest using actual EMI breakdown
        const emiPrincipal = emi.principalAmount || 0;
        const emiInterest = emi.interestAmount || 0;
        const emiTotal = emi.totalAmount || (emiPrincipal + emiInterest) || 1;

        const updateData: Record<string, unknown> = {
          paymentStatus: newPaymentStatus,
          paidAmount: updatedPaidAmount,
          paidDate: new Date(),
          paymentMode: actualPaymentMode,
          paymentReference: paymentRef,
          proofUrl: proofUrl,
          notes: emiNotes,
          // Apply penalty waiver — reduce stored penalty by waived amount
          ...(penaltyWaiver > 0 && {
            penaltyAmount: Math.max(0, (emi.penaltyAmount || 0) - (penaltyWaiver || 0)),
            waivedAmount: penaltyWaiver
          })
        };

        // FIX-26: Set paidPrincipal + paidInterest proportionally for FULL payments
        if (normalizedPaymentType !== 'INTEREST_ONLY') {
          const principalRatio = emiPrincipal / emiTotal;
          const paidPrincipal = Math.round(paidAmount * principalRatio * 100) / 100;
          const paidInterest = Math.round((paidAmount - paidPrincipal) * 100) / 100;
          updateData.paidPrincipal = (emi.paidPrincipal || 0) + paidPrincipal;
          updateData.paidInterest  = (emi.paidInterest  || 0) + paidInterest;
        }


        // Add INTEREST_ONLY specific fields
        if (normalizedPaymentType === 'INTEREST_ONLY') {
          updateData.isInterestOnly = true;
          updateData.interestOnlyPaidAt = new Date();
          updateData.interestOnlyAmount = paidAmount;
          updateData.paidInterest = paidAmount;
          updateData.principalDeferred = true;
          // Don't set remainingAmount - principal is moved to NEW EMI, not remaining on this one
          updateData.paidAmount = paidAmount; // Only interest paid
        }

        // Add PARTIAL payment specific fields
        // ONLY update the CURRENT EMI's dueDate - subsequent EMIs remain unchanged
        console.log(`[EMI API] ========== PARTIAL PAYMENT CHECK ==========`);
        console.log(`[EMI API] normalizedPaymentType: ${normalizedPaymentType}`);
        console.log(`[EMI API] remainingPaymentDate: ${remainingPaymentDate || 'null'}`);
        console.log(`[EMI API] remainingAmount: ${remainingAmount}`);
        
        if (normalizedPaymentType === 'PARTIAL' && remainingPaymentDate) {
          const newDueDate = new Date(remainingPaymentDate);
          updateData.isPartialPayment = true;
          updateData.remainingAmount = remainingAmount;
          updateData.dueDate = newDueDate;  // Update current EMI's due date to the new payment date
          updateData.nextPaymentDate = newDueDate;  // Track when the remaining amount is due
          updateData.partialPaymentCount = (emi.partialPaymentCount || 0) + 1;
          console.log(`[EMI API] ✅ PARTIAL: Updating EMI #${emi.installmentNumber} dueDate to ${newDueDate.toISOString().split('T')[0]}. Subsequent EMIs will NOT be changed.`);
        } else {
          console.log(`[EMI API] ❌ PARTIAL: Not updating dueDate - condition not met`);
        }

        // Update EMI status
        const updatedEmi = await tx.eMISchedule.update({
          where: { id: emiId },
          data: updateData
        });

        // Handle INTEREST_ONLY payment
        // When customer pays ONLY interest:
        // 1. Create NEW EMI at position +1 with NEXT EMI's due date
        // 2. Shift all subsequent EMIs by +1 in installment number AND +1 month in due date
        // IMPORTANT: All EMIs must have the SAME DAY of month (consistent due date pattern)
        if (normalizedPaymentType === 'INTEREST_ONLY') {
          console.log(`[INTEREST_ONLY] Processing for EMI #${emi.installmentNumber}`);

          // Get the FIRST EMI to determine the due date pattern (day of month)
          const firstEmi = await tx.eMISchedule.findFirst({
            where: {
              loanApplicationId: loanId,
              paymentStatus: { notIn: ['PAID', 'INTEREST_ONLY_PAID'] }
            },
            orderBy: { installmentNumber: 'asc' },
            select: { installmentNumber: true, dueDate: true }
          });

          // Get the day of month from first EMI (e.g., 15th)
          const dueDateDay = firstEmi?.dueDate?.getDate() || emi.dueDate.getDate() || 15;
          console.log(`[INTEREST_ONLY] Due date pattern: Day ${dueDateDay} of each month`);

          // Helper function to create due date with consistent day
          const createDueDate = (monthOffset: number, year: number = new Date().getFullYear()): Date => {
            const baseDate = firstEmi?.dueDate || emi.dueDate;
            const newDate = new Date(baseDate);
            newDate.setMonth(newDate.getMonth() + monthOffset);
            // Ensure the day is consistent
            newDate.setDate(dueDateDay);
            return newDate;
          };

          // Get the NEXT EMI (the one immediately after current EMI)
          // The new EMI will be due 1 month AFTER the interest-only EMI
          const nextEmi = await tx.eMISchedule.findFirst({
            where: {
              loanApplicationId: loanId,
              installmentNumber: emi.installmentNumber + 1
            },
            select: { id: true, installmentNumber: true, dueDate: true }
          });

          // New EMI's due date = Current EMI's due date + 1 month (same day pattern)
          const newEmiDueDate = new Date(emi.dueDate);
          newEmiDueDate.setMonth(newEmiDueDate.getMonth() + 1);
          newEmiDueDate.setDate(dueDateDay); // Ensure consistent day
          console.log(`[INTEREST_ONLY] New EMI will have due date: ${newEmiDueDate.toISOString().split('T')[0]} (EMI #${emi.installmentNumber} due date + 1 month)`);

          // Get all subsequent EMIs (EMIs after current one)
          const subsequentEmis = await tx.eMISchedule.findMany({
            where: {
              loanApplicationId: loanId,
              installmentNumber: { gt: emi.installmentNumber }
            },
            orderBy: { installmentNumber: 'desc' },
            select: { id: true, installmentNumber: true, dueDate: true }
          });

          console.log(`[INTEREST_ONLY] Shifting ${subsequentEmis.length} subsequent EMIs (installment +1, due date +1 month)`);

          // Shift each EMI by 1 in installment number AND +1 month in due date
          // Starting from highest to avoid unique constraint conflicts
          for (const subsequentEmi of subsequentEmis) {
            // Calculate new due date: current due date + 1 month, SAME DAY
            const newDueDate = new Date(subsequentEmi.dueDate);
            newDueDate.setMonth(newDueDate.getMonth() + 1);
            // Ensure the day remains consistent
            newDueDate.setDate(dueDateDay);
            
            await tx.eMISchedule.update({
              where: { id: subsequentEmi.id },
              data: { 
                installmentNumber: subsequentEmi.installmentNumber + 1,
                dueDate: newDueDate,
                originalDueDate: subsequentEmi.dueDate // Keep track of original due date
              }
            });
            console.log(`[INTEREST_ONLY] Shifted EMI #${subsequentEmi.installmentNumber} → #${subsequentEmi.installmentNumber + 1}, Due: ${subsequentEmi.dueDate.toISOString().split('T')[0]} → ${newDueDate.toISOString().split('T')[0]}`);
          }

          // Create new EMI with due date = Current EMI + 1 month
          // This EMI contains the deferred principal from the interest-only payment
          const newEmiAmount = emi.principalAmount + emi.interestAmount; // Full EMI amount
          const deferredPrincipalEmi = await tx.eMISchedule.create({
            data: {
              loanApplicationId: loanId,
              installmentNumber: emi.installmentNumber + 1,
              dueDate: newEmiDueDate,
              originalDueDate: newEmiDueDate,
              principalAmount: emi.principalAmount,
              interestAmount: emi.interestAmount,
              totalAmount: newEmiAmount,
              outstandingPrincipal: emi.principalAmount,
              outstandingInterest: emi.interestAmount,
              paymentStatus: 'PENDING',
              notes: `[NEW EMI] Created from EMI #${emi.installmentNumber} (Interest Only Payment). Due: ${newEmiDueDate.toISOString().split('T')[0]} (EMI #${emi.installmentNumber} due + 1 month). Due date pattern: Day ${dueDateDay}`
            }
          });

          console.log(`[INTEREST_ONLY] Created new EMI #${deferredPrincipalEmi.installmentNumber} with Due: ${newEmiDueDate.toISOString().split('T')[0]}, Principal ₹${emi.principalAmount} + Interest ₹${emi.interestAmount} = Total ₹${newEmiAmount}`);

          // HANDLE MIRROR LOAN SYNC
          const mirrorMapping = await tx.mirrorLoanMapping.findFirst({
            where: { originalLoanId: loanId }
          });

          if (mirrorMapping?.mirrorLoanId) {
            console.log(`[INTEREST_ONLY] Syncing to mirror loan: ${mirrorMapping.mirrorLoanId}`);
            
            const mirrorEmi = await tx.eMISchedule.findFirst({
              where: {
                loanApplicationId: mirrorMapping.mirrorLoanId,
                installmentNumber: emi.installmentNumber
              }
            });

            if (mirrorEmi && mirrorEmi.paymentStatus !== 'PAID') {
              const mirrorInterestAmount = mirrorEmi.interestAmount;
              const originalInterestAmount = emi.interestAmount;
              const profitAmount = originalInterestAmount - mirrorInterestAmount;

              console.log(`[INTEREST_ONLY] Original Interest: ₹${originalInterestAmount}, Mirror Interest: ₹${mirrorInterestAmount}, Profit: ₹${profitAmount}`);

              // Mark mirror EMI as Interest Only Paid (auto-sync from original)
              await tx.eMISchedule.update({
                where: { id: mirrorEmi.id },
                data: {
                  paymentStatus: 'INTEREST_ONLY_PAID',
                  isInterestOnly: true,
                  interestOnlyPaidAt: new Date(),
                  interestOnlyAmount: mirrorInterestAmount,
                  paidInterest: mirrorInterestAmount,
                  paidAmount: mirrorInterestAmount,
                  paidDate: new Date(),
                  principalDeferred: true,
                  notes: `[INTEREST ONLY SYNC] Auto-paid ₹${mirrorInterestAmount} interest (synced from original loan)`
                }
              });

              // Get the day of month from mirror loan's first EMI (consistent pattern)
              const firstMirrorEmi = await tx.eMISchedule.findFirst({
                where: {
                  loanApplicationId: mirrorMapping.mirrorLoanId,
                  paymentStatus: { notIn: ['PAID', 'INTEREST_ONLY_PAID'] }
                },
                orderBy: { installmentNumber: 'asc' },
                select: { installmentNumber: true, dueDate: true }
              });
              const mirrorDueDateDay = firstMirrorEmi?.dueDate?.getDate() || mirrorEmi.dueDate.getDate() || dueDateDay;
              console.log(`[INTEREST_ONLY] Mirror: Due date pattern: Day ${mirrorDueDateDay} of each month`);

              // Get the NEXT mirror EMI for due date reference
              const nextMirrorEmi = await tx.eMISchedule.findFirst({
                where: {
                  loanApplicationId: mirrorMapping.mirrorLoanId,
                  installmentNumber: mirrorEmi.installmentNumber + 1
                },
                select: { id: true, installmentNumber: true, dueDate: true }
              });

              // New mirror EMI's due date = Mirror EMI's due date + 1 month (same day pattern)
              const newMirrorEmiDueDate = new Date(mirrorEmi.dueDate);
              newMirrorEmiDueDate.setMonth(newMirrorEmiDueDate.getMonth() + 1);
              newMirrorEmiDueDate.setDate(mirrorDueDateDay);
              console.log(`[INTEREST_ONLY] Mirror: New EMI will have due date: ${newMirrorEmiDueDate.toISOString().split('T')[0]} (EMI #${mirrorEmi.installmentNumber} due + 1 month)`);

              // Get all subsequent mirror EMIs
              const subsequentMirrorEmis = await tx.eMISchedule.findMany({
                where: {
                  loanApplicationId: mirrorMapping.mirrorLoanId,
                  installmentNumber: { gt: mirrorEmi.installmentNumber }
                },
                orderBy: { installmentNumber: 'desc' },
                select: { id: true, installmentNumber: true, dueDate: true }
              });

              console.log(`[INTEREST_ONLY] Mirror: Shifting ${subsequentMirrorEmis.length} subsequent EMIs (installment +1, due date +1 month)`);

              // Shift each mirror EMI by 1 in installment number AND +1 month in due date
              for (const subsequentMirrorEmi of subsequentMirrorEmis) {
                const newDueDate = new Date(subsequentMirrorEmi.dueDate);
                newDueDate.setMonth(newDueDate.getMonth() + 1);
                newDueDate.setDate(mirrorDueDateDay); // Ensure consistent day
                
                await tx.eMISchedule.update({
                  where: { id: subsequentMirrorEmi.id },
                  data: { 
                    installmentNumber: subsequentMirrorEmi.installmentNumber + 1,
                    dueDate: newDueDate,
                    originalDueDate: subsequentMirrorEmi.dueDate
                  }
                });
                console.log(`[INTEREST_ONLY] Mirror: Shifted EMI #${subsequentMirrorEmi.installmentNumber} → #${subsequentMirrorEmi.installmentNumber + 1}, Due: ${subsequentMirrorEmi.dueDate.toISOString().split('T')[0]} → ${newDueDate.toISOString().split('T')[0]}`);
              }

              // Create new EMI in mirror loan with due date = Mirror EMI + 1 month
              const newMirrorEmiAmount = mirrorEmi.principalAmount + mirrorEmi.interestAmount;
              await tx.eMISchedule.create({
                data: {
                  loanApplicationId: mirrorMapping.mirrorLoanId,
                  installmentNumber: mirrorEmi.installmentNumber + 1,
                  dueDate: newMirrorEmiDueDate,
                  originalDueDate: newMirrorEmiDueDate,
                  principalAmount: mirrorEmi.principalAmount,
                  interestAmount: mirrorEmi.interestAmount,
                  totalAmount: newMirrorEmiAmount,
                  outstandingPrincipal: mirrorEmi.principalAmount,
                  outstandingInterest: mirrorEmi.interestAmount,
                  paymentStatus: 'PENDING',
                  notes: `[NEW EMI SYNC] From EMI #${mirrorEmi.installmentNumber} (Interest Only). Due: ${newMirrorEmiDueDate.toISOString().split('T')[0]} (EMI #${mirrorEmi.installmentNumber} due + 1 month). Due date pattern: Day ${mirrorDueDateDay}`
                }
              });

              console.log(`[INTEREST_ONLY] Mirror loan synced. New EMI #${mirrorEmi.installmentNumber + 1} created with Due: ${newMirrorEmiDueDate.toISOString().split('T')[0]}, Amount: ₹${newMirrorEmiAmount}`);

              // RECORD PROFIT FOR ORIGINAL COMPANY (₹88 in example goes to Company 3)
              // Mirror interest (₹112) already recorded in mirror loan company accounting
              if (profitAmount > 0) {
                await tx.creditTransaction.create({
                  data: {
                    userId: userId,
                    transactionType: 'CREDIT_INCREASE',
                    amount: profitAmount,
                    paymentMode: actualPaymentMode,
                    creditType: actualCreditType as any,
                    companyBalanceAfter: newCompanyCredit,
                    personalBalanceAfter: newPersonalCredit,
                    balanceAfter: newTotalCredit,
                    sourceType: 'INTEREST_PROFIT',
                    sourceId: emiId,
                    loanApplicationId: loanId,
                    emiScheduleId: emiId,
                    installmentNumber: emi.installmentNumber,
                    loanApplicationNo: emi.loanApplication?.applicationNo,
                    emiDueDate: emi.dueDate,
                    emiAmount: emi.totalAmount,
                    principalComponent: 0,
                    interestComponent: profitAmount,
                    description: `Interest Profit (₹${originalInterestAmount} - ₹${mirrorInterestAmount}) - ${emi.loanApplication?.applicationNo} - EMI #${emi.installmentNumber}`,
                    transactionDate: new Date()
                  }
                });

                console.log(`[INTEREST_ONLY] Profit ₹${profitAmount} recorded for original company`);
              }
            }
          }
        }

        // PARTIAL payment: Current EMI's dueDate already updated above
        // Subsequent EMIs remain UNCHANGED as per new requirement
        console.log(`[PARTIAL] Payment processed. EMI #${emi.installmentNumber} dueDate updated. Subsequent EMIs unchanged.`);

        // Create payment record
        await tx.payment.create({
          data: {
            loanApplicationId: loanId,
            emiScheduleId: emiId,
            customerId: emi.loanApplication?.customerId || '',
            amount: paidAmount,
            paymentMode: actualPaymentMode,
            status: 'COMPLETED',
            paidById: userId,
            proofUrl: proofUrl,
            remarks: `${remarks || ''}\nPayment Type: ${paymentType || 'FULL'}`
          }
        });

        // INCREASE user's credit (they collected money from customer)
        // But for Company Credit + ONLINE, credit doesn't increase (money went to bank directly)
        await tx.user.update({
          where: { id: userId },
          data: { 
            credit: newTotalCredit,
            companyCredit: newCompanyCredit,
            personalCredit: newPersonalCredit
          }
        });

        // Create credit transaction record
        // For Company Credit + ONLINE: Record as BANK_DIRECT payment (no credit increase)
        await tx.creditTransaction.create({
          data: {
            userId: userId,
            transactionType: isCompanyOnlinePayment 
              ? 'BANK_DIRECT' 
              : actualCreditType === 'PERSONAL' 
                ? 'PERSONAL_COLLECTION' 
                : 'CREDIT_INCREASE',
            amount: creditIncreaseAmount, // 0 for Company Online, full amount for others
            paymentMode: actualPaymentMode,
            creditType: actualCreditType as any,
            companyBalanceAfter: newCompanyCredit,
            personalBalanceAfter: newPersonalCredit,
            balanceAfter: newTotalCredit,
            sourceType: isCompanyOnlinePayment ? 'BANK_DIRECT_PAYMENT' : 'EMI_PAYMENT',
            sourceId: emiId,
            loanApplicationId: loanId,
            emiScheduleId: emiId,
            customerId: emi.loanApplication?.customerId,
            installmentNumber: emi.installmentNumber,
            customerName: emi.loanApplication?.customer?.name,
            customerPhone: emi.loanApplication?.customer?.phone,
            loanApplicationNo: emi.loanApplication?.applicationNo,
            emiDueDate: emi.dueDate,
            emiAmount: emi.totalAmount,
            principalComponent: emi.principalAmount,
            interestComponent: emi.interestAmount,
            description: isCompanyOnlinePayment 
              ? `Direct Bank Payment - ${emi.loanApplication?.applicationNo || loanId} - EMI #${emi.installmentNumber} (No credit change)`
              : `EMI Payment Collected - ${emi.loanApplication?.applicationNo || loanId} - EMI #${emi.installmentNumber}`,
            proofDocument: proofUrl,
            proofType: proofUrl ? 'document' : null,
            proofUploadedAt: proofUrl ? new Date() : null,
            proofVerified: actualCreditType === 'COMPANY', // Auto-verify company credit
            transactionDate: new Date()
          }
        });

        // Update daily collection
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingCollection = await tx.dailyCollection.findFirst({
          where: { date: today }
        });

        const modeField = actualPaymentMode === 'CASH' ? 'totalCash' :
                          actualPaymentMode === 'CHEQUE' ? 'totalCheque' : 'totalOnline';

        const roleField = user.role === 'SUPER_ADMIN' ? 'superAdminCollection' :
                          user.role === 'COMPANY' ? 'companyCollection' :
                          user.role === 'AGENT' ? 'agentCollection' :
                          user.role === 'STAFF' ? 'staffCollection' :
                          user.role === 'CASHIER' ? 'cashierCollection' : 'customerDirect';

        if (existingCollection) {
          await tx.dailyCollection.update({
            where: { id: existingCollection.id },
            data: {
              [modeField]: { increment: paidAmount },
              totalAmount: { increment: paidAmount },
              totalTransactions: { increment: 1 },
              emiPaymentsCount: { increment: 1 },
              [roleField]: { increment: paidAmount }
            }
          });
        } else {
          await tx.dailyCollection.create({
            data: {
              date: today,
              [modeField]: paidAmount,
              totalAmount: paidAmount,
              totalTransactions: 1,
              emiPaymentsCount: 1,
              [roleField]: paidAmount
            }
          });
        }

        // ==========================================
        // MIRROR LOAN SYNC FOR FULL/PARTIAL PAYMENT
        // ==========================================
        if (paymentType !== 'INTEREST_ONLY') {
          const mirrorMapping = await tx.mirrorLoanMapping.findFirst({
            where: { originalLoanId: loanId }
          });

          if (mirrorMapping?.mirrorLoanId) {
            console.log(`[MIRROR SYNC] Syncing payment to mirror loan: ${mirrorMapping.mirrorLoanId}`);
            
            const mirrorEmi = await tx.eMISchedule.findFirst({
              where: {
                loanApplicationId: mirrorMapping.mirrorLoanId,
                installmentNumber: emi.installmentNumber
              }
            });

            if (mirrorEmi && mirrorEmi.paymentStatus !== 'PAID') {
              const mirrorInterestAmount = mirrorEmi.interestAmount;
              const originalInterestAmount = emi.interestAmount;
              const profitAmount = originalInterestAmount - mirrorInterestAmount;

              console.log(`[MIRROR SYNC] Original Interest: ₹${originalInterestAmount}, Mirror Interest: ₹${mirrorInterestAmount}, Profit: ₹${profitAmount}`);

              // Mark mirror EMI as PAID (auto-sync from original)
              await tx.eMISchedule.update({
                where: { id: mirrorEmi.id },
                data: {
                  paymentStatus: 'PAID',
                  paidAmount: mirrorEmi.totalAmount,
                  paidDate: new Date(),
                  paymentMode: 'ONLINE', // Mirror is always internal
                  paidInterest: mirrorInterestAmount,
                  paidPrincipal: mirrorEmi.principalAmount,
                  notes: `[MIRROR SYNC] Auto-paid (synced from original loan EMI #${emi.installmentNumber})`
                }
              });

              console.log(`[MIRROR SYNC] Mirror EMI #${mirrorEmi.installmentNumber} marked as PAID`);

              // Record profit for original company
              if (profitAmount > 0) {
                await tx.creditTransaction.create({
                  data: {
                    userId: userId,
                    transactionType: 'CREDIT_INCREASE',
                    amount: profitAmount,
                    paymentMode: 'ONLINE',
                    creditType: 'COMPANY',
                    companyBalanceAfter: newCompanyCredit,
                    personalBalanceAfter: newPersonalCredit,
                    balanceAfter: newTotalCredit,
                    sourceType: 'MIRROR_LOAN_SYNC',
                    sourceId: mirrorEmi.id,
                    loanApplicationId: loanId,
                    emiScheduleId: emiId,
                    installmentNumber: emi.installmentNumber,
                    description: `Mirror Profit - EMI #${emi.installmentNumber} - Original Interest ₹${originalInterestAmount} - Mirror Interest ₹${mirrorInterestAmount} = Profit ₹${profitAmount}`,
                    transactionDate: new Date()
                  }
                });

                console.log(`[MIRROR SYNC] Profit ₹${profitAmount} recorded for Company 3`);
              }
            }
          }
        }

        // Fetch payment ID inside tx (reads its own writes)
        const latestPayment = await tx.payment.findFirst({
          where: { loanApplicationId: loanId, emiScheduleId: emiId, amount: paidAmount },
          orderBy: { createdAt: 'desc' },
          select: { id: true }
        });
        const capturedPaymentId = latestPayment?.id || null;
        const capturedCompanyId = mirrorCompanyId || emi.loanApplication?.companyId || null;

        // ── EXTRA EMI: credit the secondary payment page owner ──────────────────
        // When installmentNumber > mirrorTenure, the cashier selected a SecondaryPaymentPage
        // during disbursement. On approval, the page's role owner gets personalCredit += EMI amount.
        const mirrorMappingFull = await tx.mirrorLoanMapping.findFirst({
          where: { originalLoanId: loanId },
          select: { mirrorTenure: true, extraEMIPaymentPageId: true }
        });
        if (
          mirrorMappingFull?.extraEMIPaymentPageId &&
          mirrorMappingFull.mirrorTenure > 0 &&
          emi.installmentNumber > mirrorMappingFull.mirrorTenure
        ) {
          const spPage = await tx.secondaryPaymentPage.findUnique({
            where: { id: mirrorMappingFull.extraEMIPaymentPageId },
            select: { roleId: true, name: true }
          });
          if (spPage?.roleId) {
            const pageOwner = await tx.user.findUnique({
              where: { id: spPage.roleId },
              select: { id: true, personalCredit: true, companyCredit: true, credit: true }
            });
            if (pageOwner) {
              const newPersonalCr = pageOwner.personalCredit + paidAmount;
              const newTotalCr    = pageOwner.companyCredit + newPersonalCr;
              await tx.user.update({
                where: { id: pageOwner.id },
                data: { personalCredit: newPersonalCr, credit: newTotalCr }
              });
              await tx.creditTransaction.create({
                data: {
                  userId:              pageOwner.id,
                  transactionType:     'PERSONAL_COLLECTION',
                  amount:              paidAmount,
                  paymentMode:         actualPaymentMode,
                  creditType:          'PERSONAL',
                  companyBalanceAfter: pageOwner.companyCredit,
                  personalBalanceAfter: newPersonalCr,
                  balanceAfter:        newTotalCr,
                  sourceType:          'EXTRA_EMI_SECONDARY_PAGE',
                  sourceId:            emiId,
                  loanApplicationId:   loanId,
                  emiScheduleId:       emiId,
                  installmentNumber:   emi.installmentNumber,
                  description:         `Extra EMI #${emi.installmentNumber} collected via "${spPage.name}" page - ${emi.loanApplication?.applicationNo}`,
                  transactionDate:     new Date()
                }
              });
              console.log(`[EXTRA EMI] ✅ personalCredit of "${spPage.name}" owner (${pageOwner.id}) += ₹${paidAmount}`);
            }
          }
        }
        // ─────────────────────────────────────────────────────────────────────────

        return { updatedEmi, capturedPaymentId, capturedCompanyId };
      }, { maxWait: 30000, timeout: 30000 });

      // ── ACCOUNTING JOURNAL ENTRY (AFTER tx commits, before response) ──
      // createEMIPaymentEntry uses global db — must NOT be inside tx (SQLite deadlock)
      const { updatedEmi: result, capturedPaymentId, capturedCompanyId } = txResult;

      // Interest-first allocation rule (used for journal entry):
      //   • INTEREST_ONLY   → all to interest, 0 to principal
      //   • Staff override  → use provided principalComponent/interestComponent  
      //   • PARTIAL / FULL  → cover interest first, remainder goes to principal
      let principalPaid: number;
      let interestPaid: number;
      if (normalizedPaymentType === 'INTEREST_ONLY') {
        interestPaid = paidAmount;
        principalPaid = 0;
      } else if (staffPrincipal !== undefined && staffInterest !== undefined) {
        // Staff explicitly set the split — respect it for the journal entry
        principalPaid = Number(staffPrincipal);
        interestPaid  = Number(staffInterest);
        console.log(`[EMI API] Staff override: P ₹${principalPaid} + I ₹${interestPaid}`);
      } else {
        // Default: interest-first, then principal
        interestPaid  = Math.min(paidAmount, emi.interestAmount);
        principalPaid = Math.max(0, paidAmount - interestPaid);
      }

      if (capturedPaymentId && capturedCompanyId) {
        try {
          await createEMIPaymentEntry({
            loanId,
            customerId: emi.loanApplication?.customerId || '',
            paymentId: capturedPaymentId,
            totalAmount: paidAmount,
            principalComponent: principalPaid,
            interestComponent: interestPaid,
            penaltyComponent: 0,
            paymentDate: new Date(),
            createdById: userId,
            paymentMode: actualPaymentMode,
            targetCompanyId: capturedCompanyId,
          });
          console.log(`[EMI API] ✅ Journal entry created for company ${capturedCompanyId}`);
        } catch (journalError) {
          console.error('[EMI API] ⚠️ Journal entry failed (payment still recorded):', journalError);
        }

        // ── PROCESSING FEE JOURNAL ENTRY on first EMI (EMI #1) ──
        // Same logic as offline loans: when installment #1 is paid, record the processing fee
        const processingFeeAmount = emi.loanApplication?.sessionForm?.processingFee || 0;
        if (emi.installmentNumber === 1 && processingFeeAmount > 0 && capturedCompanyId) {
          try {
            const pfService = new AccountingService(capturedCompanyId);
            await pfService.initializeChartOfAccounts();
            // Check idempotency: don't create duplicate processing fee entry for same loan
            const existingPfEntry = await db.journalEntry.findFirst({
              where: { companyId: capturedCompanyId, referenceId: loanId, referenceType: 'PROCESSING_FEE_COLLECTION', isReversed: false },
              select: { id: true }
            });
            if (!existingPfEntry) {
              await pfService.recordProcessingFee({
                loanId,
                customerId: emi.loanApplication?.customerId || '',
                amount: processingFeeAmount,
                collectionDate: new Date(),
                createdById: userId,
                paymentMode: actualPaymentMode,
              });
              console.log(`[EMI API] ✅ Processing fee ₹${processingFeeAmount} journal entry created (EMI #1)`);

              // ── Also update the physical Cashbook / BankAccount passbook ──
              // (journal entry alone doesn't update the passbook balances)
              const pfDesc = `Processing Fee Collection - ${emi.loanApplication?.applicationNo || loanId}`;
              const pfRef = `PF-${loanId}`;
              if (actualPaymentMode === 'CASH') {
                // Cash → CashBook
                let cashBook = await db.cashBook.findUnique({ where: { companyId: capturedCompanyId } });
                if (!cashBook) cashBook = await db.cashBook.create({ data: { companyId: capturedCompanyId, currentBalance: 0 } });
                const newCashBal = cashBook.currentBalance + processingFeeAmount;
                await db.cashBookEntry.create({
                  data: { cashBookId: cashBook.id, entryType: 'CREDIT', amount: processingFeeAmount, balanceAfter: newCashBal, description: pfDesc, referenceType: 'PROCESSING_FEE', referenceId: pfRef, createdById: userId, entryDate: new Date() }
                });
                await db.cashBook.update({ where: { id: cashBook.id }, data: { currentBalance: newCashBal, lastUpdatedById: userId, lastUpdatedAt: new Date() } });
                console.log(`[EMI API] ✅ Processing fee CashBook entry: +₹${processingFeeAmount}`);
              } else {
                // Online/Cheque → BankAccount
                const bankAcct = await db.bankAccount.findFirst({ where: { companyId: capturedCompanyId, isActive: true }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
                if (bankAcct) {
                  const newBankBal = bankAcct.currentBalance + processingFeeAmount;
                  await db.bankTransaction.create({
                    data: { bankAccountId: bankAcct.id, transactionType: 'CREDIT', amount: processingFeeAmount, balanceAfter: newBankBal, description: pfDesc, referenceType: 'PROCESSING_FEE', referenceId: pfRef, createdById: userId, transactionDate: new Date() }
                  });
                  await db.bankAccount.update({ where: { id: bankAcct.id }, data: { currentBalance: newBankBal } });
                  console.log(`[EMI API] ✅ Processing fee BankTransaction: +₹${processingFeeAmount} → ${bankAcct.bankName}`);
                }
              }
            } else {
              console.log(`[EMI API] ℹ️ Processing fee entry already exists for loan ${loanId}, skipping`);
            }
          } catch (pfError) {
            console.error('[EMI API] ⚠️ Processing fee journal entry failed:', pfError);
          }
        } // end processing fee block

        // ── BANK / CASHBOOK PASSBOOK UPDATE ──────────────────────────────────────
        // Update the physical passbook records so EMI payments show up in
        // the bank statements and cash book (not just the journal/daybook).
        // This runs even if the journal entry failed — passbook is a separate concern.
        if (capturedPaymentId && capturedCompanyId) {
          try {
            const isCash = actualPaymentMode === 'CASH';
            const loanAppNo = emi.loanApplication?.applicationNo || loanId;
            const passbookDesc = `EMI #${emi.installmentNumber} Collection - ${loanAppNo}`;

            // ── SPLIT: create separate cash + bank entries ────────────────────
            if (isSplitMode && (splitCashAmount > 0 || splitOnlineAmount > 0)) {
              // Cash portion → CashBook
              if (splitCashAmount > 0) {
                let cashBook = await db.cashBook.findUnique({ where: { companyId: capturedCompanyId } });
                if (!cashBook) cashBook = await db.cashBook.create({ data: { companyId: capturedCompanyId, currentBalance: 0 } });
                const newCashBal = cashBook.currentBalance + splitCashAmount;
                await db.cashBookEntry.create({ data: { cashBookId: cashBook.id, entryType: 'CREDIT', amount: splitCashAmount, balanceAfter: newCashBal, description: `${passbookDesc} (Cash portion)`, referenceType: 'EMI_PAYMENT', referenceId: capturedPaymentId, createdById: userId, entryDate: new Date() } });
                await db.cashBook.update({ where: { id: cashBook.id }, data: { currentBalance: newCashBal, lastUpdatedById: userId, lastUpdatedAt: new Date() } });
              }
              // Online portion → BankAccount
              if (splitOnlineAmount > 0) {
                const bankAcct = await db.bankAccount.findFirst({ where: { companyId: capturedCompanyId, isActive: true }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
                if (bankAcct) {
                  const newBankBal = bankAcct.currentBalance + splitOnlineAmount;
                  await db.bankTransaction.create({ data: { bankAccountId: bankAcct.id, transactionType: 'CREDIT', amount: splitOnlineAmount, balanceAfter: newBankBal, description: `${passbookDesc} (Online portion)`, referenceType: 'EMI_PAYMENT', referenceId: capturedPaymentId, createdById: userId, transactionDate: new Date() } });
                  await db.bankAccount.update({ where: { id: bankAcct.id }, data: { currentBalance: newBankBal } });
                }
              }
              console.log(`[EMI API] ✅ SPLIT passbook: Cash ₹${splitCashAmount} + Online ₹${splitOnlineAmount}`);
            } else if (isCash) {
              // CASH → update CashBook
              let cashBook = await db.cashBook.findUnique({ where: { companyId: capturedCompanyId } });
              if (!cashBook) {
                cashBook = await db.cashBook.create({ data: { companyId: capturedCompanyId, currentBalance: 0 } });
              }
              const newCashBalance = cashBook.currentBalance + paidAmount;
              await db.cashBookEntry.create({
                data: {
                  cashBookId: cashBook.id,
                  entryType: 'CREDIT',
                  amount: paidAmount,
                  balanceAfter: newCashBalance,
                  description: passbookDesc,
                  referenceType: 'EMI_PAYMENT',
                  referenceId: capturedPaymentId,
                  createdById: userId,
                  entryDate: new Date(),
                },
              });
              await db.cashBook.update({
                where: { id: cashBook.id },
                data: { currentBalance: newCashBalance, lastUpdatedById: userId, lastUpdatedAt: new Date() },
              });
              console.log(`[EMI API] ✅ CashBook entry created: +₹${paidAmount} (new balance: ₹${newCashBalance})`);
            } else {
              // ONLINE / CHEQUE → update BankAccount
              const bankAcct = await db.bankAccount.findFirst({
                where: { companyId: capturedCompanyId, isActive: true },
                orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
              });
              if (bankAcct) {
                const newBankBalance = bankAcct.currentBalance + paidAmount;
                await db.bankTransaction.create({
                  data: {
                    bankAccountId: bankAcct.id,
                    transactionType: 'CREDIT',
                    amount: paidAmount,
                    balanceAfter: newBankBalance,
                    description: passbookDesc,
                    referenceType: 'EMI_PAYMENT',
                    referenceId: capturedPaymentId,
                    createdById: userId,
                    transactionDate: new Date(),
                  },
                });
                await db.bankAccount.update({
                  where: { id: bankAcct.id },
                  data: { currentBalance: newBankBalance },
                });
                console.log(`[EMI API] ✅ BankTransaction created: +₹${paidAmount} → ${bankAcct.bankName} (new balance: ₹${newBankBalance})`);
              } else {
                console.warn(`[EMI API] ⚠️ No bank account found for company ${capturedCompanyId}, skipping bank passbook entry`);
              }
            }
          } catch (bookError) {
            console.error('[EMI API] ⚠️ Bank/cashbook passbook update failed (payment still recorded):', bookError);
          }
        }
      } // end outer if (capturedPaymentId && capturedCompanyId)

      return NextResponse.json({ 
        success: true, 
        emi: result,
        message: isCompanyOnlinePayment 
          ? `EMI paid successfully. Payment recorded to company bank account. No credit change (direct bank payment).`
          : `EMI paid successfully. Your ${actualCreditType.toLowerCase()} credit increased by ₹${creditIncreaseAmount}`,
        creditBreakdown: {
          companyCredit: newCompanyCredit,
          personalCredit: newPersonalCredit,
          totalCredit: newTotalCredit,
          creditIncreased: !isCompanyOnlinePayment,
          increaseAmount: creditIncreaseAmount
        },
        // Explicitly include updated dueDate for partial payments
        updatedFields: {
          dueDate: result.dueDate,
          nextPaymentDate: result.nextPaymentDate,
          paymentStatus: result.paymentStatus,
          isPartialPayment: result.isPartialPayment,
          remainingAmount: result.remainingAmount
        }
      });
    }

    if (!emiId) {
      return NextResponse.json({ error: 'EMI ID is required' }, { status: 400 });
    }

    // Waive penalty
    if (action === 'waive-penalty') {
      const emi = await db.eMISchedule.update({
        where: { id: emiId },
        data: {
          penaltyAmount: 0,
          waiverReason: data.reason,
          waivedById: data.waivedBy,
          waivedAt: new Date()
        }
      });
      return NextResponse.json({ success: true, emi });
    }

    // Change due date
    if (action === 'change-due-date') {
      const emi = await db.eMISchedule.update({
        where: { id: emiId },
        data: {
          dueDate: new Date(data.newDueDate)
        }
      });
      return NextResponse.json({ success: true, emi });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('EMI update error:', error);
    return NextResponse.json({ error: 'Failed to update EMI' }, { status: 500 });
  }
}
