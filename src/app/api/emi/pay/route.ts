import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getCompany3Id } from '@/lib/simple-accounting';
import { AccountingService, ACCOUNT_CODES } from '@/lib/accounting-service';

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
    
    const paymentType = (formData.get('paymentType') as string) || 'FULL_EMI';
    // Editable interest amount for original loans (staff can override)
    const editedInterestRaw = formData.get('editedInterest');
    const editedInterest = editedInterestRaw ? parseFloat(editedInterestRaw as string) : null;
    
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
    const penaltyWaiver = formData.get('penaltyWaiver') ? parseFloat(formData.get('penaltyWaiver') as string) : 0;

    // ── PENALTY FIELDS ─────────────────────────────────────────────────
    // penaltyAmount: total penalty charged BEFORE waiver
    // penaltyWaiver: amount waived (already declared above)
    // penaltyPaymentMode: where the collected penalty goes (CASH | BANK)
    const penaltyAmount = formData.get('penaltyAmount') ? parseFloat(formData.get('penaltyAmount') as string) : 0;
    const penaltyPaymentMode = (formData.get('penaltyPaymentMode') as string) || 'CASH'; // 'CASH' | 'BANK'
    const netPenalty = Math.max(0, penaltyAmount - penaltyWaiver); // Amount actually collected

    // ── SPLIT / MULTI-MODE PAYMENT FIELDS ──────────────────────────────
    // If paymentMode === 'SPLIT', customer pays part cash + part online
    const isSplitPayment = paymentMode === 'SPLIT';
    const splitCashAmount = formData.get('splitCashAmount') ? parseFloat(formData.get('splitCashAmount') as string) : 0;
    const splitOnlineAmount = formData.get('splitOnlineAmount') ? parseFloat(formData.get('splitOnlineAmount') as string) : 0;

    // ── SPLIT VALIDATION ────────────────────────────────────────────────────
    if (isSplitPayment && (splitCashAmount + splitOnlineAmount) > 0) {
      const splitTotal = splitCashAmount + splitOnlineAmount;
      if (Math.abs(splitTotal - amount) > 1) {
        return NextResponse.json({
          error: `Split amounts (Cash ₹${splitCashAmount} + Online ₹${splitOnlineAmount} = ₹${splitTotal}) must match total payment amount ₹${amount}`
        }, { status: 400 });
      }
    }

    console.log(`[EMI Pay] Penalty: ₹${penaltyAmount} - Waiver: ₹${penaltyWaiver} - Net Penalty: ₹${netPenalty} - Mode: ${penaltyPaymentMode}`);
    if (isSplitPayment) console.log(`[EMI Pay] SPLIT — Cash: ₹${splitCashAmount} | Online: ₹${splitOnlineAmount}`);


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

    // PERFORMANCE: Run mirror check + previous EMI validation IN PARALLEL
    const [mirrorLoanCheck, previousEmis] = await Promise.all([
      db.mirrorLoanMapping.findFirst({ where: { mirrorLoanId: loanId } }),
      db.eMISchedule.findMany({
        where: {
          loanApplicationId: loanId,
          installmentNumber: { lt: emi.installmentNumber },
          paymentStatus: { notIn: ['PAID', 'INTEREST_ONLY_PAID'] }
        }
      })
    ]);

    if (mirrorLoanCheck) {
      return NextResponse.json({
        error: 'Cannot pay mirror loan directly',
        message: 'This is a MIRROR LOAN. Payments are automatically synced from the original loan. Please make payments on the original loan instead.',
        originalLoanId: mirrorLoanCheck.originalLoanId,
        isMirrorLoan: true
      }, { status: 400 });
    }

    if (previousEmis.length > 0) {
      const unpaidEmiNumbers = previousEmis.map(e => e.installmentNumber).sort((a, b) => a - b);
      return NextResponse.json({ 
        error: 'Sequential payment required',
        message: `Please pay EMI #${unpaidEmiNumbers[0]} first before paying this EMI`,
        unpaidEmis: unpaidEmiNumbers
      }, { status: 400 });
    }

    // PERFORMANCE: Fetch mirror mapping ONCE here — reused throughout the route
    // (replaces 3+ duplicate findFirst calls below)
    const mirrorMapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId }
    });
    const isExtraEMI = mirrorMapping && emi.installmentNumber > mirrorMapping.mirrorTenure;

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
        paidInterest  = remainingInterest;
        paidAmount    = remainingAmount;
        newEmiStatus  = 'PAID';
        // ── Apply staff-edited interest (original loans only) ─────────────
        // If the cashier has manually overridden the interest amount via the
        // dialog, honour that value so the correct interest is recorded.
        if (editedInterest !== null && !isNaN(editedInterest) && editedInterest >= 0) {
          paidInterest = editedInterest;
          paidAmount   = paidPrincipal + paidInterest;
          console.log(`[EMI Pay] Staff-edited interest applied: ₹${paidInterest} (was ₹${remainingInterest})`);
        }
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
      waivedAmount: penaltyWaiver,
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
      receiptNo = `RCP-${companyCode}-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
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
        penaltyComponent: netPenalty,          // ← stores actual net penalty collected
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
      
      // Mirror mapping already fetched at top — reuse it
      const mirrorMappingIO = mirrorMapping;
      
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
      if (mirrorMappingIO?.mirrorLoanId) {
        console.log(`[Interest Only] Processing Mirror Loan: ${mirrorMappingIO!.mirrorLoanId}`);
        
        // Get the corresponding mirror EMI
        const mirrorEMI = await db.eMISchedule.findFirst({
          where: {
            loanApplicationId: mirrorMappingIO!.mirrorLoanId,
            installmentNumber: emi.installmentNumber
          }
        });
        
        if (mirrorEMI) {
          // Calculate mirror interest based on mirror rate
          const mirrorRate = mirrorMappingIO!.mirrorInterestRate;
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
              loanApplicationId: mirrorMappingIO!.mirrorLoanId,
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
              loanApplicationId: mirrorMappingIO!.mirrorLoanId,
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
              loanApplicationId: mirrorMappingIO!.mirrorLoanId,
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
              loanApplicationId: mirrorMappingIO!.mirrorLoanId,
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
          
          // ============ ACCOUNTING ENTRIES FOR MIRROR LOAN ============
          // CORRECT LOGIC: Record ONLY the MIRROR INTEREST as income
          // NO deductions, NO profit calculations
          // Just record mirror interest (e.g., ₹112) in mirror company's CashBook
          
          const mirrorInterestPaid = mirrorInterest;
          
          // Record mirror interest as income in Mirror Company's CashBook
          if (mirrorInterestPaid > 0) {
            let mirrorCashBook = await db.cashBook.findUnique({
              where: { companyId: mirrorMappingIO!.mirrorCompanyId }
            });
            
            if (!mirrorCashBook) {
              mirrorCashBook = await db.cashBook.create({
                data: {
                  companyId: mirrorMappingIO!.mirrorCompanyId,
                  currentBalance: 0
                }
              });
            }
            
            const newBalance = mirrorCashBook.currentBalance + mirrorInterestPaid;
            
            await db.cashBook.update({
              where: { id: mirrorCashBook.id },
              data: { currentBalance: newBalance }
            });
            
            await db.cashBookEntry.create({
              data: {
                cashBookId: mirrorCashBook.id,
                entryType: 'CREDIT',
                amount: mirrorInterestPaid,
                balanceAfter: newBalance,
                description: `MIRROR INTEREST INCOME (Interest Only) - ${emi.loanApplication?.applicationNo} - EMI #${emi.installmentNumber}`,
                referenceType: 'MIRROR_INTEREST_INCOME',
                referenceId: payment.id,
                createdById: paidBy
              }
            });
            
            console.log(`[Mirror Interest] Recorded ₹${mirrorInterestPaid} as Interest Income in Mirror Company CashBook`);

            // ── Issue 6 Fix: Double-entry journal for mirror company (interest-only) ─
            try {
              const { AccountingService: IOAccSvc } = await import('@/lib/accounting-service');
              const ioAccSvc = new IOAccSvc(mirrorMappingIO!.mirrorCompanyId);
              await ioAccSvc.initializeChartOfAccounts();
              await ioAccSvc.recordEMIPayment({
                loanId: mirrorMappingIO!.mirrorLoanId || loanId,
                customerId: emi.loanApplication?.customerId || '',
                paymentId: payment.id,
                totalAmount: mirrorInterestPaid,
                principalComponent: 0,
                interestComponent: mirrorInterestPaid,
                paymentDate: new Date(),
                createdById: paidBy || 'SYSTEM',
                paymentMode: paymentMode as any,
                reference: `Interest-Only Mirror Sync EMI #${emi.installmentNumber} - ${emi.loanApplication?.applicationNo}`
              });
              console.log(`[Mirror IO Journal] ₹${mirrorInterestPaid} journal entry created for mirror company`);
            } catch (ioJEErr) {
              console.error('[Mirror IO Journal] Failed (non-critical):', ioJEErr);
            }
          }
        }
      }
    }

    // ============ CREDIT UPDATE ============
    const emiSettings = emi.paymentSetting;
    const secondaryPaymentPage = emiSettings?.secondaryPaymentPage;
    const companyPaymentPage = emi.loanApplication?.company?.defaultPaymentPage;

    // mirrorMapping already fetched at top of handler — reuse it
    const isExtraEMILocal = mirrorMapping && emi.installmentNumber > mirrorMapping.mirrorTenure;

    let creditUserId = paidBy;
    let effectiveCreditType = creditType;
    let creditReason = '';

    if (secondaryPaymentPage?.role && !emiSettings?.useDefaultCompanyPage) {
      // EMI-level secondary payment page assignment
      creditUserId = secondaryPaymentPage.role.id;
      effectiveCreditType = 'PERSONAL';
      creditReason = `via EMI Secondary Payment Page (${secondaryPaymentPage.name})`;
    } else if (isExtraEMILocal) {
      // ── EXTRA EMI: ALWAYS PersonalCredit ────────────────────────────────
      // Secondary payment page owner gets credit if configured;
      // otherwise the role who collected (paidBy) gets credit.
      effectiveCreditType = 'PERSONAL';
      if (companyPaymentPage?.secondaryPaymentRole) {
        creditUserId = companyPaymentPage.secondaryPaymentRole.id;
        creditReason = `Extra EMI #${emi.installmentNumber} — via Company Payment Page`;
      } else {
        creditUserId = paidBy; // cashier / agent who collected
        creditReason = `Extra EMI #${emi.installmentNumber} — direct collection by payer`;
      }
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

    // ============================================
    // PROCESSING FEE INCOME — EMI #1 on MIRROR loans
    // DYNAMIC CALC: processingFee = regularEMIAmount - lastMirrorEMI.totalAmount
    // "Last EMI" = the mirror EMI with the lowest installmentNumber (shifted to #1)
    //   which is normally the smallest amount (reduced due to lower interest rate).
    // Records in MIRROR company books with proper DR/CR journal entry.
    // ============================================
    if (mirrorMapping && newEmiStatus === 'PAID' && emi.installmentNumber === 1) {
      try {
        if (!mirrorMapping.processingFeeRecorded) {
          const mirrorCompanyId = mirrorMapping.mirrorCompanyId;

          // ── DYNAMIC CALCULATION ──────────────────────────────────────────────
          // regularEMI = the standard EMI amount of the original loan
          const regularEMI = emi.loanApplication?.sessionForm?.emiAmount ?? emi.totalAmount;

          // lastMirrorEMI = the mirror EMI for this installment (#1) — 
          // it was shifted to position 1, so it is the smallest (last) mirror EMI
          let dynamicProcFee = 0;
          if (mirrorMapping.mirrorLoanId) {
            const firstMirrorEMI = await db.eMISchedule.findFirst({
              where: {
                loanApplicationId: mirrorMapping.mirrorLoanId,
                installmentNumber: 1          // shifted last → position 1
              },
              select: { totalAmount: true }
            });
            if (firstMirrorEMI) {
              dynamicProcFee = Math.max(0, Math.round((regularEMI - firstMirrorEMI.totalAmount) * 100) / 100);
            }
          }

          // Fallback: use stored value if dynamic calc gives 0
          const procFee = dynamicProcFee > 0 ? dynamicProcFee : (mirrorMapping.mirrorProcessingFee ?? 0);

          console.log(`[Processing Fee] Dynamic calc: regularEMI=₹${regularEMI} - lastMirrorEMI=₹${regularEMI - procFee} = ₹${procFee}`);

          if (procFee > 0) {
            // FIX-ISSUE-6: Atomic — cashbook entry + processingFeeRecorded in same $transaction
            await db.$transaction(async (pfTx) => {
              // Idempotency: skip if already recorded (referenceId = loanId + '-MIR-PF')
              const existingPF = await pfTx.cashBookEntry.findFirst({
                where: { referenceType: 'PROCESSING_FEE', referenceId: `${loanId}-MIR-PF` }
              });
              if (!existingPF) {
                // Store dynamic fee on mapping
                await pfTx.mirrorLoanMapping.update({
                  where: { id: mirrorMapping.id },
                  data: { mirrorProcessingFee: procFee }
                });
                // 1. CashBook entry in mirror company
                const mirrorCashBook = await pfTx.cashBook.findUnique({ where: { companyId: mirrorCompanyId } })
                  ?? await pfTx.cashBook.create({ data: { companyId: mirrorCompanyId, currentBalance: 0 } });
                const newPFBalance = mirrorCashBook.currentBalance + procFee;
                await pfTx.cashBookEntry.create({
                  data: {
                    cashBookId: mirrorCashBook.id,
                    entryType: 'CREDIT',
                    amount: procFee,
                    balanceAfter: newPFBalance,
                    description: `Processing Fee Collection - ${emi.loanApplication?.applicationNo} (Last EMI ₹${regularEMI - procFee} vs Regular EMI ₹${regularEMI})`,
                    referenceType: 'PROCESSING_FEE',
                    referenceId: `${loanId}-MIR-PF`,
                    createdById: paidBy
                  }
                });
                await pfTx.cashBook.update({ where: { id: mirrorCashBook.id }, data: { currentBalance: newPFBalance } });
                // ATOMICALLY mark as recorded
                await pfTx.mirrorLoanMapping.update({ where: { id: mirrorMapping.id }, data: { processingFeeRecorded: true } });
              }
            });

            // 2. Double-entry journal in mirror company (FIX-ISSUE-13: correct DR account for payment mode)
            try {
              const { AccountingService: PFSvc, ACCOUNT_CODES: PF_CODES } = await import('@/lib/accounting-service');
              const pfAccSvc = new PFSvc(mirrorCompanyId);
              await pfAccSvc.initializeChartOfAccounts();
              const isOnlinePF = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS'].includes((paymentMode||'').toUpperCase());
              await pfAccSvc.createJournalEntry({
                entryDate: new Date(),
                referenceType: 'PROCESSING_FEE_COLLECTION',
                referenceId: `${loanId}-MIR-PF-JE`,
                narration: `Processing Fee Income - ${emi.loanApplication?.applicationNo} (Mirror EMI #1 = Last EMI ₹${regularEMI - procFee}, Regular EMI ₹${regularEMI}, Diff ₹${procFee})`,
                createdById: paidBy,
                lines: [
                  {
                    // FIX-ISSUE-13: Use correct DR account based on payment mode
                    accountCode: isOnlinePF ? PF_CODES.BANK_ACCOUNT : PF_CODES.CASH_IN_HAND,
                    debitAmount: procFee,
                    creditAmount: 0,
                    narration: `Processing fee = Regular EMI ₹${regularEMI} - Last Mirror EMI ₹${regularEMI - procFee} [${isOnlinePF ? 'Bank' : 'Cash'}]`,
                  },
                  {
                    accountCode: PF_CODES.PROCESSING_FEE_INCOME,
                    debitAmount: 0,
                    creditAmount: procFee,
                    narration: 'Processing fee income recognized (Last EMI adjustment)',
                  },
                ],
              });
              console.log(`[Processing Fee] ₹${procFee} journal + cashbook atomically recorded in MIRROR company ${mirrorCompanyId}`);
            } catch (pfJEErr) {
              console.error('[Processing Fee] Journal entry failed (non-critical):', pfJEErr);
            }

          } else {
            console.log(`[Processing Fee] Skipping — fee is ₹0 (regularEMI=${regularEMI})`);
            await db.mirrorLoanMapping.update({ where: { id: mirrorMapping.id }, data: { processingFeeRecorded: true } });
          }
        }
      } catch (pfErr) {
        console.error('[Processing Fee] Failed (non-critical):', pfErr);
      }
    }




    // ============ MIRROR LOAN SYNC FOR FULL EMI PAYMENT ============
    if (mirrorMapping && paymentType === 'FULL_EMI') {
      const installmentNumber = emi.installmentNumber;
      const isExtraEMIForMirror = installmentNumber > mirrorMapping.mirrorTenure;

      if (isExtraEMIForMirror) {
        // Extra EMI - Full amount is PROFIT for Company 3 (recorded in CashBook)
        const originalCompanyId = emi.loanApplication?.companyId;
        
        await db.mirrorLoanMapping.update({
          where: { id: mirrorMapping.id },
          data: {
            extraEMIsPaid: { increment: 1 },
            totalProfitReceived: { increment: paidAmount }
          }
        });

        if (originalCompanyId) {
          // Record in Company 3's CashBook (not bank account)
          let company3CashBook = await db.cashBook.findUnique({
            where: { companyId: originalCompanyId }
          });
          
          if (!company3CashBook) {
            company3CashBook = await db.cashBook.create({
              data: {
                companyId: originalCompanyId,
                currentBalance: 0
              }
            });
          }
          
          const newBalance = company3CashBook.currentBalance + paidAmount;
          
          await db.cashBook.update({
            where: { id: company3CashBook.id },
            data: { currentBalance: newBalance }
          });

          await db.cashBookEntry.create({
            data: {
              cashBookId: company3CashBook.id,
              entryType: 'CREDIT',
              amount: paidAmount,
              balanceAfter: newBalance,
              description: `EXTRA EMI PROFIT - ${emi.loanApplication?.applicationNo} - EMI #${installmentNumber}`,
              referenceType: 'EXTRA_EMI_PROFIT',
              referenceId: payment.id,
              createdById: paidBy
            }
          });

          // ── Issue 3 Fix: Double-entry journal for extra EMI profit in Company 3 ─
          try {
            const { AccountingService: ExtraSvc } = await import('@/lib/accounting-service');
            const extraSvc = new ExtraSvc(originalCompanyId);
            await extraSvc.initializeChartOfAccounts();
            await extraSvc.recordEMIPayment({
              loanId,
              customerId: emi.loanApplication?.customerId || '',
              paymentId: payment.id,
              totalAmount: paidAmount,
              principalComponent: 0,
              interestComponent: paidAmount, // Extra EMIs are pure profit — all interest
              paymentDate: new Date(),
              createdById: paidBy || 'SYSTEM',
              paymentMode: paymentMode as any,
              reference: `Extra EMI #${installmentNumber} Profit - ${emi.loanApplication?.applicationNo}`
            });
            console.log(`[Extra EMI Journal] ₹${paidAmount} journal entry created for Company 3`);
          } catch (extraJE) {
            console.error('[Extra EMI Journal] Failed (non-critical):', extraJE);
          }
        }

        console.log(`[Mirror Loan] Extra EMI #${installmentNumber} paid. ₹${paidAmount} profit recorded for Company 3 in CashBook`);
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

        // ============================================
        // CORRECT LOGIC: Record ONLY MIRROR INTEREST as income
        // Calculate mirror interest based on mirror rate
        // ============================================
        
        const mirrorCompanyId = mirrorMapping.mirrorCompanyId;
        
        // Get mirror EMI to calculate correct mirror interest
        if (mirrorMapping.mirrorLoanId) {
          // Issue 11 Fix: No paymentStatus filter — handles PENDING and PARTIALLY_PAID mirror EMIs
          const mirrorEMI = await db.eMISchedule.findFirst({
            where: {
              loanApplicationId: mirrorMapping.mirrorLoanId,
              installmentNumber: installmentNumber
            }
          });
          
          if (mirrorEMI) {
            // Calculate MIRROR interest based on mirror rate
            const mirrorMonthlyRate = mirrorMapping.mirrorInterestRate / 12 / 100;
            const mirrorInterest = Math.round(mirrorEMI.outstandingPrincipal * mirrorMonthlyRate * 100) / 100;
            const mirrorPrincipal = Math.min(mirrorEMI.totalAmount - mirrorInterest, mirrorEMI.outstandingPrincipal);
            
            // Record ONLY mirror interest as income in Mirror Company's CashBook
            if (mirrorInterest > 0) {
              let mirrorCashBook = await db.cashBook.findUnique({
                where: { companyId: mirrorCompanyId }
              });
              
              if (!mirrorCashBook) {
                mirrorCashBook = await db.cashBook.create({
                  data: {
                    companyId: mirrorCompanyId,
                    currentBalance: 0
                  }
                });
              }
              
              const newBalance = mirrorCashBook.currentBalance + mirrorInterest;
              
              await db.cashBook.update({
                where: { id: mirrorCashBook.id },
                data: { currentBalance: newBalance }
              });

              await db.cashBookEntry.create({
                data: {
                  cashBookId: mirrorCashBook.id,
                  entryType: 'CREDIT',
                  amount: mirrorInterest,
                  balanceAfter: newBalance,
                  description: `MIRROR INTEREST INCOME - ${emi.loanApplication?.applicationNo} - EMI #${installmentNumber}`,
                  referenceType: 'MIRROR_INTEREST_INCOME',
                  referenceId: payment.id,
                  createdById: paidBy
                }
              });
              
              console.log(`[Mirror Interest] Recorded ₹${mirrorInterest} as Interest Income in Mirror Company CashBook`);
            }

            // Mark mirror EMI as paid
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

    // ── Issue 5 Fix: PARTIAL PAYMENT → Mirror EMI sync ───────────────────────
    if (mirrorMapping?.mirrorLoanId && paymentType === 'PARTIAL_PAYMENT' && partialAmount && partialAmount > 0) {
      try {
        const mirrorEMIPartial = await db.eMISchedule.findFirst({
          where: {
            loanApplicationId: mirrorMapping.mirrorLoanId,
            installmentNumber: emi.installmentNumber
          }
        });
        if (mirrorEMIPartial && mirrorEMIPartial.paymentStatus !== 'PAID') {
          // Calculate mirror partial amounts — interest-first using REMAINING unpaid interest
          const mirrorMonthlyRate = mirrorMapping.mirrorInterestRate / 12 / 100;
          const mirrorInterestFull = Math.round(mirrorEMIPartial.outstandingPrincipal * mirrorMonthlyRate * 100) / 100;
          // REMAINING interest = total interest - already paid interest (from previous partial payments)
          const mirrorAlreadyPaidInterest = Number(mirrorEMIPartial.paidInterest || 0);
          const mirrorRemainingInterest = Math.max(0, mirrorInterestFull - mirrorAlreadyPaidInterest);
          const ratio = partialAmount / emi.totalAmount;
          const mirrorPartialAmt = Math.round(mirrorEMIPartial.totalAmount * ratio * 100) / 100;
          // Interest-first from REMAINING unpaid mirror interest (not full):
          const mirrorPaidInterest  = Math.min(mirrorPartialAmt, mirrorRemainingInterest);
          const mirrorPaidPrincipal = Math.max(0, mirrorPartialAmt - mirrorPaidInterest);
          const mirrorIsFullyPaid   = (mirrorEMIPartial.paidAmount || 0) + mirrorPartialAmt >= mirrorEMIPartial.totalAmount - 1;

          await db.eMISchedule.update({
            where: { id: mirrorEMIPartial.id },
            data: {
              paymentStatus: mirrorIsFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
              paidAmount:    (mirrorEMIPartial.paidAmount    || 0) + mirrorPartialAmt,
              paidPrincipal: (mirrorEMIPartial.paidPrincipal || 0) + mirrorPaidPrincipal,
              paidInterest:  (mirrorEMIPartial.paidInterest  || 0) + mirrorPaidInterest,
              paidDate: new Date(),
              paymentMode,
              isPartialPayment: !mirrorIsFullyPaid,
              notes: `Partial payment synced from original loan (${Math.round(ratio * 100)}% ratio)`
            }
          });

          // CashBook entry for mirror interest portion
          if (mirrorPaidInterest > 0) {
            let mCB = await db.cashBook.findUnique({ where: { companyId: mirrorMapping.mirrorCompanyId } });
            if (!mCB) mCB = await db.cashBook.create({ data: { companyId: mirrorMapping.mirrorCompanyId, currentBalance: 0 } });
            const mBal = mCB.currentBalance + mirrorPaidInterest;
            await db.cashBook.update({ where: { id: mCB.id }, data: { currentBalance: mBal } });
            await db.cashBookEntry.create({
              data: {
                cashBookId: mCB.id, entryType: 'CREDIT', amount: mirrorPaidInterest,
                balanceAfter: mBal,
                description: `MIRROR PARTIAL INTEREST - ${emi.loanApplication?.applicationNo} EMI #${emi.installmentNumber}`,
                referenceType: 'MIRROR_INTEREST_INCOME', referenceId: payment.id, createdById: paidBy
              }
            });
          }

          // Double-entry journal for mirror partial payment
          try {
            const { AccountingService: PartAccSvc } = await import('@/lib/accounting-service');
            const partAccSvc = new PartAccSvc(mirrorMapping.mirrorCompanyId);
            await partAccSvc.initializeChartOfAccounts();
            await partAccSvc.recordEMIPayment({
              loanId: mirrorMapping.mirrorLoanId,
              customerId: emi.loanApplication?.customerId || '',
              paymentId: payment.id,
              totalAmount: mirrorPartialAmt,
              principalComponent: mirrorPaidPrincipal,
              interestComponent: mirrorPaidInterest,
              paymentDate: new Date(),
              createdById: paidBy || 'SYSTEM',
              paymentMode: paymentMode as any,
              reference: `Partial Sync EMI #${emi.installmentNumber} (${Math.round(ratio * 100)}%) - ${emi.loanApplication?.applicationNo}`
            });
          } catch { /* non-critical */ }

          console.log(`[Partial Mirror Sync] EMI #${emi.installmentNumber} → Mirror ₹${mirrorPartialAmt} (${Math.round(ratio * 100)}%)`);
        }
      } catch (partMirrorErr) {
        console.error('[Partial Mirror Sync] Failed (non-critical):', partMirrorErr);
      }
    }

    // PERFORMANCE: Fire-and-forget the action log — don't await it, user gets response faster
    db.actionLog.create({
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
    }).catch(e => console.error('[ActionLog] Failed (non-critical):', e));

    // ============================================
    // RECORD ACCOUNTING ENTRIES
    // ============================================
    try {
      // 1. Identify mirror settings for accounting
      // PERFORMANCE: Reuse mirrorMapping fetched at top of handler
      const mirrorMappingForAccounting = mirrorMapping;
      const isExtraEMI2 = mirrorMappingForAccounting && emi.installmentNumber > mirrorMappingForAccounting.mirrorTenure;
      const isMirrorPayment = !!mirrorMappingForAccounting && !isExtraEMI2;
      
      let calculatedMirrorInterest: number | undefined = undefined;
      // Issue 2 Fix: Also capture mirror EMI amounts for correct journal entry values
      let mirrorEMIAmounts: { totalAmount: number; principalAmount: number } | null = null;
      if (isMirrorPayment && mirrorMappingForAccounting?.mirrorLoanId) {
        const mirrorEMIForCalc = await db.eMISchedule.findFirst({
          where: {
            loanApplicationId: mirrorMappingForAccounting.mirrorLoanId,
            installmentNumber: emi.installmentNumber
          }
        });
        if (mirrorEMIForCalc) {
          const mirrorMonthlyRate = mirrorMappingForAccounting.mirrorInterestRate / 12 / 100;
          calculatedMirrorInterest = Math.round(mirrorEMIForCalc.outstandingPrincipal * mirrorMonthlyRate * 100) / 100;

          // For partial payments: scale mirror amounts proportionally to actual payment
          if (isPartialPayment && mirrorEMIForCalc.totalAmount > 0) {
            const ratio = paidAmount / (emi.totalAmount || 1);
            const scaledTotal = Math.round(mirrorEMIForCalc.totalAmount * ratio * 100) / 100;
            const scaledPrincipal = Math.round(mirrorEMIForCalc.principalAmount * ratio * 100) / 100;
            // Interest-first: cover interest first, then principal
            const scaledInterest = Math.min(calculatedMirrorInterest, scaledTotal);
            const scaledPrincipalActual = Math.max(0, scaledTotal - scaledInterest);
            calculatedMirrorInterest = scaledInterest;
            mirrorEMIAmounts = { totalAmount: scaledTotal, principalAmount: scaledPrincipalActual };
          } else {
            mirrorEMIAmounts = { totalAmount: mirrorEMIForCalc.totalAmount, principalAmount: mirrorEMIForCalc.principalAmount };
          }
        }
      }

      const { AccountingService } = await import('@/lib/accounting-service');
      // FIX-ISSUE-1/12: Always use loan's OWN companyId (from DB), never trust client-provided companyId
      const companyIdToUse = isMirrorPayment
        ? mirrorMappingForAccounting!.mirrorCompanyId
        : emi.loanApplication?.companyId;  // FIX: removed '|| companyId' fallback (client-provided is untrusted)

      // ── EXTRA EMIs: already fully handled by the extra EMI block above ──
      // CashBook + Day Book journal are recorded there in original company.
      // Skip here to avoid duplicate journal entries.
      if (isExtraEMI2) {
        console.log(`[Accounting] Extra EMI #${emi.installmentNumber} — accounting already recorded in original company block above. Skipping main block.`);
      } else if (companyIdToUse) {
        const accountingService = new AccountingService(companyIdToUse);
        await accountingService.initializeChartOfAccounts();

        // ── CASHBOOK / BANK ENTRY for regular (non-mirror) loans ────────
        // Mirror loans already record cashbook in the mirror sync block above.
        // For regular loans we must record here so Day Book / Cash Book shows the receipt.
        if (!isMirrorPayment && paidAmount > 0) {
          try {
            const isOnlinePayment = ['ONLINE', 'UPI', 'BANK_TRANSFER', 'NEFT', 'RTGS', 'IMPS', 'CHEQUE'].includes(
              (paymentMode || '').toUpperCase()
            );
            const { recordCashBookEntry, recordBankTransaction } = await import('@/lib/simple-accounting');
            if (isSplitPayment && splitCashAmount > 0 && splitOnlineAmount > 0) {
              await recordCashBookEntry({ companyId: companyIdToUse, entryType: 'CREDIT', amount: splitCashAmount,
                description: `EMI #${emi.installmentNumber} Cash - ${emi.loanApplication?.applicationNo}`,
                referenceType: 'EMI_PAYMENT', referenceId: `${payment.id}-CASH`, createdById: paidBy });
              await recordBankTransaction({ companyId: companyIdToUse, transactionType: 'CREDIT', amount: splitOnlineAmount,
                description: `EMI #${emi.installmentNumber} Online - ${emi.loanApplication?.applicationNo}`,
                referenceType: 'EMI_PAYMENT', referenceId: `${payment.id}-ONLINE`, createdById: paidBy });
            } else if (isOnlinePayment) {
              await recordBankTransaction({ companyId: companyIdToUse, transactionType: 'CREDIT', amount: paidAmount,
                description: `EMI #${emi.installmentNumber} - ${emi.loanApplication?.applicationNo}`,
                referenceType: 'EMI_PAYMENT', referenceId: payment.id, createdById: paidBy });
            } else {
              await recordCashBookEntry({ companyId: companyIdToUse, entryType: 'CREDIT', amount: paidAmount,
                description: `EMI #${emi.installmentNumber} Cash - ${emi.loanApplication?.applicationNo}`,
                referenceType: 'EMI_PAYMENT', referenceId: payment.id, createdById: paidBy });
            }
            console.log(`[CashBook/Bank] ₹${paidAmount} recorded for regular loan EMI #${emi.installmentNumber}`);
          } catch (cbErr) {
            console.error('[CashBook/Bank] Entry failed (non-critical):', cbErr);
          }
        }
        
        
        // ── EMI PAYMENT JOURNAL ENTRY (Principal + Interest) ──────────
        // Works for ALL loan types — mirror uses mirror amounts, regular uses actual amounts.
        await accountingService.recordEMIPayment({
          loanId: isMirrorPayment ? mirrorMappingForAccounting!.mirrorLoanId || loanId : loanId,
          customerId: emi.loanApplication?.customerId || '',
          paymentId: payment.id,
          totalAmount:        (isMirrorPayment && mirrorEMIAmounts) ? mirrorEMIAmounts.totalAmount    : paidAmount,
          principalComponent: (isMirrorPayment && mirrorEMIAmounts) ? mirrorEMIAmounts.principalAmount : paidPrincipal,
          interestComponent:  (isMirrorPayment && calculatedMirrorInterest !== undefined) ? calculatedMirrorInterest : paidInterest,
          paymentDate: new Date(),
          createdById: paidBy || 'SYSTEM',
          paymentMode: isSplitPayment ? 'CASH' : (paymentMode as any),
          reference: `EMI #${emi.installmentNumber} - ${emi.loanApplication?.applicationNo}`
        });
        console.log(`[Accounting] EMI journal entry created for Company ${companyIdToUse} (${isMirrorPayment ? 'MIRROR' : 'REGULAR'})`);

        // ── PROCESSING FEE — non-mirror, EMI #1 only ────────────────────
        // FIX-10: Guard against double-recording on retry with unique referenceId check
        if (!isMirrorPayment && emi.installmentNumber === 1 && newEmiStatus === 'PAID') {
          try {
            const loanData = await db.loanApplication.findUnique({
              where: { id: loanId }, select: { processingFee: true, applicationNo: true }
            });
            const procFee = (loanData?.processingFee || 0);
            if (procFee > 0) {
              // FIX-ISSUE-5/8: Check BOTH cashBookEntry AND bankTransaction for same referenceId
              // so we don't double-record when EMI #1 is paid via ONLINE mode
              const [existingPFCb, existingPFBank] = await Promise.all([
                db.cashBookEntry.findFirst({
                  where: { referenceType: 'PROCESSING_FEE', referenceId: `${loanId}-PF` }
                }),
                db.bankTransaction.findFirst({
                  where: { referenceType: 'PROCESSING_FEE', referenceId: `${loanId}-PF` }
                })
              ]);
              const existingPFEntry = existingPFCb || existingPFBank;
              if (!existingPFEntry) {
                const { recordCashBookEntry, recordBankTransaction } = await import('@/lib/simple-accounting');
                const isPfOnline = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS','CHEQUE'].includes((paymentMode||'').toUpperCase());
                if (isPfOnline) {
                  await recordBankTransaction({ companyId: companyIdToUse!, transactionType: 'CREDIT', amount: procFee,
                    description: `Processing Fee - ${loanData?.applicationNo || loanId}`,
                    referenceType: 'PROCESSING_FEE', referenceId: `${loanId}-PF`, createdById: paidBy });
                } else {
                  await recordCashBookEntry({ companyId: companyIdToUse!, entryType: 'CREDIT', amount: procFee,
                    description: `Processing Fee - ${loanData?.applicationNo || loanId}`,
                    referenceType: 'PROCESSING_FEE', referenceId: `${loanId}-PF`, createdById: paidBy });
                }
                await accountingService.createJournalEntry({
                  entryDate: new Date(), referenceType: 'PROCESSING_FEE_COLLECTION',
                  referenceId: `${loanId}-PF-JE`,
                  narration: `Processing Fee - ${loanData?.applicationNo || loanId}`,
                  createdById: paidBy || 'SYSTEM', isAutoEntry: true,
                  lines: [
                    { accountCode: isPfOnline ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND, debitAmount: procFee, creditAmount: 0, narration: 'Processing fee collected' },
                    { accountCode: ACCOUNT_CODES.PROCESSING_FEE_INCOME, debitAmount: 0, creditAmount: procFee, narration: 'Processing fee income' },
                  ],
                });
                console.log(`[Processing Fee] ₹${procFee} journal + ${isPfOnline ? 'bank' : 'cashbook'} recorded for loan ${loanId}`);
              } else {
                console.log(`[Processing Fee] Skipping — already recorded for loan ${loanId} (FIX-5/8 dual idempotency)`);
              }
            }
          } catch (pfErr) {
            console.error('[Processing Fee] Regular loan fee failed (non-critical):', pfErr);
          }
        }

        // ── PENALTY INCOME ACCOUNTING ────────────────────────────────────
        // Record net penalty (after waiver) as Penalty Income
        if (netPenalty > 0) {
          try {
            const { recordCashBookEntry, recordBankTransaction } = await import('@/lib/simple-accounting');

            if (penaltyPaymentMode === 'BANK') {
              // Penalty goes to bank
              await recordBankTransaction({
                companyId: companyIdToUse,
                transactionType: 'CREDIT',
                amount: netPenalty,
                description: `Penalty Income (₹${penaltyAmount} - Waiver ₹${penaltyWaiver}) - EMI #${emi.installmentNumber} - ${emi.loanApplication?.applicationNo}`,
                referenceType: 'PENALTY_INCOME',
                referenceId: `${payment.id}-PENALTY`,
                createdById: paidBy,
              });
            } else {
              // Penalty goes to cash book
              await recordCashBookEntry({
                companyId: companyIdToUse,
                entryType: 'CREDIT',
                amount: netPenalty,
                description: `Penalty Income (₹${penaltyAmount} - Waiver ₹${penaltyWaiver}) - EMI #${emi.installmentNumber} - ${emi.loanApplication?.applicationNo}`,
                referenceType: 'PENALTY_INCOME',
                referenceId: `${payment.id}-PENALTY`,
                createdById: paidBy,
              });
            }

            // Journal Entry for Penalty Income:
            // DR Cash/Bank (1101/1102) → CR Penalty Income (4125)
            await accountingService.createJournalEntry({
              entryDate: new Date(),
              referenceType: 'EMI_PAYMENT',
              referenceId: `${payment.id}-PENALTY-JE`,
              narration: `Penalty Income - EMI #${emi.installmentNumber} - ${emi.loanApplication?.applicationNo} (Charged ₹${penaltyAmount}, Waived ₹${penaltyWaiver}, Collected ₹${netPenalty})`,
              createdById: paidBy,
              lines: [
                {
                  accountCode: penaltyPaymentMode === 'BANK' ? ACCOUNT_CODES.BANK_ACCOUNT : ACCOUNT_CODES.CASH_IN_HAND,
                  debitAmount: netPenalty,
                  creditAmount: 0,
                  narration: `Penalty collected via ${penaltyPaymentMode}`,
                },
                {
                  accountCode: ACCOUNT_CODES.PENALTY_INCOME, // 4125 - Penalty Income (INCOME account)
                  debitAmount: 0,
                  creditAmount: netPenalty,
                  narration: `Penalty income after waiver of ₹${penaltyWaiver}`,
                },
              ],
            });

            console.log(`[Penalty] Net ₹${netPenalty} recorded as Penalty Income via ${penaltyPaymentMode}`);
          } catch (penaltyErr) {
            console.error('[Penalty] Penalty accounting failed (non-critical):', penaltyErr);
          }
        }

        // NOTE: The full interest income is included in recordEMIPayment above,
        // which runs against companyIdToUse = mirrorCompanyId.
        // ALL accounting for mirror loans lives exclusively in the mirror company.

      } // end if (companyIdToUse)
    } catch (accError: any) {
      console.error('[Accounting] ❌ EMI journal FAILED — P&L will NOT show income!', {
        message: accError?.message,
        stack: accError?.stack?.split('\n').slice(0, 6).join(' | '),
        loanId,
        emiId,
      });
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

