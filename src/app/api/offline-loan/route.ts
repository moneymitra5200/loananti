import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processBankTransaction } from '@/lib/bank-transaction-service';
import { EMIPaymentStatus } from '@prisma/client';
import { calculateEMI } from '@/utils/helpers';
import { recordEMIPaymentAccounting, getCompany3Id, recordCashBookEntry, recordBankTransaction } from '@/lib/simple-accounting';

// Get or create the global loan sequence
async function getNextLoanSequence(): Promise<number> {
  try {
    // Try to find existing sequence record
    let sequenceRecord = await db.loanSequence.findFirst();

    if (!sequenceRecord) {
      // Create initial sequence record
      sequenceRecord = await db.loanSequence.create({
        data: { currentSequence: 1 }
      });
      return 1;
    }

    // Increment the sequence
    const updated = await db.loanSequence.update({
      where: { id: sequenceRecord.id },
      data: { currentSequence: { increment: 1 } }
    });

    return updated.currentSequence;
  } catch (error) {
    console.error('Error getting loan sequence:', error);
    // Fallback: use timestamp
    return Date.now();
  }
}

// Generate loan number for ORIGINAL loan: Company Code + Product Code + Customer Name
async function generateOriginalLoanNumber(
  companyCode: string,
  loanType: string,
  customerName: string
): Promise<string> {
  // Clean customer name - remove special characters and spaces, take first 15 chars
  const cleanName = customerName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 15);

  return `${companyCode}-${loanType.toUpperCase()}-${cleanName}`;
}

// Generate loan number for MIRROR loan: Company Code + Product Code + Global Sequence (00001)
async function generateMirrorLoanNumber(
  companyCode: string,
  loanType: string
): Promise<string> {
  const sequence = await getNextLoanSequence();
  const sequenceStr = sequence.toString().padStart(5, '0');

  return `${companyCode}-${loanType.toUpperCase()}-${sequenceStr}`;
}

// GET - Fetch offline loans (All users can see all company loans)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const status = searchParams.get('status');
    const loanId = searchParams.get('loanId');
    const companyId = searchParams.get('companyId');

    // Get specific loan details
    if (loanId) {
      const loan = await db.offlineLoan.findUnique({
        where: { id: loanId },
        include: {
          emis: {
            orderBy: { installmentNumber: 'asc' }
          },
          company: { select: { id: true, name: true, code: true } }
        }
      });

      if (!loan) {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }

      // Check if this loan is an original loan (has a mirror loan mapping)
      const mirrorMappingAsOriginal = await db.mirrorLoanMapping.findFirst({
        where: { originalLoanId: loanId, isOfflineLoan: true }
      });

      // Check if this loan is a mirror loan (is the mirror of another loan)
      // For offline loans, check both the mapping AND the isMirrorLoan field on the loan
      const mirrorMappingAsMirror = await db.mirrorLoanMapping.findFirst({
        where: { mirrorLoanId: loanId }
      });

      // Determine if this is a mirror loan - check both the loan field and mapping
      const isMirrorLoan = loan.isMirrorLoan || !!mirrorMappingAsMirror;
      const isMirrored = !!mirrorMappingAsOriginal; // This is original, has a mirror

      // Get mirror info for display
      const mirrorInfo = mirrorMappingAsOriginal || mirrorMappingAsMirror;
      const displayColor = mirrorInfo?.displayColor || null;
      const mirrorTenure = mirrorInfo?.mirrorTenure || null;
      const extraEMICount = mirrorInfo?.extraEMICount || 0;
      const mirrorLoanNumber = mirrorMappingAsOriginal?.mirrorLoanNumber || null;

      // Calculate summary
      const summary = {
        totalEMIs: loan.emis.length,
        paidEMIs: loan.emis.filter(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID').length,
        pendingEMIs: loan.emis.filter(e => e.paymentStatus === 'PENDING').length,
        overdueEMIs: loan.emis.filter(e => e.paymentStatus === 'OVERDUE').length,
        totalAmount: loan.emis.reduce((sum, e) => sum + e.totalAmount, 0),
        totalPaid: loan.emis.reduce((sum, e) => sum + e.paidAmount, 0),
        totalOutstanding: loan.emis.reduce((sum, e) => sum + (e.totalAmount - e.paidAmount), 0)
      };

      return NextResponse.json({
        success: true,
        loan: {
          ...loan,
          isMirrored,
          isMirrorLoan,
          displayColor,
          mirrorTenure,
          extraEMICount,
          mirrorLoanNumber, // The mirror loan number stored in mapping
          originalLoanId: mirrorMappingAsMirror?.originalLoanId || null,
          mirrorLoanId: mirrorMappingAsOriginal?.mirrorLoanId || null,
          mirrorCompanyId: mirrorMappingAsOriginal?.mirrorCompanyId || null,
          mirrorInterestRate: mirrorMappingAsOriginal?.mirrorInterestRate || null
        },
        summary
      });
    }

    // Get today's and tomorrow's EMIs to collect
    if (action === 'emi-to-collect') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      // Get all pending/overdue EMIs (NO CREATOR FILTERING - show all company loans)
      const whereClause: Record<string, unknown> = {
        paymentStatus: { in: ['PENDING', 'OVERDUE'] }
      };

      const emis = await db.offlineLoanEMI.findMany({
        where: whereClause,
        include: {
          offlineLoan: {
            select: {
              id: true,
              loanNumber: true,
              customerName: true,
              customerPhone: true,
              customerAddress: true,
              emiAmount: true,
              loanAmount: true,
              createdById: true,
              createdByRole: true,
              companyId: true
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      });

      const todayEMIs = emis.filter(e => {
        const dueDate = new Date(e.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      });

      const tomorrowEMIs = emis.filter(e => {
        const dueDate = new Date(e.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === tomorrow.getTime();
      });

      const overdueEMIs = emis.filter(e => {
        const dueDate = new Date(e.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() < today.getTime();
      });

      return NextResponse.json({
        success: true,
        todayEMIs,
        tomorrowEMIs,
        overdueEMIs,
        summary: {
          todayCount: todayEMIs.length,
          todayAmount: todayEMIs.reduce((sum, e) => sum + e.totalAmount, 0),
          tomorrowCount: tomorrowEMIs.length,
          tomorrowAmount: tomorrowEMIs.reduce((sum, e) => sum + e.totalAmount, 0),
          overdueCount: overdueEMIs.length,
          overdueAmount: overdueEMIs.reduce((sum, e) => sum + e.totalAmount, 0)
        }
      });
    }

    // Get EMI calendar view
    if (action === 'emi-calendar') {
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');

      const start = startDate ? new Date(startDate) : new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);

      const end = endDate ? new Date(endDate) : new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setHours(23, 59, 59, 999);

      const whereClause: Record<string, unknown> = {
        dueDate: { gte: start, lte: end }
      };

      const emis = await db.offlineLoanEMI.findMany({
        where: whereClause,
        include: {
          offlineLoan: {
            select: {
              loanNumber: true,
              customerName: true,
              customerPhone: true
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      });

      // Group by date
      const calendar: Record<string, { emis: typeof emis; total: number; paid: number }> = {};
      
      for (const emi of emis) {
        const dateKey = new Date(emi.dueDate).toISOString().slice(0, 10);
        if (!calendar[dateKey]) {
          calendar[dateKey] = { emis: [], total: 0, paid: 0 };
        }
        calendar[dateKey].emis.push(emi);
        calendar[dateKey].total += emi.totalAmount;
        if (emi.paymentStatus === 'PAID') {
          calendar[dateKey].paid += emi.paidAmount;
        }
      }

      return NextResponse.json({ success: true, calendar });
    }

    // Get mirror EMI schedule for an offline loan (calculated on-the-fly)
    if (action === 'mirror-schedule') {
      const mirrorMappingId = searchParams.get('mappingId');

      if (!mirrorMappingId) {
        return NextResponse.json({ error: 'Mapping ID required' }, { status: 400 });
      }

      // Get the mirror loan mapping
      const mapping = await db.mirrorLoanMapping.findUnique({
        where: { id: mirrorMappingId },
        include: {
          mirrorCompany: { select: { id: true, name: true, code: true } },
          originalCompany: { select: { id: true, name: true, code: true } }
        }
      });

      if (!mapping) {
        return NextResponse.json({ error: 'Mirror mapping not found' }, { status: 404 });
      }

      // Get the original offline loan
      const originalLoan = await db.offlineLoan.findUnique({
        where: { id: mapping.originalLoanId },
        include: {
          emis: { orderBy: { installmentNumber: 'asc' } }
        }
      });

      if (!originalLoan) {
        return NextResponse.json({ error: 'Original loan not found' }, { status: 404 });
      }

      // Calculate mirror EMI schedule on-the-fly
      const { calculateMirrorLoan } = await import('@/lib/mirror-loan');
      const mirrorCalculation = calculateMirrorLoan(
        originalLoan.loanAmount,
        mapping.originalInterestRate,
        mapping.originalTenure,
        mapping.originalInterestType as 'FLAT' | 'REDUCING',
        mapping.mirrorInterestRate,
        mapping.mirrorInterestType as 'FLAT' | 'REDUCING'
      );

      // Get paid EMIs count from original loan
      const paidEMIs = originalLoan.emis.filter(e => e.paymentStatus === 'PAID').length;

      // Build mirror schedule with due dates matching original loan
      const mirrorSchedule = mirrorCalculation.mirrorLoan.schedule.map((item, index) => {
        const originalEMI = originalLoan.emis[index];
        const dueDate = originalEMI ? originalEMI.dueDate : new Date(originalLoan.startDate);

        return {
          installmentNumber: item.installmentNumber,
          dueDate,
          principal: item.principal,
          interest: item.interest,
          totalAmount: item.emi,
          outstandingPrincipal: item.outstandingPrincipal,
          paymentStatus: index < paidEMIs ? 'PAID' : (index < mapping.mirrorEMIsPaid ? 'PAID' : 'PENDING'),
          paidDate: index < paidEMIs ? originalLoan.emis[index]?.paidDate : null
        };
      });

      // Calculate extra EMIs (for Company 3 profit)
      const extraEMISchedule: Array<{
        installmentNumber: number;
        dueDate: Date;
        principal: number;
        interest: number;
        totalAmount: number;
        paymentStatus: string;
        paidDate: Date | null;
        isExtraEMI: boolean;
      }> = [];
      for (let i = mirrorSchedule.length; i < originalLoan.emis.length; i++) {
        const originalEMI = originalLoan.emis[i];
        extraEMISchedule.push({
          installmentNumber: i + 1,
          dueDate: originalEMI.dueDate,
          principal: originalEMI.principalAmount,
          interest: originalEMI.interestAmount,
          totalAmount: originalEMI.totalAmount,
          paymentStatus: originalEMI.paymentStatus,
          paidDate: originalEMI.paidDate,
          isExtraEMI: true
        });
      }

      return NextResponse.json({
        success: true,
        mapping: {
          id: mapping.id,
          mirrorLoanNumber: mapping.mirrorLoanNumber,
          mirrorCompany: mapping.mirrorCompany,
          originalCompany: mapping.originalCompany,
          originalInterestRate: mapping.originalInterestRate,
          mirrorInterestRate: mapping.mirrorInterestRate,
          originalTenure: mapping.originalTenure,
          mirrorTenure: mapping.mirrorTenure,
          extraEMICount: mapping.extraEMICount,
          displayColor: mapping.displayColor
        },
        mirrorSchedule,
        extraEMISchedule,
        summary: {
          totalMirrorEMIs: mirrorSchedule.length,
          paidMirrorEMIs: Math.min(paidEMIs, mirrorSchedule.length),
          totalExtraEMIs: extraEMISchedule.length,
          paidExtraEMIs: mapping.extraEMIsPaid,
          mirrorInterestTotal: mirrorCalculation.mirrorLoan.totalInterest,
          originalInterestTotal: mirrorCalculation.originalLoan.totalInterest
        }
      });
    }

    // Get list of offline loans (ALL COMPANY LOANS - NO CREATOR FILTERING)
    const where: Record<string, unknown> = {};
    
    // NO LONGER FILTER BY CREATOR - Show all company loans to everyone
    // Only filter by status and company
    if (status) {
      where.status = status;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [loans, total] = await Promise.all([
      db.offlineLoan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { emis: true } },
          company: { select: { id: true, name: true, code: true } }
        }
      }),
      db.offlineLoan.count({ where })
    ]);

    // Calculate summary for each loan
    const loansWithSummary = await Promise.all(
      loans.map(async (loan) => {
        const emis = await db.offlineLoanEMI.findMany({
          where: { offlineLoanId: loan.id }
        });

        const paidCount = emis.filter(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID').length;
        const pendingCount = emis.filter(e => e.paymentStatus === 'PENDING').length;
        const overdueCount = emis.filter(e => e.paymentStatus === 'OVERDUE').length;

        return {
          ...loan,
          summary: {
            totalEMIs: emis.length,
            paidEMIs: paidCount,
            pendingEMIs: pendingCount,
            overdueEMIs: overdueCount,
            lastPaidEMI: paidCount > 0 ? emis.filter(e => e.paymentStatus === 'PAID').slice(-1)[0]?.paidDate : null,
            nextDueEMI: pendingCount > 0 ? emis.find(e => e.paymentStatus === 'PENDING')?.dueDate : null
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      loans: loansWithSummary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Offline loan fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch offline loans' }, { status: 500 });
  }
}

// POST - Create a new offline loan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      createdById,
      createdByRole,
      companyId,
      // Customer details
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      customerAadhaar,
      customerPan,
      customerAddress,
      customerCity,
      customerState,
      customerPincode,
      customerDOB,
      customerOccupation,
      customerMonthlyIncome,
      // References
      reference1Name,
      reference1Phone,
      reference1Relation,
      reference2Name,
      reference2Phone,
      reference2Relation,
      // Loan details
      loanType,
      productId,
      loanAmount,
      interestRate,
      interestType, // FLAT or REDUCING - default FLAT
      tenure,
      emiAmount,
      processingFee,
      disbursementDate,
      disbursementMode,
      disbursementRef,
      startDate,
      notes,
      internalNotes,
      bankAccountId,
      // Documents
      documents,
      // Gold Loan Details
      goldLoanDetail,
      // Vehicle Loan Details
      vehicleLoanDetail,
      // Interest Only Loan
      isInterestOnly,
      // Mirror Loan
      isMirrorLoan,
      mirrorCompanyId,
      mirrorInterestRate,
      mirrorInterestType,
      extraEmiPaymentPageId
    } = body;

    // Validate required fields (COMPANY IS NOW REQUIRED)
    // For Interest Only loans, tenure can be 0
    const isInterestOnlyLoan = isInterestOnly === true;
    
    if (!createdById || !createdByRole || !customerName || !customerPhone ||
        !loanAmount || !interestRate || !disbursementDate || !startDate || !companyId) {
      return NextResponse.json({ error: 'Missing required fields (Company is required)' }, { status: 400 });
    }
    
    // For regular loans, tenure is required
    if (!isInterestOnlyLoan && (!tenure || tenure <= 0)) {
      return NextResponse.json({ error: 'Tenure is required for regular loans' }, { status: 400 });
    }

    // ============================================
    // CRITICAL VALIDATION: Mirror loans ONLY for Company 3
    // If loan is from Company 1 or Company 2, mirror is NOT allowed
    // ============================================
    if (isMirrorLoan && mirrorCompanyId) {
      // Check if the company creating the loan is Company 3
      const companies = await db.company.findMany({
        orderBy: { createdAt: 'asc' },
        take: 3,
        select: { id: true, code: true, name: true }
      });
      
      const company3 = companies.length >= 3 ? companies[2] : null;
      const isCompany3ById = company3?.id === companyId;
      const isCompany3ByCode = companies.find(c => c.id === companyId)?.code === 'C3';
      const isFromCompany3 = isCompany3ById || isCompany3ByCode;
      
      if (!isFromCompany3) {
        const currentCompany = companies.find(c => c.id === companyId);
        return NextResponse.json({ 
          error: 'Mirror loan not allowed',
          message: `Mirror loans can ONLY be created for loans from Company 3. This loan is being created under ${currentCompany?.name || 'Company 1/2'} (${currentCompany?.code || 'not C3'}). Please select Company 3 to use mirror loan functionality.`,
          isCompany3: false
        }, { status: 400 });
      }
    }

    // Validate Gold Loan Details
    if (loanType === 'GOLD' && goldLoanDetail) {
      if (!goldLoanDetail.grossWeight || !goldLoanDetail.netWeight || !goldLoanDetail.goldRate ||
          !goldLoanDetail.valuationAmount || !goldLoanDetail.loanAmount || !goldLoanDetail.ownerName) {
        return NextResponse.json({ error: 'Missing required Gold Loan receipt fields' }, { status: 400 });
      }
    }

    // Validate Vehicle Loan Details
    if (loanType === 'VEHICLE' && vehicleLoanDetail) {
      if (!vehicleLoanDetail.vehicleType || !vehicleLoanDetail.vehicleNumber ||
          !vehicleLoanDetail.manufacturer || !vehicleLoanDetail.valuationAmount ||
          !vehicleLoanDetail.loanAmount || !vehicleLoanDetail.ownerName) {
        return NextResponse.json({ error: 'Missing required Vehicle Loan receipt fields' }, { status: 400 });
      }
    }

    // Fetch company to get company code for loan number
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { id: true, code: true, name: true }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 });
    }

    // Generate loan number: Company Code + Product Code + Customer Name
    const loanNumber = await generateOriginalLoanNumber(
      company.code,
      loanType || 'PERSONAL',
      customerName
    );

    // Extract document URLs from uploadedDocs
    const docUrls: Record<string, string> = {};
    if (documents) {
      // Map document types to schema fields
      const docMapping: Record<string, string> = {
        'pan_card': 'panCardDoc',
        'aadhaar_front': 'aadhaarFrontDoc',
        'aadhaar_back': 'aadhaarBackDoc',
        'income_proof': 'incomeProofDoc',
        'address_proof': 'addressProofDoc',
        'photo': 'photoDoc',
        'election_card': 'electionCardDoc',
        'house_photo': 'housePhotoDoc'
      };
      
      for (const [docType, docData] of Object.entries(documents)) {
        const schemaField = docMapping[docType];
        if (schemaField && (docData as { url: string })?.url) {
          docUrls[schemaField] = (docData as { url: string }).url;
        }
      }
    }

    // Calculate monthly interest for Interest Only loans
    const monthlyInterestAmount = (loanAmount * interestRate / 100) / 12;
    
    // Determine interest type (default to FLAT)
    const actualInterestType: 'FLAT' | 'REDUCING' = (interestType === 'REDUCING' ? 'REDUCING' : 'FLAT') as 'FLAT' | 'REDUCING';
    
    // Calculate EMI using the proper helper function that supports both FLAT and REDUCING
    let calculatedEmiAmount: number;
    let emiSchedule: Array<{
      installmentNumber: number;
      dueDate: Date;
      principal: number;
      interest: number;
      totalAmount: number;
      outstandingPrincipal: number;
    }> = [];
    
    if (isInterestOnlyLoan) {
      calculatedEmiAmount = monthlyInterestAmount;
    } else {
      const emiCalculation = calculateEMI(
        loanAmount,
        interestRate,
        tenure || 12,
        actualInterestType,
        new Date(startDate)
      );
      calculatedEmiAmount = emiCalculation.emi;
      emiSchedule = emiCalculation.schedule;
    }

    // Create loan
    const loan = await db.offlineLoan.create({
      data: {
        loanNumber,
        createdById,
        createdByRole,
        companyId,
        customerId,
        customerName,
        customerPhone,
        customerEmail,
        customerAadhaar,
        customerPan,
        customerAddress,
        customerCity,
        customerState,
        customerPincode,
        customerDOB: customerDOB ? new Date(customerDOB) : null,
        customerOccupation,
        customerMonthlyIncome,
        reference1Name,
        reference1Phone,
        reference1Relation,
        reference2Name,
        reference2Phone,
        reference2Relation,
        loanType: loanType || 'PERSONAL',
        interestType: actualInterestType,
        productId: productId || null,
        loanAmount,
        interestRate,
        tenure: isInterestOnlyLoan ? 0 : (tenure || 0),
        emiAmount: calculatedEmiAmount,
        processingFee: processingFee || 0,
        disbursementDate: new Date(disbursementDate),
        disbursementMode,
        disbursementRef,
        status: isInterestOnlyLoan ? 'INTEREST_ONLY' : 'ACTIVE',
        startDate: new Date(startDate),
        notes,
        internalNotes,
        bankAccountId: bankAccountId || null,
        // Interest Only Loan fields
        isInterestOnlyLoan,
        interestOnlyStartDate: isInterestOnlyLoan ? new Date(disbursementDate) : null,
        interestOnlyMonthlyAmount: isInterestOnlyLoan ? monthlyInterestAmount : null,
        partialPaymentEnabled: !isInterestOnlyLoan,
        // Documents
        ...docUrls
      }
    });

    // Generate EMI schedule
    if (isInterestOnlyLoan) {
      // ============ INTEREST ONLY LOAN - Create FIRST Interest EMI ============
      // Same logic as online loan: Create one EMI for monthly interest
      // Due date: 5th of next month
      const dueDate = new Date(disbursementDate);
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(5);
      dueDate.setHours(0, 0, 0, 0);

      await db.offlineLoanEMI.create({
        data: {
          offlineLoanId: loan.id,
          installmentNumber: 1,
          dueDate,
          originalDueDate: dueDate,
          principalAmount: 0, // No principal for interest-only EMI
          interestAmount: monthlyInterestAmount,
          totalAmount: monthlyInterestAmount,
          outstandingPrincipal: loanAmount, // Principal remains outstanding
          paymentStatus: EMIPaymentStatus.PENDING,
          isInterestOnly: true,
          interestOnlyAmount: monthlyInterestAmount
        }
      });

      console.log(`[Offline Loan] Created first Interest EMI for loan ${loanNumber}, Amount: ${monthlyInterestAmount}, Due: ${dueDate.toISOString()}`);
    } else if (tenure > 0 && emiSchedule.length > 0) {
      // ============ REGULAR LOAN - Create Full EMI Schedule ============
      // Create EMI schedules with proper due dates (5th of each month, same as online loan)
      const emis = emiSchedule.map((item, index) => {
        // Set due date to 5th of each month (same as online loan)
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + index + 1);
        dueDate.setDate(5);
        dueDate.setHours(0, 0, 0, 0);

        return {
          offlineLoanId: loan.id,
          installmentNumber: item.installmentNumber,
          dueDate,
          principalAmount: item.principal,
          interestAmount: item.interest,
          totalAmount: item.totalAmount,
          outstandingPrincipal: item.outstandingPrincipal,
          paymentStatus: EMIPaymentStatus.PENDING
        };
      });

      // Create all EMIs
      await db.offlineLoanEMI.createMany({
        data: emis
      });
    }
    
    // Handle Mirror Loan creation - Create ACTUAL mirror loan (SAME AS ONLINE LOANS)
    // Online loans create a separate LoanApplication for mirror - we do the same for offline
    let mirrorLoanResult: { mirrorLoanId: string; mirrorLoanNumber: string; extraEMICount: number } | null = null;

    if (isMirrorLoan && mirrorCompanyId && loan) {
      try {
        // Get mirror company details
        const mirrorCompany = await db.company.findUnique({
          where: { id: mirrorCompanyId }
        });

        if (!mirrorCompany) {
          throw new Error('Mirror company not found');
        }

        // Determine mirror type and rate based on company
        // Company 1 = 15% Reducing, Company 2 = 24% Reducing
        const isCompany1 = mirrorCompany.code === 'C1' || mirrorCompany.id.includes('1');
        const mirrorType = isCompany1
          ? 'COMPANY_1_15_PERCENT'
          : 'COMPANY_2_SAME_RATE';

        // Calculate mirror loan EMI schedule
        // Company 1 = 15%, Company 2 = 24%
        const mirrorRate = mirrorInterestRate ? parseFloat(mirrorInterestRate) : (isCompany1 ? 15 : 24);
        const mirrorTypeInterest = 'REDUCING'; // Always REDUCING for mirror loans

        // Calculate EMI schedule for mirror loan using SAME EMI amount as original
        // This is the key to mirror loan logic - same EMI, different interest calculation
        const originalEmiAmount = calculatedEmiAmount;

        // Recalculate mirror schedule with same EMI as original
        // This ensures the customer pays the same EMI amount
        const mirrorSchedule: Array<{
          installmentNumber: number;
          principal: number;
          interest: number;
          totalAmount: number;
          outstandingPrincipal: number;
        }> = [];

        const monthlyRate = mirrorRate / 100 / 12;
        let outstandingPrincipal = loanAmount;
        let installmentNumber = 1;

        while (outstandingPrincipal > 0.01 && installmentNumber <= 100) {
          const interest = outstandingPrincipal * monthlyRate;
          let principalPaid = originalEmiAmount - interest;
          let emiAmount = originalEmiAmount;

          if (principalPaid >= outstandingPrincipal) {
            principalPaid = outstandingPrincipal;
            emiAmount = principalPaid + interest;
            outstandingPrincipal = 0;
          } else {
            outstandingPrincipal = Math.max(0, outstandingPrincipal - principalPaid);
          }

          mirrorSchedule.push({
            installmentNumber,
            principal: principalPaid,
            interest,
            totalAmount: emiAmount,
            outstandingPrincipal
          });

          installmentNumber++;
        }

        // Calculate extra EMIs
        const originalTenure = tenure || 12;
        const mirrorTenure = mirrorSchedule.length;
        const extraEMICount = Math.max(0, originalTenure - mirrorTenure);
        const leftoverAmount = 0; // Leftover is handled within the schedule

        // Generate mirror loan number: Company Code + Product Code + Global Sequence (00001)
        const mirrorLoanNumber = await generateMirrorLoanNumber(
          mirrorCompany.code,
          loanType || 'PERSONAL'
        );

        // ============================================
        // CREATE ACTUAL MIRROR LOAN (SAME AS ONLINE LOANS)
        // Just like online loans create separate LoanApplication
        // We create separate OfflineLoan for mirror
        // ============================================

        // Generate display color for the pair
        const displayColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4'];
        const colorIndex = Math.abs(loan.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % displayColors.length;
        const displayColor = displayColors[colorIndex];

        // CREATE MIRROR LOAN - Separate OfflineLoan record (READ-ONLY for EMI payments)
        const mirrorLoan = await db.offlineLoan.create({
          data: {
            loanNumber: mirrorLoanNumber,
            createdById,
            createdByRole,
            companyId: mirrorCompanyId, // Mirror company (Company 1 or 2)
            customerId,
            customerName,
            customerPhone,
            customerEmail,
            customerAadhaar,
            customerPan,
            customerAddress,
            customerCity,
            customerState,
            customerPincode,
            customerDOB: customerDOB ? new Date(customerDOB) : null,
            customerOccupation,
            customerMonthlyIncome,
            reference1Name,
            reference1Phone,
            reference1Relation,
            reference2Name,
            reference2Phone,
            reference2Relation,
            loanType: loanType || 'PERSONAL',
            interestType: mirrorTypeInterest as 'FLAT' | 'REDUCING',
            productId: productId || null,
            loanAmount,
            interestRate: mirrorRate,
            tenure: mirrorTenure,
            emiAmount: calculatedEmiAmount, // Same EMI as original
            processingFee: 0, // No processing fee for mirror
            disbursementDate: new Date(disbursementDate),
            disbursementMode: 'BANK_TRANSFER',
            status: 'ACTIVE',
            startDate: new Date(startDate),
            notes: `Mirror loan for ${loanNumber}`,
            internalNotes: `Mirror of ${loanNumber} from ${company?.name || 'Company 3'}`,
            displayColor, // Same color as original
            isMirrorLoan: true, // READ-ONLY - EMI payments sync from original
            originalLoanId: loan.id, // Reference to original loan
            allowInterestOnly: false,
            allowPartialPayment: true,
            isInterestOnlyLoan: false,
            partialPaymentEnabled: true
          }
        });

        // CREATE EMI SCHEDULE FOR MIRROR LOAN
        const mirrorEmis = mirrorSchedule.map((item, index) => {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + index + 1);
          dueDate.setDate(5);
          dueDate.setHours(0, 0, 0, 0);

          return {
            offlineLoanId: mirrorLoan.id,
            installmentNumber: item.installmentNumber,
            dueDate,
            principalAmount: item.principal,
            interestAmount: item.interest,
            totalAmount: item.totalAmount,
            outstandingPrincipal: item.outstandingPrincipal,
            paymentStatus: EMIPaymentStatus.PENDING
          };
        });

        await db.offlineLoanEMI.createMany({
          data: mirrorEmis
        });

        // Update original loan with the same display color
        await db.offlineLoan.update({
          where: { id: loan.id },
          data: { displayColor }
        });

        console.log(`[Mirror Loan] Created mirror loan ${mirrorLoanNumber} for original ${loanNumber}`);
        console.log(`[Mirror Loan] Display color: ${displayColor}, Mirror Tenure: ${mirrorTenure}, Extra EMIs: ${extraEMICount}`);

        // Calculate total mirror interest
        const totalMirrorInterest = mirrorSchedule.reduce((sum, item) => sum + item.interest, 0);

        // CREATE MIRROR LOAN MAPPING - Link original and mirror
        await db.mirrorLoanMapping.create({
          data: {
            originalLoanId: loan.id,
            mirrorLoanId: mirrorLoan.id, // NOW WE HAVE THE MIRROR LOAN ID
            originalCompanyId: companyId,
            mirrorCompanyId,
            mirrorType,
            isOfflineLoan: true, // Mark as offline loan mapping
            mirrorLoanNumber, // Store the mirror loan number
            displayColor,
            originalInterestRate: interestRate,
            originalInterestType: interestType || 'FLAT',
            mirrorInterestRate: mirrorRate,
            mirrorInterestType: mirrorTypeInterest,
            originalEMIAmount: calculatedEmiAmount,
            originalTenure,
            mirrorTenure,
            extraEMICount,
            leftoverAmount,
            disbursementCompanyId: mirrorCompanyId,
            totalMirrorInterest,
            extraEMIPaymentPageId: extraEmiPaymentPageId || null,
            createdBy: createdById
          }
        });

        // DEDUCT FROM MIRROR COMPANY'S BANK ACCOUNT (Same as online loans)
        const mirrorDefaultBank = await db.bankAccount.findFirst({
          where: { companyId: mirrorCompanyId, isDefault: true }
        });

        if (mirrorDefaultBank) {
          // Get current balance
          const currentBank = await db.bankAccount.findUnique({
            where: { id: mirrorDefaultBank.id },
            select: { currentBalance: true }
          });

          if (currentBank && currentBank.currentBalance >= loanAmount) {
            // Update bank balance
            await db.bankAccount.update({
              where: { id: mirrorDefaultBank.id },
              data: { currentBalance: currentBank.currentBalance - loanAmount }
            });

            // Create bank transaction record
            await db.bankTransaction.create({
              data: {
                bankAccountId: mirrorDefaultBank.id,
                transactionType: 'DEBIT',
                amount: loanAmount,
                balanceAfter: currentBank.currentBalance - loanAmount,
                description: `Mirror Loan Disbursement - ${mirrorLoanNumber} (Mirror of ${loanNumber})`,
                referenceType: 'MIRROR_LOAN_DISBURSEMENT',
                referenceId: mirrorLoan.id,
                createdById
              }
            });

            console.log(`[Mirror Loan] Bank deduction: ${loanAmount} from ${mirrorDefaultBank.id}, New Balance: ${currentBank.currentBalance - loanAmount}`);
          } else {
            console.warn(`[Mirror Loan] WARNING: Insufficient bank balance or bank not found`);
          }
        } else {
          console.warn(`[Mirror Loan] WARNING: No default bank found for mirror company ${mirrorCompanyId}`);
        }

        mirrorLoanResult = {
          mirrorLoanId: mirrorLoan.id,
          mirrorLoanNumber: mirrorLoan.loanNumber,
          extraEMICount
        };

        console.log(`[Mirror Loan] SUCCESS: Created mirror loan ${mirrorLoanNumber} (ID: ${mirrorLoan.id}) for original ${loanNumber}`);
        console.log(`[Mirror Loan] Original: Company ${companyId}, Mirror: Company ${mirrorCompanyId}`);
        console.log(`[Mirror Loan] Both loans are now ACTIVE and linked via MirrorLoanMapping`);

      } catch (mirrorError) {
        console.error('Mirror loan creation failed:', mirrorError);
        // Don't fail the main loan creation
      }
    }

    // Create Gold Loan Detail if applicable
    if (loanType === 'GOLD' && goldLoanDetail) {
      await db.goldLoanDetail.create({
        data: {
          offlineLoanId: loan.id,
          grossWeight: goldLoanDetail.grossWeight,
          netWeight: goldLoanDetail.netWeight,
          goldRate: goldLoanDetail.goldRate,
          valuationAmount: goldLoanDetail.valuationAmount,
          loanAmount: goldLoanDetail.loanAmount,
          ownerName: goldLoanDetail.ownerName,
          goldItemPhoto: goldLoanDetail.goldItemPhoto || null,
          karat: goldLoanDetail.karat || 22,
          numberOfItems: goldLoanDetail.numberOfItems || 1,
          itemDescription: goldLoanDetail.itemDescription || null,
          verificationDate: goldLoanDetail.verificationDate ? new Date(goldLoanDetail.verificationDate) : new Date(),
          verifiedBy: goldLoanDetail.verifiedBy || createdById,
          remarks: goldLoanDetail.remarks || null
        }
      });
    }

    // Create Vehicle Loan Detail if applicable
    if (loanType === 'VEHICLE' && vehicleLoanDetail) {
      await db.vehicleLoanDetail.create({
        data: {
          offlineLoanId: loan.id,
          vehicleType: vehicleLoanDetail.vehicleType,
          vehicleNumber: vehicleLoanDetail.vehicleNumber || null,
          manufacturer: vehicleLoanDetail.manufacturer,
          model: vehicleLoanDetail.model || null,
          yearOfManufacture: vehicleLoanDetail.yearOfManufacture || new Date().getFullYear(),
          valuationAmount: vehicleLoanDetail.valuationAmount,
          loanAmount: vehicleLoanDetail.loanAmount,
          ownerName: vehicleLoanDetail.ownerName,
          rcBookPhoto: vehicleLoanDetail.rcBookPhoto || null,
          vehiclePhoto: vehicleLoanDetail.vehiclePhoto || null,
          chassisNumber: vehicleLoanDetail.chassisNumber || null,
          engineNumber: vehicleLoanDetail.engineNumber || null,
          fuelType: vehicleLoanDetail.fuelType || 'PETROL',
          color: vehicleLoanDetail.color || null,
          verificationDate: vehicleLoanDetail.verificationDate ? new Date(vehicleLoanDetail.verificationDate) : new Date(),
          verifiedBy: vehicleLoanDetail.verifiedBy || createdById,
          remarks: vehicleLoanDetail.remarks || null
        }
      });
    }

    // Create bank transaction for loan disbursement
    let bankTransactionResult: Awaited<ReturnType<typeof processBankTransaction>> | null = null;
    try {
      // Get default bank account for the company
      const defaultBank = await db.bankAccount.findFirst({
        where: { companyId, isDefault: true }
      });

      if (defaultBank) {
        bankTransactionResult = await processBankTransaction({
          bankAccountId: defaultBank.id,
          transactionType: 'LOAN_DISBURSEMENT',
          amount: loanAmount,
          description: `Offline Loan Disbursement - ${loanNumber} to ${customerName}`,
          referenceType: 'OFFLINE_LOAN',
          referenceId: loan.id,
          createdById,
          companyId,
          loanId: loan.id,
          customerId: customerId || undefined,
          paymentMode: disbursementMode || 'BANK_TRANSFER',
          bankRefNumber: disbursementRef
        });
      }
    } catch (bankError) {
      console.error('Bank transaction for loan disbursement failed:', bankError);
      // Don't fail the loan creation if bank transaction fails
    }

    // Log action for undo
    await db.actionLog.create({
      data: {
        userId: createdById,
        userRole: createdByRole,
        actionType: 'CREATE',
        module: 'OFFLINE_LOAN',
        recordId: loan.id,
        recordType: 'OfflineLoan',
        newData: JSON.stringify({
          loanNumber,
          customerName,
          loanAmount,
          companyId
        }),
        description: `Created offline loan ${loanNumber} for ${customerName}`,
        canUndo: true
      }
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: createdById,
        type: 'OFFLINE_LOAN_CREATED',
        title: 'Offline Loan Created',
        message: `Offline loan ${loanNumber} created for ${customerName}. Amount: ₹${loanAmount}`,
        data: JSON.stringify({ loanId: loan.id, loanNumber })
      }
    });

    return NextResponse.json({
      success: true,
      loan,
      emiCount: isInterestOnlyLoan ? 1 : tenure, // Interest Only loans have 1 EMI initially
      bankTransaction: bankTransactionResult ? {
        id: bankTransactionResult.bankTransactionId,
        balanceAfter: bankTransactionResult.balanceAfter
      } : null,
      mirrorLoan: mirrorLoanResult
    });
  } catch (error) {
    console.error('Offline loan creation error:', error);
    return NextResponse.json({ error: 'Failed to create offline loan' }, { status: 500 });
  }
}

// PUT - Update offline loan or pay EMI
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, loanId, emiId, userId, userRole } = body;

    // Pay Interest Only Loan - Same logic as online loan
    // 1. Find pending interest EMI
    // 2. Mark it as PAID
    // 3. Create next month's interest EMI
    if (action === 'pay-interest-only-loan' && loanId && userId) {
      const { paymentMode, paymentReference, bankAccountId, creditType } = body;

      // Get the loan with interest EMIs
      const loan = await db.offlineLoan.findUnique({
        where: { id: loanId },
        include: { 
          company: true,
          emis: {
            where: { isInterestOnly: true },
            orderBy: { installmentNumber: 'desc' },
            take: 1
          }
        }
      });

      if (!loan) {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }

      // Check if this is an interest-only loan
      if (!loan.isInterestOnlyLoan || loan.status !== 'INTEREST_ONLY') {
        return NextResponse.json({ 
          error: 'This action is only for Interest Only loans in INTEREST_ONLY status' 
        }, { status: 400 });
      }

      // Find the pending interest EMI
      let currentEMI = loan.emis.find(e => e.paymentStatus === 'PENDING');
      
      // If no pending EMI but last EMI is paid, create next month's EMI first
      if (!currentEMI && loan.emis.length > 0) {
        const lastEMI = loan.emis[0];
        if (lastEMI.paymentStatus === 'PAID') {
          // Create next month's interest EMI
          const nextInstallmentNumber = lastEMI.installmentNumber + 1;
          const newDueDate = new Date(lastEMI.dueDate);
          newDueDate.setMonth(newDueDate.getMonth() + 1);
          
          const monthlyInterest = loan.interestOnlyMonthlyAmount || 0;
          
          currentEMI = await db.offlineLoanEMI.create({
            data: {
              offlineLoanId: loanId,
              installmentNumber: nextInstallmentNumber,
              dueDate: newDueDate,
              originalDueDate: newDueDate,
              principalAmount: 0,
              interestAmount: monthlyInterest,
              totalAmount: monthlyInterest,
              outstandingPrincipal: loan.loanAmount,
              paymentStatus: 'PENDING',
              isInterestOnly: true,
              interestOnlyAmount: monthlyInterest
            }
          });
          
          console.log(`[Offline Loan] Created next Interest EMI #${nextInstallmentNumber} for loan ${loan.loanNumber}`);
        }
      }

      // If still no EMI, create the first one (shouldn't happen normally)
      if (!currentEMI) {
        const monthlyInterest = loan.interestOnlyMonthlyAmount || 0;
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(5);
        
        currentEMI = await db.offlineLoanEMI.create({
          data: {
            offlineLoanId: loanId,
            installmentNumber: 1,
            dueDate,
            originalDueDate: dueDate,
            principalAmount: 0,
            interestAmount: monthlyInterest,
            totalAmount: monthlyInterest,
            outstandingPrincipal: loan.loanAmount,
            paymentStatus: 'PENDING',
            isInterestOnly: true,
            interestOnlyAmount: monthlyInterest
          }
        });
        
        console.log(`[Offline Loan] Created first Interest EMI for loan ${loan.loanNumber}`);
      }

      const interestAmount = currentEMI.totalAmount;
      const now = new Date();

      // Get user details for credit
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, credit: true, companyCredit: true, personalCredit: true, role: true, name: true }
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Update credit based on credit type selection
      const creditTypeUsed = creditType || 'COMPANY';
      let creditUpdateData: Record<string, number> = {};
      
      if (creditTypeUsed === 'COMPANY') {
        creditUpdateData = { companyCredit: (user.companyCredit || 0) + interestAmount };
      } else {
        creditUpdateData = { personalCredit: (user.personalCredit || 0) + interestAmount };
      }

      // Get company's default bank account if not provided
      let targetBankAccountId = bankAccountId;
      if (!targetBankAccountId && loan.companyId) {
        const defaultBank = await db.bankAccount.findFirst({
          where: { companyId: loan.companyId, isDefault: true }
        });
        if (defaultBank) {
          targetBankAccountId = defaultBank.id;
        }
      }

      // Process bank transaction for CASH payments
      let bankTransactionResult: Awaited<ReturnType<typeof processBankTransaction>> | null = null;
      if (paymentMode === 'CASH' && targetBankAccountId && loan.companyId) {
        try {
          bankTransactionResult = await processBankTransaction({
            bankAccountId: targetBankAccountId,
            transactionType: 'EMI_PAYMENT',
            amount: interestAmount,
            description: `Interest EMI #${currentEMI.installmentNumber} Payment for ${loan.loanNumber}`,
            referenceType: 'OFFLINE_EMI',
            referenceId: currentEMI.id,
            createdById: userId,
            companyId: loan.companyId,
            loanId: loan.id,
            customerId: loan.customerId || undefined,
            interestComponent: interestAmount,
            paymentMode: paymentMode || 'CASH',
            bankRefNumber: paymentReference
          });
        } catch (bankError) {
          console.error('Bank transaction failed (continuing without):', bankError);
        }
      }

      // Calculate next EMI due date
      const nextDueDate = new Date(currentEMI.dueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      // Update loan, mark EMI as PAID, create next EMI, and update records
      const result = await db.$transaction(async (tx) => {
        // Mark current EMI as PAID
        await tx.offlineLoanEMI.update({
          where: { id: currentEMI!.id },
          data: {
            paymentStatus: 'PAID',
            paidAmount: interestAmount,
            paidInterest: interestAmount,
            paidDate: now,
            paymentMode: paymentMode || 'CASH',
            paymentReference,
            collectedById: userId,
            collectedByName: user.name,
            collectedAt: now,
            interestOnlyPaidAt: now
          }
        });

        // Create next month's interest EMI
        const nextInstallmentNumber = currentEMI!.installmentNumber + 1;
        const monthlyInterest = loan.interestOnlyMonthlyAmount || 0;
        
        await tx.offlineLoanEMI.create({
          data: {
            offlineLoanId: loanId,
            installmentNumber: nextInstallmentNumber,
            dueDate: nextDueDate,
            originalDueDate: nextDueDate,
            principalAmount: 0,
            interestAmount: monthlyInterest,
            totalAmount: monthlyInterest,
            outstandingPrincipal: loan.loanAmount,
            paymentStatus: 'PENDING',
            isInterestOnly: true,
            interestOnlyAmount: monthlyInterest
          }
        });

        console.log(`[Offline Loan] Created next Interest EMI #${nextInstallmentNumber} for loan ${loan.loanNumber}`);

        // Update loan with total interest paid
        await tx.offlineLoan.update({
          where: { id: loanId },
          data: {
            totalInterestPaid: (loan.totalInterestPaid || 0) + interestAmount
          }
        });

        // Update user credit
        await tx.user.update({
          where: { id: userId },
          data: creditUpdateData
        });

        // Create credit transaction
        await tx.creditTransaction.create({
          data: {
            userId,
            transactionType: 'CREDIT_INCREASE',
            amount: interestAmount,
            paymentMode: paymentMode || 'CASH',
            creditType: creditTypeUsed,
            companyBalanceAfter: creditTypeUsed === 'COMPANY' ? (user.companyCredit || 0) + interestAmount : user.companyCredit,
            personalBalanceAfter: creditTypeUsed === 'PERSONAL' ? (user.personalCredit || 0) + interestAmount : user.personalCredit,
            balanceAfter: (user.credit || 0) + interestAmount,
            sourceType: 'INTEREST_ONLY_PAYMENT',
            sourceId: loan.id,
            description: `Interest EMI #${currentEMI!.installmentNumber} payment for ${loan.loanNumber} (${creditTypeUsed} credit)`,
            loanApplicationNo: loan.loanNumber,
            collectedFrom: loan.customerName,
            collectedFromPhone: loan.customerPhone
          }
        });

        // Log action
        await tx.actionLog.create({
          data: {
            userId,
            userRole: user.role,
            actionType: 'PAY',
            module: 'INTEREST_ONLY_LOAN',
            recordId: loanId,
            recordType: 'OfflineLoan',
            newData: JSON.stringify({
              emiId: currentEMI!.id,
              installmentNumber: currentEMI!.installmentNumber,
              interestAmount,
              paymentMode,
              collectorId: userId,
              collectorName: user.name,
              bankTransactionId: bankTransactionResult?.bankTransactionId
            }),
            description: `Collected Interest EMI #${currentEMI!.installmentNumber} for loan ${loan.loanNumber}`,
            canUndo: true
          }
        });
      });

      return NextResponse.json({
        success: true,
        interestAmount,
        installmentNumber: currentEMI.installmentNumber,
        totalInterestPaid: (loan.totalInterestPaid || 0) + interestAmount,
        creditAdded: interestAmount,
        creditType: creditTypeUsed,
        newCompanyCredit: creditTypeUsed === 'COMPANY' ? (user.companyCredit || 0) + interestAmount : user.companyCredit,
        newPersonalCredit: creditTypeUsed === 'PERSONAL' ? (user.personalCredit || 0) + interestAmount : user.personalCredit,
        nextDueDate,
        bankTransaction: bankTransactionResult ? {
          id: bankTransactionResult.bankTransactionId,
          balanceAfter: bankTransactionResult.balanceAfter
        } : null
      });
    }

    // Pay EMI with partial payment support
    if (action === 'pay-emi' && emiId && userId) {
      const { paymentMode, paymentReference, amount, paymentType, bankAccountId, creditType, remainingPaymentDate, isAdvancePayment } = body;
      // paymentType: 'FULL', 'PARTIAL', 'INTEREST_ONLY', 'ADVANCE'
      // creditType: 'COMPANY', 'PERSONAL'
      // isAdvancePayment: true when paying EMI before its due date month starts (collect principal only)

      // Run EMI and User queries in parallel for faster response
      const [emiResult, userResult] = await Promise.all([
        db.offlineLoanEMI.findUnique({
          where: { id: emiId },
          include: { offlineLoan: true }
        }),
        db.user.findUnique({
          where: { id: userId },
          select: { id: true, credit: true, companyCredit: true, personalCredit: true, role: true, name: true }
        })
      ]);

      const emi = emiResult;
      const user = userResult;

      if (!emi) {
        return NextResponse.json({ error: 'EMI not found' }, { status: 404 });
      }

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // ============ MIRROR LOAN CHECK ============
      // Mirror loans cannot be paid directly - they sync from original loan
      
      // Check 1: Check if the loan itself is marked as mirror loan
      if (emi.offlineLoan.isMirrorLoan) {
        return NextResponse.json({
          error: 'Cannot pay mirror loan directly',
          message: 'This is a MIRROR LOAN (READ-ONLY). Payments are automatically synced from the original loan. Please make payments on the original loan instead.',
          originalLoanId: emi.offlineLoan.originalLoanId,
          isMirrorLoan: true
        }, { status: 400 });
      }
      
      // Check 2: Check via mapping (fallback for older loans)
      const mirrorLoanCheck = await db.mirrorLoanMapping.findFirst({
        where: { mirrorLoanId: emi.offlineLoanId }
      });

      if (mirrorLoanCheck) {
        return NextResponse.json({
          error: 'Cannot pay mirror loan directly',
          message: 'This is a MIRROR LOAN. Payments are automatically synced from the original loan. Please make payments on the original loan instead.',
          originalLoanId: mirrorLoanCheck.originalLoanId,
          isMirrorLoan: true
        }, { status: 400 });
      }

      // Check if payment type is allowed for this loan
      if (paymentType === 'INTEREST_ONLY' && emi.offlineLoan.allowInterestOnly === false) {
        return NextResponse.json({ error: 'Interest-only payments are not allowed for this loan' }, { status: 400 });
      }
      if (paymentType === 'PARTIAL' && emi.offlineLoan.allowPartialPayment === false) {
        return NextResponse.json({ error: 'Partial payments are not allowed for this loan' }, { status: 400 });
      }

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

      console.log(`[EMI Payment] EMI #${emi.installmentNumber} Due: ${emiDueDate.toISOString().split('T')[0]}, Current: ${currentDate.toISOString().split('T')[0]}, Is Advance: ${isEmiAdvancePayment}`);

      // Store previous state for undo
      const previousState = {
        paidAmount: emi.paidAmount,
        paidPrincipal: emi.paidPrincipal,
        paidInterest: emi.paidInterest,
        paymentStatus: emi.paymentStatus
      };

      let paidPrincipal = emi.paidPrincipal || 0;
      let paidInterest = emi.paidInterest || 0;
      let paidAmount = emi.paidAmount || 0;
      let paymentStatus = emi.paymentStatus;
      const now = new Date();

      // Calculate based on payment type
      if (paymentType === 'FULL' || paymentType === 'ADVANCE') {
        // ============ ADVANCE PAYMENT LOGIC ============
        // If EMI is being paid before its due date month: COLLECT PRINCIPAL ONLY
        // If EMI is being paid in/past due date month: COLLECT PRINCIPAL + INTEREST
        if (isAdvancePayment === true || isEmiAdvancePayment) {
          // ADVANCE PAYMENT - Principal Only
          paidPrincipal = emi.principalAmount;
          paidInterest = 0; // No interest for advance payment
          paidAmount = emi.principalAmount;
          paymentStatus = 'PAID';
          console.log(`[EMI Payment] ADVANCE payment - Principal only: ₹${paidPrincipal}`);
        } else {
          // REGULAR FULL PAYMENT
          paidAmount = emi.totalAmount;
          paidPrincipal = emi.principalAmount;
          paidInterest = emi.interestAmount;
          paymentStatus = 'PAID';
          console.log(`[EMI Payment] FULL payment - Principal: ₹${paidPrincipal}, Interest: ₹${paidInterest}`);
        }
      } else if (paymentType === 'PARTIAL') {
        // Partial payment - distribute proportionally
        const remainingAmount = emi.totalAmount - paidAmount;
        const paymentRatio = amount / remainingAmount;
        paidPrincipal += emi.principalAmount * paymentRatio;
        paidInterest += emi.interestAmount * paymentRatio;
        paidAmount += amount;
        paymentStatus = paidAmount >= emi.totalAmount ? 'PAID' : 'PARTIALLY_PAID';
      } else if (paymentType === 'INTEREST_ONLY') {
        // Interest-only payment: collect interest, defer full EMI to end
        paidInterest = emi.interestAmount;
        paidAmount = emi.interestAmount;
        paidPrincipal = 0; // Principal is NOT paid
        paymentStatus = 'INTEREST_ONLY_PAID';
        // Note: A new deferred EMI will be created at the end of the schedule
      }

      const paymentAmount = amount || emi.totalAmount;
      
      // For interest-only, the payment amount is just the interest
      const actualPaymentAmount = paymentType === 'INTEREST_ONLY' ? emi.interestAmount : paymentAmount;
      
      // ============ CHECK IF THIS IS AN EXTRA EMI (MIRROR LOAN) ============
      // Extra EMIs always go to PERSONAL credit - not company credit
      const mirrorMappingCheck = await db.mirrorLoanMapping.findFirst({
        where: { originalLoanId: emi.offlineLoanId }
      });
      
      const isExtraEMI = mirrorMappingCheck && emi.installmentNumber > mirrorMappingCheck.mirrorTenure;
      
      // Update credit based on credit type selection
      // EXTRA EMIs always go to PERSONAL credit
      let creditUpdateData: any = {};
      let creditTypeUsed = creditType || 'COMPANY';
      
      // Force PERSONAL credit for extra EMIs
      if (isExtraEMI) {
        creditTypeUsed = 'PERSONAL';
        console.log(`[EMI Payment] EMI #${emi.installmentNumber} is EXTRA EMI - forcing PERSONAL credit`);
      }
      
      if (creditTypeUsed === 'COMPANY') {
        const newCompanyCredit = (user.companyCredit || 0) + actualPaymentAmount;
        creditUpdateData = { companyCredit: newCompanyCredit };
      } else {
        const newPersonalCredit = (user.personalCredit || 0) + actualPaymentAmount;
        creditUpdateData = { personalCredit: newPersonalCredit };
      }

      // Get company's default bank account if not provided
      let targetBankAccountId = bankAccountId;
      if (!targetBankAccountId && emi.offlineLoan.companyId) {
        const defaultBank = await db.bankAccount.findFirst({
          where: { companyId: emi.offlineLoan.companyId, isDefault: true }
        });
        if (defaultBank) {
          targetBankAccountId = defaultBank.id;
        }
      }

      // Process bank transaction for CASH payments (updates bank balance)
      let bankTransactionResult: Awaited<ReturnType<typeof processBankTransaction>> | null = null;
      if (paymentMode === 'CASH' && targetBankAccountId && emi.offlineLoan.companyId) {
        try {
          bankTransactionResult = await processBankTransaction({
            bankAccountId: targetBankAccountId,
            transactionType: 'EMI_PAYMENT',
            amount: actualPaymentAmount,
            description: `EMI #${emi.installmentNumber} collected for ${emi.offlineLoan.loanNumber} - ${paymentType}${paymentType === 'INTEREST_ONLY' ? ' (Interest Only - EMI Deferred)' : ''}`,
            referenceType: 'OFFLINE_EMI',
            referenceId: emiId,
            createdById: userId,
            companyId: emi.offlineLoan.companyId,
            loanId: emi.offlineLoanId,
            customerId: emi.offlineLoan.customerId || undefined,
            principalComponent: paidPrincipal,
            interestComponent: paidInterest,
            paymentMode: paymentMode || 'CASH',
            bankRefNumber: paymentReference
          });
        } catch (bankError) {
          console.error('Bank transaction failed (continuing without):', bankError);
          // Continue without bank transaction - don't fail the EMI payment
        }
      }

      // ============ PARTIAL PAYMENT - ONLY CURRENT EMI DATE CHANGES ============
      // When customer makes PARTIAL payment with a remaining payment date:
      // Only the current EMI's nextPaymentDate is updated
      // Subsequent EMIs dates remain UNCHANGED as per new requirement
      // Example: EMI 1 due Jan 1, partial paid on Jan 5
      //          → EMI 1's nextPaymentDate set to Jan 5
      //          → EMI 2 due date remains Feb 1 (unchanged)
      if (paymentType === 'PARTIAL' && remainingPaymentDate) {
        console.log(`[Partial Payment Offline] Processing for EMI #${emi.installmentNumber}`);
        console.log(`[Partial Payment Offline] Remaining payment date: ${remainingPaymentDate}`);
        console.log(`[Partial Payment Offline] Subsequent EMI dates will NOT be changed.`);

        // The current EMI's nextPaymentDate is already updated in the EMI record
        // No need to shift subsequent EMIs
      }

      // ============ INTEREST ONLY - PYRAMID METHOD ============
      // When customer pays ONLY INTEREST on EMI:
      // 1. Create NEW EMI with unpaid principal + new interest at next position
      // 2. Shift all subsequent EMIs by 1 position
      let deferredEMI: Awaited<ReturnType<typeof db.offlineLoanEMI.create>> | null = null;
      if (paymentType === 'INTEREST_ONLY') {
        console.log(`[Interest Only Offline] Processing for EMI #${emi.installmentNumber}`);

        // Get the due date day pattern from first pending EMI (consistent across all EMIs)
        const firstPendingEmi = await db.offlineLoanEMI.findFirst({
          where: {
            offlineLoanId: emi.offlineLoanId,
            paymentStatus: 'PENDING'
          },
          orderBy: { installmentNumber: 'asc' },
          select: { installmentNumber: true, dueDate: true }
        });
        const dueDateDay = firstPendingEmi?.dueDate?.getDate() || emi.dueDate.getDate() || 15;
        console.log(`[Interest Only Offline] Due date pattern: Day ${dueDateDay} of each month`);

        // New EMI's due date = Current EMI's due date + 1 month
        const newEmiDueDate = new Date(emi.dueDate);
        newEmiDueDate.setMonth(newEmiDueDate.getMonth() + 1);
        newEmiDueDate.setDate(dueDateDay);

        // Get all subsequent EMIs and shift them (DESCENDING order to avoid unique constraint violations)
        const subsequentEmis = await db.offlineLoanEMI.findMany({
          where: {
            offlineLoanId: emi.offlineLoanId,
            installmentNumber: { gt: emi.installmentNumber }
          },
          orderBy: { installmentNumber: 'desc' }
        });

        console.log(`[Interest Only Offline] Found ${subsequentEmis.length} subsequent EMIs to shift`);

        // Shift all subsequent EMIs by 1 in PARALLEL using a transaction (much faster than sequential)
        // We need to use raw SQL for batch update with dynamic values
        if (subsequentEmis.length > 0) {
          await db.$transaction(
            subsequentEmis.map(subsequentEmi => {
              const shiftedDueDate = new Date(subsequentEmi.dueDate);
              shiftedDueDate.setMonth(shiftedDueDate.getMonth() + 1);
              shiftedDueDate.setDate(dueDateDay);
              
              return db.offlineLoanEMI.update({
                where: { id: subsequentEmi.id },
                data: {
                  installmentNumber: subsequentEmi.installmentNumber + 1,
                  dueDate: shiftedDueDate,
                  originalDueDate: subsequentEmi.originalDueDate || subsequentEmi.dueDate
                }
              });
            })
          );
          console.log(`[Interest Only Offline] Shifted ${subsequentEmis.length} EMIs in parallel`);
        }

        // ============ CREATE NEW EMI (SAME LOGIC AS ONLINE LOAN) ============
        // The NEW EMI contains:
        // - Principal: Same as original EMI's principal (deferred, not paid)
        // - Interest: Same as original EMI's interest (customer already paid this, but it's part of the new EMI)
        // - Total: Principal + Interest (same as original EMI total)
        // 
        // Example: Original EMI #1 has Principal ₹8,000 + Interest ₹2,000 = Total ₹10,000
        // Customer pays Interest Only ₹2,000
        // NEW EMI #2 created with Principal ₹8,000 + Interest ₹2,000 = Total ₹10,000
        // (The interest in NEW EMI is the SAME as original, not recalculated)
        
        const deferredPrincipal = emi.principalAmount;
        const deferredInterest = emi.interestAmount; // SAME interest as original EMI (not recalculated)
        const newEmiTotalAmount = deferredPrincipal + deferredInterest; // Same as original EMI total

        // Create NEW EMI at the position right after the interest-paid EMI
        deferredEMI = await db.offlineLoanEMI.create({
          data: {
            offlineLoanId: emi.offlineLoanId,
            installmentNumber: emi.installmentNumber + 1, // Position after interest-paid EMI
            dueDate: newEmiDueDate,
            principalAmount: deferredPrincipal,
            interestAmount: deferredInterest,
            totalAmount: newEmiTotalAmount,
            outstandingPrincipal: emi.outstandingPrincipal,
            paymentStatus: 'PENDING',
            isDeferred: true,
            deferredFromEMI: emi.installmentNumber,
            notes: `[NEW EMI] Created from EMI #${emi.installmentNumber} (Interest Only Payment). Due: ${newEmiDueDate.toISOString().split('T')[0]} (EMI #${emi.installmentNumber} due + 1 month). Principal: ₹${deferredPrincipal}, Interest: ₹${deferredInterest}, Total: ₹${newEmiTotalAmount}`
          }
        });
        console.log(`[Interest Only Offline] Created NEW EMI #${deferredEMI.installmentNumber} with Due: ${newEmiDueDate.toISOString().split('T')[0]}, Principal: ₹${deferredPrincipal}, Interest: ₹${deferredInterest}, Total: ₹${newEmiTotalAmount}`);
      }

      // Update EMI and add credit
      const [updatedEmi] = await db.$transaction([
        db.offlineLoanEMI.update({
          where: { id: emiId },
          data: {
            paidAmount,
            paidPrincipal,
            paidInterest,
            paymentStatus,
            paidDate: now,
            paymentMode,
            paymentReference,
            collectedById: userId,
            collectedByName: user.name,
            collectedAt: now,
            // For partial payment, update the EMI's due date to the new payment date
            // ONLY this EMI's date changes - subsequent EMIs remain unchanged
            ...(paymentType === 'PARTIAL' && remainingPaymentDate ? {
              dueDate: new Date(remainingPaymentDate),  // Update the actual due date
              nextPaymentDate: new Date(remainingPaymentDate),
              isPartialPayment: true,
              remainingAmount: emi.totalAmount - paidAmount
            } : {})
          }
        }),
        db.user.update({
          where: { id: userId },
          data: creditUpdateData
        }),
        db.creditTransaction.create({
          data: {
            userId,
            transactionType: 'CREDIT_INCREASE',
            amount: paymentAmount,
            paymentMode: paymentMode || 'CASH',
            creditType: creditTypeUsed,
            companyBalanceAfter: creditTypeUsed === 'COMPANY' ? (user.companyCredit || 0) + paymentAmount : user.companyCredit,
            personalBalanceAfter: creditTypeUsed === 'PERSONAL' ? (user.personalCredit || 0) + paymentAmount : user.personalCredit,
            balanceAfter: (user.credit || 0) + paymentAmount,
            sourceType: 'EMI_PAYMENT',
            sourceId: emi.id,
            description: `EMI #${emi.installmentNumber} collected for ${emi.offlineLoan.loanNumber} (${creditTypeUsed} credit)`,
            loanApplicationNo: emi.offlineLoan.loanNumber,
            emiDueDate: emi.dueDate,
            emiAmount: emi.totalAmount,
            principalComponent: paidPrincipal,
            interestComponent: paidInterest,
            collectedFrom: emi.offlineLoan.customerName,
            collectedFromPhone: emi.offlineLoan.customerPhone
          }
        }),
        // Log action for undo
        db.actionLog.create({
          data: {
            userId,
            userRole: user.role,
            actionType: 'PAY',
            module: 'EMI_PAYMENT',
            recordId: emiId,
            recordType: 'OfflineLoanEMI',
            previousData: JSON.stringify(previousState),
            newData: JSON.stringify({
              paidAmount,
              paidPrincipal,
              paidInterest,
              paymentStatus,
              paymentAmount,
              collectorId: userId,
              collectorName: user.name,
              paymentMode,
              bankTransactionId: bankTransactionResult?.bankTransactionId
            }),
            description: `Collected EMI #${emi.installmentNumber} for ${emi.offlineLoan.loanNumber}`,
            canUndo: true
          }
        })
      ]);

      // ============================================
      // RECORD ACCOUNTING ENTRIES FOR MIRROR LOANS
      // ============================================
      // Rules:
      // 1. EMIs within mirror tenure: Mirror EMI → Mirror company, Difference → Original company (C3)
      // 2. EXTRA EMIs: Entire amount → Original company (C3)
      // ============================================
      try {
        // Get Company 3 ID for personal credit
        const company3Id = await getCompany3Id();
        
        // Check if this is a mirror loan (has mirror mapping)
        const mirrorMappingForAccounting = await db.mirrorLoanMapping.findFirst({
          where: { originalLoanId: emi.offlineLoanId, isOfflineLoan: true }
        });
        
        if (company3Id && emi.offlineLoan.companyId) {
          const isMirrorLoan = !!mirrorMappingForAccounting;
          const isExtraEMI = mirrorMappingForAccounting && emi.installmentNumber > mirrorMappingForAccounting.mirrorTenure;
          
          if (isMirrorLoan && !isExtraEMI && mirrorMappingForAccounting?.mirrorLoanId) {
            // ============ MIRROR EMI (within mirror tenure) ============
            // Get the mirror EMI to know the mirror amount
            const mirrorEmiForAccounting = await db.offlineLoanEMI.findFirst({
              where: {
                offlineLoanId: mirrorMappingForAccounting.mirrorLoanId,
                installmentNumber: emi.installmentNumber
              }
            });
            
            if (mirrorEmiForAccounting) {
              const mirrorEMIAmount = mirrorEmiForAccounting.totalAmount;
              const originalEMIAmount = actualPaymentAmount;
              const differenceAmount = Math.max(0, originalEMIAmount - mirrorEMIAmount);
              
              console.log(`[Accounting] MIRROR EMI #${emi.installmentNumber}`);
              console.log(`[Accounting] Original EMI: ₹${originalEMIAmount}, Mirror EMI: ₹${mirrorEMIAmount}, Difference: ₹${differenceAmount}`);
              
              // Entry 1: Mirror EMI amount → Mirror company cashbook
              await recordEMIPaymentAccounting({
                amount: mirrorEMIAmount,
                principalComponent: mirrorEmiForAccounting.principalAmount,
                interestComponent: mirrorEmiForAccounting.interestAmount,
                paymentMode: paymentMode || 'CASH',
                paymentType: paymentType || 'FULL',
                creditType: creditTypeUsed as 'PERSONAL' | 'COMPANY',
                loanCompanyId: emi.offlineLoan.companyId,
                company3Id,
                loanId: emi.offlineLoanId,
                emiId: emi.id,
                paymentId: updatedEmi.id,
                loanNumber: emi.offlineLoan.loanNumber,
                installmentNumber: emi.installmentNumber,
                userId,
                mirrorLoanId: mirrorMappingForAccounting.mirrorLoanId,
                mirrorPrincipal: mirrorEmiForAccounting.principalAmount,
                mirrorInterest: mirrorEmiForAccounting.interestAmount,
                mirrorCompanyId: mirrorMappingForAccounting.mirrorCompanyId,
                isMirrorPayment: true // This tells accounting to use MIRROR company's books
              });
              
              console.log(`[Accounting] Entry 1: ₹${mirrorEMIAmount} → Mirror Company (${mirrorMappingForAccounting.mirrorCompanyId}) cashbook`);
              
              // Entry 2: Difference amount → Original company (C3) cashbook
              if (differenceAmount > 0) {
                await recordCashBookEntry({
                  companyId: emi.offlineLoan.companyId, // Original company (C3)
                  entryType: 'CREDIT',
                  amount: differenceAmount,
                  description: `EMI Difference #${emi.installmentNumber} - ${emi.offlineLoan.loanNumber} (Extra interest profit)`,
                  referenceType: 'MIRROR_EMI_DIFFERENCE',
                  referenceId: updatedEmi.id,
                  createdById: userId
                });
                
                console.log(`[Accounting] Entry 2: ₹${differenceAmount} → Original Company (${emi.offlineLoan.companyId}) cashbook as difference`);
              }
            } else {
              console.warn('[Accounting] Mirror EMI not found - using original company');
              await recordEMIPaymentAccounting({
                amount: actualPaymentAmount,
                principalComponent: paidPrincipal,
                interestComponent: paidInterest,
                paymentMode: paymentMode || 'CASH',
                paymentType: paymentType || 'FULL',
                creditType: creditTypeUsed as 'PERSONAL' | 'COMPANY',
                loanCompanyId: emi.offlineLoan.companyId,
                company3Id,
                loanId: emi.offlineLoanId,
                emiId: emi.id,
                paymentId: updatedEmi.id,
                loanNumber: emi.offlineLoan.loanNumber,
                installmentNumber: emi.installmentNumber,
                userId
              });
            }
          } else if (isExtraEMI) {
            // ============ EXTRA EMI (beyond mirror tenure) ============
            // Entire amount goes to Original company (C3)
            console.log(`[Accounting] EXTRA EMI #${emi.installmentNumber} - Entire ₹${actualPaymentAmount} → Original Company cashbook`);
            
            await recordCashBookEntry({
              companyId: emi.offlineLoan.companyId, // Original company (C3)
              entryType: 'CREDIT',
              amount: actualPaymentAmount,
              description: `EXTRA EMI #${emi.installmentNumber} - ${emi.offlineLoan.loanNumber} (Beyond mirror tenure - full profit)`,
              referenceType: 'EXTRA_EMI_PAYMENT',
              referenceId: updatedEmi.id,
              createdById: userId
            });
          } else {
            // ============ REGULAR EMI (no mirror loan) ============
            await recordEMIPaymentAccounting({
              amount: actualPaymentAmount,
              principalComponent: paidPrincipal,
              interestComponent: paidInterest,
              paymentMode: paymentMode || 'CASH',
              paymentType: paymentType || 'FULL',
              creditType: creditTypeUsed as 'PERSONAL' | 'COMPANY',
              loanCompanyId: emi.offlineLoan.companyId,
              company3Id,
              loanId: emi.offlineLoanId,
              emiId: emi.id,
              paymentId: updatedEmi.id,
              loanNumber: emi.offlineLoan.loanNumber,
              installmentNumber: emi.installmentNumber,
              userId
            });
            
            console.log(`[Accounting] Regular EMI #${emi.installmentNumber} - ₹${actualPaymentAmount} → Company cashbook`);
          }
          
          console.log(`[Accounting] Recorded EMI payment accounting - Credit: ${creditTypeUsed}, Mode: ${paymentMode}`);
        } else {
          console.warn('[Accounting] Company 3 or loan company not found - skipping accounting');
        }
      } catch (accountingError) {
        // Log but don't fail the payment
        console.error('[Accounting] Failed to record accounting entry:', accountingError);
      }

      // Check if all EMIs are paid
      const allEmis = await db.offlineLoanEMI.findMany({
        where: { offlineLoanId: emi.offlineLoanId }
      });

      // All EMIs must be fully paid (PAID or INTEREST_ONLY_PAID counts as paid)
      const allPaid = allEmis.every(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID');

      console.log(`[Offline Loan] Checking if all EMIs paid for loan ${emi.offlineLoanId}: ${allPaid}`);
      console.log(`[Offline Loan] EMI Statuses: ${allEmis.map(e => `${e.installmentNumber}:${e.paymentStatus}`).join(', ')}`);

      if (allPaid) {
        console.log(`[Offline Loan] Marking loan ${emi.offlineLoanId} as CLOSED`);
        await db.offlineLoan.update({
          where: { id: emi.offlineLoanId },
          data: { status: 'CLOSED', closedAt: new Date() }
        });
      }

      // ============ MIRROR LOAN SYNC (SAME AS ONLINE LOANS) ============
      // When EMI is paid on original loan, sync to mirror loan
      // Mirror loan now EXISTS as a separate OfflineLoan record
      const mirrorMapping = await db.mirrorLoanMapping.findFirst({
        where: { originalLoanId: emi.offlineLoanId, isOfflineLoan: true }
      });

      if (mirrorMapping && mirrorMapping.mirrorLoanId) {
        console.log(`[Mirror Sync] Original loan ${emi.offlineLoanId} has mirror loan ${mirrorMapping.mirrorLoanId}`);

        // Find the corresponding EMI in mirror loan
        const mirrorEmi = await db.offlineLoanEMI.findFirst({
          where: {
            offlineLoanId: mirrorMapping.mirrorLoanId,
            installmentNumber: emi.installmentNumber
          }
        });

        if (mirrorEmi && mirrorEmi.paymentStatus === 'PENDING') {
          // Check if this is within the mirror tenure (not an extra EMI)
          if (emi.installmentNumber <= mirrorMapping.mirrorTenure) {
            // Sync the payment to mirror loan EMI
            await db.offlineLoanEMI.update({
              where: { id: mirrorEmi.id },
              data: {
                paymentStatus: 'PAID',
                paidAmount: mirrorEmi.totalAmount,
                paidPrincipal: mirrorEmi.principalAmount,
                paidInterest: mirrorEmi.interestAmount,
                paidDate: now,
                paymentMode: paymentMode,
                paymentReference: `Synced from original loan EMI #${emi.installmentNumber}`,
                collectedById: userId,
                collectedByName: user.name,
                collectedAt: now,
                notes: `[MIRROR SYNC] Auto-paid from original loan EMI #${emi.installmentNumber}`
              }
            });

            // Update mirror EMIs paid count
            await db.mirrorLoanMapping.update({
              where: { id: mirrorMapping.id },
              data: {
                mirrorEMIsPaid: { increment: 1 }
              }
            });

            console.log(`[Mirror Sync] Synced EMI #${emi.installmentNumber} to mirror loan ${mirrorMapping.mirrorLoanId}`);
          } else {
            // This is an EXTRA EMI - goes to personal credit of Company 3 (already handled above)
            console.log(`[Mirror Sync] EMI #${emi.installmentNumber} is EXTRA EMI (beyond mirror tenure ${mirrorMapping.mirrorTenure})`);

            // Update extra EMIs paid count
            await db.mirrorLoanMapping.update({
              where: { id: mirrorMapping.id },
              data: {
                extraEMIsPaid: { increment: 1 },
                totalProfitReceived: { increment: actualPaymentAmount }
              }
            });

            console.log(`[Mirror Sync] Extra EMI #${emi.installmentNumber} - profit ₹${actualPaymentAmount} recorded for Company 3`);
          }
        } else if (!mirrorEmi) {
          console.log(`[Mirror Sync] No corresponding EMI #${emi.installmentNumber} in mirror loan - this is expected for extra EMIs`);

          // This is an EXTRA EMI - update the count
          await db.mirrorLoanMapping.update({
            where: { id: mirrorMapping.id },
            data: {
              extraEMIsPaid: { increment: 1 },
              totalProfitReceived: { increment: actualPaymentAmount }
            }
          });
        }

        // Check if mirror loan is complete
        const mirrorEmisPaid = await db.offlineLoanEMI.count({
          where: {
            offlineLoanId: mirrorMapping.mirrorLoanId,
            paymentStatus: 'PAID'
          }
        });

        if (mirrorEmisPaid >= mirrorMapping.mirrorTenure) {
          console.log(`[Mirror Sync] Mirror loan ${mirrorMapping.mirrorLoanId} is complete!`);

          // Mark mirror loan as closed
          await db.offlineLoan.update({
            where: { id: mirrorMapping.mirrorLoanId },
            data: { status: 'CLOSED', closedAt: new Date() }
          });

          // Update mirror completed timestamp
          await db.mirrorLoanMapping.update({
            where: { id: mirrorMapping.id },
            data: { mirrorCompletedAt: new Date() }
          });
        }
      }

      return NextResponse.json({
        success: true,
        emi: updatedEmi,
        creditAdded: actualPaymentAmount,  // Use actualPaymentAmount for correct interest-only amount
        creditType: creditTypeUsed,
        newCompanyCredit: creditTypeUsed === 'COMPANY' ? (user.companyCredit || 0) + actualPaymentAmount : user.companyCredit,
        newPersonalCredit: creditTypeUsed === 'PERSONAL' ? (user.personalCredit || 0) + actualPaymentAmount : user.personalCredit,
        bankTransaction: bankTransactionResult ? {
          id: bankTransactionResult.bankTransactionId,
          balanceAfter: bankTransactionResult.balanceAfter
        } : null,
        mirrorSynced: mirrorMapping ? true : false
      });
    }

    // Update loan status
    if (action === 'update-status' && loanId) {
      const { status } = body;

      const loan = await db.offlineLoan.update({
        where: { id: loanId },
        data: { status }
      });

      return NextResponse.json({ success: true, loan });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Offline loan update error:', error);
    return NextResponse.json({ error: 'Failed to update offline loan' }, { status: 500 });
  }
}

// DELETE - Delete offline loan (SuperAdmin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');
    const userRole = searchParams.get('userRole');
    const force = searchParams.get('force') === 'true'; // Force delete even with paid EMIs

    if (!loanId) {
      return NextResponse.json({ error: 'Loan ID is required' }, { status: 400 });
    }

    // Only SuperAdmin can delete
    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only SuperAdmin can delete offline loans' }, { status: 403 });
    }

    // Get loan details before deletion
    const loan = await db.offlineLoan.findUnique({
      where: { id: loanId },
      include: {
        emis: true
      }
    });

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Check if any EMIs are paid
    const paidEmis = loan.emis.filter(e => e.paymentStatus === 'PAID').length;

    if (paidEmis > 0 && !force) {
      return NextResponse.json({
        error: `Cannot delete loan with ${paidEmis} paid EMI(s). Use force=true to override.`,
        hasPaidEMIs: true,
        paidEMICount: paidEmis
      }, { status: 400 });
    }

    // ==========================================
    // DELETE ACCOUNTING ENTRIES FIRST
    // ==========================================
    const accountingReferenceTypes = [
      'EMI_PAYMENT_PERSONAL',
      'EMI_PAYMENT_ONLINE', 
      'EMI_PAYMENT_CASH',
      'MIRROR_EMI_PAYMENT',
      'EXTRA_EMI_PAYMENT',
      'LOAN_DISBURSEMENT',
      'EMI_PAYMENT',
      'OFFLINE_LOAN',
      'OFFLINE_EMI'
    ];

    // Delete CashBook entries for the loan
    try {
      const deletedCashEntries = await db.cashBookEntry.deleteMany({
        where: {
          referenceId: loanId,
          referenceType: { in: accountingReferenceTypes }
        }
      });
      console.log(`[DELETE OFFLINE LOAN] Deleted ${deletedCashEntries.count} CashBook entries for loan`);
    } catch (e) {
      console.error('[DELETE OFFLINE LOAN] Error deleting CashBook entries:', e);
    }

    // Delete Bank transactions for the loan
    try {
      const deletedBankTxns = await db.bankTransaction.deleteMany({
        where: {
          referenceId: loanId,
          referenceType: { in: accountingReferenceTypes }
        }
      });
      console.log(`[DELETE OFFLINE LOAN] Deleted ${deletedBankTxns.count} Bank transactions for loan`);
    } catch (e) {
      console.error('[DELETE OFFLINE LOAN] Error deleting Bank transactions:', e);
    }

    // Delete accounting entries for all EMIs
    const emiIds = loan.emis.map(e => e.id);
    if (emiIds.length > 0) {
      try {
        // Delete CashBook entries for EMIs
        const deletedEmiCash = await db.cashBookEntry.deleteMany({
          where: {
            referenceId: { in: emiIds },
            referenceType: { in: accountingReferenceTypes }
          }
        });
        console.log(`[DELETE OFFLINE LOAN] Deleted ${deletedEmiCash.count} CashBook entries for EMIs`);

        // Delete Bank transactions for EMIs
        const deletedEmiBank = await db.bankTransaction.deleteMany({
          where: {
            referenceId: { in: emiIds },
            referenceType: { in: accountingReferenceTypes }
          }
        });
        console.log(`[DELETE OFFLINE LOAN] Deleted ${deletedEmiBank.count} Bank transactions for EMIs`);
      } catch (e) {
        console.error('[DELETE OFFLINE LOAN] Error deleting EMI accounting entries:', e);
      }
    }

    // Delete Credit Transactions for this loan
    try {
      const deletedCreditTxns = await db.creditTransaction.deleteMany({
        where: { sourceId: loanId }
      });
      console.log(`[DELETE OFFLINE LOAN] Deleted ${deletedCreditTxns.count} Credit transactions`);
    } catch (e) {
      console.error('[DELETE OFFLINE LOAN] Error deleting Credit transactions:', e);
    }

    // Delete EMIs
    await db.offlineLoanEMI.deleteMany({
      where: { offlineLoanId: loanId }
    });

    // Delete loan
    await db.offlineLoan.delete({
      where: { id: loanId }
    });

    // Log action for undo (soft delete approach - can restore)
    await db.actionLog.create({
      data: {
        userId: searchParams.get('userId') || 'system',
        userRole: userRole,
        actionType: 'DELETE',
        module: 'OFFLINE_LOAN',
        recordId: loanId,
        recordType: 'OfflineLoan',
        previousData: JSON.stringify(loan),
        description: `Deleted offline loan ${loan?.loanNumber}${paidEmis > 0 ? ` (with ${paidEmis} paid EMIs)` : ''}`,
        canUndo: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Loan ${loan.loanNumber} deleted successfully${paidEmis > 0 ? ` (including ${paidEmis} paid EMIs)` : ''}`
    });
  } catch (error) {
    console.error('Offline loan delete error:', error);
    return NextResponse.json({ error: 'Failed to delete offline loan' }, { status: 500 });
  }
}
