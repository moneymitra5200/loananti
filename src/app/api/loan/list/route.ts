import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache, CacheKeys, CacheTTL, invalidateLoanCache } from '@/lib/cache';

// List select — includes document fields needed by DisbursementDialog
const LOAN_LIST_SELECT = {
  id: true,
  applicationNo: true,
  status: true,
  loanType: true,
  requestedAmount: true,
  requestedTenure: true,
  requestedInterestRate: true,
  purpose: true,
  createdAt: true,
  customerId: true,
  companyId: true,
  currentHandlerId: true,
  isInterestOnlyLoan: true,
  // Applicant personal details
  firstName: true, middleName: true, lastName: true,
  fatherName: true, motherName: true,
  gender: true, maritalStatus: true,
  panNumber: true, aadhaarNumber: true,
  dateOfBirth: true, phone: true,
  address: true, city: true, state: true, pincode: true,
  // Employment
  employmentType: true, employerName: true, designation: true,
  yearsInEmployment: true, monthlyIncome: true, annualIncome: true,
  otherIncome: true, incomeSource: true,
  // Business fields (SELF_EMPLOYED / BUSINESS)
  businessName: true, businessType: true, yearsInBusiness: true, annualTurnover: true,
  // Bank details (for disbursement)
  bankAccountNumber: true, bankIfsc: true, bankName: true,
  bankBranch: true, accountType: true, accountHolderName: true,
  // ── DOCUMENT URLS ──────────────────────────────────────────────
  panCardDoc: true,
  aadhaarFrontDoc: true,
  aadhaarBackDoc: true,
  incomeProofDoc: true,
  addressProofDoc: true,
  photoDoc: true,
  bankStatementDoc: true,
  passbookDoc: true,
  salarySlipDoc: true,
  electionCardDoc: true,
  housePhotoDoc: true,
  otherDocs: true,
  digitalSignature: true,

  // References
  reference1Name: true, reference1Phone: true,
  reference1Relation: true, reference1Address: true,
  reference2Name: true, reference2Phone: true,
  reference2Relation: true, reference2Address: true,
  // Relations
  customer: { select: { id: true, name: true, email: true, phone: true } },
  company: { select: { id: true, name: true, code: true, isMirrorCompany: true } },
  sessionForm: {
    select: {
      id: true,
      approvedAmount: true,
      interestRate: true,
      interestType: true,
      tenure: true,
      emiAmount: true,
      totalInterest: true,
      totalAmount: true,
      processingFee: true,
      emiFrequency: true,
      customerSignature: true,  // Customer sanction approval signature
    }
  },
  goldLoanDetail: true,
  vehicleLoanDetail: true,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const customerId = searchParams.get('customerId');
    const companyId = searchParams.get('companyId');
    const agentId = searchParams.get('agentId');
    const staffId = searchParams.get('staffId');
    const status = searchParams.get('status');

    // Generate cache key based on query params
    const cacheKey = CacheKeys.loansByRole(role || 'all') + 
      `:${customerId || ''}:${companyId || ''}:${agentId || ''}:${staffId || ''}:${status || ''}`;

    // Try cache first
    const cachedLoans = cache.get(cacheKey);
    if (cachedLoans) {
      return NextResponse.json({ loans: cachedLoans, cached: true });
    }

    const where: Record<string, unknown> = {};
    
    if (customerId) where.customerId = customerId;
    if (companyId) where.companyId = companyId;
    if (status) where.status = status;

    // Role-based filtering
    if (role === 'SUPER_ADMIN') {
      // Super admin sees all loans
    } else if (role === 'CUSTOMER' && customerId) {
      // Customer should only see ORIGINAL loans, not mirror loans
      // Fetch mirror loan IDs first
      try {
        const mirrorMappings = await db.mirrorLoanMapping.findMany({
          select: { mirrorLoanId: true }
        });
        const mirrorLoanIds = mirrorMappings
          .map(m => m.mirrorLoanId)
          .filter(id => id !== null) as string[];
          
        if (mirrorLoanIds.length > 0) {
          where.id = { notIn: mirrorLoanIds };
        }
      } catch (err) {
        // If mirrorLoanMapping doesn't exist or fails, just continue without filtering
        console.warn("Could not filter mirror loans", err);
      }
    } else if (role === 'COMPANY') {
      if (companyId) where.companyId = companyId;
    } else if (role === 'AGENT' && agentId) {
      const agent = await db.user.findUnique({
        where: { id: agentId },
        select: { companyId: true }
      });
      
      where.OR = [
        { currentHandlerId: agentId },
        { status: 'COMPANY_APPROVED', companyId: agent?.companyId },
        { status: 'SA_APPROVED', currentHandlerId: agentId },
        { 
          status: { in: ['AGENT_APPROVED_STAGE1', 'LOAN_FORM_COMPLETED', 'SESSION_CREATED', 'CUSTOMER_SESSION_APPROVED', 'FINAL_APPROVED', 'ACTIVE', 'DISBURSED'] },
          currentHandlerId: agentId 
        }
      ];
    } else if (role === 'STAFF' && staffId) {
      where.currentHandlerId = staffId;
    } else if (role === 'CASHIER') {
      where.status = { in: ['FINAL_APPROVED', 'ACTIVE', 'DISBURSED', 'ACTIVE_INTEREST_ONLY'] };
    } else if (role === 'ACCOUNTANT') {
      where.status = { in: ['ACTIVE', 'DISBURSED', 'ACTIVE_INTEREST_ONLY'] };
    } else if (agentId) {
      where.currentHandlerId = agentId;
    }

    const loans = await db.loanApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: LOAN_LIST_SELECT
    });

    // Cache the result
    cache.set(cacheKey, loans, CacheTTL.SHORT);

    return NextResponse.json({ loans });
  } catch (error) {
    console.error('[Loan List API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch loans', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Invalidate cache when loan is modified
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, loanId } = body;

    if (action === 'invalidate' && loanId) {
      invalidateLoanCache(loanId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to invalidate cache' }, { status: 500 });
  }
}
