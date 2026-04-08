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
      let mirrorMappingAsOriginal = await db.mirrorLoanMapping.findFirst({
        where: { originalLoanId: loanId, isOfflineLoan: true },
        include: {
          mirrorCompany: { select: { id: true, name: true, code: true } }
        }
      });
      
      // If no mapping found, check if there's a mirror loan directly via originalLoanId field
      // This handles the case where the mapping wasn't created but the mirror loan exists
      let mirrorLoanDirect: {
        id: string;
        loanNumber: string;
        tenure: number;
        interestRate: number;
        companyId: string | null;
        displayColor: string | null;
        company: { id: string; name: string; code: string } | null;
      } | null = null;
      if (!mirrorMappingAsOriginal) {
        mirrorLoanDirect = await db.offlineLoan.findFirst({
          where: { 
            originalLoanId: loanId,
            isMirrorLoan: true 
          },
          include: {
            company: { select: { id: true, name: true, code: true } }
          }
        });
        
        if (mirrorLoanDirect) {
          console.log(`[Offline Loan] Found mirror loan ${mirrorLoanDirect.id} via originalLoanId field (no mapping table entry)`);
        }
      }

      // Check if this loan is a mirror loan (is the mirror of another loan)
      // For offline loans, check both the mapping AND the isMirrorLoan field on the loan
      const mirrorMappingAsMirror = await db.mirrorLoanMapping.findFirst({
        where: { mirrorLoanId: loanId },
        include: {
          originalCompany: { select: { id: true, name: true, code: true } }
        }
      });

      // Determine if this is a mirror loan - check both the loan field and mapping
      const isMirrorLoan = loan.isMirrorLoan || !!mirrorMappingAsMirror;
      const isMirrored = !!mirrorMappingAsOriginal || !!mirrorLoanDirect; // This is original, has a mirror

      // Get mirror info for display - use mapping first, then direct loan
      const mirrorInfo = mirrorMappingAsOriginal || (mirrorLoanDirect ? {
        mirrorLoanId: mirrorLoanDirect.id,
        mirrorCompanyId: mirrorLoanDirect.companyId,
        mirrorCompany: mirrorLoanDirect.company,
        mirrorTenure: mirrorLoanDirect.tenure,
        mirrorInterestRate: mirrorLoanDirect.interestRate,
        displayColor: mirrorLoanDirect.displayColor || loan.displayColor,
        extraEMICount: Math.max(0, loan.tenure - mirrorLoanDirect.tenure)
      } : null);
      
      const displayColor = mirrorInfo?.displayColor || null;
      const mirrorTenure = mirrorInfo?.mirrorTenure || null;
      const extraEMICount = mirrorInfo?.extraEMICount || 0;
      const mirrorLoanNumber = mirrorMappingAsOriginal?.mirrorLoanNumber || mirrorLoanDirect?.loanNumber || null;
      
      // Get mirror company name for display
      const mirrorCompanyName = mirrorInfo?.mirrorCompany?.name || null;
      const mirrorCompanyCode = mirrorInfo?.mirrorCompany?.code || null;

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
          mirrorLoanNumber, // The mirror loan number stored in mapping or from direct loan
          mirrorCompanyName, // Mirror company name for UI display
          mirrorCompanyCode, // Mirror company code for UI display
          originalLoanId: mirrorMappingAsMirror?.originalLoanId || null,
          mirrorLoanId: mirrorMappingAsOriginal?.mirrorLoanId || mirrorLoanDirect?.id || null,
          mirrorCompanyId: mirrorMappingAsOriginal?.mirrorCompanyId || mirrorLoanDirect?.companyId || null,
          mirrorInterestRate: mirrorMappingAsOriginal?.mirrorInterestRate || mirrorLoanDirect?.interestRate || null
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
      extraEmiPaymentPageId,
      // Split Payment
      useSplitPayment = false,
      bankAmount = 0,
      cashAmount = 0
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

        // ============================================
        // CREATE ACCOUNTING ENTRY FOR MIRROR COMPANY
        // This ensures Loans Receivable shows in Chart of Accounts
        // 
        // IMPORTANT: Credit goes to BANK_ACCOUNT (not Owner's Capital)
        // because the money is actually deducted from mirror company's bank
        // ============================================
        try {
          const { AccountingService, ACCOUNT_CODES } = await import('@/lib/accounting-service');
          const accountingService = new AccountingService(mirrorCompanyId);
          await accountingService.initializeChartOfAccounts();

          // Create journal entry for mirror loan disbursement
          // Debit: Loans Receivable (Asset increases)
          // Credit: Bank Account (money actually left mirror company's bank)
          await accountingService.createJournalEntry({
            entryDate: new Date(disbursementDate),
            referenceType: 'MIRROR_LOAN_DISBURSEMENT',
            referenceId: mirrorLoan.id,
            narration: `Mirror Loan Disbursement - ${mirrorLoanNumber} (Mirror of ${loanNumber}) - Principal: ₹${loanAmount.toLocaleString()}`,
            lines: [
              {
                accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
                debitAmount: loanAmount,
                creditAmount: 0,
                loanId: mirrorLoan.id,
                narration: 'Mirror loan principal disbursed',
              },
              {
                // Credit Bank Account - money was actually deducted from mirror company's bank
                accountCode: ACCOUNT_CODES.BANK_ACCOUNT,
                debitAmount: 0,
                creditAmount: loanAmount,
                narration: 'Bank account debited for mirror loan disbursement',
              },
            ],
            createdById: createdById,
            paymentMode: 'BANK_TRANSFER',
            isAutoEntry: true,
          });

          console.log(`[Mirror Loan Accounting] Created journal entry for mirror loan disbursement - Loans Receivable: ₹${loanAmount}`);
        } catch (accountingError) {
          console.error('[Mirror Loan Accounting] Failed to create accounting entry:', accountingError);
          // Don't fail the loan creation
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

    // ============================================
    // DISBURSEMENT - Handle split payment or single payment
    // 
    // IMPORTANT: For MIRROR loans, disbursement is already handled above
    // in the mirror loan creation section (bank deduction + journal entry)
    // So we SKIP this section for mirror loans to avoid double-deduction
    // ============================================
    let cashbookResult: { success: boolean; cashBookId: string; newBalance: number } | null = null;

    // SKIP disbursement for mirror loans - already handled in mirror loan creation section
    if (isMirrorLoan && mirrorCompanyId) {
      console.log(`[Disbursement] SKIPPED for mirror loan - already handled in mirror loan creation section`);
    } else {
      // Regular loan - handle disbursement
      // Disbursement company is the loan's company for regular loans
      const disbursementCompanyId = companyId;
      
      try {
        if (useSplitPayment) {
        // ============================================
        // SPLIT PAYMENT - Deduct from both bank AND cash
        // ============================================
        console.log(`[Disbursement] Split Payment: Bank ₹${bankAmount}, Cash ₹${cashAmount}`);

        // 1. Handle Bank Portion
        if (bankAmount > 0) {
          const targetBankId = bankAccountId || (await db.bankAccount.findFirst({
            where: { companyId: disbursementCompanyId, isDefault: true }
          }))?.id;

          if (targetBankId) {
            const targetBank = await db.bankAccount.findUnique({
              where: { id: targetBankId },
              select: { currentBalance: true }
            });

            if (targetBank && targetBank.currentBalance >= bankAmount) {
              // Deduct from bank
              await db.bankAccount.update({
                where: { id: targetBankId },
                data: { currentBalance: targetBank.currentBalance - bankAmount }
              });

              // Create bank transaction record
              await db.bankTransaction.create({
                data: {
                  bankAccountId: targetBankId,
                  transactionType: 'DEBIT',
                  amount: bankAmount,
                  balanceAfter: targetBank.currentBalance - bankAmount,
                  description: `Offline Loan Disbursement (Bank Portion) - ${loanNumber} to ${customerName}`,
                  referenceType: 'OFFLINE_LOAN',
                  referenceId: loan.id,
                  createdById
                }
              });

              console.log(`[Disbursement] Bank deduction: ₹${bankAmount} from ${targetBankId}, New Balance: ₹${targetBank.currentBalance - bankAmount}`);
            } else {
              console.warn(`[Disbursement] WARNING: Insufficient bank balance for bank portion`);
            }
          } else {
            console.warn(`[Disbursement] WARNING: No bank account found for bank portion`);
          }
        }

        // 2. Handle Cash Portion
        if (cashAmount > 0) {
          // Import the recordCashBookEntry function
          const { recordCashBookEntry } = await import('@/lib/simple-accounting');

          cashbookResult = await recordCashBookEntry({
            companyId: disbursementCompanyId,
            entryType: 'DEBIT',
            amount: cashAmount,
            description: `Offline Loan Disbursement (Cash Portion) - ${loanNumber} to ${customerName}`,
            referenceType: 'OFFLINE_LOAN',
            referenceId: loan.id,
            createdById
          });

          console.log(`[Disbursement] Cash deduction: ₹${cashAmount}, New Cash Balance: ₹${cashbookResult?.newBalance}`);
        }

      } else {
        // ============================================
        // SINGLE PAYMENT - Deduct from bank OR cash
        // ============================================
        console.log(`[Disbursement] Single Payment Mode: ${disbursementMode}, Amount: ₹${loanAmount}`);

        if (disbursementMode === 'CASH') {
          // Deduct from cashbook
          const { recordCashBookEntry } = await import('@/lib/simple-accounting');

          cashbookResult = await recordCashBookEntry({
            companyId: disbursementCompanyId,
            entryType: 'DEBIT',
            amount: loanAmount,
            description: `Offline Loan Disbursement - ${loanNumber} to ${customerName}`,
            referenceType: 'OFFLINE_LOAN',
            referenceId: loan.id,
            createdById
          });

          console.log(`[Disbursement] Cash deduction: ₹${loanAmount}, New Cash Balance: ₹${cashbookResult?.newBalance}`);
        } else {
          // Deduct from bank
          const targetBankId = bankAccountId || (await db.bankAccount.findFirst({
            where: { companyId: disbursementCompanyId, isDefault: true }
          }))?.id;

          if (targetBankId) {
            const targetBank = await db.bankAccount.findUnique({
              where: { id: targetBankId },
              select: { currentBalance: true }
            });

            if (targetBank && targetBank.currentBalance >= loanAmount) {
              // Deduct from bank
              await db.bankAccount.update({
                where: { id: targetBankId },
                data: { currentBalance: targetBank.currentBalance - loanAmount }
              });

              // Create bank transaction record
              await db.bankTransaction.create({
                data: {
                  bankAccountId: targetBankId,
                  transactionType: 'DEBIT',
                  amount: loanAmount,
                  balanceAfter: targetBank.currentBalance - loanAmount,
                  description: `Offline Loan Disbursement - ${loanNumber} to ${customerName}`,
                  referenceType: 'OFFLINE_LOAN',
                  referenceId: loan.id,
                  createdById
                }
              });

              console.log(`[Disbursement] Bank deduction: ₹${loanAmount} from ${targetBankId}, New Balance: ₹${targetBank.currentBalance - loanAmount}`);
            } else {
              console.warn(`[Disbursement] WARNING: Insufficient bank balance. Available: ₹${targetBank?.currentBalance || 0}, Required: ₹${loanAmount}`);
            }
          } else {
            console.warn(`[Disbursement] WARNING: No bank account found for disbursement`);
          }
        }
      }
    } catch (disbursementError) {
      console.error('Disbursement transaction failed:', disbursementError);
      // Don't fail the loan creation if disbursement fails
    }
    } // End of else block for non-mirror loans

    // ============================================
    // CREATE ACCOUNTING ENTRIES FOR LOAN DISBURSEMENT
    // This updates the Chart of Accounts properly
    // 
    // IMPORTANT FOR MIRROR LOANS:
    // - Accounting entry is ALREADY created in mirror loan creation section above
    // - So we SKIP this section for mirror loans
    // ============================================
    
    // SKIP for mirror loans - already handled in mirror loan creation section
    if (isMirrorLoan && mirrorCompanyId) {
      console.log(`[Accounting] SKIPPED for mirror loan - already handled in mirror loan creation section`);
    } else {
      // Regular loan - create accounting entries
      try {
        const { AccountingService, ACCOUNT_CODES } = await import('@/lib/accounting-service');
        
        console.log(`[Accounting] Creating disbursement entry for company: ${companyId}`);
        
        // Create accounting entry for the company that actually disbursed the money
        const accountingService = new AccountingService(companyId);
        await accountingService.initializeChartOfAccounts();
        
        // Create journal entry: Debit Loans Receivable, Credit Cash/Bank
        await accountingService.createJournalEntry({
          entryDate: new Date(disbursementDate),
          referenceType: 'LOAN_DISBURSEMENT',
          referenceId: loan.id,
          narration: `Loan Disbursement - ${loanNumber} - ${customerName}`,
          lines: [
            {
              accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
              debitAmount: loanAmount,
              creditAmount: 0,
              loanId: loan.id,
              narration: 'Loan principal disbursed'
            },
            {
              accountCode: disbursementMode === 'CASH' ? ACCOUNT_CODES.CASH_IN_HAND : ACCOUNT_CODES.BANK_ACCOUNT,
              debitAmount: 0,
              creditAmount: loanAmount,
              narration: 'Cash/Bank paid out for loan'
            }
          ],
          createdById,
          paymentMode: disbursementMode || 'CASH',
          isAutoEntry: true
        });
        
        console.log(`[Accounting] Created journal entry for loan disbursement: ${loanNumber}, Amount: ₹${loanAmount}, Company: ${companyId}`);
      } catch (accountingError) {
        console.error('Accounting entry creation failed:', accountingError);
        // Don't fail the loan creation if accounting fails
      }
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
      disbursement: {
        useSplitPayment,
        bankAmount: useSplitPayment ? bankAmount : (disbursementMode !== 'CASH' ? loanAmount : 0),
        cashAmount: useSplitPayment ? cashAmount : (disbursementMode === 'CASH' ? loanAmount : 0),
        cashbookBalance: cashbookResult?.newBalance,
      },
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

    // Pay EMI with partial payment support - OPTIMIZED VERSION
    if (action === 'pay-emi' && emiId && userId) {
      const { paymentMode, paymentReference, amount, paymentType, bankAccountId, creditType, remainingPaymentDate, isAdvancePayment } = body;
      // paymentType: 'FULL', 'PARTIAL', 'INTEREST_ONLY', 'ADVANCE'
      // creditType: 'COMPANY', 'PERSONAL'
      // isAdvancePayment: true when paying EMI before its due date month starts (collect principal only)

      // ============ STEP 1: FETCH EMI AND USER ============
      const startTime = Date.now();
      
      const [emiResult, userResult, companies] = await Promise.all([
        db.offlineLoanEMI.findUnique({
          where: { id: emiId },
          include: { offlineLoan: true }
        }),
        db.user.findUnique({
          where: { id: userId },
          select: { id: true, credit: true, companyCredit: true, personalCredit: true, role: true, name: true }
        }),
        db.company.findMany({
          orderBy: { createdAt: 'asc' },
          take: 3,
          select: { id: true, code: true }
        })
      ]);

      const emi = emiResult;
      const user = userResult;
      const company3Id = companies.length >= 3 ? companies[2].id : null;

      if (!emi) {
        return NextResponse.json({ error: 'EMI not found' }, { status: 404 });
      }

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // ============ MIRROR LOAN CHECK ============
      if (emi.offlineLoan.isMirrorLoan) {
        return NextResponse.json({
          error: 'Cannot pay mirror loan directly',
          message: 'This is a MIRROR LOAN (READ-ONLY). Payments are automatically synced from the original loan. Please make payments on the original loan instead.',
          originalLoanId: emi.offlineLoan.originalLoanId,
          isMirrorLoan: true
        }, { status: 400 });
      }

      // Check if payment type is allowed
      if (paymentType === 'INTEREST_ONLY' && emi.offlineLoan.allowInterestOnly === false) {
        return NextResponse.json({ error: 'Interest-only payments are not allowed for this loan' }, { status: 400 });
      }
      if (paymentType === 'PARTIAL' && emi.offlineLoan.allowPartialPayment === false) {
        return NextResponse.json({ error: 'Partial payments are not allowed for this loan' }, { status: 400 });
      }

      // ============ STEP 2: FETCH ALL MIRROR/BANK DATA IN PARALLEL ============
      const [mirrorLoanMapping, mirrorLoanCheck, defaultBank] = await Promise.all([
        // Check if this loan has a mirror (original -> mirror)
        db.mirrorLoanMapping.findFirst({
          where: { originalLoanId: emi.offlineLoanId, isOfflineLoan: true },
          select: { id: true, mirrorLoanId: true, mirrorTenure: true, mirrorCompanyId: true }
        }),
        // Check if this is a mirror loan (mirror -> original)
        db.mirrorLoanMapping.findFirst({
          where: { mirrorLoanId: emi.offlineLoanId },
          select: { id: true, originalLoanId: true }
        }),
        // Get default bank
        emi.offlineLoan.companyId ? db.bankAccount.findFirst({
          where: { companyId: emi.offlineLoan.companyId, isDefault: true }
        }) : Promise.resolve(null)
      ]);

      // Mirror loan check via mapping
      if (mirrorLoanCheck) {
        return NextResponse.json({
          error: 'Cannot pay mirror loan directly',
          message: 'This is a MIRROR LOAN. Payments are automatically synced from the original loan. Please make payments on the original loan instead.',
          originalLoanId: mirrorLoanCheck.originalLoanId,
          isMirrorLoan: true
        }, { status: 400 });
      }

      console.log(`[EMI Payment] Data fetch completed in ${Date.now() - startTime}ms`);

      // ============ STEP 3: CALCULATE PAYMENT ============
      const currentDate = new Date();
      const emiDueDate = new Date(emi.dueDate);
      const isEmiAdvancePayment = currentDate.getFullYear() < emiDueDate.getFullYear() || 
        (currentDate.getFullYear() === emiDueDate.getFullYear() && currentDate.getMonth() < emiDueDate.getMonth());

      console.log(`[EMI Payment] EMI #${emi.installmentNumber} Due: ${emiDueDate.toISOString().split('T')[0]}, Is Advance: ${isEmiAdvancePayment}`);

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
        if (isAdvancePayment === true || isEmiAdvancePayment) {
          paidPrincipal = emi.principalAmount;
          paidInterest = 0;
          paidAmount = emi.principalAmount;
          paymentStatus = 'PAID';
        } else {
          paidAmount = emi.totalAmount;
          paidPrincipal = emi.principalAmount;
          paidInterest = emi.interestAmount;
          paymentStatus = 'PAID';
        }
      } else if (paymentType === 'PARTIAL') {
        const remainingAmount = emi.totalAmount - paidAmount;
        const paymentRatio = amount / remainingAmount;
        paidPrincipal += emi.principalAmount * paymentRatio;
        paidInterest += emi.interestAmount * paymentRatio;
        paidAmount += amount;
        paymentStatus = paidAmount >= emi.totalAmount ? 'PAID' : 'PARTIALLY_PAID';
      } else if (paymentType === 'INTEREST_ONLY') {
        paidInterest = emi.interestAmount;
        paidAmount = emi.interestAmount;
        paidPrincipal = 0;
        paymentStatus = 'INTEREST_ONLY_PAID';
      }

      const paymentAmount = amount || emi.totalAmount;
      const actualPaymentAmount = paymentType === 'INTEREST_ONLY' ? emi.interestAmount : paymentAmount;
      
      // Check for extra EMI
      const isExtraEMI = mirrorLoanMapping && emi.installmentNumber > mirrorLoanMapping.mirrorTenure;
      
      let creditTypeUsed = creditType || 'COMPANY';
      if (isExtraEMI) {
        creditTypeUsed = 'PERSONAL';
        console.log(`[EMI Payment] EMI #${emi.installmentNumber} is EXTRA EMI - forcing PERSONAL credit`);
      }
      
      const creditUpdateData = creditTypeUsed === 'COMPANY' 
        ? { companyCredit: (user.companyCredit || 0) + actualPaymentAmount }
        : { personalCredit: (user.personalCredit || 0) + actualPaymentAmount };

      // ============ STEP 4: PROCESS PAYMENT IN TRANSACTION ============
      const updatedEmi = await db.$transaction(async (tx) => {
        // Update EMI
        const updated = await tx.offlineLoanEMI.update({
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
            ...(paymentType === 'PARTIAL' && remainingPaymentDate ? {
              dueDate: new Date(remainingPaymentDate),
              nextPaymentDate: new Date(remainingPaymentDate),
              isPartialPayment: true,
              remainingAmount: emi.totalAmount - paidAmount
            } : {})
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
        });

        // Action log
        await tx.actionLog.create({
          data: {
            userId,
            userRole: user.role,
            actionType: 'PAY',
            module: 'EMI_PAYMENT',
            recordId: emiId,
            recordType: 'OfflineLoanEMI',
            previousData: JSON.stringify(previousState),
            newData: JSON.stringify({ paidAmount, paidPrincipal, paidInterest, paymentStatus, paymentAmount, collectorId: userId, collectorName: user.name, paymentMode }),
            description: `Collected EMI #${emi.installmentNumber} for ${emi.offlineLoan.loanNumber}`,
            canUndo: true
          }
        });

        // Handle Interest Only - create deferred EMI
        if (paymentType === 'INTEREST_ONLY') {
          const newEmiDueDate = new Date(emi.dueDate);
          newEmiDueDate.setMonth(newEmiDueDate.getMonth() + 1);
          
          await tx.offlineLoanEMI.create({
            data: {
              offlineLoanId: emi.offlineLoanId,
              installmentNumber: emi.installmentNumber + 1,
              dueDate: newEmiDueDate,
              principalAmount: emi.principalAmount,
              interestAmount: emi.interestAmount,
              totalAmount: emi.principalAmount + emi.interestAmount,
              outstandingPrincipal: emi.outstandingPrincipal,
              paymentStatus: 'PENDING',
              isDeferred: true,
              deferredFromEMI: emi.installmentNumber,
              notes: `Created from Interest Only payment on EMI #${emi.installmentNumber}`
            }
          });
        }

        // Sync to mirror loan if exists
        if (mirrorLoanMapping?.mirrorLoanId && emi.installmentNumber <= mirrorLoanMapping.mirrorTenure) {
          const mirrorEmi = await tx.offlineLoanEMI.findFirst({
            where: {
              offlineLoanId: mirrorLoanMapping.mirrorLoanId,
              installmentNumber: emi.installmentNumber
            }
          });

          if (mirrorEmi && (mirrorEmi.paymentStatus === 'PENDING' || mirrorEmi.paymentStatus === 'PARTIALLY_PAID')) {
            const isFullPayment = paymentStatus === 'PAID';
            
            if (isFullPayment) {
              await tx.offlineLoanEMI.update({
                where: { id: mirrorEmi.id },
                data: {
                  paymentStatus: 'PAID',
                  paidAmount: mirrorEmi.totalAmount,
                  paidPrincipal: mirrorEmi.principalAmount,
                  paidInterest: mirrorEmi.interestAmount,
                  paidDate: now,
                  paymentMode,
                  collectedById: userId,
                  collectedByName: user.name,
                  collectedAt: now,
                  notes: `[MIRROR SYNC] Auto-paid from original loan (FULL)`
                }
              });
            } else if (paymentStatus === 'PARTIALLY_PAID') {
              const paymentRatio = paidAmount / emi.totalAmount;
              await tx.offlineLoanEMI.update({
                where: { id: mirrorEmi.id },
                data: {
                  paymentStatus: 'PARTIALLY_PAID',
                  paidAmount: Math.round(mirrorEmi.totalAmount * paymentRatio * 100) / 100,
                  paidPrincipal: Math.round(mirrorEmi.principalAmount * paymentRatio * 100) / 100,
                  paidInterest: Math.round(mirrorEmi.interestAmount * paymentRatio * 100) / 100,
                  paidDate: now,
                  paymentMode,
                  collectedById: userId,
                  collectedByName: user.name,
                  collectedAt: now,
                  notes: `[MIRROR SYNC] Partial payment (${Math.round(paymentRatio * 100)}%)`
                }
              });
            }
          }
        }

        // Check if loan is complete
        const allEmis = await tx.offlineLoanEMI.findMany({
          where: { offlineLoanId: emi.offlineLoanId },
          select: { paymentStatus: true }
        });
        
        const allPaid = allEmis.every(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID');
        if (allPaid) {
          await tx.offlineLoan.update({
            where: { id: emi.offlineLoanId },
            data: { status: 'CLOSED', closedAt: now }
          });
        }

        return updated;
      });

      console.log(`[EMI Payment] Transaction completed in ${Date.now() - startTime}ms total`);

      // ============================================
      // COMPREHENSIVE ACCOUNTING ENTRIES
      // ============================================
      // Rules:
      // 1. NON-MIRROR LOANS:
      //    - Company Credit + ONLINE → Bank Account + Journal Entry (Interest as Income)
      //    - Company Credit + CASH → Cashbook + Journal Entry (Interest as Income)
      //    - Personal Credit → Company 3 Cashbook (always CASH)
      //
      // 2. MIRROR LOANS (within mirror tenure):
      //    - Company Credit + ONLINE → Mirror Company's Bank Account
      //    - Company Credit + CASH → Mirror Company's Cashbook
      //    - Payment recorded in MIRROR company's books
      //    - ONLY MIRROR INTEREST (calculated at mirror rate) is recorded as income
      //
      // 3. EXTRA EMIs (beyond mirror tenure):
      //    - Goes to Original Company (C3) Cashbook
      //    - Full EMI amount is profit for Company 3
      // ============================================
      
      try {
        const isMirrorLoan = !!mirrorLoanMapping && !isExtraEMI;
        const targetCompanyId = isMirrorLoan 
          ? mirrorLoanMapping!.mirrorCompanyId 
          : (creditTypeUsed === 'PERSONAL' ? company3Id : emi.offlineLoan.companyId);
        
        // ============================================
        // CRITICAL: Calculate MIRROR INTEREST for mirror loans
        // The mirror interest is calculated at the MIRROR rate, not original rate
        // ============================================
        let mirrorInterestAmount = 0;
        let mirrorPrincipalAmount = 0;
        
        if (isMirrorLoan && mirrorLoanMapping?.mirrorLoanId) {
          // Fetch the mirror EMI to get the correct interest at mirror rate
          const mirrorEmiForAccounting = await db.offlineLoanEMI.findFirst({
            where: {
              offlineLoanId: mirrorLoanMapping.mirrorLoanId,
              installmentNumber: emi.installmentNumber
            }
          });
          
          if (mirrorEmiForAccounting) {
            mirrorInterestAmount = mirrorEmiForAccounting.interestAmount;
            mirrorPrincipalAmount = mirrorEmiForAccounting.principalAmount;
            console.log(`[Accounting] MIRROR EMI Interest: ₹${mirrorInterestAmount} (Mirror Rate) vs Original: ₹${emi.interestAmount}`);
          } else {
            // Fallback: Calculate mirror interest if mirror EMI not found
            const mirrorRate = (await db.mirrorLoanMapping.findFirst({
              where: { id: mirrorLoanMapping.id },
              select: { mirrorInterestRate: true }
            }))?.mirrorInterestRate || 15;
            const monthlyRate = mirrorRate / 100 / 12;
            mirrorInterestAmount = Math.round(emi.outstandingPrincipal * monthlyRate * 100) / 100;
            console.log(`[Accounting] MIRROR Interest calculated: ₹${mirrorInterestAmount} at ${mirrorRate}% rate`);
          }
        }
        
        if (targetCompanyId) {
          // Use the comprehensive accounting function
          const accountingResult = await recordEMIPaymentAccounting({
            amount: actualPaymentAmount,
            principalComponent: paidPrincipal,
            interestComponent: paidInterest,
            paymentMode: paymentMode as 'CASH' | 'ONLINE' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE',
            paymentType: paymentType || 'FULL',
            creditType: creditTypeUsed as 'PERSONAL' | 'COMPANY',
            loanCompanyId: emi.offlineLoan.companyId || company3Id || '',
            company3Id: company3Id || '',
            loanId: emi.offlineLoanId,
            emiId: emi.id,
            paymentId: updatedEmi.id,
            loanNumber: emi.offlineLoan.loanNumber,
            installmentNumber: emi.installmentNumber,
            userId,
            customerId: emi.offlineLoan.customerId || undefined,
            mirrorLoanId: mirrorLoanMapping?.mirrorLoanId || undefined,
            mirrorPrincipal: isMirrorLoan ? mirrorPrincipalAmount : undefined,
            mirrorInterest: isMirrorLoan ? mirrorInterestAmount : undefined,  // Use MIRROR interest
            mirrorCompanyId: mirrorLoanMapping?.mirrorCompanyId || undefined,
            isMirrorPayment: isMirrorLoan
          });

          console.log(`[Accounting] EMI Payment recorded:`);
          console.log(`  - Type: ${isMirrorLoan ? 'MIRROR' : (isExtraEMI ? 'EXTRA' : 'REGULAR')}`);
          console.log(`  - Credit: ${creditTypeUsed}`);
          console.log(`  - Mode: ${paymentMode}`);
          console.log(`  - Target Company: ${targetCompanyId}`);
          if (isMirrorLoan) {
            console.log(`  - Mirror Interest Recorded: ₹${mirrorInterestAmount}`);
          }
          console.log(`  - Bank Entry: ${accountingResult.bankTransaction ? 'Yes' : 'No'}`);
          console.log(`  - Cashbook Entry: ${accountingResult.cashBookEntry ? 'Yes' : 'No'}`);
          console.log(`  - Journal Entry: ${accountingResult.journalEntryId ? 'Yes' : 'No'}`);
        } else {
          console.warn('[Accounting] Target company not found - skipping accounting entries');
        }
      } catch (accountingError) {
        console.error('[Accounting] Failed to record EMI payment accounting:', accountingError);
        // Don't fail the payment, just log the error
      }

      return NextResponse.json({
        success: true,
        emi: updatedEmi,
        creditAdded: actualPaymentAmount,
        creditType: creditTypeUsed,
        newCompanyCredit: creditTypeUsed === 'COMPANY' ? (user.companyCredit || 0) + actualPaymentAmount : user.companyCredit,
        newPersonalCredit: creditTypeUsed === 'PERSONAL' ? (user.personalCredit || 0) + actualPaymentAmount : user.personalCredit,
        mirrorSynced: !!mirrorLoanMapping,
        processingTime: Date.now() - startTime
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

    // ==========================================
    // DELETE MIRROR LOAN AND MAPPING IF EXISTS
    // ==========================================
    // Check if this loan is an original loan with a mirror
    const mirrorMappingAsOriginal = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId, isOfflineLoan: true }
    });

    // Check if this loan is a mirror loan
    const mirrorMappingAsMirror = await db.mirrorLoanMapping.findFirst({
      where: { mirrorLoanId: loanId }
    });

    let mirrorLoanDeleted = false;
    let mappingDeleted = false;

    // If this is the ORIGINAL loan, delete the mirror loan too
    if (mirrorMappingAsOriginal?.mirrorLoanId) {
      try {
        const mirrorLoan = await db.offlineLoan.findUnique({
          where: { id: mirrorMappingAsOriginal.mirrorLoanId },
          include: { emis: true }
        });

        if (mirrorLoan) {
          // Delete mirror loan's EMIs
          await db.offlineLoanEMI.deleteMany({
            where: { offlineLoanId: mirrorLoan.id }
          });

          // Delete mirror loan's accounting entries
          const mirrorEmiIds = mirrorLoan.emis.map(e => e.id);
          if (mirrorEmiIds.length > 0) {
            await db.cashBookEntry.deleteMany({
              where: {
                referenceId: { in: mirrorEmiIds },
                referenceType: { in: accountingReferenceTypes }
              }
            });
            await db.bankTransaction.deleteMany({
              where: {
                referenceId: { in: mirrorEmiIds },
                referenceType: { in: accountingReferenceTypes }
              }
            });
          }

          // Delete mirror loan's cashbook entries
          await db.cashBookEntry.deleteMany({
            where: {
              referenceId: mirrorLoan.id,
              referenceType: { in: accountingReferenceTypes }
            }
          });

          // Delete mirror loan's bank transactions
          await db.bankTransaction.deleteMany({
            where: {
              referenceId: mirrorLoan.id,
              referenceType: { in: accountingReferenceTypes }
            }
          });

          // Delete the mirror loan
          await db.offlineLoan.delete({
            where: { id: mirrorLoan.id }
          });
          mirrorLoanDeleted = true;
          console.log(`[DELETE OFFLINE LOAN] Deleted mirror loan ${mirrorLoan.loanNumber}`);
        }
      } catch (e) {
        console.error('[DELETE OFFLINE LOAN] Error deleting mirror loan:', e);
      }
    }

    // If this is the MIRROR loan, we should NOT delete the original
    // Just remove the mapping

    // Delete the mirror loan mapping
    if (mirrorMappingAsOriginal || mirrorMappingAsMirror) {
      try {
        await db.mirrorLoanMapping.deleteMany({
          where: {
            OR: [
              { originalLoanId: loanId },
              { mirrorLoanId: loanId }
            ]
          }
        });
        mappingDeleted = true;
        console.log('[DELETE OFFLINE LOAN] Deleted mirror loan mapping');
      } catch (e) {
        console.error('[DELETE OFFLINE LOAN] Error deleting mirror mapping:', e);
      }
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
      message: `Loan ${loan.loanNumber} deleted successfully${paidEmis > 0 ? ` (including ${paidEmis} paid EMIs)` : ''}${mirrorLoanDeleted ? ' (mirror loan also deleted)' : ''}${mappingDeleted ? ' (mapping removed)' : ''}`
    });
  } catch (error) {
    console.error('Offline loan delete error:', error);
    return NextResponse.json({ error: 'Failed to delete offline loan' }, { status: 500 });
  }
}
