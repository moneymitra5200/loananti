import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateMirrorLoan } from '@/lib/mirror-loan';
import { EMIPaymentStatus } from '@prisma/client';

// GET - Fetch pending mirror loans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const status = searchParams.get('status');
    const id = searchParams.get('id');

    // Get single pending mirror loan by ID
    if (id) {
      const pendingLoan = await db.pendingMirrorLoan.findUnique({
        where: { id },
        include: {
          mirrorCompany: { select: { id: true, name: true, code: true } },
          originalCompany: { select: { id: true, name: true, code: true } }
        }
      });

      if (!pendingLoan) {
        return NextResponse.json({ error: 'Pending mirror loan not found' }, { status: 404 });
      }

      // Fetch the original loan separately
      type OriginalLoanType = Awaited<ReturnType<typeof db.loanApplication.findUnique>> & {
        customer: { id: string; name: string; email: string; phone: string } | null;
        sessionForm: NonNullable<Awaited<ReturnType<typeof db.sessionForm.findFirst>>> | null;
        company: { id: string; name: string; code: string } | null;
      };
      let originalLoan: OriginalLoanType | null = null;
      if (!pendingLoan.isOfflineLoan) {
        const loanData = await db.loanApplication.findUnique({
          where: { id: pendingLoan.originalLoanId },
          include: {
            customer: { select: { id: true, name: true, email: true, phone: true } },
            sessionForm: true,
            company: { select: { id: true, name: true, code: true } }
          }
        });
        if (loanData) {
          originalLoan = loanData as OriginalLoanType;
        }
      }

      return NextResponse.json({ 
        success: true, 
        pendingLoan: {
          ...pendingLoan,
          originalLoan
        }
      });
    }

    // Get pending mirror loans by status
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const pendingLoans = await db.pendingMirrorLoan.findMany({
      where: whereClause,
      include: {
        mirrorCompany: { select: { id: true, name: true, code: true } },
        originalCompany: { select: { id: true, name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch original loan details separately for online loans
    const onlineLoanIds = pendingLoans.filter(p => !p.isOfflineLoan).map(p => p.originalLoanId);
    const originalLoans = onlineLoanIds.length > 0 ? await db.loanApplication.findMany({
      where: { id: { in: onlineLoanIds } },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        sessionForm: true,
        company: { select: { id: true, name: true, code: true } }
      }
    }) : [];
    
    const originalLoanMap = new Map<string, typeof originalLoans[number]>();
    originalLoans.forEach(l => originalLoanMap.set(l.id, l));

    // Enrich pending loans with original loan data
    const enrichedPendingLoans = pendingLoans.map(p => ({
      ...p,
      originalLoan: p.isOfflineLoan ? null : originalLoanMap.get(p.originalLoanId) || null
    }));

    // Get counts by status
    const counts = await db.pendingMirrorLoan.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const statusCounts = {
      PENDING: 0,
      APPROVED: 0,
      DISBURSED: 0,
      REJECTED: 0
    };

    counts.forEach(item => {
      statusCounts[item.status as keyof typeof statusCounts] = item._count.id;
    });

    return NextResponse.json({
      success: true,
      pendingLoans: enrichedPendingLoans,
      counts: statusCounts
    });
  } catch (error) {
    console.error('Pending mirror loan API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new pending mirror loan request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      originalLoanId,
      mirrorCompanyId,
      mirrorType,
      mirrorInterestRate,
      mirrorInterestType,  // FLAT or REDUCING - user-defined per loan
      createdBy,
      initialStatus // Allow setting initial status (for Super Admin direct approval)
    } = body;

    // Validate required fields
    if (!originalLoanId || !mirrorCompanyId || !createdBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if already exists
    const existing = await db.pendingMirrorLoan.findUnique({
      where: {
        originalLoanId_mirrorCompanyId: {
          originalLoanId,
          mirrorCompanyId
        }
      }
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        pendingLoan: existing,
        message: 'Pending mirror loan request already exists for this company'
      });
    }

    // Get original loan details
    const originalLoan = await db.loanApplication.findUnique({
      where: { id: originalLoanId },
      include: {
        sessionForm: true,
        company: true,
        customer: { select: { id: true, name: true, email: true, phone: true } }
      }
    });

    if (!originalLoan || !originalLoan.sessionForm) {
      return NextResponse.json({ error: 'Original loan not found or incomplete' }, { status: 404 });
    }

    // Calculate mirror loan details
    const principal = originalLoan.sessionForm.approvedAmount;
    const originalRate = originalLoan.sessionForm.interestRate;
    const originalTenure = originalLoan.sessionForm.tenure;
    const originalEMIAmount = originalLoan.sessionForm.emiAmount;
    const originalType = (originalLoan.sessionForm.interestType || 'FLAT') as 'FLAT' | 'REDUCING';

    // Use provided mirror rate or default based on mirror type
    const effectiveMirrorRate = mirrorInterestRate || (mirrorType === 'COMPANY_1_15_PERCENT' ? 15 : 24);
    // Use provided interest type or default to REDUCING
    const effectiveMirrorType = (mirrorInterestType || 'REDUCING') as 'FLAT' | 'REDUCING';

    const calculation = calculateMirrorLoan(
      principal,
      originalRate,
      originalTenure,
      originalType,
      effectiveMirrorRate,
      effectiveMirrorType
    );

    // Determine the initial status
    // If initialStatus is 'APPROVED', it means Super Admin is directly approving
    // Otherwise, default to PENDING for review
    const status = initialStatus === 'APPROVED' ? 'APPROVED' : 'PENDING';
    const approvedById = status === 'APPROVED' ? createdBy : null;
    const approvedAt = status === 'APPROVED' ? new Date() : null;

    // Create pending mirror loan request
    const pendingLoan = await db.pendingMirrorLoan.create({
      data: {
        originalLoanId,
        originalCompanyId: originalLoan.companyId || '',
        mirrorCompanyId,
        mirrorType: mirrorType || 'CUSTOM_RATE',
        originalInterestRate: originalRate,
        originalInterestType: originalType,
        mirrorInterestRate: effectiveMirrorRate,
        mirrorInterestType: effectiveMirrorType,
        originalEMIAmount,
        originalTenure,
        mirrorTenure: calculation.mirrorLoan.schedule.length,
        extraEMICount: calculation.extraEMICount,
        leftoverAmount: calculation.leftoverAmount,
        principalAmount: principal,
        status,
        createdBy,
        // If directly approved by Super Admin
        approvedById,
        approvedAt
      },
      include: {
        mirrorCompany: { select: { id: true, name: true, code: true } },
        originalCompany: { select: { id: true, name: true, code: true } }
      }
    });

    console.log(`[Pending Mirror Loan] Created ${status} request for loan ${originalLoan.applicationNo}`);

    return NextResponse.json({
      success: true,
      pendingLoan: {
        ...pendingLoan,
        originalLoan: {
          customer: { id: originalLoan.customerId, name: originalLoan.customer?.name, email: originalLoan.customer?.email, phone: originalLoan.customer?.phone }
        }
      },
      calculation,
      message: status === 'APPROVED' 
        ? 'Mirror loan approved and scheduled. Ready for Cashier disbursement.'
        : 'Pending mirror loan request created. Awaiting Super Admin approval.'
    });
  } catch (error) {
    console.error('Create pending mirror loan error:', error);
    return NextResponse.json({ error: 'Failed to create pending mirror loan' }, { status: 500 });
  }
}

// PUT - Approve, Reject, or Disburse a pending mirror loan
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, action, userId, rejectionReason, disbursementBankAccountId, disbursementReference, extraEMIPaymentPageId,
      // Split Payment Support
      useSplitPayment, bankAmount, cashAmount
    } = body;

    if (!id || !action || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const pendingLoan = await db.pendingMirrorLoan.findUnique({
      where: { id }
    });

    if (!pendingLoan) {
      return NextResponse.json({ error: 'Pending mirror loan not found' }, { status: 404 });
    }

    if (action === 'approve') {
      // Only pending loans can be approved
      if (pendingLoan.status !== 'PENDING') {
        return NextResponse.json({ error: 'Only pending loans can be approved' }, { status: 400 });
      }

      const updated = await db.pendingMirrorLoan.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: userId,
          approvedAt: new Date()
        }
      });

      console.log(`[Pending Mirror Loan] Approved: ${id}`);

      return NextResponse.json({
        success: true,
        pendingLoan: updated,
        message: 'Mirror loan approved. Ready for disbursement by Cashier.'
      });
    }

    if (action === 'reject') {
      // Only pending or approved loans can be rejected
      if (!['PENDING', 'APPROVED'].includes(pendingLoan.status)) {
        return NextResponse.json({ error: 'Only pending or approved loans can be rejected' }, { status: 400 });
      }

      const updated = await db.pendingMirrorLoan.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedById: userId,
          rejectedAt: new Date(),
          rejectionReason: rejectionReason || 'No reason provided'
        }
      });

      console.log(`[Pending Mirror Loan] Rejected: ${id}`);

      return NextResponse.json({
        success: true,
        pendingLoan: updated,
        message: 'Mirror loan rejected.'
      });
    }

    if (action === 'disburse') {
      // Only approved loans can be disbursed
      if (pendingLoan.status !== 'APPROVED') {
        return NextResponse.json({ error: 'Only approved loans can be disbursed' }, { status: 400 });
      }

      // Get original loan details for creating mirror loan
      const originalLoan = await db.loanApplication.findUnique({
        where: { id: pendingLoan.originalLoanId },
        include: { sessionForm: true }
      });

      if (!originalLoan || !originalLoan.sessionForm) {
        return NextResponse.json({ error: 'Original loan not found' }, { status: 404 });
      }

      // Get mirror company info
      const mirrorCompanyInfo = await db.company.findUnique({
        where: { id: pendingLoan.mirrorCompanyId },
        select: { name: true, code: true }
      });

      // Generate mirror loan application number with company code prefix
      // Format: {CompanyCode}{ProductCode}{Sequence}
      // Example: C1PL00001 (Company 1, Personal Loan, #00001)

      // Company code - use directly if it's C1/C2/C3 format
      let companyCode = 'C1'; // default
      if (mirrorCompanyInfo?.code) {
        if (mirrorCompanyInfo.code.match(/^C\d$/)) {
          // Already in C1, C2, C3 format
          companyCode = mirrorCompanyInfo.code;
        } else {
          // Extract number from code
          const codeMatch = mirrorCompanyInfo.code.match(/(\d+)/);
          if (codeMatch) {
            companyCode = `C${codeMatch[1]}`;
          }
        }
      }
      
      // Extract product code from original application number
      // Handle both old format (A00001) and new format (C3PL00001)
      let productCode = 'PL'; // default
      
      if (originalLoan.applicationNo) {
        // Check if it's the new format (starts with C followed by digit)
        const newFormatMatch = originalLoan.applicationNo.match(/^C\d([A-Z]{2})/);
        if (newFormatMatch) {
          // New format: C3PL00001 → product code is PL (positions 2-4)
          productCode = originalLoan.applicationNo.substring(2, 4);
        } else {
          // Old format: A00001 or other → use loan type
          const loanTypeCodes: Record<string, string> = {
            'PERSONAL': 'PL',
            'GOLD': 'GL',
            'VEHICLE': 'VL',
            'BUSINESS': 'BL',
            'HOME': 'HL',
            'EDUCATION': 'EL',
            'AGRICULTURAL': 'AL',
            'MORTGAGE': 'ML',
          };
          productCode = loanTypeCodes[originalLoan.loanType?.toUpperCase() || ''] || 
                       originalLoan.loanType?.substring(0, 2).toUpperCase() || 'PL';
        }
      } else {
        // Fallback to loan type
        const loanTypeCodes: Record<string, string> = {
          'PERSONAL': 'PL',
          'GOLD': 'GL',
          'VEHICLE': 'VL',
          'BUSINESS': 'BL',
          'HOME': 'HL',
          'EDUCATION': 'EL',
          'AGRICULTURAL': 'AL',
          'MORTGAGE': 'ML',
        };
        productCode = loanTypeCodes[originalLoan.loanType?.toUpperCase() || ''] || 
                     originalLoan.loanType?.substring(0, 2).toUpperCase() || 'PL';
      }
      
      const mirrorPrefix = `${companyCode}${productCode}`;
      
      const mirrorLoanCount = await db.loanApplication.count({
        where: { applicationNo: { startsWith: mirrorPrefix } }
      });
      const mirrorSequence = (mirrorLoanCount + 1).toString().padStart(5, '0');
      const mirrorApplicationNo = `${mirrorPrefix}${mirrorSequence}`;

      console.log(`[Mirror Loan] Generated application number: ${mirrorApplicationNo}`);
      console.log(`[Mirror Loan] Original: ${originalLoan.applicationNo}, Company Code: ${companyCode}, Product Code: ${productCode}, Sequence: ${mirrorSequence}`);

      // Calculate mirror EMI schedule
      const calculation = calculateMirrorLoan(
        pendingLoan.principalAmount,
        pendingLoan.originalInterestRate,
        pendingLoan.originalTenure,
        pendingLoan.originalInterestType as 'FLAT' | 'REDUCING',
        pendingLoan.mirrorInterestRate,
        (pendingLoan.mirrorInterestType || 'REDUCING') as 'FLAT' | 'REDUCING'
      );

      // Create the actual MIRROR LOAN APPLICATION
      const mirrorLoan = await db.loanApplication.create({
        data: {
          applicationNo: mirrorApplicationNo,
          customerId: originalLoan.customerId,
          companyId: pendingLoan.mirrorCompanyId,
          loanType: originalLoan.loanType,
          requestedAmount: pendingLoan.principalAmount,
          requestedTenure: pendingLoan.mirrorTenure,
          purpose: originalLoan.purpose || 'Mirror Loan',
          status: 'ACTIVE', // Mirror loan is activated immediately
          
          // Copy customer details from original loan
          title: originalLoan.title,
          firstName: originalLoan.firstName,
          lastName: originalLoan.lastName,
          fatherName: originalLoan.fatherName,
          panNumber: originalLoan.panNumber,
          aadhaarNumber: originalLoan.aadhaarNumber,
          dateOfBirth: originalLoan.dateOfBirth,
          address: originalLoan.address,
          city: originalLoan.city,
          state: originalLoan.state,
          pincode: originalLoan.pincode,
          phone: originalLoan.phone,
          employmentType: originalLoan.employmentType,
          employerName: originalLoan.employerName,
          monthlyIncome: originalLoan.monthlyIncome,
          bankAccountNumber: originalLoan.bankAccountNumber,
          bankIfsc: originalLoan.bankIfsc,
          bankName: originalLoan.bankName,
          
          // Timestamps
          finalApprovedAt: new Date(),
          disbursedAt: new Date(),
          disbursedById: userId,
          disbursedAmount: pendingLoan.principalAmount,
          currentStage: 'ACTIVE_LOAN',
        }
      });

      // Create SessionForm for mirror loan
      await db.sessionForm.create({
        data: {
          loanApplicationId: mirrorLoan.id,
          agentId: originalLoan.sessionForm.agentId,
          approvedAmount: pendingLoan.principalAmount,
          interestRate: pendingLoan.mirrorInterestRate,
          interestType: pendingLoan.mirrorInterestType || 'REDUCING',
          tenure: pendingLoan.mirrorTenure,
          emiAmount: pendingLoan.originalEMIAmount,
          totalInterest: calculation.mirrorLoan.totalInterest,
          totalAmount: pendingLoan.principalAmount + calculation.mirrorLoan.totalInterest,
          processingFee: 0,
          processingFeeType: 'FIXED',
          emiFrequency: 'MONTHLY',
          customerApprovedAt: new Date(),
          customerApproved: true,
        }
      });

      // Create EMI schedules for mirror loan
      const mirrorEMISchedules = calculation.mirrorLoan.schedule.map((emi, index) => {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + index + 1);
        dueDate.setDate(5);
        
        return {
          loanApplicationId: mirrorLoan.id,
          installmentNumber: emi.installmentNumber,
          dueDate,
          originalDueDate: dueDate,
          principalAmount: emi.principal,
          interestAmount: emi.interest,
          totalAmount: emi.emi,
          outstandingPrincipal: emi.outstandingPrincipal,
          outstandingInterest: 0,
          paymentStatus: EMIPaymentStatus.PENDING,
        };
      });

      await db.eMISchedule.createMany({
        data: mirrorEMISchedules,
      });

      // Create EMIPaymentSetting records for all EMIs in the ORIGINAL loan
      // Extra EMIs (after mirrorTenure) will have the secondary payment page assigned
      const originalLoanEMIs = await db.eMISchedule.findMany({
        where: { loanApplicationId: pendingLoan.originalLoanId },
        orderBy: { installmentNumber: 'asc' }
      });

      const mirrorTenure = pendingLoan.mirrorTenure;
      const extraEMICount = pendingLoan.extraEMICount || 0;

      console.log(`[Mirror Loan] Creating EMI Payment Settings for ${originalLoanEMIs.length} EMIs`);
      console.log(`[Mirror Loan] Mirror Tenure: ${mirrorTenure}, Extra EMI Count: ${extraEMICount}`);
      console.log(`[Mirror Loan] Extra EMI Payment Page ID: ${extraEMIPaymentPageId || 'Not provided'}`);

      // Create EMIPaymentSetting for each EMI
      for (const emi of originalLoanEMIs) {
        const isExtraEMI = emi.installmentNumber > mirrorTenure;
        
        await db.eMIPaymentSetting.create({
          data: {
            emiScheduleId: emi.id,
            loanApplicationId: pendingLoan.originalLoanId,
            enableFullPayment: true,
            enablePartialPayment: !isExtraEMI, // Extra EMIs should only allow full payment
            enableInterestOnly: !isExtraEMI, // Extra EMIs should not allow interest-only
            useDefaultCompanyPage: !isExtraEMI || !extraEMIPaymentPageId,
            secondaryPaymentPageId: isExtraEMI ? extraEMIPaymentPageId : null,
          }
        });
      }

      console.log(`[Mirror Loan] Created ${originalLoanEMIs.length} EMI Payment Settings`);
      console.log(`[Mirror Loan] ${(originalLoanEMIs.length - mirrorTenure)} EMIs marked as Extra EMIs with secondary payment page`);

      // Create the mirror loan mapping
      const mirrorMapping = await db.mirrorLoanMapping.create({
        data: {
          originalLoanId: pendingLoan.originalLoanId,
          mirrorLoanId: mirrorLoan.id,
          originalCompanyId: pendingLoan.originalCompanyId,
          mirrorCompanyId: pendingLoan.mirrorCompanyId,
          mirrorType: pendingLoan.mirrorType,
          originalInterestRate: pendingLoan.originalInterestRate,
          originalInterestType: pendingLoan.originalInterestType,
          mirrorInterestRate: pendingLoan.mirrorInterestRate,
          mirrorInterestType: pendingLoan.mirrorInterestType,
          originalEMIAmount: pendingLoan.originalEMIAmount,
          originalTenure: pendingLoan.originalTenure,
          mirrorTenure: pendingLoan.mirrorTenure,
          extraEMICount: pendingLoan.extraEMICount,
          leftoverAmount: pendingLoan.leftoverAmount,
          totalMirrorInterest: calculation.mirrorLoan.totalInterest,
          totalExtraEMIProfit: pendingLoan.extraEMICount * pendingLoan.originalEMIAmount,
          disbursementCompanyId: pendingLoan.mirrorCompanyId,
          disbursementBankAccountId: disbursementBankAccountId || null,
          extraEMIPaymentPageId: extraEMIPaymentPageId || null,
          createdBy: userId
        }
      });

      // ============================================
      // DEDUCT FROM MIRROR COMPANY'S BANK ACCOUNT AND/OR CASH BOOK
      // This is the ACTUAL disbursement - money goes out from mirror company
      // Supports Split Payment (Bank + Cash)
      // ============================================
      
      const principalAmount = pendingLoan.principalAmount;
      const isSplitPayment = useSplitPayment && (bankAmount || 0) > 0 && (cashAmount || 0) > 0;
      
      console.log(`[Mirror Loan] Disbursement params:`, {
        useSplitPayment,
        bankAmount,
        cashAmount,
        disbursementBankAccountId,
        isSplitPayment,
        principalAmount
      });
      
      if (isSplitPayment) {
        console.log(`[Mirror Loan] Processing SPLIT PAYMENT: Bank ₹${bankAmount}, Cash ₹${cashAmount}`);
        
        // 1. Handle Bank Portion
        if (bankAmount > 0 && disbursementBankAccountId) {
          const bank = await db.bankAccount.findUnique({ 
            where: { id: disbursementBankAccountId },
            select: { currentBalance: true, companyId: true }
          });
          
          if (bank) {
            if (bank.companyId !== pendingLoan.mirrorCompanyId) {
              console.warn(`[Mirror Loan] WARNING: Bank account ${disbursementBankAccountId} does not belong to mirror company ${pendingLoan.mirrorCompanyId}`);
            }
            
            const newBalance = bank.currentBalance - bankAmount;
            
            await db.bankAccount.update({
              where: { id: disbursementBankAccountId },
              data: { currentBalance: newBalance }
            });
            
            await db.bankTransaction.create({
              data: {
                bankAccountId: disbursementBankAccountId,
                transactionType: 'DEBIT',
                amount: bankAmount,
                balanceAfter: newBalance,
                description: `Mirror Loan Disbursement (Bank Portion) - ${mirrorApplicationNo}`,
                referenceType: 'LOAN_DISBURSEMENT',
                referenceId: mirrorLoan.id,
                createdById: userId
              }
            });
            
            console.log(`[Mirror Loan] Bank deduction: ₹${bankAmount}, New Balance: ₹${newBalance}`);
          } else {
            console.error(`[Mirror Loan] ERROR: Bank account ${disbursementBankAccountId} not found!`);
          }
        } else if (bankAmount > 0) {
          console.error(`[Mirror Loan] ERROR: Bank amount ₹${bankAmount} provided but disbursementBankAccountId is missing!`);
        }
        
        // 2. Handle Cash Portion
        if (cashAmount > 0) {
          let cashBook = await db.cashBook.findUnique({
            where: { companyId: pendingLoan.mirrorCompanyId }
          });
          
          if (!cashBook) {
            cashBook = await db.cashBook.create({
              data: {
                companyId: pendingLoan.mirrorCompanyId,
                openingBalance: 0,
                currentBalance: 0
              }
            });
          }
          
          const newCashBalance = cashBook.currentBalance - cashAmount;
          
          await db.cashBookEntry.create({
            data: {
              cashBookId: cashBook.id,
              entryType: 'DEBIT',
              amount: cashAmount,
              balanceAfter: newCashBalance,
              description: `Mirror Loan Disbursement (Cash Portion) - ${mirrorApplicationNo}`,
              referenceType: 'LOAN_DISBURSEMENT',
              referenceId: mirrorLoan.id,
              createdById: userId
            }
          });
          
          await db.cashBook.update({
            where: { id: cashBook.id },
            data: {
              currentBalance: newCashBalance,
              lastUpdatedAt: new Date()
            }
          });
          
          console.log(`[Mirror Loan] Cash deduction: ₹${cashAmount}, New Balance: ₹${newCashBalance}`);
        }
      } else if (disbursementBankAccountId) {
        // Single Bank Payment
        const bank = await db.bankAccount.findUnique({ 
          where: { id: disbursementBankAccountId },
          select: { currentBalance: true, companyId: true }
        });
        
        if (bank) {
          if (bank.companyId !== pendingLoan.mirrorCompanyId) {
            console.warn(`[Mirror Loan] WARNING: Bank account ${disbursementBankAccountId} does not belong to mirror company ${pendingLoan.mirrorCompanyId}`);
          }
          
          const newBalance = bank.currentBalance - principalAmount;
          
          await db.bankAccount.update({
            where: { id: disbursementBankAccountId },
            data: { currentBalance: newBalance }
          });
          
          await db.bankTransaction.create({
            data: {
              bankAccountId: disbursementBankAccountId,
              transactionType: 'DEBIT',
              amount: principalAmount,
              balanceAfter: newBalance,
              description: `Mirror Loan Disbursement - ${mirrorApplicationNo} (Original: ${originalLoan.applicationNo})`,
              referenceType: 'LOAN_DISBURSEMENT',
              referenceId: mirrorLoan.id,
              createdById: userId
            }
          });
          
          console.log(`[Mirror Loan] Bank transaction created: Account ${disbursementBankAccountId}, Amount: ${principalAmount}, New Balance: ${newBalance}`);
        } else {
          console.error(`[Mirror Loan] ERROR: Bank account ${disbursementBankAccountId} not found!`);
        }
      } else {
        console.warn(`[Mirror Loan] WARNING: No bank account ID provided for disbursement. Checking for cash-only disbursement...`);
        
        // Cash-only disbursement
        let cashBook = await db.cashBook.findUnique({
          where: { companyId: pendingLoan.mirrorCompanyId }
        });
        
        if (!cashBook) {
          cashBook = await db.cashBook.create({
            data: {
              companyId: pendingLoan.mirrorCompanyId,
              openingBalance: 0,
              currentBalance: 0
            }
          });
        }
        
        const newCashBalance = cashBook.currentBalance - principalAmount;
        
        await db.cashBookEntry.create({
          data: {
            cashBookId: cashBook.id,
            entryType: 'DEBIT',
            amount: principalAmount,
            balanceAfter: newCashBalance,
            description: `Mirror Loan Disbursement (Cash) - ${mirrorApplicationNo}`,
            referenceType: 'LOAN_DISBURSEMENT',
            referenceId: mirrorLoan.id,
            createdById: userId
          }
        });
        
        await db.cashBook.update({
          where: { id: cashBook.id },
          data: {
            currentBalance: newCashBalance,
            lastUpdatedAt: new Date()
          }
        });
        
        console.log(`[Mirror Loan] Cash disbursement: ₹${principalAmount}, New Balance: ₹${newCashBalance}`);
      }

      // ============================================
      // CREATE JOURNAL ENTRY FOR DOUBLE-ENTRY ACCOUNTING
      // Debit: Loans Receivable (Asset increases)
      // Credit: Cash in Hand / Bank Account (Asset decreases)
      // ============================================
      
      try {
        // Get or create financial year
        const currentYear = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
        const yearName = `FY ${currentYear}-${currentYear + 1}`;
        
        let financialYear = await db.financialYear.findFirst({
          where: { companyId: pendingLoan.mirrorCompanyId, name: yearName }
        });
        
        if (!financialYear) {
          financialYear = await db.financialYear.create({
            data: {
              companyId: pendingLoan.mirrorCompanyId,
              name: yearName,
              startDate: new Date(currentYear, 3, 1),
              endDate: new Date(currentYear + 1, 2, 31),
              isClosed: false,
            },
          });
        }
        
        // Get required accounts
        const loansReceivableAccount = await db.chartOfAccount.findFirst({
          where: { companyId: pendingLoan.mirrorCompanyId, accountCode: '1200' }
        });
        const cashInHandAccount = await db.chartOfAccount.findFirst({
          where: { companyId: pendingLoan.mirrorCompanyId, accountCode: '1101' }
        });
        
        // Find or create bank account in Chart of Accounts (Use 1102 - Bank Account)
        let bankCOAAccount: Awaited<ReturnType<typeof db.chartOfAccount.findFirst>> = null;
        if (disbursementBankAccountId) {
          const bankAccount = await db.bankAccount.findUnique({
            where: { id: disbursementBankAccountId }
          });
          
          if (bankAccount) {
            // Use standard bank account code 1102
            bankCOAAccount = await db.chartOfAccount.findFirst({
              where: {
                companyId: pendingLoan.mirrorCompanyId,
                accountCode: '1102'
              }
            });
            
            if (!bankCOAAccount) {
              // Create bank account in Chart of Accounts with code 1102
              bankCOAAccount = await db.chartOfAccount.create({
                data: {
                  companyId: pendingLoan.mirrorCompanyId,
                  accountCode: '1102',
                  accountName: 'Bank Account',
                  accountType: 'ASSET',
                  description: 'Bank Account for disbursements',
                  openingBalance: 0,
                  currentBalance: bankAccount.currentBalance,
                  isActive: true,
                }
              });
            }
          }
        }
        
        if (loansReceivableAccount && (cashInHandAccount || bankCOAAccount)) {
          // Generate entry number
          const existingCount = await db.journalEntry.count({
            where: { companyId: pendingLoan.mirrorCompanyId }
          });
          const entryNumber = `JE${String(existingCount + 1).padStart(6, '0')}`;
          
          const effectiveBankAmount = isSplitPayment ? (bankAmount || 0) : (disbursementBankAccountId ? principalAmount : 0);
          const effectiveCashAmount = isSplitPayment ? (cashAmount || 0) : (disbursementBankAccountId ? 0 : principalAmount);
          
          // Create journal entry lines
          const journalLines: {
            accountId: string;
            debitAmount: number;
            creditAmount: number;
            narration: string;
            loanId?: string;
            customerId?: string;
          }[] = [];
          
          // Debit: Loans Receivable
          journalLines.push({
            accountId: loansReceivableAccount.id,
            debitAmount: principalAmount,
            creditAmount: 0,
            narration: `Mirror Loan Disbursement - ${mirrorApplicationNo}`,
            loanId: mirrorLoan.id,
            customerId: originalLoan.customerId,
          });
          
          // Credit: Bank Account (if bank payment)
          if (effectiveBankAmount > 0 && bankCOAAccount) {
            journalLines.push({
              accountId: bankCOAAccount.id,
              debitAmount: 0,
              creditAmount: effectiveBankAmount,
              narration: `Mirror Loan Disbursement (Bank) - ${mirrorApplicationNo}`,
            });
          }
          
          // Credit: Cash in Hand (if cash payment)
          if (effectiveCashAmount > 0 && cashInHandAccount) {
            journalLines.push({
              accountId: cashInHandAccount.id,
              debitAmount: 0,
              creditAmount: effectiveCashAmount,
              narration: `Mirror Loan Disbursement (Cash) - ${mirrorApplicationNo}`,
            });
          }
          
          // Create the journal entry
          await db.journalEntry.create({
            data: {
              companyId: pendingLoan.mirrorCompanyId,
              entryNumber,
              entryDate: new Date(),
              referenceType: 'MIRROR_LOAN_DISBURSEMENT',
              referenceId: mirrorLoan.id,
              narration: `Mirror Loan Disbursement - ${mirrorApplicationNo}`,
              totalDebit: principalAmount,
              totalCredit: principalAmount,
              isAutoEntry: true,
              isApproved: true,
              createdById: userId,
              paymentMode: isSplitPayment ? 'SPLIT' : (effectiveBankAmount > 0 ? 'BANK_TRANSFER' : 'CASH'),
              bankAccountId: disbursementBankAccountId || null,
              lines: {
                create: journalLines
              }
            }
          });
          
          // Update account balances
          // Loans Receivable increases (debit)
          await db.chartOfAccount.update({
            where: { id: loansReceivableAccount.id },
            data: { currentBalance: loansReceivableAccount.currentBalance + principalAmount }
          });
          
          // Bank Account decreases (credit)
          if (effectiveBankAmount > 0 && bankCOAAccount) {
            await db.chartOfAccount.update({
              where: { id: bankCOAAccount.id },
              data: { currentBalance: bankCOAAccount.currentBalance - effectiveBankAmount }
            });
          }
          
          // Cash in Hand decreases (credit)
          if (effectiveCashAmount > 0 && cashInHandAccount) {
            await db.chartOfAccount.update({
              where: { id: cashInHandAccount.id },
              data: { currentBalance: cashInHandAccount.currentBalance - effectiveCashAmount }
            });
          }
          
          console.log(`[Mirror Loan] Journal entry ${entryNumber} created for disbursement`);
        } else {
          console.warn(`[Mirror Loan] WARNING: Could not create journal entry - accounts not found`);
        }
      } catch (jeError) {
        console.error(`[Mirror Loan] Error creating journal entry:`, jeError);
        // Continue - disbursement is still successful
      }

      // Update pending loan status
      const updated = await db.pendingMirrorLoan.update({
        where: { id },
        data: {
          status: 'DISBURSED',
          disbursedById: userId,
          disbursedAt: new Date(),
          disbursementBankAccountId: disbursementBankAccountId || null,
          disbursementReference: disbursementReference || null
        }
      });

      console.log(`[Pending Mirror Loan] Disbursed: ${id}`);
      console.log(`[Mirror Loan] Created MIRROR LOAN ${mirrorApplicationNo} for original ${originalLoan.applicationNo}`);

      return NextResponse.json({
        success: true,
        pendingLoan: updated,
        mirrorLoan: {
          id: mirrorLoan.id,
          applicationNo: mirrorApplicationNo
        },
        mirrorMapping,
        message: 'Mirror loan disbursed successfully! Both loans are now active.'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update pending mirror loan error:', error);
    return NextResponse.json({ error: 'Failed to update pending mirror loan' }, { status: 500 });
  }
}

// DELETE - Remove a pending mirror loan (only if PENDING)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Pending mirror loan ID required' }, { status: 400 });
    }

    const pendingLoan = await db.pendingMirrorLoan.findUnique({
      where: { id }
    });

    if (!pendingLoan) {
      return NextResponse.json({ error: 'Pending mirror loan not found' }, { status: 404 });
    }

    if (pendingLoan.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only pending loans can be deleted' }, { status: 400 });
    }

    await db.pendingMirrorLoan.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Pending mirror loan deleted' });
  } catch (error) {
    console.error('Delete pending mirror loan error:', error);
    return NextResponse.json({ error: 'Failed to delete pending mirror loan' }, { status: 500 });
  }
}
