import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processBankTransaction } from '@/lib/bank-transaction-service';
import { calculateEMI } from '@/utils/helpers';
import { recordEMIPaymentAccounting, getCompany3Id, recordCashBookEntry, recordBankTransaction } from '@/lib/simple-accounting';
import { recordOfflineLoanDisbursement as recordDaybookDisbursement } from '@/lib/accounting-helper';
import { notifyEvent } from '@/lib/event-notify';

// Local type definitions - Prisma schema uses strings, not enums
type EMIPaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID' | 'INTEREST_ONLY_PAID' | 'WAIVED';

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
          company: { select: { id: true, name: true, code: true } },
          goldLoanDetail: true,
          vehicleLoanDetail: true
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

      // Get all pending/overdue EMIs for original loans only (mirror loans excluded)
      const whereClause: Record<string, unknown> = {
        paymentStatus: { in: ['PENDING', 'OVERDUE'] },
        offlineLoan: { isMirrorLoan: false }
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

    // Get list of offline loans — exclude mirror loans (internal accounting duplicates).
    // The ACCOUNTANT role accesses mirror loan data via the accounting APIs, not here.
    const where: Record<string, unknown> = { isMirrorLoan: false };
    
    if (status && status !== 'all') {
      // Explicit status filter requested
      where.status = status;
    } else if (!status || status === 'all') {
      // Default: exclude CLOSED loans from active list.
      // UI must pass status=CLOSED explicitly to see closed loans.
      where.status = { notIn: ['CLOSED'] };
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
      // Location
      customerLocation,
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
      // C3 Non-Mirror: secondary payment page for EMI credit routing
      secondaryPaymentPageId,
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
    // VALIDATION: Mirror loans can be created by ANY company
    // Just ensure the mirror company is different from the original company
    // ============================================
    if (isMirrorLoan && mirrorCompanyId) {
      // Validate that mirror company is different from original company
      if (mirrorCompanyId === companyId) {
        return NextResponse.json({ 
          error: 'Invalid mirror company',
          message: 'Mirror company must be different from the original company.',
        }, { status: 400 });
      }
      
      // Verify the mirror company exists and is active
      const mirrorCompany = await db.company.findUnique({
        where: { id: mirrorCompanyId },
        select: { id: true, code: true, name: true, isActive: true }
      });
      
      if (!mirrorCompany || !mirrorCompany.isActive) {
        return NextResponse.json({ 
          error: 'Invalid mirror company',
          message: 'The selected mirror company does not exist or is not active.',
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
    
    // Accounting tracking variables
    let bankAccountIdUsed: string | null = bankAccountId || null;
    let cashBookIdUsed: string | null = null;

    if (documents) {
      // Mapping documents to schema fields
      const docMapping: Record<string, string> = {
        'pan_card': 'panCardDoc',
        'aadhaar_front': 'aadhaarFrontDoc',
        'aadhaar_back': 'aadhaarBackDoc',
        'income_proof': 'incomeProofDoc',
        'address_proof': 'addressProofDoc',
        'photo': 'photoDoc',
        'election_card': 'electionCardDoc',
        'house_photo': 'housePhotoDoc',
        'guarantor_photo': 'guarantorPhotoDoc',
        'passbook_photo': 'passbookPhotoDoc'
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
    // Uses EMIScheduleItem from @/utils/helpers (totalAmount, no 'emi' field)
    let emiSchedule: import('@/utils/helpers').EMIScheduleItem[] = [];
    
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

    // ── Validate productId (prevent P2003 FK error if CMSService/product doesn't exist) ──
    let validatedProductId: string | null = null;
    if (productId) {
      const productExists = await db.cMSService.findFirst({
        where: { id: productId },
        select: { id: true },
      });
      validatedProductId = productExists ? productId : null;
      if (!productExists) {
        console.warn(`[Offline Loan] productId '${productId}' not found in CMSService — creating loan without product link.`);
      }
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
        productId: validatedProductId,
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
        // C3 non-mirror secondary payment page
        secondaryPaymentPageId: secondaryPaymentPageId || null,
        // Interest Only Loan fields
        isInterestOnlyLoan,
        interestOnlyStartDate: isInterestOnlyLoan ? new Date(disbursementDate) : null,
        interestOnlyMonthlyAmount: isInterestOnlyLoan ? monthlyInterestAmount : null,
        partialPaymentEnabled: !isInterestOnlyLoan,
        // Location
        applicationLocation: customerLocation,
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
          paymentStatus: 'PENDING' as const,
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
          totalAmount: item.totalAmount, // utils/helpers EMIScheduleItem has .totalAmount
          outstandingPrincipal: item.outstandingPrincipal,
          paymentStatus: 'PENDING' as const
        };
      });

      // Create all EMIs
      await db.offlineLoanEMI.createMany({
        data: emis as any
      });
    }
    
    // Handle Mirror Loan creation - Create ACTUAL mirror loan (SAME AS ONLINE LOANS)
    // Online loans create a separate LoanApplication for mirror - we do the same for offline
    let mirrorLoanResult: { mirrorLoanId: string; mirrorLoanNumber: string; extraEMICount: number; disbursement?: { success: boolean; mode: string; newBalance: number; bankAmount?: number; cashAmount?: number } } | null = null;

    if (isMirrorLoan && mirrorCompanyId && loan) {
      try {
        // Get mirror company details
        const mirrorCompany = await db.company.findUnique({
          where: { id: mirrorCompanyId }
        });

        if (!mirrorCompany) {
          throw new Error('Mirror company not found');
        }

        // BLOCK MIRROR-TO-MIRROR: Cannot mirror a mirror company's loan
        const originalCompany = await db.company.findUnique({ where: { id: companyId } });
        if (originalCompany?.isMirrorCompany) {
          return NextResponse.json({ success: false, error: 'Cannot create a mirror loan from a mirror company. Mirror-to-mirror is not allowed.' }, { status: 400 });
        }
        if (mirrorCompanyId === companyId) {
          return NextResponse.json({ success: false, error: 'Mirror company cannot be the same as the original company.' }, { status: 400 });
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

        // Calculate EMI schedule for mirror loan using shared library (supports shifted schedule)
        const originalEmiAmount = calculatedEmiAmount;
        const { calculateMirrorLoan: calcMirror } = await import('@/lib/mirror-loan');
        const mirrorCalc = calcMirror(
          loanAmount,
          interestRate,
          tenure || 12,
          actualInterestType,
          mirrorRate,
          mirrorTypeInterest as 'FLAT' | 'REDUCING'
        );

        // Use the SHIFTED schedule: last (smallest) EMI is moved to EMI #1
        const mirrorSchedule = mirrorCalc.shiftedSchedule;
        // Processing fee = originalEMI - lastMirrorEMI (e.g. 1200 - 1014.2 = 185.8)
        const mirrorProcessingFee = mirrorCalc.processingFee;

        // Calculate extra EMIs
        const originalTenure = tenure || 12;
        const mirrorTenure = mirrorCalc.mirrorLoan.schedule.length;
        const extraEMICount = Math.max(0, originalTenure - mirrorTenure);
        const leftoverAmount = mirrorCalc.leftoverAmount;

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
            totalAmount: item.emi, // EMIScheduleItem uses .emi
            outstandingPrincipal: item.outstandingPrincipal,
            paymentStatus: 'PENDING' as const
          };
        });

        await db.offlineLoanEMI.createMany({
          data: mirrorEmis as any
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

        // CREATE MIRROR LOAN MAPPING - Link original and mirror with processing fee
        await db.mirrorLoanMapping.create({
          data: {
            originalLoanId: loan.id,
            mirrorLoanId: mirrorLoan.id,
            originalCompanyId: companyId,
            mirrorCompanyId,
            mirrorType,
            isOfflineLoan: true,
            mirrorLoanNumber,
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
            // Processing fee auto-calculated from shared library
            mirrorProcessingFee,
            processingFeeRecorded: false,
            createdBy: createdById
          }
        });

        // ============================================
        // DEDUCT FROM MIRROR COMPANY'S BANK OR CASH
        // SUPPORTS: Split Payment (Bank + Cash)
        // CRITICAL FIX: Always create journal entry regardless of disbursement success
        // ============================================
        let disbursementSuccess = false;
        let disbursementMode: 'BANK' | 'CASH' | 'SPLIT' | 'PENDING' = 'PENDING';
        let cashBookIdUsedMirror: string | null = null;
        let newBalanceAfterDisbursement = 0;
        let actualBankAmount = 0;
        let actualCashAmount = 0;

        // Check if split payment is requested
        const isSplitPayment = useSplitPayment && (bankAmount > 0) && (cashAmount > 0);
        
        console.log(`[Mirror Loan] Disbursement params:`, {
          useSplitPayment,
          bankAmount,
          cashAmount,
          isSplitPayment,
          loanAmount
        });

        // Get mirror company's bank account
        let mirrorBank = await db.bankAccount.findFirst({
          where: { companyId: mirrorCompanyId, isActive: true }
        });

        if (mirrorBank) {
          console.log(`[Mirror Loan] Found bank account for mirror company ${mirrorCompanyId}: ${mirrorBank.accountName}`);
        } else {
          console.log(`[Mirror Loan] No bank account found for mirror company ${mirrorCompanyId} — will attempt cash disbursement`);
        }

        if (isSplitPayment) {
          // ============================================
          // SPLIT PAYMENT: Deduct from both Bank AND Cash
          // ============================================
          console.log(`[Mirror Loan] Processing SPLIT PAYMENT: Bank ₹${bankAmount}, Cash ₹${cashAmount}`);
          
          // 1. Handle Bank Portion
          if (bankAmount > 0 && mirrorBank) {
            try {
              const currentBank = await db.bankAccount.findUnique({
                where: { id: mirrorBank.id },
                select: { currentBalance: true, accountName: true }
              });

              if (currentBank) {
                const newBalance = currentBank.currentBalance - bankAmount;
                
                await db.$transaction([
                  db.bankAccount.update({
                    where: { id: mirrorBank.id },
                    data: { currentBalance: newBalance }
                  }),
                  db.bankTransaction.create({
                    data: {
                      bankAccountId: mirrorBank.id,
                      transactionType: 'DEBIT',
                      amount: bankAmount,
                      balanceAfter: newBalance,
                      description: `Mirror Loan Disbursement (Bank Portion) - ${mirrorLoanNumber}`,
                      referenceType: 'MIRROR_LOAN_DISBURSEMENT',
                      referenceId: mirrorLoan.id,
                      createdById
                    }
                  })
                ]);

                actualBankAmount = bankAmount;
                bankAccountIdUsed = mirrorBank.id;
                newBalanceAfterDisbursement = newBalance;
                console.log(`[Mirror Loan] ✓ Bank deduction SUCCESS: ₹${bankAmount}, New Balance: ₹${newBalance}`);
              }
            } catch (bankError) {
              console.error(`[Mirror Loan] Bank deduction FAILED:`, bankError);
            }
          }

          // 2. Handle Cash Portion
          if (cashAmount > 0) {
            try {
              const cashResult = await recordCashBookEntry({
                companyId: mirrorCompanyId,
                entryType: 'DEBIT',
                amount: cashAmount,
                description: `Mirror Loan Disbursement (Cash Portion) - ${mirrorLoanNumber}`,
                referenceType: 'MIRROR_LOAN_DISBURSEMENT',
                referenceId: mirrorLoan.id,
                createdById
              });

              actualCashAmount = cashAmount;
              cashBookIdUsed = cashResult.cashBookId;
              console.log(`[Mirror Loan] ✓ Cash deduction SUCCESS: ₹${cashAmount}, New Cash Balance: ₹${cashResult.newBalance}`);
            } catch (cashError) {
              console.error(`[Mirror Loan] Cash deduction FAILED:`, cashError);
              // Create cash book if needed and retry
              try {
                const { getOrCreateCashBook } = await import('@/lib/simple-accounting');
                await getOrCreateCashBook(mirrorCompanyId);
                
                const cashResult = await recordCashBookEntry({
                  companyId: mirrorCompanyId,
                  entryType: 'DEBIT',
                  amount: cashAmount,
                  description: `Mirror Loan Disbursement (Cash Portion) - ${mirrorLoanNumber}`,
                  referenceType: 'MIRROR_LOAN_DISBURSEMENT',
                  referenceId: mirrorLoan.id,
                  createdById
                });

                actualCashAmount = cashAmount;
                cashBookIdUsed = cashResult.cashBookId;
                console.log(`[Mirror Loan] ✓ Cash deduction SUCCESS after creating cash book: ₹${cashAmount}`);
              } catch (retryError) {
                console.error(`[Mirror Loan] Cash retry FAILED:`, retryError);
              }
            }
          }

          // Check if split was successful
          if (actualBankAmount > 0 || actualCashAmount > 0) {
            disbursementSuccess = true;
            disbursementMode = 'SPLIT';
            console.log(`[Mirror Loan] ✓ SPLIT PAYMENT SUCCESS: Bank ₹${actualBankAmount}, Cash ₹${actualCashAmount}`);
          }

        } else {
          // ============================================
          // SINGLE PAYMENT: Full Bank OR Full Cash
          // ============================================
          
          // FIRST: Try bank deduction
          if (mirrorBank) {
            try {
              const currentBank = await db.bankAccount.findUnique({
                where: { id: mirrorBank.id },
                select: { currentBalance: true, accountName: true }
              });

              if (currentBank) {
                const newBalance = currentBank.currentBalance - loanAmount;
                
                console.log(`[Mirror Loan] Processing bank deduction: ₹${loanAmount} from '${currentBank.accountName}' (Current: ₹${currentBank.currentBalance})`);
                
                await db.$transaction([
                  db.bankAccount.update({
                    where: { id: mirrorBank.id },
                    data: { currentBalance: newBalance }
                  }),
                  db.bankTransaction.create({
                    data: {
                      bankAccountId: mirrorBank.id,
                      transactionType: 'DEBIT',
                      amount: loanAmount,
                      balanceAfter: newBalance,
                      description: `Mirror Loan Disbursement - ${mirrorLoanNumber} (Mirror of ${loanNumber})`,
                      referenceType: 'MIRROR_LOAN_DISBURSEMENT',
                      referenceId: mirrorLoan.id,
                      createdById
                    }
                  })
                ]);

                disbursementSuccess = true;
                disbursementMode = 'BANK';
                bankAccountIdUsed = mirrorBank.id;
                actualBankAmount = loanAmount;
                newBalanceAfterDisbursement = newBalance;
                console.log(`[Mirror Loan] ✓ Bank deduction SUCCESS: ₹${loanAmount}, New Balance: ₹${newBalance}`);
              } else {
                console.warn(`[Mirror Loan] Bank account found but could not get balance. Trying cash...`);
              }
            } catch (bankError) {
              console.error(`[Mirror Loan] Bank deduction FAILED:`, bankError);
              console.log(`[Mirror Loan] Falling back to cash...`);
            }
          } else {
            console.log(`[Mirror Loan] No bank account found for mirror company ${mirrorCompanyId}. Trying cash...`);
          }

          // SECOND: If bank failed, try cash deduction
          if (!disbursementSuccess) {
            try {
              console.log(`[Mirror Loan] Attempting cash deduction for company ${mirrorCompanyId}...`);
              const cashResult = await recordCashBookEntry({
                companyId: mirrorCompanyId,
                entryType: 'DEBIT',
                amount: loanAmount,
                description: `Mirror Loan Disbursement - ${mirrorLoanNumber} (Mirror of ${loanNumber})`,
                referenceType: 'MIRROR_LOAN_DISBURSEMENT',
                referenceId: mirrorLoan.id,
                createdById
              });

              disbursementSuccess = true;
              disbursementMode = 'CASH';
              cashBookIdUsed = cashResult.cashBookId;
              actualCashAmount = loanAmount;
              newBalanceAfterDisbursement = cashResult.newBalance;
              console.log(`[Mirror Loan] ✓ Cash deduction SUCCESS: ₹${loanAmount}, New Cash Balance: ₹${newBalanceAfterDisbursement}`);
            } catch (cashError) {
              console.error(`[Mirror Loan] Cash deduction FAILED:`, cashError);
              try {
                console.log(`[Mirror Loan] Creating cash book for company ${mirrorCompanyId}...`);
                const { getOrCreateCashBook } = await import('@/lib/simple-accounting');
                await getOrCreateCashBook(mirrorCompanyId);
                
                const cashResult = await recordCashBookEntry({
                  companyId: mirrorCompanyId,
                  entryType: 'DEBIT',
                  amount: loanAmount,
                  description: `Mirror Loan Disbursement - ${mirrorLoanNumber} (Mirror of ${loanNumber})`,
                  referenceType: 'MIRROR_LOAN_DISBURSEMENT',
                  referenceId: mirrorLoan.id,
                  createdById
                });
                
                disbursementSuccess = true;
                disbursementMode = 'CASH';
                cashBookIdUsed = cashResult.cashBookId;
                actualCashAmount = loanAmount;
                newBalanceAfterDisbursement = cashResult.newBalance;
                console.log(`[Mirror Loan] ✓ Cash deduction SUCCESS after creating cash book: ₹${loanAmount}`);
              } catch (retryError) {
                console.error(`[Mirror Loan] Cash deduction FAILED after retry:`, retryError);
              }
            }
          }
        }

        // ============================================
        // CREATE ACCOUNTING ENTRY FOR MIRROR COMPANY
        // CRITICAL FIX: ALWAYS create journal entry regardless of disbursement success
        // Supports: BANK, CASH, SPLIT payment modes
        // ============================================
        
        // 1. Create Daybook Entry for Mirror Loan Disbursement
        try {
          const effectivePaymentMode = disbursementSuccess 
            ? (disbursementMode === 'SPLIT' ? 'SPLIT' : disbursementMode === 'BANK' ? 'BANK_TRANSFER' : 'CASH')
            : 'PENDING';
            
          await recordDaybookDisbursement({
            companyId: mirrorCompanyId,
            loanId: mirrorLoan.id,
            loanNo: mirrorLoanNumber,
            customerName,
            amount: loanAmount,
            processingFee: 0, // No processing fee for mirror loans
            paymentMode: effectivePaymentMode,
            createdById,
            isMirrorLoan: true
          });
          console.log(`[Mirror Loan Accounting] ✓ Created daybook entry for mirror loan disbursement`);
        } catch (daybookError) {
          console.error('[Mirror Loan Accounting] Failed to create daybook entry:', daybookError);
        }
        
        // 2. Create Journal Entry for Chart of Accounts
        try {
          const { AccountingService, ACCOUNT_CODES } = await import('@/lib/accounting-service');
          const accountingService = new AccountingService(mirrorCompanyId);
          await accountingService.initializeChartOfAccounts();

          // Build journal entry lines based on disbursement mode
          const journalLines: Array<{
            accountCode: string;
            debitAmount: number;
            creditAmount: number;
            loanId?: string;
            narration: string;
          }> = [];

          // Debit: Loans Receivable (Asset increases)
          journalLines.push({
            accountCode: ACCOUNT_CODES.LOANS_RECEIVABLE,
            debitAmount: loanAmount,
            creditAmount: 0,
            loanId: mirrorLoan.id,
            narration: 'Mirror loan principal disbursed',
          });

          // Credit lines based on disbursement mode
          if (disbursementMode === 'SPLIT' && actualBankAmount > 0 && actualCashAmount > 0) {
            // SPLIT: Credit both Bank and Cash
            journalLines.push({
              accountCode: ACCOUNT_CODES.BANK_ACCOUNT,
              debitAmount: 0,
              creditAmount: actualBankAmount,
              narration: `Bank portion (₹${actualBankAmount}) for mirror loan`,
            });
            journalLines.push({
              accountCode: ACCOUNT_CODES.CASH_IN_HAND,
              debitAmount: 0,
              creditAmount: actualCashAmount,
              narration: `Cash portion (₹${actualCashAmount}) for mirror loan`,
            });
            console.log(`[Mirror Loan Accounting] SPLIT journal entry: Bank ₹${actualBankAmount}, Cash ₹${actualCashAmount}`);
          } else if (disbursementSuccess && disbursementMode === 'BANK') {
            journalLines.push({
              accountCode: ACCOUNT_CODES.BANK_ACCOUNT,
              debitAmount: 0,
              creditAmount: loanAmount,
              narration: 'Bank account debited for mirror loan disbursement',
            });
          } else if (disbursementSuccess && disbursementMode === 'CASH') {
            journalLines.push({
              accountCode: ACCOUNT_CODES.CASH_IN_HAND,
              debitAmount: 0,
              creditAmount: loanAmount,
              narration: 'Cash account debited for mirror loan disbursement',
            });
          } else {
            // Disbursement pending - record as borrowed funds (liability)
            journalLines.push({
              accountCode: ACCOUNT_CODES.BORROWED_FUNDS,
              debitAmount: 0,
              creditAmount: loanAmount,
              narration: 'Pending disbursement - funds to be received',
            });
            disbursementMode = 'PENDING';
            console.log(`[Mirror Loan Accounting] Disbursement PENDING - recording as borrowed funds liability`);
          }

          // Create journal entry
          await accountingService.createJournalEntry({
            entryDate: new Date(disbursementDate),
            referenceType: 'MIRROR_LOAN_DISBURSEMENT',
            referenceId: mirrorLoan.id,
            narration: `Mirror Loan Disbursement - ${mirrorLoanNumber} (Mirror of ${loanNumber}) - Principal: ₹${loanAmount.toLocaleString()} ${disbursementSuccess ? `via ${disbursementMode}` : '(PENDING FUNDS)'}`,
            lines: journalLines,
            createdById: createdById,
            paymentMode: disbursementMode === 'SPLIT' ? 'SPLIT' : disbursementMode === 'BANK' ? 'BANK_TRANSFER' : disbursementMode === 'CASH' ? 'CASH' : 'PENDING',
            bankAccountId: bankAccountIdUsed || undefined,
            isAutoEntry: true,
          });

          console.log(`[Mirror Loan Accounting] ✓ Created journal entry for mirror loan disbursement - Loans Receivable: ₹${loanAmount} ${disbursementSuccess ? `via ${disbursementMode}` : '(PENDING)'}`);
        } catch (accountingError) {
          console.error('[Mirror Loan Accounting] Failed to create journal entry:', accountingError);
        }

        mirrorLoanResult = {
          mirrorLoanId: mirrorLoan.id,
          mirrorLoanNumber: mirrorLoan.loanNumber,
          extraEMICount,
          disbursement: {
            success: disbursementSuccess,
            mode: disbursementMode,
            newBalance: newBalanceAfterDisbursement,
            bankAmount: actualBankAmount,
            cashAmount: actualCashAmount
          }
        };

        if (disbursementSuccess) {
          console.log(`[Mirror Loan] ✓ SUCCESS: Created mirror loan ${mirrorLoanNumber} (ID: ${mirrorLoan.id}) for original ${loanNumber}`);
          console.log(`[Mirror Loan] ✓ Disbursed ₹${loanAmount} via ${disbursementMode}, New Balance: ₹${newBalanceAfterDisbursement}`);
        } else {
          console.log(`[Mirror Loan] ⚠️ WARNING: Created mirror loan ${mirrorLoanNumber} with PENDING disbursement - journal entry recorded as borrowed funds`);
        }
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
          // CRITICAL FIX: Use ANY active bank (don't require isDefault)
          let targetBank = bankAccountId ? await db.bankAccount.findUnique({ where: { id: bankAccountId } }) : null;
          
          if (!targetBank) {
            targetBank = await db.bankAccount.findFirst({
              where: { companyId: disbursementCompanyId, isActive: true }
            });
          }

          if (targetBank) {
            console.log(`[Disbursement] Found bank: ${targetBank.accountName} for split payment bank portion`);
          }

          const targetBankId = targetBank?.id;

          if (targetBankId) {
            try {
              const currentBank = await db.bankAccount.findUnique({
                where: { id: targetBankId },
                select: { currentBalance: true, accountName: true }
              });

              if (currentBank) {
                // Allow overdraft - deduct regardless of balance
                const newBalance = currentBank.currentBalance - bankAmount;
                
                console.log(`[Disbursement] Bank deduction: ₹${bankAmount} from '${currentBank.accountName}' (Current: ₹${currentBank.currentBalance})`);
                
                // Use transaction for atomicity
                await db.$transaction([
                  db.bankAccount.update({
                    where: { id: targetBankId },
                    data: { currentBalance: newBalance }
                  }),
                  db.bankTransaction.create({
                    data: {
                      bankAccountId: targetBankId,
                      transactionType: 'DEBIT',
                      amount: bankAmount,
                      balanceAfter: newBalance,
                      description: `Offline Loan Disbursement (Bank Portion) - ${loanNumber} to ${customerName}`,
                      referenceType: 'OFFLINE_LOAN',
                      referenceId: loan.id,
                      createdById
                    }
                  })
                ]);

                console.log(`[Disbursement] ✓ Bank deduction SUCCESS: ₹${bankAmount}, New Balance: ₹${newBalance}`);
              } else {
                console.warn(`[Disbursement] WARNING: Could not get bank balance`);
              }
            } catch (bankError) {
              console.error(`[Disbursement] Bank deduction FAILED:`, bankError);
            }
          } else {
            console.warn(`[Disbursement] WARNING: No bank account found for bank portion - trying cash fallback`);
            // Fallback to cash for bank portion
            try {
              cashbookResult = await recordCashBookEntry({
                companyId: disbursementCompanyId,
                entryType: 'DEBIT',
                amount: bankAmount,
                description: `Offline Loan Disbursement (Bank Portion Cash Fallback) - ${loanNumber}`,
                referenceType: 'OFFLINE_LOAN',
                referenceId: loan.id,
                createdById
              });
              console.log(`[Disbursement] ✓ Cash fallback for bank portion: ₹${bankAmount}`);
            } catch (cashFallbackError) {
              console.error(`[Disbursement] Cash fallback FAILED:`, cashFallbackError);
            }
          }
        }

        // 2. Handle Cash Portion
        if (cashAmount > 0) {
          try {
            cashbookResult = await recordCashBookEntry({
              companyId: disbursementCompanyId,
              entryType: 'DEBIT',
              amount: cashAmount,
              description: `Offline Loan Disbursement (Cash Portion) - ${loanNumber} to ${customerName}`,
              referenceType: 'OFFLINE_LOAN',
              referenceId: loan.id,
              createdById
            });

            console.log(`[Disbursement] ✓ Cash deduction SUCCESS: ₹${cashAmount}, New Cash Balance: ₹${cashbookResult?.newBalance}`);
          } catch (cashError) {
            console.error(`[Disbursement] Cash deduction FAILED:`, cashError);
            // Create cash book if needed and retry
            try {
              const { getOrCreateCashBook } = await import('@/lib/simple-accounting');
              await getOrCreateCashBook(disbursementCompanyId);
              cashbookResult = await recordCashBookEntry({
                companyId: disbursementCompanyId,
                entryType: 'DEBIT',
                amount: cashAmount,
                description: `Offline Loan Disbursement (Cash Portion) - ${loanNumber}`,
                referenceType: 'OFFLINE_LOAN',
                referenceId: loan.id,
                createdById
              });
              console.log(`[Disbursement] ✓ Cash deduction SUCCESS after creating cash book: ₹${cashAmount}`);
            } catch (retryError) {
              console.error(`[Disbursement] Cash retry FAILED:`, retryError);
            }
          }
        }

      } else {
        // ============================================
        // SINGLE PAYMENT - Deduct from bank OR cash
        // ============================================
        console.log(`[Disbursement] Single Payment Mode: ${disbursementMode}, Amount: ₹${loanAmount}`);

        if (disbursementMode === 'CASH') {
          // Deduct from cashbook
          try {
            cashbookResult = await recordCashBookEntry({
              companyId: disbursementCompanyId,
              entryType: 'DEBIT',
              amount: loanAmount,
              description: `Offline Loan Disbursement - ${loanNumber} to ${customerName}`,
              referenceType: 'OFFLINE_LOAN',
              referenceId: loan.id,
              createdById
            });

            console.log(`[Disbursement] ✓ Cash deduction SUCCESS: ₹${loanAmount}, New Cash Balance: ₹${cashbookResult?.newBalance}`);
          } catch (cashError) {
            console.error(`[Disbursement] Cash deduction FAILED:`, cashError);
            // Create cash book if needed and retry
            try {
              const { getOrCreateCashBook } = await import('@/lib/simple-accounting');
              await getOrCreateCashBook(disbursementCompanyId);
              cashbookResult = await recordCashBookEntry({
                companyId: disbursementCompanyId,
                entryType: 'DEBIT',
                amount: loanAmount,
                description: `Offline Loan Disbursement - ${loanNumber} to ${customerName}`,
                referenceType: 'OFFLINE_LOAN',
                referenceId: loan.id,
                createdById
              });
              console.log(`[Disbursement] ✓ Cash deduction SUCCESS after creating cash book: ₹${loanAmount}`);
            } catch (retryError) {
              console.error(`[Disbursement] Cash retry FAILED:`, retryError);
            }
          }
        } else {
          // Deduct from bank - CRITICAL FIX: Use ANY active bank (don't require isDefault)
          let targetBank = bankAccountId ? await db.bankAccount.findUnique({ where: { id: bankAccountId } }) : null;
          
          if (!targetBank) {
            targetBank = await db.bankAccount.findFirst({
              where: { companyId: disbursementCompanyId, isActive: true }
            });
          }

          if (targetBank) {
            console.log(`[Disbursement] Found bank: ${targetBank.accountName} for single payment`);
          }

          const targetBankId = targetBank?.id;

          if (targetBankId) {
            try {
              const currentBank = await db.bankAccount.findUnique({
                where: { id: targetBankId },
                select: { currentBalance: true, accountName: true }
              });

              if (currentBank) {
                // Allow overdraft - deduct regardless of balance
                const newBalance = currentBank.currentBalance - loanAmount;
                
                console.log(`[Disbursement] Bank deduction: ₹${loanAmount} from '${currentBank.accountName}' (Current: ₹${currentBank.currentBalance})`);
                
                // Use transaction for atomicity
                await db.$transaction([
                  db.bankAccount.update({
                    where: { id: targetBankId },
                    data: { currentBalance: newBalance }
                  }),
                  db.bankTransaction.create({
                    data: {
                      bankAccountId: targetBankId,
                      transactionType: 'DEBIT',
                      amount: loanAmount,
                      balanceAfter: newBalance,
                      description: `Offline Loan Disbursement - ${loanNumber} to ${customerName}`,
                      referenceType: 'OFFLINE_LOAN',
                      referenceId: loan.id,
                      createdById
                    }
                  })
                ]);

                console.log(`[Disbursement] ✓ Bank deduction SUCCESS: ₹${loanAmount}, New Balance: ₹${newBalance}`);
              } else {
                console.warn(`[Disbursement] WARNING: Could not get bank balance`);
              }
            } catch (bankError) {
              console.error(`[Disbursement] Bank deduction FAILED:`, bankError);
              // Fallback to cash
              try {
                cashbookResult = await recordCashBookEntry({
                  companyId: disbursementCompanyId,
                  entryType: 'DEBIT',
                  amount: loanAmount,
                  description: `Offline Loan Disbursement (Cash Fallback) - ${loanNumber}`,
                  referenceType: 'OFFLINE_LOAN',
                  referenceId: loan.id,
                  createdById
                });
                console.log(`[Disbursement] ✓ Cash fallback SUCCESS: ₹${loanAmount}`);
              } catch (cashFallbackError) {
                console.error(`[Disbursement] Cash fallback FAILED:`, cashFallbackError);
              }
            }
          } else {
            console.warn(`[Disbursement] WARNING: No bank account found for disbursement - trying cash fallback`);
            // Fallback to cash if no bank account
            try {
              const { getOrCreateCashBook } = await import('@/lib/simple-accounting');
              await getOrCreateCashBook(disbursementCompanyId);
              cashbookResult = await recordCashBookEntry({
                companyId: disbursementCompanyId,
                entryType: 'DEBIT',
                amount: loanAmount,
                description: `Offline Loan Disbursement (Cash Fallback) - ${loanNumber}`,
                referenceType: 'OFFLINE_LOAN',
                referenceId: loan.id,
                createdById
              });
              console.log(`[Disbursement] ✓ Cash fallback SUCCESS after creating cash book: ₹${loanAmount}`);
            } catch (cashFallbackError) {
              console.error(`[Disbursement] Cash fallback FAILED:`, cashFallbackError);
            }
          }
        }
      }
    } catch (disbursementError) {
      console.error('Disbursement transaction failed:', disbursementError);
      // Don't fail the loan creation if disbursement fails
    }
    } // End of else block for non-mirror loans

    // ============================================
    // CREATE ACCOUNTING ENTRIES FOR ORIGINAL LOAN DISBURSEMENT
    // IMPORTANT: For mirror loans, we SKIP the original company journal entry.
    // The mirror company's journal entry is already created in the mirror loan
    // creation section above, so no double-entry is needed here.
    // ============================================

    // SKIP journal entry for mirror loans — already handled in mirror creation section
    if (isMirrorLoan && mirrorCompanyId) {
      console.log(`[Accounting] SKIPPED original company journal for mirror loan — mirror company journal already recorded`);
    } else {
      // Regular loan - create accounting entries
      const effectiveDisbursementMode = disbursementMode || 'CASH';
      
      // 1. Create Daybook Entry (for daybook view)
      try {
        console.log(`[Accounting] Creating daybook entry for company: ${companyId}`);
        await recordDaybookDisbursement({
          companyId,
          loanId: loan.id,
          loanNo: loanNumber,
          customerName,
          amount: loanAmount,
          processingFee: processingFee || 0,
          paymentMode: effectiveDisbursementMode,
          createdById
        });
        console.log(`[Accounting] Created daybook entry for loan disbursement: ${loanNumber}`);
      } catch (daybookError) {
        console.error('Daybook entry creation failed:', daybookError);
      }
      
      // 2. Create Journal Entry (for Chart of Accounts)
      try {
        const { AccountingService, ACCOUNT_CODES } = await import('@/lib/accounting-service');
        
        console.log(`[Accounting] Creating journal entry for company: ${companyId}`);
        
        const accountingService = new AccountingService(companyId);
        await accountingService.initializeChartOfAccounts();

        const disbursementAccountCode = effectiveDisbursementMode === 'CASH'
          ? ACCOUNT_CODES.CASH_IN_HAND
          : ACCOUNT_CODES.BANK_ACCOUNT;
        
        // ============ UNIFIED ACCOUNTING - LOAN DISBURSEMENT ============
        // customerId may be undefined for offline loans created without a linked system user —
        // fall back to loan ID so the journal entry is always created.
        const effectiveCustomerId = customerId || loan.id;
        
        await accountingService.recordLoanDisbursement({
          loanId: loan.id,
          customerId: effectiveCustomerId,
          customerName: customerName,
          amount: loanAmount,
          disbursementDate: new Date(disbursementDate),
          createdById,
          paymentMode: effectiveDisbursementMode,
          bankAccountId: bankAccountIdUsed || undefined,
          reference: `Offline Loan: ${loanNumber}`
        });
        
        console.log(`[Accounting] ✅ Created journal entry for loan disbursement: ${loanNumber}`);

        // ============ UNIFIED ACCOUNTING - PROCESSING FEE ============
        // FIX-ISSUE-2: Record processing fee at disbursement + mark processingFeeRecorded=true
        if (processingFee && processingFee > 0) {
          try {
            // 1. Cashbook or bank entry so it appears in DayBook
            const { recordCashBookEntry: pfCb, recordBankTransaction: pfBank } = await import('@/lib/simple-accounting');
            const isPfOnline = ['ONLINE','UPI','BANK_TRANSFER','NEFT','RTGS','IMPS','CHEQUE'].includes((effectiveDisbursementMode||'').toUpperCase());
            if (isPfOnline) {
              await pfBank({ companyId, transactionType: 'CREDIT', amount: processingFee,
                description: `Processing Fee - ${loanNumber}`, referenceType: 'PROCESSING_FEE',
                referenceId: `${loan.id}-PF`, createdById }).catch(e => console.error('[PF Bank]', e));
            } else {
              await pfCb({ companyId, entryType: 'CREDIT', amount: processingFee,
                description: `Processing Fee - ${loanNumber}`, referenceType: 'PROCESSING_FEE',
                referenceId: `${loan.id}-PF`, createdById }).catch(e => console.error('[PF CB]', e));
            }
            // 2. Double-entry journal for processing fee
            await accountingService.recordProcessingFee({
              loanId: loan.id,
              customerId: effectiveCustomerId,
              amount: processingFee,
              collectionDate: new Date(disbursementDate),
              createdById,
              paymentMode: effectiveDisbursementMode,
              bankAccountId: bankAccountIdUsed || undefined,
              reference: `Processing Fee: ${loanNumber}`
            });
            // 3. Mark fee as recorded on the loan
            await db.offlineLoan.update({ where: { id: loan.id }, data: { processingFeeRecorded: true } as any });
            console.log(`[Accounting] ✓ Processing fee: ₹${processingFee} for ${loanNumber}`);
          } catch (pfError) {
            console.error('[Accounting] Processing fee recording failed:', pfError);
          }
        }
      } catch (accountingError) {
        console.error(`[Accounting] ❌ Journal entry creation FAILED for ${loanNumber}:`, accountingError);
      }
    } // end of else (non-mirror loan accounting)

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

    // Notify SUPER_ADMIN + COMPANY of new offline loan (fire-and-forget)
    notifyEvent({
      event: 'OFFLINE_LOAN_CREATED',
      title: `🏦 New Offline Loan Disbursed`,
      body: `${loanType} loan of ₹${Number(loanAmount).toLocaleString('en-IN')} for ${customerName} — ${loanNumber}`,
      data: { loanId: loan.id, loanNumber, type: 'OFFLINE_LOAN_CREATED', actionUrl: '/?section=offline-loans' },
      actionUrl: '/?section=offline-loans',
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
      
      // NOTE: Do NOT pre-create the next EMI here.
      // The DB transaction block below always creates the next-month EMI after marking
      // the current one as PAID. Pre-creating it here causes a duplicate EMI bug.
      // The only fallback needed is when there is NO EMI at all (first payment).

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

        // Create next month's interest EMI — only if it doesn't already exist
        const nextInstallmentNumber = currentEMI!.installmentNumber + 1;
        const monthlyInterest = loan.interestOnlyMonthlyAmount || 0;
        
        const existingNextEMI = await tx.offlineLoanEMI.findFirst({
          where: { offlineLoanId: loanId, installmentNumber: nextInstallmentNumber }
        });

        if (!existingNextEMI) {
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
        } else {
          console.log(`[Interest-Only] Next EMI #${nextInstallmentNumber} already exists — skipping creation`);
        }

        console.log(`[Offline Loan] Created next Interest EMI #${nextInstallmentNumber} for loan ${loan.loanNumber}`);

        // Update loan with total interest paid
        await tx.offlineLoan.update({
          where: { id: loanId },
          data: {
            totalInterestPaid: (loan.totalInterestPaid || 0) + interestAmount
          }
        });

        // ── AUTO-CLOSE CHECK ─────────────────────────────────────────────────────
        // If ALL EMIs (including the one we just paid) are PAID / INTEREST_ONLY_PAID,
        // close the loan automatically — works whether mirror exists or not.
        const allLoanEmis = await tx.offlineLoanEMI.findMany({
          where: { offlineLoanId: loanId },
          select: { paymentStatus: true }
        });
        const allPaidNow = allLoanEmis.every(e =>
          e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID' || e.paymentStatus === 'WAIVED'
        );
        if (allPaidNow) {
          await tx.offlineLoan.update({ where: { id: loanId }, data: { status: 'CLOSED', closedAt: now } });
          console.log(`[Interest-Only Auto-Close] ✅ Loan ${loan.loanNumber} auto-closed — all EMIs paid`);
          // Also close mirror loan if exists
          const mirrorMap = await tx.mirrorLoanMapping.findFirst({
            where: { originalLoanId: loanId },
            select: { mirrorLoanId: true }
          });
          if (mirrorMap?.mirrorLoanId) {
            const mirrorEmis = await tx.offlineLoanEMI.findMany({
              where: { offlineLoanId: mirrorMap.mirrorLoanId },
              select: { paymentStatus: true }
            });
            const mirrorAllPaid = mirrorEmis.length === 0 || mirrorEmis.every(e =>
              e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID' || e.paymentStatus === 'WAIVED'
            );
            if (mirrorAllPaid) {
              await tx.offlineLoan.update({ where: { id: mirrorMap.mirrorLoanId }, data: { status: 'CLOSED', closedAt: now } });
              console.log(`[Interest-Only Auto-Close] ✅ Mirror loan also auto-closed`);
            }
          }
        }

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
            customerName: loan.customerName,
            customerPhone: loan.customerPhone
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
        }});
      }, { maxWait: 15000, timeout: 30000 });

      // ============================================================
      // ACCOUNTING: Record Interest-Only Payment as Interest Income
      // Dr: Cash in Hand / Bank Account  = interestAmount
      // Cr: Interest Income (4110)       = interestAmount
      // This was previously MISSING — interest was collected but
      // never reflected in the company's income accounts.
      // ============================================================
      if (loan.companyId) { // guard: only run accounting if company is known
        try {
          const isOnlineMode = paymentMode === 'ONLINE' || paymentMode === 'UPI' || paymentMode === 'BANK_TRANSFER';
          const { AccountingService: AccSvc, ACCOUNT_CODES: CODES } = await import('@/lib/accounting-service');
          const accService = new AccSvc(loan.companyId);
          await accService.initializeChartOfAccounts();

          // Cashbook or Bank entry
          if (isOnlineMode) {
            const { recordBankTransaction } = await import('@/lib/simple-accounting');
            await recordBankTransaction({
              companyId: loan.companyId,
              transactionType: 'CREDIT',
              amount: interestAmount,
              description: `Interest-Only EMI #${currentEMI.installmentNumber} - ${loan.loanNumber}`,
              referenceType: 'INTEREST_ONLY_PAYMENT',
              referenceId: currentEMI.id,
              createdById: userId,
            });
          } else {
            const { recordCashBookEntry } = await import('@/lib/simple-accounting');
            await recordCashBookEntry({
              companyId: loan.companyId,
              entryType: 'CREDIT',
              amount: interestAmount,
              description: `Interest-Only EMI #${currentEMI.installmentNumber} - ${loan.loanNumber}`,
              referenceType: 'INTEREST_ONLY_PAYMENT',
              referenceId: currentEMI.id,
              createdById: userId,
            });
          }

          // Double-entry journal: Dr Cash/Bank → Cr Interest Income
          await accService.createJournalEntry({
            entryDate: now,
            referenceType: 'INTEREST_ONLY_PAYMENT',
            referenceId: currentEMI.id,
            narration: `Interest-Only EMI #${currentEMI.installmentNumber} for ${loan.loanNumber} — ₹${interestAmount}`,
            lines: [
              {
                accountCode: isOnlineMode ? CODES.BANK_ACCOUNT : CODES.CASH_IN_HAND,
                debitAmount:  interestAmount,
                creditAmount: 0,
                narration: `Interest received (${paymentMode || 'CASH'})`,
              },
              {
                accountCode: CODES.INTEREST_INCOME,
                debitAmount:  0,
                creditAmount: interestAmount,
                narration: `Interest income — ${loan.loanNumber} EMI #${currentEMI.installmentNumber}`,
              },
            ],
            createdById: userId,
            paymentMode: paymentMode || 'CASH',
            isAutoEntry: true,
          });

          console.log(`[Interest-Only Accounting] ✓ Dr ${isOnlineMode ? 'Bank' : 'Cash'} ₹${interestAmount}, Cr Interest Income ₹${interestAmount}`);
        } catch (accErr) {
          // Non-fatal: log but don't block the success response
          console.error('[Interest-Only Accounting] Failed (non-critical):', accErr);
        }
      } // end if (loan.companyId)

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
      const { paymentMode, paymentReference, amount, paymentType, bankAccountId, creditType, remainingPaymentDate, isAdvancePayment,
        penaltyAmount: rawPenaltyAmount, penaltyWaiver: rawPenaltyWaiver, penaltyPaymentMode: rawPenaltyMode,
        // Split payment support: part cash + part online in one EMI
        isSplitPayment, splitCashAmount: rawSplitCash, splitOnlineAmount: rawSplitOnline,
        // Staff-editable principal/interest split for journal entry (optional)
        principalComponent: staffPrincipal, interestComponent: staffInterest } = body;
      const penaltyAmount = rawPenaltyAmount ? parseFloat(rawPenaltyAmount) : 0;
      const penaltyWaiver = rawPenaltyWaiver ? parseFloat(rawPenaltyWaiver) : 0;
      const netPenalty = Math.max(0, penaltyAmount - penaltyWaiver);
      const penaltyPaymentMode = rawPenaltyMode || 'CASH';
      console.log(`[PAY-EMI] ⚡ PENALTY DEBUG → rawPenaltyAmount=${rawPenaltyAmount} | rawPenaltyWaiver=${rawPenaltyWaiver} | rawPenaltyMode=${rawPenaltyMode} | penaltyAmount=${penaltyAmount} | penaltyWaiver=${penaltyWaiver} | netPenalty=${netPenalty} | paymentMode=${paymentMode}`);
      const splitCashAmt  = isSplitPayment ? (parseFloat(rawSplitCash)   || 0) : 0;
      const splitOnlineAmt = isSplitPayment ? (parseFloat(rawSplitOnline) || 0) : 0;
      // For split payments: effective paymentMode is CASH for accounting (we'll handle ONLINE part separately below)
      const effectiveSplitMode = isSplitPayment ? 'CASH' : paymentMode;
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
          select: { id: true, mirrorLoanId: true, mirrorTenure: true, mirrorCompanyId: true, mirrorInterestRate: true }
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
      if (paymentType === 'FULL') {
        // When isAdvancePayment is explicitly TRUE (only sent by multi-EMI "Select All" mode for future EMIs),
        // collect principal only. For all single EMI payments, isAdvancePayment=false so this never triggers.
        if (isAdvancePayment === true) {
          paidPrincipal = emi.principalAmount;
          paidInterest  = 0;
          paidAmount    = emi.principalAmount;
          paymentStatus = 'PAID';
        } else {
          // Normal FULL: collect principal + interest
          paidAmount    = emi.totalAmount;
          paidPrincipal = emi.principalAmount;
          paidInterest  = emi.interestAmount;
          paymentStatus = 'PAID';
        }
      } else if (paymentType === 'ADVANCE') {
        // ADVANCE explicitly means: collect principal only (interest not yet due)
        paidPrincipal = emi.principalAmount;
        paidInterest  = 0;
        paidAmount    = emi.principalAmount;
        paymentStatus = 'PAID';
      } else if (paymentType === 'PARTIAL') {
        // Issue 7 Fix: Interest-first allocation (same as online loans)
        const remainingInterest  = emi.interestAmount  - paidInterest;
        const interestPortion    = Math.min(amount, remainingInterest);
        const principalPortion   = Math.max(0, amount - interestPortion);
        paidInterest  += interestPortion;
        paidPrincipal += principalPortion;
        paidAmount    += amount;
        paymentStatus = paidAmount >= emi.totalAmount - 0.01 ? 'PAID' : 'PARTIALLY_PAID';
      } else if (paymentType === 'INTEREST_ONLY') {
        // CRITICAL: Use REMAINING interest only (interestAmount - already paidInterest)
        // If a prior partial already collected some/all interest, don't re-collect it.
        const remainingInterestIO = (emi.interestAmount || 0) - (emi.paidInterest || 0);
        const interestToCollect   = Math.max(0, remainingInterestIO);
        paidInterest  = (emi.paidInterest || 0) + interestToCollect; // cumulative
        paidAmount    = (emi.paidAmount   || 0) + interestToCollect; // cumulative
        paidPrincipal = emi.paidPrincipal || 0;                      // unchanged
        paymentStatus = 'INTEREST_ONLY_PAID';
      } else if (paymentType === 'PRINCIPAL_ONLY') {
        // Collect only principal; interest is written off as Irrecoverable Debt (loss)
        paidPrincipal = emi.principalAmount;
        paidInterest  = 0;   // NOT collected — will be written off in accounting
        paidAmount    = emi.principalAmount;
        paymentStatus = 'PAID';  // EMI fully settled (principal cleared)
      }

      // ── SESSION-DELTA amounts ─────────────────────────────────────────────
      // These represent ONLY what was paid THIS session, not the cumulative total.
      // Critical for remaining payments after a partial: prevents recording full EMI twice.
      const prevPaid          = previousState.paidAmount    || 0;
      const prevPaidPrincipal = previousState.paidPrincipal || 0;
      const prevPaidInterest  = previousState.paidInterest  || 0;
      const sessionAmount     = paidAmount    - prevPaid;
      const sessionPrincipal  = paidPrincipal - prevPaidPrincipal;
      const sessionInterest   = paidInterest  - prevPaidInterest;
      // For PRINCIPAL_ONLY: interest that is being written off this session
      const sessionInterestWrittenOff = paymentType === 'PRINCIPAL_ONLY'
        ? Math.max(0, emi.interestAmount - prevPaidInterest)  // remaining unpaid interest
        : 0;

      const actualPaymentAmount = paymentType === 'INTEREST_ONLY'
        ? sessionInterest   // only interest portion paid this session
        : sessionAmount;    // cash actually collected this session
      
      // Check for extra EMI
      const isExtraEMI = mirrorLoanMapping && emi.installmentNumber > mirrorLoanMapping.mirrorTenure;
      
      let creditTypeUsed = creditType || 'COMPANY';
      if (isExtraEMI) {
        creditTypeUsed = 'PERSONAL';
        console.log(`[EMI Payment] EMI #${emi.installmentNumber} is EXTRA EMI - forcing PERSONAL credit`);
      }

      // ONLINE payment: money goes directly to bank — NO credit increase for any role
      // SPLIT payment: ONLY the CASH portion increases credit (online portion goes to bank directly)
      const isOnlinePayment = paymentMode === 'ONLINE' || paymentMode === 'UPI' || paymentMode === 'BANK_TRANSFER';
      // For split: cashable amount = splitCashAmt; for pure online = 0; for cash = full amount
      const creditIncreaseAmount = isSplitPayment
        ? splitCashAmt   // Only cash portion increases credit
        : isOnlinePayment
          ? 0            // Pure online: no credit
          : actualPaymentAmount;  // Pure cash: full amount

      // Build a rich description for history showing split breakdown
      const creditDescription = isSplitPayment
        ? `EMI #${emi.installmentNumber} SPLIT collected for ${emi.offlineLoan.loanNumber}: Cash ₹${splitCashAmt} (${creditTypeUsed} credit) + Online ₹${splitOnlineAmt} (Bank)
          P+I: ₹${sessionPrincipal.toFixed(2)} + ₹${sessionInterest.toFixed(2)}`
        : isOnlinePayment
          ? `EMI #${emi.installmentNumber} online payment for ${emi.offlineLoan.loanNumber} (direct to bank — no credit change)`
          : `EMI #${emi.installmentNumber} collected for ${emi.offlineLoan.loanNumber} (${creditTypeUsed} credit)`;

      // ── Capture mirror EMI state BEFORE the transaction ────────────────────
      // After the transaction syncs the mirror EMI, we compute session delta:
      //   sessionInterest = postSyncPaidInterest - preSyncPaidInterest
      //   sessionPrincipal = postSyncPaidPrincipal - preSyncPaidPrincipal
      // This prevents re-recording already-paid interest (e.g. 2nd payment after partial).
      let mirrorEmiPreSyncPaidInterest  = 0;
      let mirrorEmiPreSyncPaidPrincipal = 0;
      if (mirrorLoanMapping?.mirrorLoanId) {
        const mirrorEmiPre = await db.offlineLoanEMI.findFirst({
          where: { offlineLoanId: mirrorLoanMapping.mirrorLoanId, installmentNumber: emi.installmentNumber },
          select: { paidInterest: true, paidPrincipal: true }
        });
        mirrorEmiPreSyncPaidInterest  = Number(mirrorEmiPre?.paidInterest  || 0);
        mirrorEmiPreSyncPaidPrincipal = Number(mirrorEmiPre?.paidPrincipal || 0);
        console.log(`[Mirror Pre-Sync] EMI #${emi.installmentNumber}: paidI=₹${mirrorEmiPreSyncPaidInterest} paidP=₹${mirrorEmiPreSyncPaidPrincipal}`);
      }

      const newCompanyCr  = creditTypeUsed === 'COMPANY'  && !isOnlinePayment && !isSplitPayment
        ? (user.companyCredit  || 0) + creditIncreaseAmount
        : creditTypeUsed === 'COMPANY'  && isSplitPayment
          ? (user.companyCredit  || 0) + creditIncreaseAmount  // cash portion only
          : (user.companyCredit  || 0);
      const newPersonalCr = creditTypeUsed === 'PERSONAL' && !isOnlinePayment && !isSplitPayment
        ? (user.personalCredit || 0) + creditIncreaseAmount
        : creditTypeUsed === 'PERSONAL' && isSplitPayment
          ? (user.personalCredit || 0) + creditIncreaseAmount  // cash portion only
          : (user.personalCredit || 0);

      const creditUpdateData = isOnlinePayment
        ? {} // No credit change — money went to bank directly
        : creditTypeUsed === 'COMPANY'
          ? { companyCredit: newCompanyCr }
          : { personalCredit: newPersonalCr };

      // ============ STEP 4: PROCESS PAYMENT IN TRANSACTION ============
      // timeout: 30000 — INTEREST_ONLY shifts EMIs (N queries) and can exceed default 5s
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
            // ── PENALTY: save auto-calc (editable) penalty to DB ─────────────
            penaltyAmount:  (emi.penaltyAmount  || 0) + penaltyAmount,   // cumulative
            penaltyPaid:    (emi.penaltyPaid    || 0) + netPenalty,       // net collected
            // ────────────────────────────────────────────────────────────────
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
            transactionType: isOnlinePayment && !isSplitPayment ? 'BANK_DIRECT' : 'CREDIT_INCREASE',
            amount: creditIncreaseAmount, // 0 for online; cash portion for split
            paymentMode: paymentMode || 'CASH',
            creditType: creditTypeUsed,
            companyBalanceAfter:  newCompanyCr,
            personalBalanceAfter: newPersonalCr,
            balanceAfter: newCompanyCr + newPersonalCr,
            sourceType: 'EMI_PAYMENT',
            sourceId: emi.id,
            description: creditDescription,
            loanApplicationNo: emi.offlineLoan.loanNumber,
            emiDueDate: emi.dueDate,
            emiAmount: emi.totalAmount,
            principalComponent: sessionPrincipal,  // delta: this session only
            interestComponent: sessionInterest,     // delta: this session only
            customerName: emi.offlineLoan.customerName,
            customerPhone: emi.offlineLoan.customerPhone
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
            newData: JSON.stringify({ paidAmount, paidPrincipal, paidInterest, paymentStatus, sessionAmount, collectorId: userId, collectorName: user.name, paymentMode }),
            description: `Collected EMI #${emi.installmentNumber} for ${emi.offlineLoan.loanNumber}`,
            canUndo: true
          }
        });

        // Handle Interest Only - create deferred EMI (only if next installment doesn't exist)
        if (paymentType === 'INTEREST_ONLY') {
          // Determine remaining principal that was NOT yet paid via prior partials
          const remainingPrincipalAfterIO = (emi.principalAmount || 0) - (emi.paidPrincipal || 0);

          // Only defer if there's actually principal left to collect
          if (remainingPrincipalAfterIO > 0.01) {
            // Find next EMI slot
            const nextInstNum = emi.installmentNumber + 1;
            const existingNext = await tx.offlineLoanEMI.findFirst({
              where: { offlineLoanId: emi.offlineLoanId, installmentNumber: nextInstNum }
            });
            // If slot N+1 is taken, shift ALL subsequent EMIs +1 first (highest first to avoid unique clash)
            if (existingNext) {
              const subsequentEmis = await tx.offlineLoanEMI.findMany({
                where: { offlineLoanId: emi.offlineLoanId, installmentNumber: { gte: nextInstNum } },
                orderBy: { installmentNumber: 'desc' }
              });
              for (const sub of subsequentEmis) {
                const shiftedDue = new Date(sub.dueDate);
                shiftedDue.setMonth(shiftedDue.getMonth() + 1);
                await tx.offlineLoanEMI.update({ where: { id: sub.id }, data: { installmentNumber: sub.installmentNumber + 1, dueDate: shiftedDue } });
              }
              console.log(`[Interest-Only] Shifted ${subsequentEmis.length} subsequent EMIs +1 to free slot #${nextInstNum}`);
            }
            // Slot N+1 is now free — insert deferred principal EMI
            const newEmiDueDate = new Date(emi.dueDate);
            newEmiDueDate.setMonth(newEmiDueDate.getMonth() + 1);
            // Deferred EMI = copy of original EMI for the next month:
            // - Same principal (deferred) + FRESH interest computed from loan rate
            // IMPORTANT: Do NOT copy emi.interestAmount — that EMI might be the "last"
            // (reduced) EMI with a smaller interest amount (e.g., ₹20 instead of ₹200).
            // Always recompute interest from the loan's interestRate and outstandingPrincipal.
            // IMPORTANT: Do NOT blindly recompute using reducing-balance formula 
            // since offline loans are typically FLAT interest.
            // For FLAT, the interest per month is constant.
            // In 99% of cases, the current EMI's interest is the correct flat monthly interest.
            // The only exception is the LAST EMI, which might be reduced. So we can use 
            // the standard EMI interest as a safe fallback.
            const standardEmiInterest = emi.offlineLoan.emiAmount && emi.offlineLoan.loanAmount && emi.offlineLoan.tenure
              ? Math.max(0, Number(emi.offlineLoan.emiAmount) - Number(emi.offlineLoan.loanAmount) / emi.offlineLoan.tenure)
              : 0;
            
            // Prefer the current EMI's interest, unless it's drastically lower than the standard (which means it's a reduced last EMI)
            const currentInterest = Number(emi.interestAmount) || 0;
            const deferredInterest = Math.max(currentInterest, standardEmiInterest);
            console.log(`[Interest-Only Deferred] Extracted standard flat interest: ₹${deferredInterest}`);
            await tx.offlineLoanEMI.create({
              data: {
                offlineLoanId: emi.offlineLoanId,
                installmentNumber: nextInstNum,
                dueDate: newEmiDueDate,
                principalAmount: remainingPrincipalAfterIO,
                interestAmount: deferredInterest,   // full interest for next month
                totalAmount: remainingPrincipalAfterIO + deferredInterest,
                outstandingPrincipal: emi.outstandingPrincipal,
                paymentStatus: 'PENDING',
                isDeferred: true,
                deferredFromEMI: emi.installmentNumber,
                notes: `Deferred from Interest-Only payment on EMI #${emi.installmentNumber} — P:₹${remainingPrincipalAfterIO.toFixed(2)} + I:₹${deferredInterest.toFixed(2)}`
              }
            });
            console.log(`[Interest-Only Deferred] Created deferred EMI #${nextInstNum}: P:₹${remainingPrincipalAfterIO} + I:₹${deferredInterest} = ₹${remainingPrincipalAfterIO + deferredInterest}`);

            // ── INCREMENT mirrorTenure to keep the "Extra EMI" boundary correct ──────
            // When a deferred EMI is inserted at position N+1, ALL subsequent EMIs shift
            // forward by 1 (e.g. old EMI #10 becomes #11). If mirrorTenure was 10, the
            // old #10 would now be at #11 and incorrectly tagged as Extra EMI (Personal Credit).
            // Solution: expand mirrorTenure by 1 so the SAME original EMIs stay within it.
            if (mirrorLoanMapping) {
              await tx.mirrorLoanMapping.update({
                where: { id: mirrorLoanMapping.id },
                data:  { mirrorTenure: mirrorLoanMapping.mirrorTenure + 1 }
              });
              // Update local mirror mapping so subsequent logic in this request uses new tenure
              mirrorLoanMapping.mirrorTenure += 1;
              console.log(`[Interest-Only] mirrorTenure incremented to ${mirrorLoanMapping.mirrorTenure} to preserve Extra EMI boundary`);
            }
          } else {
            console.log(`[Interest-Only Deferred] No principal left to defer (already paid: ₹${emi.paidPrincipal || 0}) — skipping`);
          }
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
            const isInterestOnlyPmt = paymentStatus === 'INTEREST_ONLY_PAID';

            if (isInterestOnlyPmt) {
              // Mark mirror EMI as INTEREST_ONLY_PAID and create deferred principal EMI
              const mirrorRemInt = Math.max(0, (mirrorEmi.interestAmount || 0) - (mirrorEmi.paidInterest || 0));
              await tx.offlineLoanEMI.update({
                where: { id: mirrorEmi.id },
                data: {
                  paymentStatus: 'INTEREST_ONLY_PAID',
                  paidAmount:    (mirrorEmi.paidAmount   || 0) + mirrorRemInt,
                  paidInterest:  (mirrorEmi.paidInterest || 0) + mirrorRemInt,
                  paidPrincipal:  mirrorEmi.paidPrincipal || 0,
                  paidDate:      now, paymentMode,
                  collectedById: userId, collectedByName: user.name, collectedAt: now,
                  notes: `[MIRROR SYNC] Interest-Only: I:₹${mirrorRemInt} collected, principal deferred`
                }
              });
              const mirrorRemPrin = Math.max(0, (mirrorEmi.principalAmount || 0) - (mirrorEmi.paidPrincipal || 0));
              if (mirrorRemPrin > 0.01) {
                const mNextInst = mirrorEmi.installmentNumber + 1;
                const mExisting = await tx.offlineLoanEMI.findFirst({ where: { offlineLoanId: mirrorLoanMapping.mirrorLoanId, installmentNumber: mNextInst } });
                if (mExisting) {
                  const mSubs = await tx.offlineLoanEMI.findMany({ where: { offlineLoanId: mirrorLoanMapping.mirrorLoanId, installmentNumber: { gte: mNextInst } }, orderBy: { installmentNumber: 'desc' } });
                  for (const ms of mSubs) {
                    const mDue = new Date(ms.dueDate); mDue.setMonth(mDue.getMonth() + 1);
                    await tx.offlineLoanEMI.update({ where: { id: ms.id }, data: { installmentNumber: ms.installmentNumber + 1, dueDate: mDue } });
                  }
                }
                const mNewDue = new Date(mirrorEmi.dueDate); mNewDue.setMonth(mNewDue.getMonth() + 1);
                // Compute fresh mirror interest from the mirror loan's interest rate
                // For FLAT loans, just mirror the existing interest amount
                const mirrorLoanRate   = mirrorLoanMapping.mirrorInterestRate || 0;
                const mDeferredInterest = Number(mirrorEmi.interestAmount) || 0;
                await tx.offlineLoanEMI.create({ data: {
                  offlineLoanId: mirrorLoanMapping.mirrorLoanId, installmentNumber: mNextInst, dueDate: mNewDue,
                  principalAmount: mirrorRemPrin, interestAmount: mDeferredInterest,
                  totalAmount: mirrorRemPrin + mDeferredInterest,
                  outstandingPrincipal: mirrorEmi.outstandingPrincipal, paymentStatus: 'PENDING',
                  isDeferred: true, deferredFromEMI: mirrorEmi.installmentNumber,
                  notes: `[MIRROR] Deferred from IO sync on EMI #${mirrorEmi.installmentNumber} — P:₹${mirrorRemPrin.toFixed(2)} + I:₹${mDeferredInterest.toFixed(2)} (rate:${mirrorLoanRate}%)`
                }});
                console.log(`[Mirror IO Deferred] Created deferred EMI #${mNextInst} for mirror loan: I:₹${mDeferredInterest} at ${mirrorLoanRate}%`);
              }
            } else if (paymentType === 'PRINCIPAL_ONLY') {
              // ── PRINCIPAL_ONLY: Only principal is collected, interest is written off ──
              // Use MIRROR principal (not original), MIRROR interest goes to Irrecoverable Debt
              const mirrorPrincipalToCollect = Math.max(0, (mirrorEmi.principalAmount || 0) - (mirrorEmi.paidPrincipal || 0));
              const mirrorInterestToWriteOff = Math.max(0, (mirrorEmi.interestAmount || 0) - (mirrorEmi.paidInterest || 0));
              
              await tx.offlineLoanEMI.update({
                where: { id: mirrorEmi.id },
                data: {
                  paymentStatus: 'PAID',
                  paidAmount: (mirrorEmi.paidAmount || 0) + mirrorPrincipalToCollect,
                  paidPrincipal: mirrorEmi.principalAmount,  // MIRROR principal (e.g., Rs 981)
                  paidInterest: mirrorEmi.paidInterest || 0,  // NOT collected - will be written off
                  paidDate: now,
                  paymentMode,
                  collectedById: userId,
                  collectedByName: user.name,
                  collectedAt: now,
                  notes: `[MIRROR SYNC] Principal-Only: P:₹${mirrorPrincipalToCollect} collected, I:₹${mirrorInterestToWriteOff} written off to Irrecoverable Debt`
                }
              });
              console.log(`[Mirror PRINCIPAL_ONLY] P:₹${mirrorPrincipalToCollect} collected, I:₹${mirrorInterestToWriteOff} → Irrecoverable Debt`);
            } else if (isFullPayment) {
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
              // INTEREST-FIRST allocation for mirror partial:
              // Use SESSION DELTA (not cumulative) for ratio — prevents re-recording already-paid interest.
              // Example: Payment 1 (session=100, total=400) → ratio 0.25
              //          Payment 2 (session=400, total=400) → ratio 1.0
              // mirrorPaidAmount = mirrorTotal * ratio = THIS session's mirror portion only.
              const mirrorPaymentRatio = emi.totalAmount > 0
                ? Math.min(sessionAmount / emi.totalAmount, 1)   // SESSION delta, not cumulative
                : 0;
              const mirrorPaidAmount = Math.round(mirrorEmi.totalAmount * mirrorPaymentRatio * 100) / 100;

              // Interest-first: only charge remaining interest not yet collected
              const mirrorRemainingInterest = Math.max(0, (mirrorEmi.interestAmount || 0) - (mirrorEmi.paidInterest || 0));
              const mirrorPaidInterest  = Math.min(mirrorPaidAmount, mirrorRemainingInterest);
              const mirrorPaidPrincipal = Math.max(0, Math.round((mirrorPaidAmount - mirrorPaidInterest) * 100) / 100);

              // ACCUMULATE — do NOT overwrite paidInterest/paidPrincipal/paidAmount
              // Overwriting was the root cause of interest being double-charged on 3rd partial
              const newMirrorPaidInterest  = (mirrorEmi.paidInterest  || 0) + mirrorPaidInterest;
              const newMirrorPaidPrincipal = (mirrorEmi.paidPrincipal || 0) + mirrorPaidPrincipal;
              const newMirrorPaidAmount    = (mirrorEmi.paidAmount    || 0) + mirrorPaidAmount;
              const newMirrorStatus = newMirrorPaidAmount >= mirrorEmi.totalAmount - 0.01 ? 'PAID' : 'PARTIALLY_PAID';

              await tx.offlineLoanEMI.update({
                where: { id: mirrorEmi.id },
                data: {
                  paymentStatus: newMirrorStatus,
                  paidAmount:    newMirrorPaidAmount,
                  paidPrincipal: newMirrorPaidPrincipal,
                  paidInterest:  newMirrorPaidInterest,
                  paidDate:      now,
                  paymentMode,
                  collectedById:   userId,
                  collectedByName: user.name,
                  collectedAt:     now,
                  notes: `[MIRROR SYNC] Partial session (${Math.round(mirrorPaymentRatio * 100)}%) – I:₹${mirrorPaidInterest} P:₹${mirrorPaidPrincipal} | cumulative I:₹${newMirrorPaidInterest} P:₹${newMirrorPaidPrincipal}`
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
          console.log(`[Auto-Close] ✅ Original loan ${emi.offlineLoan.loanNumber} auto-closed — all EMIs paid`);

          // Also auto-close the mirror loan if it exists
          const mappingForClose = await tx.mirrorLoanMapping.findFirst({
            where: { originalLoanId: emi.offlineLoanId, isOfflineLoan: true },
            select: { mirrorLoanId: true }
          });
          if (mappingForClose?.mirrorLoanId) {
            const mirrorEmis = await tx.offlineLoanEMI.findMany({
              where: { offlineLoanId: mappingForClose.mirrorLoanId },
              select: { paymentStatus: true }
            });
            const mirrorAllPaid = mirrorEmis.length === 0 ||
              mirrorEmis.every(e => e.paymentStatus === 'PAID' || e.paymentStatus === 'INTEREST_ONLY_PAID' || e.paymentStatus === 'WAIVED');
            if (mirrorAllPaid) {
              await tx.offlineLoan.update({
                where: { id: mappingForClose.mirrorLoanId },
                data: { status: 'CLOSED', closedAt: now }
              });
              console.log(`[Auto-Close] ✅ Mirror loan also auto-closed alongside original`);
            }
          }
        }


        return updated;
      }, { maxWait: 10000, timeout: 30000 }); // 30s — INTEREST_ONLY shifts ≥N EMI rows

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
      

      // ============================================
      // PROCESSING FEE INCOME — Only for EMI #1 on mirror loans
      // DYNAMIC CALC: processingFee = regularEMI - lastMirrorEMI
      // "Last EMI" was shifted to installment #1 in the mirror schedule.
      // Recorded as income for the MIRROR company (not original).
      // ============================================
      if (paymentStatus === 'PAID' && emi.installmentNumber === 1 && mirrorLoanMapping) {
        try {
          const fullMapping = await db.mirrorLoanMapping.findFirst({
            where: { id: mirrorLoanMapping.id },
            select: { mirrorProcessingFee: true, processingFeeRecorded: true, mirrorCompanyId: true, mirrorLoanId: true }
          });

          if (fullMapping && !fullMapping.processingFeeRecorded) {
            const mirrorCoId = fullMapping.mirrorCompanyId;

            // ── DYNAMIC CALCULATION ──────────────────────────────────────────
            // regularEMI = the standard EMI amount of the original offline loan
            const regularEMI = emi.offlineLoan.emiAmount ?? emi.totalAmount;

            // lastMirrorEMI = mirror installment #1 (shifted from last position)
            let dynamicProcFee = 0;
            if (fullMapping.mirrorLoanId) {
              const firstMirrorEMI = await db.offlineLoanEMI.findFirst({
                where: {
                  offlineLoanId: fullMapping.mirrorLoanId,
                  installmentNumber: 1        // shifted last EMI → position 1
                },
                select: { totalAmount: true }
              });
              if (firstMirrorEMI) {
                dynamicProcFee = Math.max(0, Math.round((regularEMI - firstMirrorEMI.totalAmount) * 100) / 100);
              }
            }

            // Fallback to stored value if dynamic calc gives 0
            const procFee = dynamicProcFee > 0 ? dynamicProcFee : (fullMapping.mirrorProcessingFee ?? 0);

            console.log(`[Processing Fee] Dynamic calc: regularEMI=₹${regularEMI} - lastMirrorEMI=₹${regularEMI - procFee} = ₹${procFee}`);

            if (procFee > 0) {
              const isPfOnline = paymentMode === 'ONLINE' || paymentMode === 'UPI' || paymentMode === 'BANK_TRANSFER';

              // FIX-ISSUE-11: ATOMIC operation — cashbook/bank entry + flag in same $transaction
              await db.$transaction(async (pfTx) => {
                if (isPfOnline) {
                  // ── ONLINE: route processing fee to BANK ACCOUNT ──────────────
                  const existingPF = await pfTx.bankTransaction.findFirst({
                    where: { referenceType: 'PROCESSING_FEE', referenceId: emi.offlineLoanId }
                  });
                  if (!existingPF) {
                    // Find mirror company's bank account
                    const mirrorBank = await pfTx.bankAccount.findFirst({
                      where: { companyId: mirrorCoId, isActive: true },
                      orderBy: { isDefault: 'desc' }
                    });
                    if (mirrorBank) {
                      const newBankBal = (mirrorBank.currentBalance || 0) + procFee;
                      await pfTx.bankTransaction.create({
                        data: {
                          bankAccountId: mirrorBank.id,
                          transactionType: 'CREDIT',
                          amount: procFee,
                          balanceAfter: newBankBal,
                          description: `Processing Fee Collection - ${emi.offlineLoan.loanNumber} (Last EMI ₹${regularEMI - procFee} vs Regular EMI ₹${regularEMI})`,
                          referenceType: 'PROCESSING_FEE',
                          referenceId: emi.offlineLoanId,
                          createdById: userId
                        }
                      });
                      await pfTx.bankAccount.update({ where: { id: mirrorBank.id }, data: { currentBalance: newBankBal } });
                    } else {
                      // No bank — fall back to cashbook
                      const cashBook = await pfTx.cashBook.findUnique({ where: { companyId: mirrorCoId } })
                        || await pfTx.cashBook.create({ data: { companyId: mirrorCoId, currentBalance: 0 } });
                      const newBal = cashBook.currentBalance + procFee;
                      await pfTx.cashBookEntry.create({
                        data: {
                          cashBookId: cashBook.id, entryType: 'CREDIT', amount: procFee, balanceAfter: newBal,
                          description: `[Bank Fallback] Processing Fee - ${emi.offlineLoan.loanNumber}`,
                          referenceType: 'PROCESSING_FEE', referenceId: emi.offlineLoanId, createdById: userId
                        }
                      });
                      await pfTx.cashBook.update({ where: { id: cashBook.id }, data: { currentBalance: newBal } });
                    }
                    // Mark as recorded
                    await pfTx.mirrorLoanMapping.update({
                      where: { id: mirrorLoanMapping!.id },
                      data: { processingFeeRecorded: true }
                    });
                  }
                } else {
                  // ── CASH: route processing fee to CASHBOOK ─────────────────────
                  const existingPF = await pfTx.cashBookEntry.findFirst({
                    where: { referenceType: 'PROCESSING_FEE', referenceId: emi.offlineLoanId }
                  });
                  if (!existingPF) {
                    const cashBook = await pfTx.cashBook.findUnique({ where: { companyId: mirrorCoId } })
                      || await pfTx.cashBook.create({ data: { companyId: mirrorCoId, currentBalance: 0 } });
                    const newBal = cashBook.currentBalance + procFee;
                    await pfTx.cashBookEntry.create({
                      data: {
                        cashBookId: cashBook.id, entryType: 'CREDIT', amount: procFee, balanceAfter: newBal,
                        description: `Processing Fee Collection - ${emi.offlineLoan.loanNumber} (Last EMI ₹${regularEMI - procFee} vs Regular EMI ₹${regularEMI})`,
                        referenceType: 'PROCESSING_FEE', referenceId: emi.offlineLoanId, createdById: userId
                      }
                    });
                    await pfTx.cashBook.update({ where: { id: cashBook.id }, data: { currentBalance: newBal } });
                    await pfTx.mirrorLoanMapping.update({
                      where: { id: mirrorLoanMapping!.id },
                      data: { processingFeeRecorded: true }
                    });
                  }
                }
              }, { maxWait: 15000, timeout: 30000 });

              // ── Journal Entry for Processing Fee in MIRROR company ──────────
              // Dr: Cash/Bank (based on paymentMode) → money received
              // Cr: Processing Fees (4121) → income recognised
              try {
                const { AccountingService: PFAccSvc } = await import('@/lib/accounting-service');
                const pfAccService = new PFAccSvc(mirrorCoId);
                await pfAccService.initializeChartOfAccounts();
                await pfAccService.recordProcessingFee({
                  loanId: emi.offlineLoanId,
                  customerId: emi.offlineLoan.customerId || '',
                  amount: procFee,
                  collectionDate: new Date(),
                  createdById: userId || 'SYSTEM',
                  paymentMode: paymentMode || 'CASH',  // Pass actual paymentMode so journal debits correct account
                });
                console.log(`[Processing Fee Journal] ₹${procFee} journal entry (${isPfOnline ? 'BANK' : 'CASH'}) for MIRROR company ${mirrorCoId}`);
              } catch (pfJournalErr) {
                console.error('[Processing Fee Journal] Failed (non-critical):', pfJournalErr);
              }

              console.log(`[Processing Fee] ₹${procFee} income recorded for MIRROR company ${mirrorCoId} on EMI#1 of ${emi.offlineLoan.loanNumber}`);
            } else {
              await db.mirrorLoanMapping.update({
                where: { id: mirrorLoanMapping.id },
                data: { processingFeeRecorded: true }
              });
              console.log(`[Processing Fee] ₹0 fee — skipping (regularEMI=${regularEMI})`);
            }
          }
        } catch (pfErr) {
          console.error('[Processing Fee] Failed to record processing fee (non-critical):', pfErr);
        }
      }



      // ─── ACCOUNTING BLOCK (outside DB transaction to avoid blocking payment) ─────
      // RULE: Accounting is PURELY STATUS-DRIVEN.
      //   Entries only fire when EMI = PAID | INTEREST_ONLY_PAID | PARTIALLY_PAID
      //   Same rule as emi/pay/route.ts — both routes are consistent.
      //   No button, no retry, no manual call can create a duplicate.
      const accountingWarnings: string[] = [];

      // ── STATUS GATE ─────────────────────────────────────────────────────────
      const isOfflineTerminalPaidState = (
        paymentStatus === 'PAID' ||
        paymentStatus === 'PARTIALLY_PAID' ||
        paymentStatus === 'INTEREST_ONLY_PAID'
      );
      if (!isOfflineTerminalPaidState) {
        console.log(`[Accounting] Skipping offline EMI accounting — status '${paymentStatus}' is not a terminal paid state.`);
      } else
      try {
        const isMirrorLoan = !!mirrorLoanMapping && !isExtraEMI;

        // ── Determine effective company for accounting ────────────────────────
        // For C3 (PD Rangani) non-mirror loans: ALWAYS go to C3 cashbook (no bank)
        // loanCompanyId can be null for legacy loans — use company3Id as fallback
        const loanCompanyId = emi.offlineLoan.companyId || company3Id || '';
        const isLoanFromC3 = company3Id && loanCompanyId === company3Id;

        // FIX-ISSUE-3: Force CASH mode for C3 loans (C3 has no bank account)
        const effectivePaymentMode = (isLoanFromC3 && !isMirrorLoan)
          ? 'CASH'
          : (paymentMode as string);

        const targetCompanyId = isMirrorLoan
          ? mirrorLoanMapping!.mirrorCompanyId
          : loanCompanyId;

        // ── FIX-ISSUE-4: Secondary payment page credit for C3 non-mirror loans ──
        // If this is a C3 non-mirror loan with a secondaryPaymentPageId, route credit to that user
        // emi.offlineLoan is already fetched via include: { offlineLoan: true } above
        const c3SecondaryPageId = (!isMirrorLoan && isLoanFromC3)
          ? (emi.offlineLoan as any).secondaryPaymentPageId || null
          : null;

        let c3SecondaryRoleId: string | null = null;
        if (c3SecondaryPageId) {
          const secPage = await db.secondaryPaymentPage.findUnique({
            where: { id: c3SecondaryPageId },
            select: { roleId: true }
          });
          c3SecondaryRoleId = secPage?.roleId || null;
          if (c3SecondaryRoleId) {
            // Increase personal credit of secondary page owner
            await db.user.update({
              where: { id: c3SecondaryRoleId },
              data: {
                personalCredit: { increment: actualPaymentAmount },
                credit: { increment: actualPaymentAmount },
              }
            });
            console.log(`[C3 Secondary Page] ₹${actualPaymentAmount} credited to secondary page user ${c3SecondaryRoleId}`);
          }
        }
        
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
            // ── PRINCIPAL_ONLY: Use MIRROR EMI's principal and interest directly ──
            // For PRINCIPAL_ONLY, we write off the mirror interest (not collect it)
            // So we use the mirror EMI's full interest amount, not session delta
            if (paymentType === 'PRINCIPAL_ONLY') {
              mirrorPrincipalAmount = Number(mirrorEmiForAccounting.principalAmount || 0);
              mirrorInterestAmount = Number(mirrorEmiForAccounting.interestAmount || 0);
              console.log(`[Accounting] MIRROR PRINCIPAL_ONLY: Using MIRROR EMI values directly - P:₹${mirrorPrincipalAmount} (to collect), I:₹${mirrorInterestAmount} (to write off)`);
            } else {
              // For other payment types: Use SESSION DELTA — only what was paid this session on the mirror EMI.
              // paidInterest after sync  - paidInterest before sync = interest paid THIS session.
              // This correctly handles:
              //   • 1st partial (₹90): pre=0, post=84.18 → sessionI=84.18, sessionP=5.82 ✓
              //   • 2nd remaining (₹910): pre=84.18, post=84.18 → sessionI=0, sessionP=910 ✓
              const postPaidInterest  = Number(mirrorEmiForAccounting.paidInterest  || 0);
              const postPaidPrincipal = Number(mirrorEmiForAccounting.paidPrincipal || 0);
              mirrorInterestAmount  = Math.max(0, Math.round((postPaidInterest  - mirrorEmiPreSyncPaidInterest)  * 100) / 100);
              mirrorPrincipalAmount = Math.max(0, Math.round((postPaidPrincipal - mirrorEmiPreSyncPaidPrincipal) * 100) / 100);
              console.log(`[Accounting] MIRROR Session Delta: I:₹${mirrorInterestAmount} P:₹${mirrorPrincipalAmount} (pre: I:₹${mirrorEmiPreSyncPaidInterest} P:₹${mirrorEmiPreSyncPaidPrincipal}, post: I:₹${postPaidInterest} P:₹${postPaidPrincipal})`  );
            }
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
          // Unique payment reference per accounting entry.
          // PARTIAL payments get a per-session suffix (cumulative paise) so each partial
          // creates its own journal while still being idempotent for network retries.
          // FULL/ADVANCE/INTEREST_ONLY use emi.id directly (one entry per EMI).
          const cumulativePaidPaise = Math.round((Number(updatedEmi.paidAmount) || 0) * 100);
          const uniquePaymentId = (paymentType === 'PARTIAL')
            ? `${updatedEmi.id}-P${cumulativePaidPaise}`
            : paymentType === 'PRINCIPAL_ONLY'
              ? `${updatedEmi.id}-PO-${cumulativePaidPaise}`
              : updatedEmi.id;

          // Apply staff-override split for journal entry (FULL payment only)
          const journalPrincipal = (paymentType === 'FULL' && staffPrincipal !== undefined && staffInterest !== undefined)
            ? Number(staffPrincipal)
            : paidPrincipal;
          const journalInterest = (paymentType === 'FULL' && staffPrincipal !== undefined && staffInterest !== undefined)
            ? Number(staffInterest)
            : paidInterest;
          if (staffPrincipal !== undefined) {
            console.log(`[Offline EMI] Staff split override: P ₹${journalPrincipal} + I ₹${journalInterest}`);
          }
          // Use the comprehensive accounting function
          // FIX-ISSUE-3: Pass effectivePaymentMode (forced CASH for C3) so journal debits correct account
          // FIX-ISSUE-7: null-guard company3Id to prevent silent accounting skip
          // ALWAYS use session deltas (not cumulative) for accounting
          // journalPrincipal/journalInterest are CUMULATIVE which caused:
          //   Payment 1: records I=56.11  ✅
          //   Payment 2: records I=56.11 AGAIN ❌ (cumulative still 56.11)
          //   Payment 4+: same double-charge bug on every subsequent payment
          // sessionPrincipal/sessionInterest = only what was paid THIS request
          const acctPrincipal = sessionPrincipal;
          const acctInterest  = sessionInterest;
          let accountingResult: { bankTransaction?: any; cashBookEntry?: any; journalEntryId?: string } = {};
          if (paymentType === 'PRINCIPAL_ONLY') {
            // ── PRINCIPAL-ONLY: Journal entry handles everything (no separate CashBook entry needed) ──
            // The journal entry creates:
            //   Dr  Cash/Bank        = principalAmount  (money received)
            //   Cr  Loans Receivable = principalAmount  (loan reduced)
            //   Dr  Irrecoverable Debt = interestWrittenOff (interest lost)
            //   Cr  Interest Income    = interestWrittenOff (interest recognized then written off)
            //
            // IMPORTANT: For MIRROR loans, ONLY create journal in MIRROR company (no original company entry)
            // Use MIRROR interest for write-off, NOT the original interest
            
            const { recordPrincipalOnlyJournal } = await import('@/lib/simple-accounting');
            
            if (isMirrorLoan && mirrorLoanMapping?.mirrorCompanyId) {
              // ── MIRROR LOAN: Only record in MIRROR company ─────────────────────────────
              // Use MIRROR principal and MIRROR interest (not original)
              const mirrorPrincipal = mirrorPrincipalAmount || 0;
              const mirrorInterest = mirrorInterestAmount || 0;
              
              if (mirrorPrincipal > 0) {
                const mirrorJournalResult = await recordPrincipalOnlyJournal({
                  companyId:          mirrorLoanMapping.mirrorCompanyId,
                  loanId:             mirrorLoanMapping.mirrorLoanId || emi.offlineLoanId,
                  paymentId:          uniquePaymentId,
                  principalAmount:    mirrorPrincipal,
                  interestWrittenOff: mirrorInterest,  // Use MIRROR interest for write-off
                  paymentDate:        new Date(),
                  createdById:        userId,
                  paymentMode:        effectivePaymentMode || 'CASH',
                  loanNumber:         emi.offlineLoan.loanNumber,
                  installmentNumber:  emi.installmentNumber,
                });
                if (!mirrorJournalResult.success) {
                  accountingWarnings.push(`MIRROR PRINCIPAL_ONLY journal: ${mirrorJournalResult.error}`);
                  console.error(`[Accounting] MIRROR PRINCIPAL_ONLY ❌:`, mirrorJournalResult.error);
                } else {
                  console.log(`[Accounting] MIRROR PRINCIPAL_ONLY ✅: P:₹${mirrorPrincipal} collected, I:₹${mirrorInterest} → Irrecoverable Debt (MIRROR company only)`);
                }
              }
              // For mirror loans: PRINCIPAL_ONLY journal is in mirror company only.
              // The mirror company books the loan asset reduction + irrecoverable debt write-off.
            } else {
              // ── NON-MIRROR LOAN: Record in original company ─────────────────────────────
              // IMPORTANT: Use explicit Number() conversion directly from emi fields.
              // sessionPrincipal (delta) can be 0 if Prisma Decimal fields don't coerce
              // correctly in arithmetic — explicit calculation is more robust.
              // Use sessionPrincipal (delta this payment) as primary source.
              // Fall back to emi.principalAmount if session delta is 0 due to Prisma Decimal coercion.
              const principalToCollect = sessionPrincipal > 0
                ? sessionPrincipal
                : Math.max(0, Number(emi.principalAmount ?? 0) - Number(previousState.paidPrincipal ?? 0));
              const interestToWriteOff = sessionInterestWrittenOff > 0
                ? sessionInterestWrittenOff
                : Math.max(0, Number(emi.interestAmount ?? 0) - Number(previousState.paidInterest ?? 0));
              console.log(`[Principal-Only] principalToCollect=₹${principalToCollect}, interestToWriteOff=₹${interestToWriteOff} (sessionP=${sessionPrincipal}, emi.P=${emi.principalAmount}, prev.paidP=${previousState.paidPrincipal})`);

              if (principalToCollect <= 0) {
                console.warn(`[Principal-Only] ⚠️ principalToCollect=0 — skipping journal. EMI may already be principal-paid or principalAmount is missing.`);
              } else {
                const journalResult = await recordPrincipalOnlyJournal({
                  companyId:          targetCompanyId,
                  company3Id:         company3Id || undefined,
                  creditType:         creditTypeUsed as 'PERSONAL' | 'COMPANY',
                  loanId:             emi.offlineLoanId,
                  paymentId:          uniquePaymentId,
                  principalAmount:    principalToCollect,
                  interestWrittenOff: interestToWriteOff,
                  paymentDate:        new Date(),
                  createdById:        userId,
                  paymentMode:        effectivePaymentMode || 'CASH',
                  loanNumber:         emi.offlineLoan.loanNumber,
                  installmentNumber:  emi.installmentNumber,
                });
                if (!journalResult.success) {
                  accountingWarnings.push(`PRINCIPAL_ONLY journal: ${journalResult.error}`);
                  console.error(`[Principal-Only] ❌ Journal FAILED:`, journalResult.error);
                } else {
                  console.log(`[Principal-Only] ✅ Journal ${journalResult.journalEntryId}: P:₹${principalToCollect} collected, I:₹${interestToWriteOff}→Irrecoverable Debt`);
                }
              }
            }
            console.log(`[Accounting] PRINCIPAL_ONLY: P:₹${sessionPrincipal} collected, I:₹${sessionInterestWrittenOff} written off`);
          } else {
            accountingResult = await recordEMIPaymentAccounting({
              // FIX: For split payment, only the CASH portion goes to cashbook.
              // The online portion is recorded separately via recordBankTransaction below.
              amount: (isSplitPayment && splitCashAmt > 0) ? splitCashAmt : actualPaymentAmount,
              principalComponent: acctPrincipal,
              interestComponent: acctInterest,
              // FIX: Force CASH mode for split so recordEMIPaymentAccounting routes to Cashbook only.
              // The bank portion will be added separately (or handled by mirror split logic).
              paymentMode: (isSplitPayment ? 'CASH' : effectivePaymentMode || 'CASH') as 'CASH' | 'ONLINE' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE',
              paymentType: paymentType || 'FULL',
              creditType: creditTypeUsed as 'PERSONAL' | 'COMPANY',
              loanCompanyId: loanCompanyId || (company3Id ?? ''),
              company3Id: company3Id || loanCompanyId,
              loanId: emi.offlineLoanId,
              emiId: emi.id,
              paymentId: uniquePaymentId,
              loanNumber: emi.offlineLoan.loanNumber,
              installmentNumber: emi.installmentNumber,
              userId,
              customerId: emi.offlineLoan.customerId || undefined,
              mirrorLoanId: mirrorLoanMapping?.mirrorLoanId || undefined,
              mirrorPrincipal: isMirrorLoan ? mirrorPrincipalAmount : undefined,
              mirrorInterest: isMirrorLoan ? mirrorInterestAmount : undefined,
              mirrorCompanyId: mirrorLoanMapping?.mirrorCompanyId || undefined,
              isMirrorPayment: isMirrorLoan,
              // Pass split details so mirror loan path can proportion cash/online correctly
              isSplitPayment: isSplitPayment || false,
              splitCashAmount: splitCashAmt,
              splitOnlineAmount: splitOnlineAmt,
            });
            console.log(`[Accounting] EMI Payment recorded — Journal: ${accountingResult.journalEntryId ? 'Yes' : 'MISSING ❌'}`);

            // ── SPLIT PAYMENT: add separate ONLINE bank entry for the online portion ──
            // For NON-MIRROR loans: recordEMIPaymentAccounting recorded cashbook (CASH mode).
            // Now we credit the online portion to the Bank Account.
            // For MIRROR loans: the split is handled internally in recordEMIPaymentAccounting.
            if (isSplitPayment && splitOnlineAmt > 0 && !isMirrorLoan) {
              try {
                await recordBankTransaction({
                  companyId: targetCompanyId || loanCompanyId,
                  transactionType: 'CREDIT',
                  amount: splitOnlineAmt,
                  description: `SPLIT (Online portion) - ${emi.offlineLoan.loanNumber} EMI #${emi.installmentNumber}`,
                  referenceType: 'EMI_PAYMENT_SPLIT_ONLINE',
                  referenceId: `${updatedEmi.id}-SPLIT-ONLINE`,
                  createdById: userId,
                });
                console.log(`[Accounting] SPLIT: ₹${splitCashAmt} → Cashbook, ₹${splitOnlineAmt} → Bank Account`);
              } catch (splitErr) {
                console.error('[Accounting] SPLIT bank entry failed (non-critical):', splitErr);
              }
            }
          } // end else (non-PRINCIPAL_ONLY)

          console.log(`[Accounting] EMI Payment recorded:`);
          console.log(`  - Type: ${isMirrorLoan ? 'MIRROR' : (isExtraEMI ? 'EXTRA' : 'REGULAR')}`);
          console.log(`  - Credit: ${creditTypeUsed}`);
          console.log(`  - Mode: ${paymentMode}`);
          console.log(`  - Target Company: ${targetCompanyId}`);
          if (isMirrorLoan) {
            console.log(`  - Mirror Interest Recorded: ₹${mirrorInterestAmount}`);
          }
          if (paymentType !== 'PRINCIPAL_ONLY') {
            console.log(`  - Bank Entry: ${accountingResult.bankTransaction ? 'Yes' : 'No'}`);
            console.log(`  - Cashbook Entry: ${accountingResult.cashBookEntry ? 'Yes' : 'No'}`);
            console.log(`  - Journal Entry: ${accountingResult.journalEntryId ? 'Yes (' + accountingResult.journalEntryId + ')' : 'MISSING ❌'}`);
          }

          // ── FALLBACK: If journal wasn't created, try directly ──────────────────
          if (isMirrorLoan && paymentType !== 'PRINCIPAL_ONLY' && !accountingResult.journalEntryId && mirrorLoanMapping?.mirrorCompanyId) {
            console.warn('[Accounting] ⚠️ Journal missing — attempting inline fallback');
            try {
              const { AccountingService: FbAccSvc, ACCOUNT_CODES: FbCodes } = await import('@/lib/accounting-service');
              const fbSvc = new FbAccSvc(mirrorLoanMapping.mirrorCompanyId);
              await fbSvc.initializeChartOfAccounts();

              const effectiveP = isMirrorLoan ? mirrorPrincipalAmount : paidPrincipal;
              const effectiveI = isMirrorLoan ? mirrorInterestAmount : paidInterest;
              const effectiveTotal = effectiveP + effectiveI;
              const isOnlineMode = paymentMode === 'ONLINE' || paymentMode === 'BANK_TRANSFER' || paymentMode === 'UPI';
              const debitCode = isOnlineMode ? FbCodes.BANK_ACCOUNT : FbCodes.CASH_IN_HAND;

              const fbLines: any[] = [
                { accountCode: debitCode, debitAmount: effectiveTotal, creditAmount: 0, loanId: emi.offlineLoanId, narration: `${isOnlineMode ? 'Bank' : 'Cash'} received - Mirror EMI #${emi.installmentNumber}` },
                { accountCode: FbCodes.INTEREST_INCOME, debitAmount: 0, creditAmount: effectiveI, loanId: emi.offlineLoanId, narration: `Mirror interest income - EMI #${emi.installmentNumber}` },
              ];
              if (effectiveP > 0) {
                fbLines.push({ accountCode: FbCodes.LOANS_RECEIVABLE, debitAmount: 0, creditAmount: effectiveP, loanId: emi.offlineLoanId, narration: `Principal repayment - EMI #${emi.installmentNumber}` });
              }

              const fbJournalId = await fbSvc.createJournalEntry({
                entryDate: new Date(),
                referenceType: 'MIRROR_EMI_PAYMENT',
                referenceId: uniquePaymentId,
                narration: `[FALLBACK] Mirror EMI #${emi.installmentNumber} - ${emi.offlineLoan.loanNumber} - ₹${effectiveTotal} (P:₹${effectiveP} + I:₹${effectiveI})`,
                lines: fbLines,
                createdById: userId || 'SYSTEM',
                paymentMode: paymentMode || 'CASH',
                isAutoEntry: true,
              });
              accountingResult.journalEntryId = fbJournalId; // mark success
              console.log(`[Accounting] ✅ FALLBACK journal created: ${fbJournalId}`);
            } catch (fbErr: any) {
              console.error('[Accounting] ❌ FALLBACK journal FAILED:', fbErr?.message);
            }
          }

          // ── ATOMICITY CHECK: No journal = EMI must stay UNPAID ─────────────────
          const journalWasCreated =
            paymentType === 'PRINCIPAL_ONLY'
            || !!(accountingResult.journalEntryId);

          if (!journalWasCreated) {
            console.error('[ATOMICITY] ❌ No journal — rolling back EMI to prevent ghost payment');
            try {
              await db.offlineLoanEMI.update({
                where: { id: emi.id },
                data: {
                  paidAmount:       emi.paidAmount       ?? 0,
                  paidPrincipal:    emi.paidPrincipal    ?? 0,
                  paidInterest:     emi.paidInterest     ?? 0,
                  paymentStatus:    (Number(emi.paidAmount ?? 0) > 0) ? 'PARTIALLY_PAID' : 'PENDING',
                  paidDate:         emi.paidDate         ?? null,
                  paymentMode:      emi.paymentMode      ?? null,
                  paymentReference: emi.paymentReference ?? null,
                  collectedById:    emi.collectedById    ?? null,
                  collectedByName:  emi.collectedByName  ?? null,
                  collectedAt:      emi.collectedAt      ?? null,
                  penaltyAmount:    emi.penaltyAmount    ?? 0,
                  penaltyPaid:      emi.penaltyPaid      ?? 0,
                },
              });
              console.log(`[ATOMICITY] ✏️ EMI ${emi.id} rolled back to UNPAID`);
            } catch (rbErr: any) {
              console.error('[ATOMICITY] ❌ ROLLBACK FAILED:', rbErr?.message);
            }
            return NextResponse.json({
              success: false,
              error: 'Payment could not be processed: accounting entry failed. No amount deducted. Please try again.',
              emiId: emi.id,
            }, { status: 500 });
          }
        } else {
          console.warn('[Accounting] Target company not found - skipping accounting entries');
        }
      } catch (accountingError: any) {
        const errMsg = accountingError?.message || String(accountingError);
        console.error('[ATOMICITY] ❌ Accounting FAILED — rolling back EMI to UNPAID:', {
          message: errMsg, emiId: updatedEmi.id,
        });

        // Roll back EMI to pre-payment state ――――――――――――――――――――――――――――――――――
        try {
          await db.offlineLoanEMI.update({
            where: { id: emi.id },
            data: {
              paidAmount:      emi.paidAmount      ?? 0,
              paidPrincipal:   emi.paidPrincipal   ?? 0,
              paidInterest:    emi.paidInterest    ?? 0,
              paymentStatus:   (Number(emi.paidAmount ?? 0) > 0) ? 'PARTIALLY_PAID' : 'PENDING',
              paidDate:        emi.paidDate        ?? null,
              paymentMode:     emi.paymentMode     ?? null,
              paymentReference: emi.paymentReference ?? null,
              collectedById:   emi.collectedById   ?? null,
              collectedByName: emi.collectedByName ?? null,
              collectedAt:     emi.collectedAt     ?? null,
              penaltyAmount:   emi.penaltyAmount   ?? 0,
              penaltyPaid:     emi.penaltyPaid     ?? 0,
            },
          });
          console.log(`[ATOMICITY] ✏️ EMI ${emi.id} rolled back to UNPAID`);
        } catch (rbErr: any) {
          console.error('[ATOMICITY] ❌ ROLLBACK FAILED — DB inconsistency! Admin must fix manually.', rbErr?.message);
          try {
            await db.actionLog.create({
              data: {
                userId: userId || 'SYSTEM',
                action: 'ACCOUNTING_ROLLBACK_FAILED',
                module: 'OFFLINE_LOAN',
                recordId: emi.id,
                recordType: 'OfflineLoanEMI',
                description: `CRITICAL: EMI ${emi.id} (${emi.offlineLoan.loanNumber} #${emi.installmentNumber}) marked PAID but journal MISSING. Accounting error: ${errMsg}. Rollback failed: ${rbErr?.message}`,
                canUndo: false,
              } as any
            });
          } catch (_) { /* non-critical */ }
        }

        return NextResponse.json({
          success: false,
          error: 'Payment failed: accounting entry could not be created. Payment reversed. Please try again.',
          details: errMsg,
          emiId: emi.id,
        }, { status: 500 });
      }

      // ── OFFLINE LOAN PENALTY INCOME ──────────────────────────────────────
      // Record net penalty (charged minus waived) as Penalty Income in the company's books
      console.log(`[PAY-EMI] ⚡ PENALTY BLOCK CHECK → netPenalty=${netPenalty} | penaltyAmount=${penaltyAmount} | penaltyWaiver=${penaltyWaiver} | paymentMode=${paymentMode}`);
      if (netPenalty > 0) {
        const penaltyCompanyId = mirrorLoanMapping?.mirrorCompanyId || emi.offlineLoan.companyId;
        console.log(`[Penalty] Attempting ₹${netPenalty} penalty for company ${penaltyCompanyId}`);
        try {
          const isOnlinePenalty = penaltyPaymentMode === 'BANK' || ['ONLINE','UPI','BANK_TRANSFER'].includes((paymentMode||'').toUpperCase());
          console.log(`[Penalty] Mode: ${penaltyPaymentMode}, isOnline: ${isOnlinePenalty}`);
          if (isOnlinePenalty) {
            await recordBankTransaction({
              companyId: penaltyCompanyId || '',
              transactionType: 'CREDIT',
              amount: netPenalty,
              description: `Penalty Income (Charged ₹${penaltyAmount} - Waived ₹${penaltyWaiver}) - EMI #${emi.installmentNumber} - ${emi.offlineLoan.loanNumber}`,
              referenceType: 'PENALTY_INCOME',
              referenceId: `${updatedEmi.id}-PENALTY`,
              createdById: userId,
            });
          } else {
            await recordCashBookEntry({
              companyId: penaltyCompanyId || '',
              entryType: 'CREDIT',
              amount: netPenalty,
              description: `Penalty Income (Charged ₹${penaltyAmount} - Waived ₹${penaltyWaiver}) - EMI #${emi.installmentNumber} - ${emi.offlineLoan.loanNumber}`,
              referenceType: 'PENALTY_INCOME',
              referenceId: `${updatedEmi.id}-PENALTY`,
              createdById: userId,
            });
          }
          // Journal Entry: DR Cash/Bank → CR Penalty Income (4125)
          const { AccountingService: PenAccSvc, ACCOUNT_CODES: PenCodes } = await import('@/lib/accounting-service');
          const penSvc = new PenAccSvc(penaltyCompanyId || '');
          await penSvc.initializeChartOfAccounts();
          await penSvc.createJournalEntry({
            entryDate: new Date(),
            referenceType: 'PENALTY_COLLECTION',
            referenceId: `${updatedEmi.id}-PENALTY-JE`,
            narration: `Penalty Income - EMI #${emi.installmentNumber} - ${emi.offlineLoan.loanNumber} (Charged ₹${penaltyAmount}, Waived ₹${penaltyWaiver}, Collected ₹${netPenalty})`,
            createdById: userId || 'SYSTEM',
            isAutoEntry: true,
            lines: [
              { accountCode: isOnlinePenalty ? PenCodes.BANK_ACCOUNT : PenCodes.CASH_IN_HAND, debitAmount: netPenalty, creditAmount: 0, narration: `Penalty collected via ${penaltyPaymentMode}` },
              { accountCode: PenCodes.PENALTY_INCOME, debitAmount: 0, creditAmount: netPenalty, narration: `Penalty income after waiver of ₹${penaltyWaiver}` },
            ],
          });
          console.log(`[Penalty] ✅ ₹${netPenalty} Penalty Income recorded in company ${penaltyCompanyId}`);
        } catch (penErr: any) {
          const penMsg = `Penalty accounting: ${penErr?.message || penErr}`;
          accountingWarnings.push(penMsg);
          console.error('[Penalty] ❌ Offline loan penalty accounting FAILED:', penErr?.message || penErr);
          console.error('[Penalty] ❌ FULL ERROR:', JSON.stringify({
            message: penErr?.message,
            code: penErr?.code,
            meta: penErr?.meta,
            stack: penErr?.stack?.split('\n').slice(0, 8).join(' | ')
          }));
        }
      }

      return NextResponse.json({
        success: true,
        emi: updatedEmi,
        creditAdded: actualPaymentAmount,
        creditType: creditTypeUsed,
        newCompanyCredit: creditTypeUsed === 'COMPANY' ? (user.companyCredit || 0) + actualPaymentAmount : user.companyCredit,
        newPersonalCredit: creditTypeUsed === 'PERSONAL' ? (user.personalCredit || 0) + actualPaymentAmount : user.personalCredit,
        mirrorSynced: !!mirrorLoanMapping,
        processingTime: Date.now() - startTime,
        // Accounting warnings: empty = all good, non-empty = admin needs to investigate
        accountingOk: accountingWarnings.length === 0,
        accountingWarnings,
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
