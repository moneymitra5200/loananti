import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateMirrorLoan } from '@/lib/mirror-loan';
import { getMirrorCompanies } from '@/lib/mirror-company-utils';
import { getNextUniqueColor } from '@/utils/loanColors';

// Helper function to check if a company is Company 3
async function isCompany3(companyId: string): Promise<boolean> {
  // First try to find by code C3
  const companyByCode = await db.company.findFirst({
    where: { code: 'C3', id: companyId }
  });
  
  if (companyByCode) {
    return true;
  }
  
  // Otherwise check if it's the third company by creation order
  const companies = await db.company.findMany({
    orderBy: { createdAt: 'asc' },
    take: 3,
    select: { id: true }
  });
  
  if (companies.length >= 3 && companies[2].id === companyId) {
    return true;
  }
  
  return false;
}

// Helper function to get Company 3 ID
async function getCompany3Id(): Promise<string | null> {
  // First try to find by code C3
  const companyByCode = await db.company.findFirst({
    where: { code: 'C3' }
  });
  
  if (companyByCode) {
    return companyByCode.id;
  }
  
  // Otherwise get the third company by creation order
  const companies = await db.company.findMany({
    orderBy: { createdAt: 'asc' },
    take: 3
  });
  
  if (companies.length >= 3) {
    return companies[2].id;
  }
  
  return null;
}

// GET - Fetch mirror companies or preview calculation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const loanId = searchParams.get('loanId');

    // Handle direct loanId query (fetch mirror mappings for a loan)
    if (loanId && !action) {
      const mappings = await db.mirrorLoanMapping.findMany({
        where: { originalLoanId: loanId },
        include: {
          mirrorCompany: { select: { id: true, name: true, code: true } },
          originalCompany: { select: { id: true, name: true, code: true } },
          mirrorLoan: {
            include: {
              company: { select: { id: true, name: true, code: true } }
            }
          }
        }
      });

      if (mappings.length === 0) {
        return NextResponse.json({ 
          success: true, 
          mirrorLoans: [],
          message: 'No mirror loans configured for this loan'
        });
      }

      // Format the response to match frontend expectations
      const mirrorLoans = mappings.map(m => ({
        id: m.id,
        mirrorType: m.mirrorType,
        extraEMICount: m.extraEMICount || 0,
        leftoverAmount: m.leftoverAmount || 0,
        mirrorInterestRate: m.mirrorInterestRate,
        mirrorTenure: m.mirrorTenure,
        originalTenure: m.originalTenure,
        originalEMIAmount: m.originalEMIAmount,
        mirrorEMIAmount: m.originalEMIAmount, // Same EMI amount
        loanApplication: m.mirrorLoan ? {
          id: m.mirrorLoan.id,
          applicationNo: m.mirrorLoan.applicationNo,
          companyId: m.mirrorLoan.companyId,
          company: m.mirrorLoan.company
        } : null,
        mirrorCompany: m.mirrorCompany,
        originalCompany: m.originalCompany,
        mirrorEMIsPaid: m.mirrorEMIsPaid,
        extraEMIsPaid: m.extraEMIsPaid
      }));

      return NextResponse.json({ 
        success: true, 
        mirrorLoans,
        mappings: mappings.map(m => ({
          id: m.id,
          mirrorType: m.mirrorType,
          extraEMICount: m.extraEMICount,
          mirrorInterestRate: m.mirrorInterestRate,
          mirrorTenure: m.mirrorTenure,
          originalTenure: m.originalTenure,
          originalEMIAmount: m.originalEMIAmount
        }))
      });
    }

    if (action === 'mirror-companies') {
      // Get all active companies
      const companies = await db.company.findMany({
        where: { 
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          code: true,
          defaultInterestRate: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' }
      });

      console.log('[Mirror Companies API] Fetched companies from DB:', companies.map(c => ({ id: c.id, name: c.name, code: c.code })));

      // Use shared utility to identify mirror companies
      const mirrorCompanies = getMirrorCompanies(companies);

      console.log('[Mirror Companies API] Returning mirror companies:', mirrorCompanies.map(c => ({ 
        name: c.name, 
        code: c.code, 
        rate: c.mirrorInterestRate,
        displayName: c.displayName 
      })));

      return NextResponse.json({ success: true, companies: mirrorCompanies });
    }

    // Get all mirror loan mappings (for offline loans display)
    if (action === 'all-mappings') {
      const mappings = await db.mirrorLoanMapping.findMany({
        select: {
          id: true,
          originalLoanId: true,
          mirrorLoanId: true,
          originalCompanyId: true,
          mirrorCompanyId: true,
          displayColor: true,
          extraEMICount: true,
          mirrorTenure: true,
          originalInterestRate: true,
          mirrorInterestRate: true,
          mirrorEMIsPaid: true,
          extraEMIsPaid: true,
        }
      });

      return NextResponse.json({ success: true, mappings });
    }

    if (action === 'preview') {
      const principal = parseFloat(searchParams.get('principal') || '0');
      const originalRate = parseFloat(searchParams.get('originalRate') || '24');
      const originalTenure = parseInt(searchParams.get('originalTenure') || '12');
      const originalType = (searchParams.get('originalType') || 'FLAT') as 'FLAT' | 'REDUCING';
      const mirrorType = searchParams.get('mirrorType') || 'COMPANY_1_15_PERCENT';
      const mirrorRateParam = searchParams.get('mirrorRate');

      // Use provided mirror rate, or default based on mirror type
      // Company 1 = 15% REDUCING, Company 2 = same as original rate
      let mirrorRate: number;
      if (mirrorRateParam) {
        mirrorRate = parseFloat(mirrorRateParam);
      } else if (mirrorType === 'COMPANY_1_15_PERCENT') {
        mirrorRate = 15;
      } else {
        // COMPANY_2_SAME_RATE - use original rate
        mirrorRate = originalRate;
      }

      const calculation = calculateMirrorLoan(
        principal,
        originalRate,
        originalTenure,
        originalType,
        mirrorRate,
        'REDUCING'
      );

      return NextResponse.json({ 
        success: true, 
        calculation: {
          ...calculation,
          appliedMirrorRate: mirrorRate
        }
      });
    }

    if (action === 'profit') {
      // Get all mirror loan mappings with extra EMIs
      const mirrorMappings = await db.mirrorLoanMapping.findMany({
        where: { extraEMICount: { gt: 0 } },
        include: {
          originalLoan: {
            select: { applicationNo: true, customerId: true }
          }
        }
      });

      let totalPotentialProfit = 0;
      let totalReceivedProfit = 0;
      const profitDetails: any[] = [];

      for (const mapping of mirrorMappings) {
        const potentialProfit = mapping.extraEMICount * mapping.originalEMIAmount;
        totalPotentialProfit += potentialProfit;
        totalReceivedProfit += mapping.totalProfitReceived;

        profitDetails.push({
          id: mapping.id,
          originalLoanId: mapping.originalLoanId,
          applicationNo: mapping.originalLoan?.applicationNo,
          extraEMICount: mapping.extraEMICount,
          extraEMIsPaid: mapping.extraEMIsPaid,
          emiAmount: mapping.originalEMIAmount,
          potentialProfit,
          receivedProfit: mapping.totalProfitReceived,
          mirrorEMIsPaid: mapping.mirrorEMIsPaid,
          mirrorTenure: mapping.mirrorTenure,
          createdAt: mapping.createdAt
        });
      }

      return NextResponse.json({
        success: true,
        totalPotentialProfit,
        totalReceivedProfit,
        profitDetails,
        count: mirrorMappings.length
      });
    }

    if (action === 'loan-mappings') {
      // Get all mirror loan mappings for a specific loan
      const loanId = searchParams.get('loanId');
      if (!loanId) {
        return NextResponse.json({ error: 'Loan ID required' }, { status: 400 });
      }

      const mappings = await db.mirrorLoanMapping.findMany({
        where: { originalLoanId: loanId },
        include: {
          mirrorCompany: { select: { id: true, name: true, code: true } },
          originalCompany: { select: { id: true, name: true, code: true } }
        }
      });

      // Calculate EMI schedules for each mapping
      const mappingsWithSchedule = mappings.map(mapping => {
        // Calculate mirror EMI schedule
        const calculation = calculateMirrorLoan(
          mapping.originalEMIAmount * mapping.originalTenure / (1 + (mapping.originalInterestRate / 100) * (mapping.originalTenure / 12)), // Approximate principal
          mapping.originalInterestRate,
          mapping.originalTenure,
          mapping.originalInterestType as 'FLAT' | 'REDUCING',
          mapping.mirrorInterestRate,
          'REDUCING'
        );

        return {
          ...mapping,
          mirrorSchedule: calculation.mirrorLoan.schedule,
          originalSchedule: calculation.originalLoan.schedule
        };
      });

      return NextResponse.json({ success: true, mappings: mappingsWithSchedule });
    }

    // Ensure mirror loan mapping exists for a loan (create if needed)
    if (action === 'ensure-mapping') {
      const loanId = searchParams.get('loanId');
      if (!loanId) {
        return NextResponse.json({ error: 'Loan ID required' }, { status: 400 });
      }

      // Check if mapping already exists
      const existingMapping = await db.mirrorLoanMapping.findFirst({
        where: { originalLoanId: loanId },
        include: {
          mirrorCompany: { select: { id: true, name: true, code: true } },
          originalCompany: { select: { id: true, name: true, code: true } }
        }
      });

      if (existingMapping) {
        return NextResponse.json({ success: true, mapping: existingMapping, existed: true });
      }

      // Get loan details to create mapping
      const loan = await db.loanApplication.findUnique({
        where: { id: loanId },
        include: { 
          sessionForm: true,
          company: { select: { id: true, name: true, code: true } }
        }
      });

      if (!loan || !loan.sessionForm || !loan.companyId) {
        return NextResponse.json({ success: true, mapping: null, message: 'Loan not ready for mirror mapping' });
      }

      // ============================================
      // CRITICAL VALIDATION: Mirror loans ONLY for Company 3
      // ============================================
      const isFromCompany3 = await isCompany3(loan.companyId);
      
      if (!isFromCompany3) {
        return NextResponse.json({ 
          success: false, 
          mapping: null, 
          error: 'Mirror loan not allowed',
          message: `Mirror loans can ONLY be created for loans from Company 3. This loan is from ${loan.company?.name || 'Company 1/2'} (${loan.company?.code || 'not C3'}).`,
          isCompany3: false
        });
      }

      // Get Company 1 (operational company) - mirror target
      const mirrorCompany = await db.company.findFirst({
        where: { 
          isActive: true,
          code: { contains: '1' }
        },
        select: { id: true, name: true, code: true }
      });

      if (!mirrorCompany) {
        return NextResponse.json({ success: true, mapping: null, message: 'No mirror company found' });
      }

      // Skip if the loan is already with Company 1
      if (mirrorCompany.id === loan.companyId) {
        return NextResponse.json({ success: true, mapping: null, message: 'Loan is with mirror company, no mapping needed' });
      }

      const principal = loan.sessionForm.approvedAmount;
      const originalRate = loan.sessionForm.interestRate;
      const originalTenure = loan.sessionForm.tenure;
      const originalEMIAmount = loan.sessionForm.emiAmount;
      const originalType = (loan.sessionForm.interestType || 'FLAT') as 'FLAT' | 'REDUCING';
      const mirrorRate = 15;

      // Calculate mirror loan details
      const calculation = calculateMirrorLoan(
        principal,
        originalRate,
        originalTenure,
        originalType,
        mirrorRate,
        'REDUCING'
      );

      // Generate unique color for this mirror pair
      const displayColor = getNextUniqueColor();

      // Create the mapping
      const newMapping = await db.mirrorLoanMapping.create({
        data: {
          originalLoanId: loanId,
          originalCompanyId: loan.companyId,
          mirrorCompanyId: mirrorCompany.id,
          mirrorType: 'COMPANY_1_15_PERCENT',
          originalInterestRate: originalRate,
          originalInterestType: originalType,
          mirrorInterestRate: mirrorRate,
          mirrorInterestType: 'REDUCING',
          originalEMIAmount,
          originalTenure,
          mirrorTenure: calculation.mirrorLoan.schedule.length,
          extraEMICount: calculation.extraEMICount,
          leftoverAmount: calculation.leftoverAmount,
          totalMirrorInterest: calculation.mirrorLoan.totalInterest,
          totalExtraEMIProfit: calculation.extraEMICount * originalEMIAmount,
          disbursementCompanyId: mirrorCompany.id,
          displayColor,
          createdBy: 'SYSTEM_AUTO'
        },
        include: {
          mirrorCompany: { select: { id: true, name: true, code: true } },
          originalCompany: { select: { id: true, name: true, code: true } }
        }
      });

      console.log(`[Mirror Loan] Auto-created mapping for loan ${loan.applicationNo}`);

      return NextResponse.json({ success: true, mapping: newMapping, existed: false });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Mirror loan API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create mirror loan mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      originalLoanId, 
      mirrorCompanyId, 
      mirrorType, // DEPRECATED - kept for backward compatibility
      extraEMIPaymentPageId, 
      createdBy,
      // NEW: Dynamic interest rate and type per loan
      mirrorInterestRate,
      mirrorInterestType 
    } = body;

    // Check if mapping already exists
    const existingMapping = await db.mirrorLoanMapping.findUnique({
      where: {
        originalLoanId_mirrorCompanyId: {
          originalLoanId,
          mirrorCompanyId
        }
      }
    });

    if (existingMapping) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        mirrorLoan: existingMapping,
        message: 'Mirror loan mapping already exists for this company'
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

    // ============================================
    // VALIDATION: Mirror loans only for non-mirror companies (original lender)
    // ============================================
    if (originalLoan.companyId) {
      const originalCompany = await db.company.findUnique({
        where: { id: originalLoan.companyId },
        select: { name: true, code: true, isMirrorCompany: true }
      });
      
      // If the loan is from a mirror company, mirror is not allowed
      if (originalCompany?.isMirrorCompany === true) {
        return NextResponse.json({ 
          error: 'Mirror loan not allowed',
          message: `Mirror loans can only be created from original company loans. This loan is from ${originalCompany.name} (${originalCompany.code}), which is a mirror company.`,
          companyCode: originalCompany.code,
          isOriginalCompany: false
        }, { status: 400 });
      }
    }

    const principal = originalLoan.sessionForm.approvedAmount;
    const originalRate = originalLoan.sessionForm.interestRate;
    const originalTenure = originalLoan.sessionForm.tenure;
    const originalEMIAmount = originalLoan.sessionForm.emiAmount;
    const originalType = (originalLoan.sessionForm.interestType || 'FLAT') as 'FLAT' | 'REDUCING';

    // Use provided mirror rate and type, or fall back to defaults
    const mirrorRate = mirrorInterestRate || 15;
    const mirrorTypeValue = mirrorInterestType || 'REDUCING';
    
    // Calculate mirror loan details
    const calculation = calculateMirrorLoan(
      principal,
      originalRate,
      originalTenure,
      originalType,
      mirrorRate,
      mirrorTypeValue as 'FLAT' | 'REDUCING'
    );

    // Calculate total mirror interest (this goes to mirror company as their profit)
    const totalMirrorInterest = calculation.mirrorLoan.totalInterest;
    
    // Calculate extra EMI profit (this goes to original company as pure profit)
    const extraEMIProfit = calculation.extraEMICount * originalEMIAmount;

    // Create the mirror loan mapping
    const displayColor = getNextUniqueColor();

    const mirrorMapping = await db.mirrorLoanMapping.create({
      data: {
        originalLoanId,
        originalCompanyId: originalLoan.companyId || '',
        mirrorCompanyId,
        mirrorType: mirrorType || 'CUSTOM_RATE', // Use CUSTOM_RATE for dynamic rates
        originalInterestRate: originalRate,
        originalInterestType: originalType,
        mirrorInterestRate: mirrorRate,
        mirrorInterestType: mirrorTypeValue,
        originalEMIAmount,
        originalTenure,
        mirrorTenure: calculation.mirrorLoan.schedule.length,
        extraEMICount: calculation.extraEMICount,
        leftoverAmount: calculation.leftoverAmount,
        totalMirrorInterest,
        totalExtraEMIProfit: extraEMIProfit,
        extraEMIPaymentPageId,
        disbursementCompanyId: mirrorCompanyId, // Disbursement from mirror company (Company 1)
        displayColor, // Unique color for this mirror pair
        createdBy
      }
    });

    // NOTE: We do NOT change the loan's companyId
    // The loan stays with Company 3 (original company)
    // Company 3 sees the original loan and receives extra EMI profit
    // Company 1 sees the mirror schedule and receives interest profit

    return NextResponse.json({
      success: true,
      mirrorLoan: mirrorMapping,
      calculation,
      message: 'Mirror loan mapping created. Loan remains with original company.'
    });
  } catch (error) {
    console.error('Create mirror loan error:', error);
    return NextResponse.json({ error: 'Failed to create mirror loan' }, { status: 500 });
  }
}

// PUT - Update mirror loan progress (called when EMI is paid)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, emiNumber, paidAmount } = body;

    // Get the mirror loan mapping
    const mapping = await db.mirrorLoanMapping.findFirst({
      where: { originalLoanId: loanId }
    });

    if (!mapping) {
      return NextResponse.json({ success: true, message: 'No mirror mapping found' });
    }

    // Check if this EMI is within mirror tenure or is an extra EMI
    const isExtraEMI = emiNumber > mapping.mirrorTenure;

    if (isExtraEMI) {
      // This is an extra EMI - full amount goes to Company 3 as profit
      await db.mirrorLoanMapping.update({
        where: { id: mapping.id },
        data: {
          extraEMIsPaid: { increment: 1 },
          totalProfitReceived: { increment: paidAmount }
        }
      });

      return NextResponse.json({
        success: true,
        type: 'EXTRA_EMI',
        profitFor: 'COMPANY_3',
        amount: paidAmount,
        message: 'Extra EMI recorded as profit for Company 3'
      });
    } else {
      // This is a regular EMI - interest goes to Company 1
      // Calculate interest portion for this EMI based on mirror rate
      const mirrorSchedule = await calculateMirrorEMIInterest(
        mapping.originalEMIAmount,
        emiNumber,
        mapping.mirrorInterestRate,
        mapping.mirrorTenure
      );

      await db.mirrorLoanMapping.update({
        where: { id: mapping.id },
        data: {
          mirrorEMIsPaid: { increment: 1 },
          // Mark mirror as completed if all mirror EMIs are paid
          ...(emiNumber === mapping.mirrorTenure ? { mirrorCompletedAt: new Date() } : {})
        }
      });

      return NextResponse.json({
        success: true,
        type: 'REGULAR_EMI',
        interestFor: 'COMPANY_1',
        interestAmount: mirrorSchedule.interest,
        principalAmount: mirrorSchedule.principal,
        message: 'EMI recorded. Interest goes to Company 1.'
      });
    }
  } catch (error) {
    console.error('Update mirror loan error:', error);
    return NextResponse.json({ error: 'Failed to update mirror loan' }, { status: 500 });
  }
}

// DELETE - Remove mirror loan mapping
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Mirror loan ID required' }, { status: 400 });
    }

    await db.mirrorLoanMapping.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Mirror loan mapping deleted' });
  } catch (error) {
    console.error('Delete mirror loan error:', error);
    return NextResponse.json({ error: 'Failed to delete mirror loan' }, { status: 500 });
  }
}

// Helper function to calculate interest for a specific EMI
async function calculateMirrorEMIInterest(
  emiAmount: number,
  emiNumber: number,
  mirrorRate: number,
  mirrorTenure: number
): Promise<{ interest: number; principal: number }> {
  // For reducing balance, we need to calculate based on outstanding
  // This is a simplified calculation - in reality, you'd track the actual outstanding
  const monthlyRate = mirrorRate / 12 / 100;
  
  // Approximate calculation for this EMI
  // In production, you'd track actual outstanding balance
  const avgOutstanding = emiAmount * mirrorTenure * (1 - (emiNumber - 1) / mirrorTenure);
  const interest = Math.round(avgOutstanding * monthlyRate * 100) / 100;
  const principal = emiAmount - interest;

  return { interest, principal };
}
