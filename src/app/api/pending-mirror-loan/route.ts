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
          originalLoan: {
            include: {
              customer: { select: { id: true, name: true, email: true, phone: true } },
              sessionForm: true,
              company: { select: { id: true, name: true, code: true } }
            }
          },
          mirrorCompany: { select: { id: true, name: true, code: true } },
          originalCompany: { select: { id: true, name: true, code: true } }
        }
      });

      if (!pendingLoan) {
        return NextResponse.json({ error: 'Pending mirror loan not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, pendingLoan });
    }

    // Get pending mirror loans by status
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const pendingLoans = await db.pendingMirrorLoan.findMany({
      where: whereClause,
      include: {
        originalLoan: {
          include: {
            customer: { select: { id: true, name: true, email: true, phone: true } },
            sessionForm: true,
            company: { select: { id: true, name: true, code: true } }
          }
        },
        mirrorCompany: { select: { id: true, name: true, code: true } },
        originalCompany: { select: { id: true, name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

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
      pendingLoans,
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
        company: true
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

    const calculation = calculateMirrorLoan(
      principal,
      originalRate,
      originalTenure,
      originalType,
      effectiveMirrorRate,
      'REDUCING'
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
        mirrorType: mirrorType || 'COMPANY_1_15_PERCENT',
        originalInterestRate: originalRate,
        originalInterestType: originalType,
        mirrorInterestRate: effectiveMirrorRate,
        mirrorInterestType: 'REDUCING',
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
        originalLoan: {
          include: {
            customer: { select: { id: true, name: true, email: true, phone: true } }
          }
        },
        mirrorCompany: { select: { id: true, name: true, code: true } },
        originalCompany: { select: { id: true, name: true, code: true } }
      }
    });

    console.log(`[Pending Mirror Loan] Created ${status} request for loan ${originalLoan.applicationNo}`);

    return NextResponse.json({
      success: true,
      pendingLoan,
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
    const { id, action, userId, rejectionReason, disbursementBankAccountId, disbursementReference, extraEMIPaymentPageId } = body;

    if (!id || !action || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const pendingLoan = await db.pendingMirrorLoan.findUnique({
      where: { id },
      include: {
        originalLoan: { include: { sessionForm: true } }
      }
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
        'REDUCING'
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
          interestType: 'REDUCING',
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
      // DEDUCT FROM MIRROR COMPANY'S BANK ACCOUNT
      // This is the ACTUAL disbursement - money goes out from mirror company
      // ============================================
      if (disbursementBankAccountId) {
        const bank = await db.bankAccount.findUnique({ 
          where: { id: disbursementBankAccountId },
          select: { currentBalance: true, companyId: true }
        });
        
        if (bank) {
          // Verify the bank account belongs to the mirror company
          if (bank.companyId !== pendingLoan.mirrorCompanyId) {
            console.warn(`[Mirror Loan] WARNING: Bank account ${disbursementBankAccountId} does not belong to mirror company ${pendingLoan.mirrorCompanyId}`);
          }
          
          const newBalance = bank.currentBalance - pendingLoan.principalAmount;
          
          // Update bank balance
          await db.bankAccount.update({
            where: { id: disbursementBankAccountId },
            data: { currentBalance: newBalance }
          });
          
          // Create bank transaction record
          await db.bankTransaction.create({
            data: {
              bankAccountId: disbursementBankAccountId,
              transactionType: 'DEBIT',
              amount: pendingLoan.principalAmount,
              balanceAfter: newBalance,
              description: `Mirror Loan Disbursement - ${mirrorApplicationNo} (Original: ${originalLoan.applicationNo})`,
              referenceType: 'LOAN_DISBURSEMENT',
              referenceId: mirrorLoan.id,
              createdById: userId
            }
          });
          
          console.log(`[Mirror Loan] Bank transaction created: Account ${disbursementBankAccountId}, Amount: ${pendingLoan.principalAmount}, New Balance: ${newBalance}`);
        } else {
          console.error(`[Mirror Loan] ERROR: Bank account ${disbursementBankAccountId} not found!`);
        }
      } else {
        console.warn(`[Mirror Loan] WARNING: No bank account ID provided for disbursement. Bank balance NOT updated.`);
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
