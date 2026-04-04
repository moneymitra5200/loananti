import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { recordEMIPaymentAccounting, getCompany3Id } from '@/lib/simple-accounting';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const emiId = formData.get('emiId') as string;
    const loanId = formData.get('loanId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const paymentMode = formData.get('paymentMode') as string;
    const remarks = formData.get('remarks') as string;
    const paidBy = formData.get('paidBy') as string;
    const creditType = formData.get('creditType') as 'PERSONAL' | 'COMPANY';
    const companyId = formData.get('companyId') as string;
    const proofFile = formData.get('proof') as File | null;
    const isAdvancePayment = formData.get('isAdvancePayment') === 'true'; // Advance payment flag
    
    // Payment type - FULL_EMI, PARTIAL_PAYMENT, INTEREST_ONLY, ADVANCE
    const paymentType = (formData.get('paymentType') as string) || 'FULL_EMI';
    
    console.log(`[EMI Pay] ========== PAYMENT REQUEST ==========`);
    console.log(`[EMI Pay] EMI ID: ${emiId}`);
    console.log(`[EMI Pay] Loan ID: ${loanId}`);
    console.log(`[EMI Pay] Payment Type: ${paymentType}`);
    console.log(`[EMI Pay] Amount: ${amount}`);
    console.log(`[EMI Pay] Payment Mode: ${paymentMode}`);
    console.log(`[EMI Pay] Is Advance Payment: ${isAdvancePayment}`);
    
    // For partial payment
    const partialAmount = formData.get('partialAmount') ? parseFloat(formData.get('partialAmount') as string) : null;
    const nextPaymentDate = formData.get('nextPaymentDate') as string | null;

    if (!emiId || !loanId || !paidBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get EMI details with payment settings
    const emi = await db.eMISchedule.findUnique({
      where: { id: emiId },
      include: {
        loanApplication: {
          include: {
            company: {
              include: {
                defaultPaymentPage: {
                  include: {
                    secondaryPaymentRole: {
                      select: { id: true, name: true, email: true, role: true }
                    }
                  }
                }
              }
            },
            sessionForm: {
              include: {
                agent: {
                  select: { id: true, name: true, email: true }
                }
              }
            },
            emiSchedules: {
              where: { paymentStatus: 'PENDING' },
              orderBy: { installmentNumber: 'asc' }
            }
          }
        },
        paymentSetting: {
          include: {
            secondaryPaymentPage: {
              include: {
                role: {
                  select: { id: true, name: true, email: true, role: true }
                }
              }
            }
          }
        }
      }
    });

    if (!emi) {
      return NextResponse.json({ error: 'EMI not found' }, { status: 404 });
    }

    // ============ MIRROR LOAN CHECK ============
    // Mirror loans cannot be paid directly - they sync from original loan
    const mirrorLoanCheck = await db.mirrorLoanMapping.findFirst({
      where: { mirrorLoanId: loanId }
    });

    if (mirrorLoanCheck) {
      return NextResponse.json({
        error: 'Cannot pay mirror loan directly',
        message: 'This is a MIRROR LOAN. Payments are automatically synced from the original loan. Please make payments on the original loan instead.',
        originalLoanId: mirrorLoanCheck.originalLoanId,
        isMirrorLoan: true
      }, { status: 400 });
    }

    // Sequential Payment Validation - Check if previous EMIs are paid
    // INTEREST_ONLY_PAID is also considered as "paid" for sequential payment purposes
    const previousEmis = await db.eMISchedule.findMany({
      where: {
        loanApplicationId: loanId,
        installmentNumber: { lt: emi.installmentNumber },
        paymentStatus: { notIn: ['PAID', 'INTEREST_ONLY_PAID'] }
      }
    });

    if (previousEmis.length > 0) {
      const unpaidEmiNumbers = previousEmis.map(e => e.installmentNumber).sort((a, b) => a - b);
      return NextResponse.json({ 
        error: 'Sequential payment required',
        message: `Please pay EMI #${unpaidEmiNumbers[0]} first before paying this EMI`,
        unpaidEmis: unpaidEmiNumbers
      }, { status: 400 });
    }

    // Check if EMI already has partial payment - disable interest only option
    if (paymentType === 'INTEREST_ONLY' && emi.isPartialPayment) {
      return NextResponse.json({ 
        error: 'Interest only not available after partial payment',
        message: 'This EMI has a partial payment. Interest only option is not available.'
      }, { status: 400 });
    }

    // Handle proof upload - make it resilient
    let proofUrl = '';
    if (proofFile && proofFile.size > 0) {
      try {
        const bytes = await proofFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'proofs');
        
        // Try to create directory
        try {
          await mkdir(uploadsDir, { recursive: true });
        } catch (e) {
          console.log('[EMI Pay] Mkdir result:', e);
        }
        
        const fileName = `proof-${emiId}-${Date.now()}.${proofFile.name.split('.').pop()}`;
        const filePath = path.join(uploadsDir, fileName);
        
        try {
          await writeFile(filePath, buffer);
          proofUrl = `/uploads/proofs/${fileName}`;
          console.log('[EMI Pay] Proof uploaded:', proofUrl);
        } catch (writeErr) {
          console.error('[EMI Pay] Failed to write proof file:', writeErr);
          // Continue without proof
        }
      } catch (uploadErr) {
        console.error('[EMI Pay] Proof upload error:', uploadErr);
        // Continue without proof
      }
    }

    // Calculate payment amounts based on payment type
    let paidAmount = amount;
    let paidPrincipal = 0;
    let paidInterest = 0;
    let newEmiStatus = 'PAID' as 'PAID' | 'PARTIALLY_PAID' | 'INTEREST_ONLY_PAID';
    let isPartialPayment = false;
    let isInterestOnly = false;
    let principalDeferred = false;
    let nextPaymentDateValue: Date | null = null;

    const remainingAmount = emi.totalAmount - (emi.paidAmount || 0);
    const remainingPrincipal = emi.principalAmount - (emi.paidPrincipal || 0);
    const remainingInterest = emi.interestAmount - (emi.paidInterest || 0);

    // ============ ADVANCE PAYMENT CHECK ============
    // Check if EMI is being paid before its due date month starts
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const emiDueDate = new Date(emi.dueDate);
    const emiDueMonth = emiDueDate.getMonth();
    const emiDueYear = emiDueDate.getFullYear();

    // EMI is advance if: current date's month/year < EMI due date's month/year
    const isEmiAdvancePayment = currentYear < emiDueYear || 
      (currentYear === emiDueYear && currentMonth < emiDueMonth);

    console.log(`[EMI Pay] EMI #${emi.installmentNumber} Due: ${emiDueDate.toISOString().split('T')[0]}, Current: ${currentDate.toISOString().split('T')[0]}, Is Advance: ${isEmiAdvancePayment}`);

    if (paymentType === 'FULL_EMI' || paymentType === 'ADVANCE') {
      // ============ ADVANCE PAYMENT LOGIC ============
      // If EMI is being paid before its due date month: COLLECT PRINCIPAL ONLY
      // If EMI is being paid in/past due date month: COLLECT PRINCIPAL + INTEREST
      if (isAdvancePayment || isEmiAdvancePayment) {
        // ADVANCE PAYMENT - Principal Only
        paidPrincipal = remainingPrincipal;
        paidInterest = 0; // No interest for advance payment
        paidAmount = remainingPrincipal;
        newEmiStatus = 'PAID';
        console.log(`[EMI Pay] ADVANCE payment - Principal only: ₹${paidPrincipal}`);
      } else {
        // REGULAR FULL PAYMENT
        paidPrincipal = remainingPrincipal;
        paidInterest = remainingInterest;
        paidAmount = remainingAmount;
        newEmiStatus = 'PAID';
        console.log(`[EMI Pay] FULL payment - Principal: ₹${paidPrincipal}, Interest: ₹${paidInterest}`);
      }
    } else if (paymentType === 'PARTIAL_PAYMENT') {
      // Partial payment - INTEREST FIRST, THEN PRINCIPAL
      console.log(`[EMI Pay] Processing PARTIAL_PAYMENT:`, { partialAmount, nextPaymentDate, remainingAmount, remainingInterest });
      
      if (!partialAmount || partialAmount <= 0) {
        console.log(`[EMI Pay] Invalid partial amount: ${partialAmount}`);
        return NextResponse.json({ success: false, error: 'Invalid partial amount' }, { status: 400 });
      }
      if (!nextPaymentDate) {
        console.log(`[EMI Pay] Missing nextPaymentDate`);
        return NextResponse.json({ success: false, error: 'Next payment date is required for partial payments' }, { status: 400 });
      }
      if (partialAmount > remainingAmount) {
        console.log(`[EMI Pay] Partial amount exceeds remaining: ${partialAmount} > ${remainingAmount}`);
        return NextResponse.json({ success: false, error: 'Partial amount cannot exceed remaining amount' }, { status: 400 });
      }

      isPartialPayment = true;
      paidAmount = partialAmount;
      nextPaymentDateValue = new Date(nextPaymentDate);
      
      console.log(`[EMI Pay] Partial payment details:`, { 
        paidAmount, 
        nextPaymentDateValue: nextPaymentDateValue.toISOString(),
        remainingInterest,
        remainingPrincipal
      });
      
      // INTEREST FIRST, THEN PRINCIPAL
      if (partialAmount <= remainingInterest) {
        paidInterest = partialAmount;
        paidPrincipal = 0;
      } else {
        paidInterest = remainingInterest;
        paidPrincipal = partialAmount - remainingInterest;
      }
      
      if (partialAmount >= remainingAmount - 1) {
        newEmiStatus = 'PAID';
        isPartialPayment = false;
      } else {
        newEmiStatus = 'PARTIALLY_PAID';
      }
      
      console.log(`[EMI Pay] Partial payment calculated:`, { 
        paidInterest, 
        paidPrincipal, 
        newEmiStatus, 
        isPartialPayment 
      });
    } else if (paymentType === 'INTEREST_ONLY') {
      // Interest only payment
      isInterestOnly = true;
      principalDeferred = true;
      paidInterest = remainingInterest;
      paidPrincipal = 0;
      paidAmount = remainingInterest;
      newEmiStatus = 'INTEREST_ONLY_PAID';
    }

    // Update EMI status
    console.log(`[EMI Pay] ========== UPDATING EMI ==========`);
    console.log(`[EMI Pay] isPartialPayment: ${isPartialPayment}`);
    console.log(`[EMI Pay] nextPaymentDateValue: ${nextPaymentDateValue ? nextPaymentDateValue.toISOString() : 'null'}`);
    console.log(`[EMI Pay] Will update dueDate: ${isPartialPayment && nextPaymentDateValue ? 'YES' : 'NO'}`);
    
    const updateData: Record<string, unknown> = {
      paymentStatus: newEmiStatus,
      paidAmount: (emi.paidAmount || 0) + paidAmount,
      paidPrincipal: (emi.paidPrincipal || 0) + paidPrincipal,
      paidInterest: (emi.paidInterest || 0) + paidInterest,
      paidDate: new Date(),
      paymentMode: paymentMode,
      proofUrl: proofUrl,
      notes: remarks,
      isPartialPayment,
      isInterestOnly,
      principalDeferred,
      // Increment partial payment count
      partialPaymentCount: isPartialPayment ? (emi.partialPaymentCount || 0) + 1 : (emi.partialPaymentCount || 0),
      // Calculate remaining amount
      remainingAmount: isPartialPayment ? (emi.totalAmount - ((emi.paidAmount || 0) + paidAmount)) : 0
    };
    
    // For partial payment: Update both dueDate and nextPaymentDate to the new date
    // ONLY this EMI's date changes - subsequent EMIs remain unchanged
    if (isPartialPayment && nextPaymentDateValue) {
      updateData.dueDate = nextPaymentDateValue;
      updateData.nextPaymentDate = nextPaymentDateValue;
      console.log(`[EMI Pay] Setting dueDate and nextPaymentDate to: ${nextPaymentDateValue.toISOString()}`);
    }
    
    const updatedEMI = await db.eMISchedule.update({
      where: { id: emiId },
      data: updateData
    });
    
    // If partial payment, automatically disable interest only option in settings
    if (isPartialPayment) {
      await db.eMIPaymentSetting.upsert({
        where: { emiScheduleId: emiId },
        create: {
          emiScheduleId: emiId,
          loanApplicationId: loanId,
          enableFullPayment: true,
          enablePartialPayment: true,
          enableInterestOnly: false, // Disable interest only after partial payment
          useDefaultCompanyPage: true
        },
        update: {
          enableInterestOnly: false, // Disable interest only after partial payment
          lastModifiedAt: new Date()
        }
      });
      console.log(`[EMI Pay] Auto-disabled interest only option due to partial payment`);
    }
    
    console.log(`[EMI Pay] ========== EMI UPDATED ==========`);
    console.log(`[EMI Pay] EMI #${emi.installmentNumber} status: ${emi.paymentStatus} → ${updatedEMI.paymentStatus}`);
    console.log(`[EMI Pay] Paid Amount: ${updatedEMI.paidAmount}`);
    console.log(`[EMI Pay] Paid Interest: ${updatedEMI.paidInterest}`);
    console.log(`[EMI Pay] Is Interest Only: ${updatedEMI.isInterestOnly}`);

    // Generate receipt when EMI is FULLY PAID or INTEREST ONLY PAID
    const shouldGenerateReceipt = newEmiStatus === 'PAID' || newEmiStatus === 'INTEREST_ONLY_PAID';
    
    let receiptNo: string | null = null;
    if (shouldGenerateReceipt) {
      const companyCode = emi.loanApplication?.company?.code || 'MM';
      
      // Get the last receipt number for this company
      const lastPayment = await db.payment.findFirst({
        where: {
          receiptNumber: { startsWith: `RCP-${companyCode}-` }
        },
        orderBy: { createdAt: 'desc' },
        select: { receiptNumber: true }
      });
      
      let nextNumber = 1;
      if (lastPayment?.receiptNumber) {
        const parts = lastPayment.receiptNumber.split('-');
        const lastNumber = parseInt(parts[parts.length - 1] || '0', 10);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
      
      receiptNo = `RCP-${companyCode}-${nextNumber}`;
      console.log(`[EMI Pay] Generated receipt number: ${receiptNo}`);
    }

    console.log(`[EMI Pay] Receipt Generation: ${shouldGenerateReceipt ? 'YES' : 'NO'} (Status: ${newEmiStatus})`);

    // Create payment record
    const payment = await db.payment.create({
      data: {
        loanApplicationId: loanId,
        emiScheduleId: emiId,
        customerId: emi.loanApplication?.customerId || '',
        amount: paidAmount,
        principalComponent: paidPrincipal,
        interestComponent: paidInterest,
        paymentMode: paymentMode,
        status: 'COMPLETED',
        receiptNumber: receiptNo,
        receiptGenerated: shouldGenerateReceipt,
        paidById: paidBy,
        remarks: remarks,
        proofUrl: proofUrl,
        paymentType: paymentType as 'FULL_EMI' | 'PARTIAL_PAYMENT' | 'INTEREST_ONLY'
      }
    });

    console.log(`[EMI Pay] Payment created: ${payment.id}`);
    if (shouldGenerateReceipt) {
      console.log(`[EMI Pay] Receipt Number: ${receiptNo}`);
    }

    // Bank transaction is handled by recordEMIPaymentAccounting below
    // which properly routes to mirror company's bank for mirror loans

    // Handle partial payment - Only update current EMI's nextPaymentDate
    // Subsequent EMI dates remain UNCHANGED as per new requirement
    if (paymentType === 'PARTIAL_PAYMENT' && isPartialPayment && nextPaymentDateValue && partialAmount) {
      const remainingAfterPartial = remainingAmount - partialAmount;

      // Update payment record with remaining amount info
      await db.payment.update({
        where: { id: payment.id },
        data: {
          remarks: `${remarks || ''} | Remaining: ₹${remainingAfterPartial.toFixed(2)} due by ${nextPaymentDateValue.toLocaleDateString()}`
        }
      });
      
      console.log(`[EMI Pay] Partial payment processed. Remaining: ₹${remainingAfterPartial.toFixed(2)} due by ${nextPaymentDateValue.toISOString().split('T')[0]}. Subsequent EMI dates NOT changed.`);
    }

    // ============ NEW INTEREST ONLY PAYMENT LOGIC ============
    // When customer pays ONLY INTEREST on EMI:
    // 1. Create NEW EMI with unpaid principal + new interest at next position
    // 2. Shift all subsequent EMIs by 1
    // 3. Do this for BOTH original and mirror loans
    
    if (paymentType === 'INTEREST_ONLY' && principalDeferred) {
      console.log(`[Interest Only] Processing for EMI #${emi.installmentNumber} - Original Loan: ${loanId}`);
      
      // Get mirror mapping if exists
      const mirrorMapping = await db.mirrorLoanMapping.findFirst({
        where: { originalLoanId: loanId }
      });
      
      // Get the due date day pattern from first pending EMI (consistent across all EMIs)
      const firstPendingEmi = await db.eMISchedule.findFirst({
        where: {
          loanApplicationId: loanId,
          paymentStatus: { notIn: ['PAID', 'INTEREST_ONLY_PAID'] }
        },
        orderBy: { installmentNumber: 'asc' },
        select: { installmentNumber: true, dueDate: true }
      });
      const dueDateDay = firstPendingEmi?.dueDate?.getDate() || emi.dueDate.getDate() || 15;
      console.log(`[Interest Only] Due date pattern: Day ${dueDateDay} of each month`);
      
      // Get the NEXT EMI's due date for the new EMI
      const nextEmiOriginal = await db.eMISchedule.findFirst({
        where: {
          loanApplicationId: loanId,
          installmentNumber: emi.installmentNumber + 1
        },
        select: { installmentNumber: true, dueDate: true }
      });
      
      // New EMI's due date = Current EMI's due date + 1 month (same day pattern)
      const newEmiDueDate = new Date(emi.dueDate);
      newEmiDueDate.setMonth(newEmiDueDate.getMonth() + 1);
      newEmiDueDate.setDate(dueDateDay);
      console.log(`[Interest Only] New EMI will have due date: ${newEmiDueDate.toISOString().split('T')[0]} (EMI #${emi.installmentNumber} due + 1 month)`);
      
      // Get current max installment number
      const maxInstallment = await db.eMISchedule.findFirst({
        where: { loanApplicationId: loanId },
        orderBy: { installmentNumber: 'desc' },
        select: { installmentNumber: true }
      });
      
      const newTotalEMIs = (maxInstallment?.installmentNumber || 0) + 1;
      
      // ============ ORIGINAL LOAN: Shift subsequent EMIs ============
      // CRITICAL: Get all EMIs AFTER current one (installment number > current, not >=)
      // and shift them in DESCENDING order to avoid unique constraint violations
      const subsequentEmisOriginal = await db.eMISchedule.findMany({
        where: {
          loanApplicationId: loanId,
          installmentNumber: { gt: emi.installmentNumber }  // Only EMIs AFTER current
        },
        orderBy: { installmentNumber: 'desc' }  // DESCENDING order - shift highest first!
      });
      
      console.log(`[Interest Only] Found ${subsequentEmisOriginal.length} subsequent EMIs to shift (installment +1, due date +1 month)`);
      
      // Shift all subsequent EMIs by 1 (increment installment number AND +1 month in due date) - highest first!
      for (const subsequentEmi of subsequentEmisOriginal) {
        const shiftedDueDate = new Date(subsequentEmi.dueDate);
        shiftedDueDate.setMonth(shiftedDueDate.getMonth() + 1);
        shiftedDueDate.setDate(dueDateDay); // Ensure consistent day of month
        
        await db.eMISchedule.update({
          where: { id: subsequentEmi.id },
          data: {
            installmentNumber: subsequentEmi.installmentNumber + 1,
            dueDate: shiftedDueDate,
            originalDueDate: subsequentEmi.originalDueDate || subsequentEmi.dueDate
          }
        });
        console.log(`[Interest Only] Shifted EMI #${subsequentEmi.installmentNumber} → #${subsequentEmi.installmentNumber + 1}, Due: ${subsequentEmi.dueDate.toISOString().split('T')[0]} → ${shiftedDueDate.toISOString().split('T')[0]}`);
      }
      
      // Calculate interest for the new EMI (based on original loan rate)
      const originalRate = emi.loanApplication?.sessionForm?.interestRate || 12;
      const originalType = emi.loanApplication?.sessionForm?.interestType || 'FLAT';
      const newInterestOriginal = originalType === 'FLAT' 
        ? remainingPrincipal * (originalRate / 100) / 12 
        : emi.outstandingPrincipal * (originalRate / 100) / 12;
      
      // Create NEW EMI for original loan at the position right after the interest-paid EMI
      // Due date = Current EMI + 1 month
      const newEMIOriginal = await db.eMISchedule.create({
        data: {
          loanApplicationId: loanId,
          installmentNumber: emi.installmentNumber + 1, // Position after interest-paid EMI (now free)
          dueDate: newEmiDueDate,
          originalDueDate: newEmiDueDate,
          principalAmount: remainingPrincipal,
          interestAmount: Math.round(newInterestOriginal * 100) / 100,
          totalAmount: remainingPrincipal + Math.round(newInterestOriginal * 100) / 100,
          outstandingPrincipal: emi.outstandingPrincipal,
          outstandingInterest: 0,
          paymentStatus: 'PENDING',
          notes: `NEW EMI created from Interest-Only payment on EMI #${emi.installmentNumber}. Due: ${newEmiDueDate.toISOString().split('T')[0]} (EMI #${emi.installmentNumber} due + 1 month). Principal: ₹${remainingPrincipal}, Interest: ₹${Math.round(newInterestOriginal * 100) / 100}`,
          isInterestOnly: false,
          principalDeferred: true,
          originalEMIId: emi.id,
          duplicatedEMINumber: emi.installmentNumber
        }
      });
      
      console.log(`[Interest Only] Created NEW EMI #${newEMIOriginal.installmentNumber} for Original Loan with Due: ${newEmiDueDate.toISOString().split('T')[0]}. Total EMIs now: ${newTotalEMIs}`);
      console.log(`[Interest Only] Original EMI #${emi.installmentNumber} status: INTEREST_ONLY_PAID`);
      
      // ============ MIRROR LOAN: Same process ============
      if (mirrorMapping?.mirrorLoanId) {
        console.log(`[Interest Only] Processing Mirror Loan: ${mirrorMapping.mirrorLoanId}`);
        
        // Get the corresponding mirror EMI
        const mirrorEMI = await db.eMISchedule.findFirst({
          where: {
            loanApplicationId: mirrorMapping.mirrorLoanId,
            installmentNumber: emi.installmentNumber
          }
        });
        
        if (mirrorEMI) {
          // Calculate mirror interest based on mirror rate
          const mirrorRate = mirrorMapping.mirrorInterestRate;
          const mirrorMonthlyRate = mirrorRate / 12 / 100;
          const mirrorInterest = Math.round(mirrorEMI.outstandingPrincipal * mirrorMonthlyRate * 100) / 100;
          const mirrorPrincipal = mirrorEMI.principalAmount;
          
          console.log(`[Interest Only] Mirror EMI #${mirrorEMI.installmentNumber} - Marking as INTEREST_ONLY_PAID, Interest: ₹${mirrorInterest}`);
          
          // Mark mirror EMI as interest-only paid
          await db.eMISchedule.update({
            where: { id: mirrorEMI.id },
            data: {
              paymentStatus: 'INTEREST_ONLY_PAID',
              paidAmount: mirrorInterest,
              paidPrincipal: 0,
              paidInterest: mirrorInterest,
              paidDate: new Date(),
              paymentMode: paymentMode,
              isInterestOnly: true,
              principalDeferred: true,
              notes: `Interest only synced from original loan. Interest: ₹${mirrorInterest}`
            }
          });
          
          console.log(`[Interest Only] Mirror EMI #${mirrorEMI.installmentNumber} marked as INTEREST_ONLY_PAID`);
          
          // Get the due date day pattern from mirror loan's first pending EMI
          const firstPendingMirrorEmi = await db.eMISchedule.findFirst({
            where: {
              loanApplicationId: mirrorMapping.mirrorLoanId,
              paymentStatus: { notIn: ['PAID', 'INTEREST_ONLY_PAID'] }
            },
            orderBy: { installmentNumber: 'asc' },
            select: { installmentNumber: true, dueDate: true }
          });
          const mirrorDueDateDay = firstPendingMirrorEmi?.dueDate?.getDate() || mirrorEMI.dueDate.getDate() || dueDateDay;
          console.log(`[Interest Only] Mirror: Due date pattern: Day ${mirrorDueDateDay} of each month`);
          
          // Get the NEXT mirror EMI's due date for the new EMI
          const nextMirrorEmi = await db.eMISchedule.findFirst({
            where: {
              loanApplicationId: mirrorMapping.mirrorLoanId,
              installmentNumber: mirrorEMI.installmentNumber + 1
            },
            select: { installmentNumber: true, dueDate: true }
          });
          
          // New mirror EMI's due date = Mirror EMI's due date + 1 month (same day pattern)
          const newMirrorEmiDueDate = new Date(mirrorEMI.dueDate);
          newMirrorEmiDueDate.setMonth(newMirrorEmiDueDate.getMonth() + 1);
          newMirrorEmiDueDate.setDate(mirrorDueDateDay);
          console.log(`[Interest Only] Mirror: New EMI will have due date: ${newMirrorEmiDueDate.toISOString().split('T')[0]} (EMI #${mirrorEMI.installmentNumber} due + 1 month)`);
          
          // Shift all subsequent EMIs in mirror loan - DESCENDING order!
          const subsequentEmisMirror = await db.eMISchedule.findMany({
            where: {
              loanApplicationId: mirrorMapping.mirrorLoanId,
              installmentNumber: { gt: mirrorEMI.installmentNumber }  // Only EMIs AFTER current
            },
            orderBy: { installmentNumber: 'desc' }  // DESCENDING - shift highest first!
          });
          
          console.log(`[Interest Only] Mirror: Found ${subsequentEmisMirror.length} subsequent EMIs to shift (installment +1, due date +1 month)`);
          
          for (const subsequentMirrorEmi of subsequentEmisMirror) {
            const shiftedDueDate = new Date(subsequentMirrorEmi.dueDate);
            shiftedDueDate.setMonth(shiftedDueDate.getMonth() + 1);
            shiftedDueDate.setDate(mirrorDueDateDay); // Ensure consistent day of month
            
            await db.eMISchedule.update({
              where: { id: subsequentMirrorEmi.id },
              data: {
                installmentNumber: subsequentMirrorEmi.installmentNumber + 1,
                dueDate: shiftedDueDate,
                originalDueDate: subsequentMirrorEmi.originalDueDate || subsequentMirrorEmi.dueDate
              }
            });
            console.log(`[Interest Only] Mirror: Shifted EMI #${subsequentMirrorEmi.installmentNumber} → #${subsequentMirrorEmi.installmentNumber + 1}, Due: ${subsequentMirrorEmi.dueDate.toISOString().split('T')[0]} → ${shiftedDueDate.toISOString().split('T')[0]}`);
          }
          
          // Calculate new interest for mirror NEW EMI
          const newInterestMirror = Math.round(mirrorEMI.outstandingPrincipal * mirrorMonthlyRate * 100) / 100;
          
          // Create NEW EMI for mirror loan with due date = Mirror EMI + 1 month
          const newEMIMirror = await db.eMISchedule.create({
            data: {
              loanApplicationId: mirrorMapping.mirrorLoanId,
              installmentNumber: mirrorEMI.installmentNumber + 1,
              dueDate: newMirrorEmiDueDate,
              originalDueDate: newMirrorEmiDueDate,
              principalAmount: mirrorPrincipal,
              interestAmount: newInterestMirror,
              totalAmount: mirrorPrincipal + newInterestMirror,
              outstandingPrincipal: mirrorEMI.outstandingPrincipal,
              outstandingInterest: 0,
              paymentStatus: 'PENDING',
              notes: `NEW EMI created from Interest-Only payment sync. Due: ${newMirrorEmiDueDate.toISOString().split('T')[0]} (EMI #${mirrorEMI.installmentNumber} due + 1 month). Principal: ₹${mirrorPrincipal}, Interest: ₹${newInterestMirror}`,
              isInterestOnly: false,
              principalDeferred: true,
              originalEMIId: mirrorEMI.id,
              duplicatedEMINumber: mirrorEMI.installmentNumber
            }
          });
          
          console.log(`[Interest Only] Created NEW EMI #${newEMIMirror.installmentNumber} for Mirror Loan with Due: ${newMirrorEmiDueDate.toISOString().split('T')[0]}`);
          
          // ============ ACCOUNTING ENTRIES ============
          // Mirror Company gets their interest portion
          // Company 3 gets the difference as profit
          
          const originalInterest = remainingInterest; // e.g., Rs 200
          const mirrorInterestPaid = mirrorInterest;  // e.g., Rs 112
          const profitForCompany3 = originalInterest - mirrorInterestPaid; // e.g., Rs 88
          
          // Record interest income for Mirror Company (Company 1)
          const mirrorCompanyBank = await db.bankAccount.findFirst({
            where: { companyId: mirrorMapping.mirrorCompanyId, isActive: true }
          });
          
          if (mirrorCompanyBank && mirrorInterestPaid > 0) {
            await db.bankAccount.update({
              where: { id: mirrorCompanyBank.id },
              data: { currentBalance: { increment: mirrorInterestPaid } }
            });
            
            await db.bankTransaction.create({
              data: {
                bankAccountId: mirrorCompanyBank.id,
                transactionType: 'CREDIT',
                amount: mirrorInterestPaid,
                balanceAfter: mirrorCompanyBank.currentBalance + mirrorInterestPaid,
                description: `INTEREST INCOME (Mirror) - ${emi.loanApplication?.applicationNo} - EMI #${emi.installmentNumber}`,
                referenceType: 'MIRROR_INTEREST_INCOME',
                referenceId: payment.id,
                createdById: paidBy
              }
            });
            
            console.log(`[Accounting] Mirror Company: ₹${mirrorInterestPaid} interest income recorded`);
          }
          
          // Record profit for Company 3 (Original Company)
          if (profitForCompany3 > 0 && mirrorMapping.originalCompanyId) {
            const originalCompanyBank = await db.bankAccount.findFirst({
              where: { companyId: mirrorMapping.originalCompanyId, isActive: true }
            });
            
            if (originalCompanyBank) {
              await db.bankAccount.update({
                where: { id: originalCompanyBank.id },
                data: { currentBalance: { increment: profitForCompany3 } }
              });
              
              await db.bankTransaction.create({
                data: {
                  bankAccountId: originalCompanyBank.id,
                  transactionType: 'CREDIT',
                  amount: profitForCompany3,
                  balanceAfter: originalCompanyBank.currentBalance + profitForCompany3,
                  description: `MIRROR PROFIT - ${emi.loanApplication?.applicationNo} - EMI #${emi.installmentNumber} (Original: ₹${originalInterest}, Mirror: ₹${mirrorInterestPaid})`,
                  referenceType: 'MIRROR_PROFIT',
                  referenceId: payment.id,
                  createdById: paidBy
                }
              });
              
              console.log(`[Accounting] Company 3: ₹${profitForCompany3} profit recorded (Original Interest: ₹${originalInterest} - Mirror Interest: ₹${mirrorInterestPaid})`);
            }
          }
        }
      }
    }

    // ============ CREDIT UPDATE ============
    const emiSettings = emi.paymentSetting;
    const secondaryPaymentPage = emiSettings?.secondaryPaymentPage;
    const companyPaymentPage = emi.loanApplication?.company?.defaultPaymentPage;

    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId }
    });
    const isExtraEMI = mirrorMapping && emi.installmentNumber > mirrorMapping.mirrorTenure;

    let creditUserId = paidBy;
    let effectiveCreditType = creditType;
    let creditReason = '';
    
    if (secondaryPaymentPage?.role && !emiSettings?.useDefaultCompanyPage) {
      creditUserId = secondaryPaymentPage.role.id;
      effectiveCreditType = 'PERSONAL';
      creditReason = `via EMI Secondary Payment Page (${secondaryPaymentPage.name})`;
    } else if (isExtraEMI && companyPaymentPage?.secondaryPaymentRole) {
      creditUserId = companyPaymentPage.secondaryPaymentRole.id;
      effectiveCreditType = 'PERSONAL';
      creditReason = `via Company Payment Page (Extra EMI #${emi.installmentNumber})`;
    }

    if (effectiveCreditType === 'PERSONAL') {
      const user = await db.user.findUnique({
        where: { id: creditUserId },
        select: { personalCredit: true, companyCredit: true, credit: true, name: true }
      });
      
      const newPersonalCredit = (user?.personalCredit || 0) + paidAmount;
      const newTotalCredit = (user?.credit || 0) + paidAmount;
      
      await db.creditTransaction.create({
        data: {
          userId: creditUserId,
          transactionType: 'PERSONAL_COLLECTION',
          amount: paidAmount,
          paymentMode: (paymentMode || 'CASH') as 'CASH' | 'CHEQUE' | 'ONLINE' | 'UPI' | 'BANK_TRANSFER' | 'SYSTEM',
          creditType: 'PERSONAL',
          sourceType: 'EMI_PAYMENT',
          balanceAfter: newTotalCredit,
          personalBalanceAfter: newPersonalCredit,
          companyBalanceAfter: user?.companyCredit || 0,
          loanApplicationId: loanId,
          emiScheduleId: emiId,
          installmentNumber: emi.installmentNumber,
          customerName: emi.loanApplication?.firstName + ' ' + emi.loanApplication?.lastName,
          loanApplicationNo: emi.loanApplication?.applicationNo,
          emiDueDate: emi.dueDate,
          emiAmount: emi.totalAmount,
          description: `EMI Payment - ${emi.loanApplication?.applicationNo || loanId}${creditReason ? ` ${creditReason}` : ''}`,
          transactionDate: new Date()
        }
      });
      
      await db.user.update({
        where: { id: creditUserId },
        data: {
          personalCredit: newPersonalCredit,
          credit: newTotalCredit
        }
      });
      
      console.log(`[Credit] ₹${paidAmount} credited to personal credit of user ${creditUserId} ${creditReason}`);
    } else if (effectiveCreditType === 'COMPANY' && companyId) {
      const company = await db.company.findUnique({
        where: { id: companyId },
        select: { companyCredit: true }
      });
      
      const newCompanyCredit = (company?.companyCredit || 0) + paidAmount;
      
      await db.creditTransaction.create({
        data: {
          userId: paidBy,
          transactionType: 'CREDIT_INCREASE',
          amount: paidAmount,
          paymentMode: (paymentMode || 'CASH') as 'CASH' | 'CHEQUE' | 'ONLINE' | 'UPI' | 'BANK_TRANSFER' | 'SYSTEM',
          creditType: 'COMPANY',
          sourceType: 'EMI_PAYMENT',
          balanceAfter: newCompanyCredit,
          personalBalanceAfter: 0,
          companyBalanceAfter: newCompanyCredit,
          loanApplicationId: loanId,
          emiScheduleId: emiId,
          installmentNumber: emi.installmentNumber,
          customerName: emi.loanApplication?.firstName + ' ' + emi.loanApplication?.lastName,
          loanApplicationNo: emi.loanApplication?.applicationNo,
          emiDueDate: emi.dueDate,
          emiAmount: emi.totalAmount,
          description: `EMI Payment - ${emi.loanApplication?.applicationNo || loanId}`,
          transactionDate: new Date()
        }
      });
      
      await db.company.update({
        where: { id: companyId },
        data: {
          companyCredit: newCompanyCredit
        }
      });
    }

    // Check if all EMIs are paid
    const allEMIs = await db.eMISchedule.findMany({ 
      where: { loanApplicationId: loanId } 
    });
    
    // All EMIs must be fully paid (PAID or INTEREST_ONLY_PAID counts as paid)
    const allPaid = allEMIs.every(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID');
    
    console.log(`[EMI Pay] Checking if all EMIs paid for loan ${loanId}: ${allPaid}`);
    console.log(`[EMI Pay] EMI Statuses: ${allEMIs.map(e => `${e.installmentNumber}:${e.paymentStatus}`).join(', ')}`);
    
    if (allPaid) {
      console.log(`[EMI Pay] Marking loan ${loanId} as CLOSED`);
      await db.loanApplication.update({
        where: { id: loanId },
        data: { status: 'CLOSED' }
      });
    }

    // ============ MIRROR LOAN SYNC FOR FULL EMI PAYMENT ============
    if (mirrorMapping && paymentType === 'FULL_EMI') {
      const installmentNumber = emi.installmentNumber;
      const isExtraEMIForMirror = installmentNumber > mirrorMapping.mirrorTenure;

      if (isExtraEMIForMirror) {
        // Extra EMI - Full amount is PROFIT for Company 3
        const originalCompanyId = emi.loanApplication?.companyId;
        
        await db.mirrorLoanMapping.update({
          where: { id: mirrorMapping.id },
          data: {
            extraEMIsPaid: { increment: 1 },
            totalProfitReceived: { increment: paidAmount }
          }
        });

        if (originalCompanyId) {
          const company3Bank = await db.bankAccount.findFirst({
            where: { companyId: originalCompanyId, isActive: true }
          });

          if (company3Bank) {
            await db.bankAccount.update({
              where: { id: company3Bank.id },
              data: { currentBalance: { increment: paidAmount } }
            });

            await db.bankTransaction.create({
              data: {
                bankAccountId: company3Bank.id,
                transactionType: 'CREDIT',
                amount: paidAmount,
                balanceAfter: company3Bank.currentBalance + paidAmount,
                description: `EXTRA EMI PROFIT - ${emi.loanApplication?.applicationNo} - EMI #${installmentNumber}`,
                referenceType: 'EXTRA_EMI_PROFIT',
                referenceId: payment.id,
                createdById: paidBy
              }
            });
          }
        }

        console.log(`[Mirror Loan] Extra EMI #${installmentNumber} paid. ₹${paidAmount} profit recorded for Company 3`);
      } else {
        // Regular EMI - Sync to mirror loan
        await db.mirrorLoanMapping.update({
          where: { id: mirrorMapping.id },
          data: {
            mirrorEMIsPaid: { increment: 1 },
            ...(installmentNumber === mirrorMapping.mirrorTenure ? { 
              mirrorCompletedAt: new Date() 
            } : {})
          }
        });

        const interestPortion = paidInterest;

        const mirrorCompanyId = mirrorMapping.mirrorCompanyId;
        const mirrorCompanyBank = await db.bankAccount.findFirst({
          where: { companyId: mirrorCompanyId, isActive: true }
        });

        if (mirrorCompanyBank && interestPortion > 0) {
          await db.bankAccount.update({
            where: { id: mirrorCompanyBank.id },
            data: { currentBalance: { increment: interestPortion } }
          });

          await db.bankTransaction.create({
            data: {
              bankAccountId: mirrorCompanyBank.id,
              transactionType: 'CREDIT',
              amount: interestPortion,
              balanceAfter: mirrorCompanyBank.currentBalance + interestPortion,
              description: `MIRROR INTEREST - ${emi.loanApplication?.applicationNo} - EMI #${installmentNumber}`,
              referenceType: 'MIRROR_INTEREST',
              referenceId: payment.id,
              createdById: paidBy
            }
          });
        }

        console.log(`[Mirror Loan] Regular EMI #${installmentNumber} paid. Interest ₹${interestPortion} recorded for Mirror Company`);
        
        // Mark mirror EMI as paid
        if (mirrorMapping.mirrorLoanId) {
          const mirrorEMI = await db.eMISchedule.findFirst({
            where: {
              loanApplicationId: mirrorMapping.mirrorLoanId,
              installmentNumber: installmentNumber,
              paymentStatus: 'PENDING'
            }
          });
          
          if (mirrorEMI) {
            const mirrorMonthlyRate = mirrorMapping.mirrorInterestRate / 12 / 100;
            const mirrorInterest = Math.round(mirrorEMI.outstandingPrincipal * mirrorMonthlyRate * 100) / 100;
            const mirrorPrincipal = Math.min(mirrorEMI.totalAmount - mirrorInterest, mirrorEMI.outstandingPrincipal);
            
            await db.eMISchedule.update({
              where: { id: mirrorEMI.id },
              data: {
                paymentStatus: 'PAID',
                paidAmount: mirrorEMI.totalAmount,
                paidPrincipal: mirrorPrincipal,
                paidInterest: mirrorInterest,
                paidDate: new Date(),
                paymentMode: paymentMode,
                notes: `Synced from original loan EMI payment`
              }
            });
            
            await db.payment.create({
              data: {
                loanApplicationId: mirrorMapping.mirrorLoanId,
                emiScheduleId: mirrorEMI.id,
                customerId: emi.loanApplication?.customerId || '',
                amount: mirrorEMI.totalAmount,
                principalComponent: mirrorPrincipal,
                interestComponent: mirrorInterest,
                paymentMode: paymentMode,
                status: 'COMPLETED',
                receiptNumber: `RCP-MIRROR-${Date.now()}`,
                paidById: paidBy,
                remarks: `Auto-synced from original loan ${emi.loanApplication?.applicationNo}`,
                paymentType: 'FULL_EMI'
              }
            });
            
            console.log(`[Mirror Loan] Synced EMI #${installmentNumber} to mirror loan ${mirrorMapping.mirrorLoanId}`);
          }
        }
      }
    }

    // Log action
    await db.actionLog.create({
      data: {
        userId: paidBy,
        userRole: 'CASHIER',
        actionType: paymentType === 'FULL_EMI' ? 'PAYMENT' : 
                    paymentType === 'PARTIAL_PAYMENT' ? 'PAYMENT' : 'PAYMENT',
        module: 'EMI_PAYMENT',
        recordId: payment.id,
        recordType: 'Payment',
        previousData: JSON.stringify({
          emiStatus: emi.paymentStatus,
          paidAmount: emi.paidAmount
        }),
        newData: JSON.stringify({ 
          emiId, 
          loanId, 
          paymentId: payment.id,
          amount: paidAmount, 
          paymentMode, 
          paymentType,
          creditType, 
          companyId: creditType === 'COMPANY' ? companyId : null,
          partialAmount: paymentType === 'PARTIAL_PAYMENT' ? partialAmount : null,
          nextPaymentDate: paymentType === 'PARTIAL_PAYMENT' ? nextPaymentDate : null
        }),
        description: `${paymentType === 'FULL_EMI' ? 'Full EMI' : paymentType === 'PARTIAL_PAYMENT' ? 'Partial' : 'Interest Only'} payment of ₹${paidAmount.toFixed(2)} for EMI #${emi.installmentNumber}`
      }
    });

    // ============================================
    // RECORD ACCOUNTING ENTRIES
    // ============================================
    try {
      // Get Company 3 ID for personal credit
      const company3Id = await getCompany3Id();
      
      if (company3Id) {
        // Get loan company ID
        const loanCompanyId = emi.loanApplication?.companyId || companyId;
        
        // Check for mirror loan
        const mirrorMapping = await db.mirrorLoanMapping.findFirst({
          where: { originalLoanId: loanId }
        });
        
        // Check if this is an extra EMI (beyond mirror tenure)
        const isExtraEMI = mirrorMapping && emi.installmentNumber > mirrorMapping.mirrorTenure;
        
        // Record accounting entries based on credit type and payment mode
        // IMPORTANT: When loan has mirror AND it's NOT an extra EMI, payment goes to MIRROR COMPANY's books
        // For EXTRA EMIs, payment goes to ORIGINAL COMPANY's books (Company 3)
        const isMirrorPayment = !!mirrorMapping && !isExtraEMI;
        
        await recordEMIPaymentAccounting({
          amount: paidAmount,
          principalComponent: paidPrincipal,
          interestComponent: paidInterest,
          paymentMode: paymentMode as 'CASH' | 'ONLINE' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE',
          paymentType: paymentType === 'FULL_EMI' ? 'FULL' : 
                       paymentType === 'PARTIAL_PAYMENT' ? 'PARTIAL' : 
                       paymentType === 'INTEREST_ONLY' ? 'INTEREST_ONLY' : 'ADVANCE',
          creditType: creditType as 'PERSONAL' | 'COMPANY' || 'COMPANY',
          loanCompanyId: loanCompanyId || company3Id,
          company3Id,
          loanId,
          emiId,
          paymentId: payment.id,
          loanNumber: emi.loanApplication?.applicationNo || loanId,
          installmentNumber: emi.installmentNumber,
          userId: paidBy,
          customerId: emi.loanApplication?.customerId,
          // Mirror loan details if applicable
          mirrorLoanId: mirrorMapping?.mirrorLoanId || undefined,
          mirrorCompanyId: mirrorMapping?.mirrorCompanyId || undefined,
          // Flag to indicate this payment should go to mirror company's books
          // FALSE for extra EMIs - they go to original company (C3)
          isMirrorPayment: isMirrorPayment
        });
        
        console.log(`[Accounting] Recorded EMI payment accounting:`);
        console.log(`  - Credit: ${creditType}, Mode: ${paymentMode}`);
        console.log(`  - HasMirror: ${!!mirrorMapping}, IsExtraEMI: ${!!isExtraEMI}`);
        console.log(`  - IsMirrorPayment: ${isMirrorPayment}`);
        console.log(`  - Target: ${isMirrorPayment ? 'MIRROR COMPANY' : (isExtraEMI ? 'ORIGINAL COMPANY (Extra EMI)' : 'LOAN COMPANY')}`);
      } else {
        console.warn('[Accounting] Company 3 not found - skipping personal credit accounting');
      }
    } catch (accountingError) {
      // Log but don't fail the payment
      console.error('[Accounting] Failed to record accounting entry:', accountingError);
    }

    return NextResponse.json({ 
      success: true, 
      message: getPaymentSuccessMessage(paymentType, paidAmount, remainingPrincipal),
      data: {
        emiId: updatedEMI.id,
        paymentStatus: updatedEMI.paymentStatus,
        paidAmount: updatedEMI.paidAmount,
        paidPrincipal: updatedEMI.paidPrincipal,
        paidInterest: updatedEMI.paidInterest,
        isPartialPayment: updatedEMI.isPartialPayment,
        isInterestOnly: updatedEMI.isInterestOnly,
        dueDate: updatedEMI.dueDate,
        nextPaymentDate: updatedEMI.nextPaymentDate,
        creditType,
        creditedTo: creditType === 'PERSONAL' ? paidBy : companyId,
        paymentId: payment.id,
        receiptNumber: payment.receiptNumber
      }
    });

  } catch (error) {
    console.error('EMI payment error:', error);
    return NextResponse.json({ error: 'Failed to process payment', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

function getPaymentSuccessMessage(paymentType: string, paidAmount: number, deferredPrincipal: number): string {
  switch (paymentType) {
    case 'PARTIAL_PAYMENT':
      return `Partial payment of ₹${paidAmount.toFixed(2)} received. Remaining balance rescheduled.`;
    case 'INTEREST_ONLY':
      return `Interest payment of ₹${paidAmount.toFixed(2)} received. NEW EMI created for principal ₹${deferredPrincipal.toFixed(2)} at next position. Both original and mirror loans updated.`;
    default:
      return 'EMI paid successfully';
  }
}
