import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processBankTransaction } from '@/lib/bank-transaction-service';
import { EMIPaymentStatus } from '@prisma/client';
import { calculateEMI } from '@/utils/helpers';
import { recordEMIPaymentAccounting, getCompany3Id, recordCashBookEntry, recordBankTransaction } from '@/lib/simple-accounting';

// Generate sequential loan number
async function generateLoanNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const datePrefix = `LN${year}${month}`;
  
  try {
    // Get the highest loan number from both OfflineLoan and LoanApplication
    const [lastOfflineLoan, lastOnlineLoan] = await Promise.all([
      db.offlineLoan.findFirst({
        where: { loanNumber: { startsWith: datePrefix } },
        orderBy: { loanNumber: 'desc' },
        select: { loanNumber: true }
      }),
      db.loanApplication.findFirst({
        where: { applicationNo: { startsWith: datePrefix } },
        orderBy: { applicationNo: 'desc' },
        select: { applicationNo: true }
      })
    ]);
    
    // Extract sequence numbers
    const offlineSeq = lastOfflineLoan?.loanNumber 
      ? parseInt(lastOfflineLoan.loanNumber.slice(-5)) || 0 
      : 0;
    const onlineSeq = lastOnlineLoan?.applicationNo 
      ? parseInt(lastOnlineLoan.applicationNo.slice(-5)) || 0 
      : 0;
    
    // Use the highest sequence number + 1
    const nextSeq = Math.max(offlineSeq, onlineSeq) + 1;
    const sequence = nextSeq.toString().padStart(5, '0');
    
    return `${datePrefix}${sequence}`;
  } catch (error) {
    // Fallback to timestamp-based number if query fails
    const timestamp = Date.now().toString().slice(-8);
    return `LN${timestamp}`;
  }
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

      // Check if this loan is mirrored (has a mirror loan mapping)
      const mirrorMapping = await db.mirrorLoanMapping.findFirst({
        where: { originalLoanId: loanId }
      });
      const isMirrored = !!mirrorMapping;

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

      return NextResponse.json({ success: true, loan: { ...loan, isMirrored }, summary });
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

    const loanNumber = await generateLoanNumber();

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
    
    // Handle Mirror Loan creation - Create actual mirror loan and mapping
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
        const mirrorEmiCalculation = calculateEMI(
          loanAmount,
          mirrorRate,
          tenure || 12,
          mirrorTypeInterest as 'FLAT' | 'REDUCING',
          new Date(startDate)
        );
        
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
        
        // Generate mirror loan number
        const mirrorLoanNumber = await generateLoanNumber();
        
        // Create mirror loan in mirror company
        const mirrorLoan = await db.offlineLoan.create({
          data: {
            loanNumber: mirrorLoanNumber,
            createdById,
            createdByRole,
            companyId: mirrorCompanyId,
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
            internalNotes: `Mirror of ${loanNumber} from ${mirrorCompany.name}`,
            allowInterestOnly: false,
            allowPartialPayment: true,
            isInterestOnlyLoan: false,
            partialPaymentEnabled: true
          }
        });
        
        // Create EMI schedule for mirror loan using the recalculated schedule
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
        
        // Generate display color for the pair
        const displayColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4'];
        const colorIndex = Math.abs(loan.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % displayColors.length;
        const displayColor = displayColors[colorIndex];
        
        // Calculate total mirror interest
        const totalMirrorInterest = mirrorSchedule.reduce((sum, item) => sum + item.interest, 0);
        
        // Create mirror loan mapping
        await db.mirrorLoanMapping.create({
          data: {
            originalLoanId: loan.id,
            mirrorLoanId: mirrorLoan.id,
            originalCompanyId: companyId,
            mirrorCompanyId,
            mirrorType,
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
        
        // Create bank transaction for mirror loan disbursement (from mirror company's bank)
        const mirrorDefaultBank = await db.bankAccount.findFirst({
          where: { companyId: mirrorCompanyId, isDefault: true }
        });
        
        if (mirrorDefaultBank) {
          await processBankTransaction({
            bankAccountId: mirrorDefaultBank.id,
            transactionType: 'LOAN_DISBURSEMENT',
            amount: loanAmount,
            description: `Mirror Loan Disbursement - ${mirrorLoanNumber} (Mirror of ${loanNumber})`,
            referenceType: 'MIRROR_LOAN_DISBURSEMENT',
            referenceId: mirrorLoan.id,
            createdById,
            companyId: mirrorCompanyId,
            loanId: mirrorLoan.id,
            customerId: customerId || undefined,
            paymentMode: 'BANK_TRANSFER'
          });
        }
        
        mirrorLoanResult = {
          mirrorLoanId: mirrorLoan.id,
          mirrorLoanNumber: mirrorLoan.loanNumber,
          extraEMICount
        };
        
        console.log(`[Mirror Loan] Created mirror loan ${mirrorLoanNumber} for original ${loanNumber}, Extra EMIs: ${extraEMICount}`);
        
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
      
      // Update credit based on credit type selection
      let creditUpdateData: any = {};
      let creditTypeUsed = creditType || 'COMPANY';
      
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
      // RECORD ACCOUNTING ENTRIES
      // ============================================
      try {
        // Get Company 3 ID for personal credit
        const company3Id = await getCompany3Id();
        
        if (company3Id && emi.offlineLoan.companyId) {
          // Record accounting entries based on credit type and payment mode
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
        } : null
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
