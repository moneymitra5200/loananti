import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// Loan type to code mapping
const LOAN_TYPE_CODES: Record<string, string> = {
  'PERSONAL': 'PL',
  'GOLD': 'GL',
  'VEHICLE': 'VL',
  'BUSINESS': 'BL',
  'HOME': 'HL',
  'EDUCATION': 'EL',
  'AGRICULTURAL': 'AL',
  'MORTGAGE': 'ML',
};

// Get loan type code
function getLoanTypeCode(loanType: string): string {
  return LOAN_TYPE_CODES[loanType?.toUpperCase()] || loanType?.substring(0, 2).toUpperCase() || 'PL';
}

// Generate initial application number (A00001 format)
// Used when customer first applies - NOT an active loan yet
async function generateInitialApplicationNo(): Promise<string> {
  // Count all loan applications
  const count = await db.loanApplication.count();
  const sequence = (count + 1).toString().padStart(5, '0');
  return `A${sequence}`;
}

// Generate active loan number with company code and loan type
// Format: {CompanyCode}{LoanTypeCode}{Sequence: 00001}
// Example: C3PL00001 (Company 3, Personal Loan, #00001)
// Called when loan is DISBURSED (becomes ACTIVE)
async function generateActiveLoanNo(companyId: string, loanType: string): Promise<string> {
  // Get company code (should be C1, C2, C3 after fix)
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { code: true }
  });

  // Company code - use directly if it's C1/C2/C3 format
  let companyCode = 'C3'; // default to Company 3
  if (company?.code) {
    if (company.code.match(/^C\d$/)) {
      // Already in C1, C2, C3 format
      companyCode = company.code;
    } else {
      // Extract number from code
      const codeMatch = company.code.match(/(\d+)/);
      if (codeMatch) {
        companyCode = `C${codeMatch[1]}`;
      }
    }
  }

  const loanTypeCode = getLoanTypeCode(loanType);
  const prefix = `${companyCode}${loanTypeCode}`;

  // Count active loans with this prefix
  const count = await db.loanApplication.count({
    where: {
      applicationNo: { startsWith: prefix },
      status: 'ACTIVE'
    }
  });

  const sequence = (count + 1).toString().padStart(5, '0');
  console.log(`[generateActiveLoanNo] Company: ${companyCode}, Product: ${loanTypeCode}, Sequence: ${sequence} → ${prefix}${sequence}`);
  return `${prefix}${sequence}`;
}

// Get Company 3 (default company for new applications)
async function getDefaultCompanyId(): Promise<string> {
  // Try to find Company 3 first (code = 'C3')
  let company = await db.company.findFirst({
    where: {
      isActive: true,
      code: 'C3'
    },
    select: { id: true, code: true }
  });

  // Fallback: find company with code containing '3'
  if (!company) {
    company = await db.company.findFirst({
      where: {
        isActive: true,
        code: { contains: '3' }
      },
      select: { id: true, code: true }
    });
  }

  // Fallback to first active company
  if (!company) {
    company = await db.company.findFirst({
      where: { isActive: true },
      select: { id: true, code: true }
    });
  }

  if (!company) {
    throw new Error('No active company found. Please create a company first.');
  }
  
  return company.id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, loanType, requestedAmount, requestedTenure, purpose } = body;

    // Check if this is an INTEREST_ONLY loan
    const loanTypeValue = loanType || 'PERSONAL';
    const isInterestOnly = loanTypeValue.toUpperCase() === 'INTEREST_ONLY';

    // For Interest Only loans, tenure is not required at application time
    if (!customerId || !requestedAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For non-interest-only loans, tenure is required
    if (!isInterestOnly && !requestedTenure) {
      return NextResponse.json(
        { error: 'Tenure is required for non-interest-only loans' },
        { status: 400 }
      );
    }
    
    // Get default company (Company 3)
    const companyId = await getDefaultCompanyId();
    
    // Generate initial application number (A00001 format)
    const applicationNo = await generateInitialApplicationNo();

    const loan = await db.loanApplication.create({
      data: {
        applicationNo,
        customerId,
        companyId, // Default to Company 3
        loanType: loanTypeValue,
        requestedAmount: parseFloat(requestedAmount),
        requestedTenure: isInterestOnly ? 0 : parseInt(requestedTenure || '0'), // 0 for interest-only loans (will be set later)
        purpose,
        status: 'SUBMITTED',
        // Set interest-only flag for INTEREST_ONLY loans
        isInterestOnlyLoan: isInterestOnly,
        // interestOnlyMonthlyAmount will be calculated when interest rate is set during session/approval
      }
    });

    await db.auditLog.create({
      data: {
        userId: customerId,
        action: 'CREATE',
        module: 'LOAN',
        description: `Loan application ${applicationNo} submitted for ${loanTypeValue}`,
        recordId: loan.id,
        recordType: 'LoanApplication',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      loan
    });
  } catch (error) {
    console.error('Error creating loan:', error);
    return NextResponse.json(
      { error: 'Failed to create loan application' },
      { status: 500 }
    );
  }
}

// Export function to generate active loan number (used by disbursement)
export { generateActiveLoanNo };

// Define valid LoanApplication fields from schema
const VALID_LOAN_APPLICATION_FIELDS = [
  // Personal Info
  'title', 'firstName', 'middleName', 'lastName', 'fatherName', 'motherName',
  'gender', 'maritalStatus', 'dateOfBirth', 'nationality',
  // Contact
  'phone', 'address', 'city', 'state', 'pincode',
  // KYC
  'panNumber', 'aadhaarNumber',
  // Employment - Common
  'employmentType', 'employerName', 'employerAddress', 'designation',
  'yearsInEmployment', 'totalWorkExperience', 'officePhone', 'officeEmail',
  'monthlyIncome', 'annualIncome', 'otherIncome', 'incomeSource',
  // Employment - Self-Employed
  'businessName', 'businessType', 'yearsInBusiness', 'annualTurnover', 'businessAddress',
  // Employment - Business Owner
  'companyName', 'companyType', 'yearsInOperation', 'annualRevenue', 'numberOfEmployees',
  // Employment - Professional
  'professionType', 'practiceName', 'yearsOfPractice', 'professionalRegNo',
  // Employment - Retired
  'previousEmployer', 'retirementDate', 'pensionAmount',
  // Employment - Housewife
  'spouseName', 'spouseOccupation', 'spouseIncome', 'familyIncome',
  // Employment - Student
  'institutionName', 'courseProgram', 'expectedCompletion', 'guardianName', 'guardianIncome',
  // Employment - Unemployed
  'sourceOfFunds', 'monthlySupportAmount', 'supportProviderName',
  // Bank Details
  'bankAccountNumber', 'bankIfsc', 'bankName', 'bankBranch', 'accountType', 'accountHolderName',
  // References
  'reference1Name', 'reference1Phone', 'reference1Relation', 'reference1Address',
  'reference2Name', 'reference2Phone', 'reference2Relation', 'reference2Address',
  // Documents
  'panCardDoc', 'aadhaarFrontDoc', 'aadhaarBackDoc', 'incomeProofDoc',
  'addressProofDoc', 'photoDoc', 'bankStatementDoc', 'passbookDoc', 'salarySlipDoc',
  'electionCardDoc', 'housePhotoDoc', 'otherDocs',
  // Signature
  'digitalSignature', 'signatureHash', 'consentGiven', 'consentTimestamp', 'consentIp',
  // Risk
  'riskScore', 'fraudFlag', 'fraudReason', 'rejectionReason',
];

// Helper function to check if loan type is Gold Loan
const isGoldLoan = (loanType: string): boolean => {
  const upperType = loanType?.toUpperCase() || '';
  return upperType === 'GOLD' || upperType.includes('GOLD');
};

// Helper function to check if loan type is Vehicle Loan
const isVehicleLoan = (loanType: string): boolean => {
  const upperType = loanType?.toUpperCase() || '';
  return upperType === 'VEHICLE' || upperType.includes('VEHICLE');
};

// Field type mappings for proper conversion
const FLOAT_FIELDS = [
  'monthlyIncome', 'annualIncome', 'otherIncome', 'annualTurnover', 'annualRevenue',
  'pensionAmount', 'spouseIncome', 'familyIncome', 'guardianIncome', 'monthlySupportAmount',
  'requestedAmount', 'requestedInterestRate', 'loanAmount', 'interestRate', 'emiAmount',
  'processingFee', 'disbursedAmount'
];

const INT_FIELDS = [
  'yearsInEmployment', 'totalWorkExperience', 'yearsInBusiness', 'yearsInOperation',
  'numberOfEmployees', 'yearsOfPractice', 'requestedTenure', 'tenure', 'riskScore', 'creditScore'
];

const DATE_FIELDS = [
  'dateOfBirth', 'retirementDate', 'expectedCompletion', 'consentTimestamp'
];

const BOOLEAN_FIELDS = [
  'panVerified', 'aadhaarVerified', 'bankVerified', 'consentGiven', 'fraudFlag'
];

function convertFieldValue(key: string, value: unknown): unknown {
  // Skip empty values
  if (value === '' || value === undefined || value === null) {
    return undefined;
  }
  
  // Handle string trimming
  if (typeof value === 'string') {
    value = value.trim();
    if (value === '') return undefined;
  }
  
  // Convert based on field type
  if (FLOAT_FIELDS.includes(key)) {
    const num = parseFloat(String(value));
    return isNaN(num) ? undefined : num;
  }
  
  if (INT_FIELDS.includes(key)) {
    const num = parseInt(String(value));
    return isNaN(num) ? undefined : num;
  }
  
  if (DATE_FIELDS.includes(key)) {
    if (typeof value === 'string' && value) {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  }
  
  if (BOOLEAN_FIELDS.includes(key)) {
    return Boolean(value);
  }
  
  return value;
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[LOAN APPLY API] Received update request:', JSON.stringify(body, null, 2));
    
    const { loanId, status, userId, ...updateData } = body;

    if (!loanId) {
      return NextResponse.json(
        { error: 'Loan ID is required' },
        { status: 400 }
      );
    }

    // Check if loan exists
    const loan = await db.loanApplication.findUnique({
      where: { id: loanId }
    });

    if (!loan) {
      return NextResponse.json(
        { error: 'Loan application not found' },
        { status: 404 }
      );
    }

    // Build update data - only include valid fields
    const data: Record<string, unknown> = { updatedAt: new Date() };
    
    // Map frontend field names to schema field names
    const fieldMapping: Record<string, string> = {
      ref1Name: 'reference1Name',
      ref1Phone: 'reference1Phone',
      ref1Relation: 'reference1Relation',
      ref1Address: 'reference1Address',
      ref2Name: 'reference2Name',
      ref2Phone: 'reference2Phone',
      ref2Relation: 'reference2Relation',
      ref2Address: 'reference2Address',
      applicantSignature: 'digitalSignature',
    };
    
    // Process each field
    for (const [key, value] of Object.entries(updateData)) {
      // Map field name if needed
      const mappedKey = fieldMapping[key] || key;
      
      // Skip if not a valid field
      if (!VALID_LOAN_APPLICATION_FIELDS.includes(mappedKey)) {
        console.log(`[LOAN APPLY API] Skipping invalid field: ${key}`);
        continue;
      }
      
      // Convert value
      const convertedValue = convertFieldValue(mappedKey, value);
      
      // Only include if conversion was successful
      if (convertedValue !== undefined) {
        data[mappedKey] = convertedValue;
      }
    }

    // Handle status update
    if (status) {
      data.status = status;
      if (status === 'LOAN_FORM_COMPLETED') {
        data.loanFormCompletedAt = new Date();
        data.currentStage = 'SESSION_CREATION';
        
        // Reassign to agent
        if (userId) {
          const staffUser = await db.user.findUnique({
            where: { id: userId },
            select: { agentId: true }
          });
          if (staffUser?.agentId) {
            data.currentHandlerId = staffUser.agentId;
          }
        }
      }
    }

    console.log('[LOAN APPLY API] Update data:', JSON.stringify(data, null, 2));

    // Update the loan application
    const updatedLoan = await db.loanApplication.update({
      where: { id: loanId },
      data
    });

    // Create or update loan form for verification status
    const loanFormData = {
      panVerified: Boolean(updateData.panVerified),
      aadhaarVerified: Boolean(updateData.aadhaarVerified),
      bankVerified: Boolean(updateData.bankVerified),
      employmentVerified: !!(updateData.employmentType && (updateData.employerName || updateData.businessName || updateData.companyName || updateData.institutionName || updateData.spouseName || updateData.previousEmployer || updateData.sourceOfFunds)),
      addressVerified: !!(updateData.address && updateData.city),
      incomeVerified: !!(updateData.monthlyIncome || updateData.annualTurnover || updateData.annualRevenue || updateData.familyIncome || updateData.pensionAmount || updateData.guardianIncome || updateData.monthlySupportAmount),
      verificationDate: new Date(),
      verifiedById: userId || null,
      riskScore: parseInt(updateData.riskScore) || 0,
      fraudFlag: Boolean(updateData.fraudFlag),
      fraudReason: updateData.fraudFlag ? updateData.verificationRemarks : null,
      verificationRemarks: updateData.verificationRemarks || null,
      internalRemarks: updateData.verificationRemarks || null
    };

    const existingLoanForm = await db.loanForm.findUnique({
      where: { loanApplicationId: loanId }
    });

    if (existingLoanForm) {
      await db.loanForm.update({
        where: { loanApplicationId: loanId },
        data: loanFormData
      });
    } else {
      await db.loanForm.create({
        data: {
          loanApplicationId: loanId,
          ...loanFormData
        }
      });
    }

    // Create workflow log
    if (status && status !== loan.status) {
      await db.workflowLog.create({
        data: {
          loanApplicationId: loanId,
          actionById: userId || 'system',
          previousStatus: loan.status,
          newStatus: status,
          action: 'complete_form',
          remarks: updateData.verificationRemarks || 'Verification completed',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
        }
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: userId || 'system',
        action: 'UPDATE',
        module: 'LOAN',
        description: `Loan application ${loan.applicationNo} updated`,
        recordId: loanId,
        recordType: 'LoanApplication',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    // Handle Gold Loan Details
    if (updateData.goldLoanDetails && isGoldLoan(loan.loanType)) {
      const goldData = updateData.goldLoanDetails as Record<string, unknown>;
      
      // Check if gold loan detail already exists
      const existingGoldDetail = await db.goldLoanDetail.findUnique({
        where: { loanApplicationId: loanId }
      });

      if (existingGoldDetail) {
        await db.goldLoanDetail.update({
          where: { loanApplicationId: loanId },
          data: {
            grossWeight: parseFloat(String(goldData.grossWeight)) || 0,
            netWeight: parseFloat(String(goldData.netWeight)) || 0,
            goldRate: parseFloat(String(goldData.goldRate)) || 0,
            valuationAmount: parseFloat(String(goldData.valuationAmount)) || 0,
            loanAmount: parseFloat(String(goldData.loanAmount)) || 0,
            ownerName: String(goldData.ownerName || ''),
            goldItemPhoto: String(goldData.goldItemPhoto || ''),
            karat: parseInt(String(goldData.karat)) || 22,
            numberOfItems: parseInt(String(goldData.numberOfItems)) || 1,
            itemDescription: String(goldData.itemDescription || ''),
            verificationDate: goldData.verificationDate ? new Date(String(goldData.verificationDate)) : new Date(),
            verifiedBy: userId || 'system',
            remarks: String(goldData.remarks || ''),
          }
        });
      } else {
        await db.goldLoanDetail.create({
          data: {
            loanApplicationId: loanId,
            grossWeight: parseFloat(String(goldData.grossWeight)) || 0,
            netWeight: parseFloat(String(goldData.netWeight)) || 0,
            goldRate: parseFloat(String(goldData.goldRate)) || 0,
            valuationAmount: parseFloat(String(goldData.valuationAmount)) || 0,
            loanAmount: parseFloat(String(goldData.loanAmount)) || 0,
            ownerName: String(goldData.ownerName || ''),
            goldItemPhoto: String(goldData.goldItemPhoto || ''),
            karat: parseInt(String(goldData.karat)) || 22,
            numberOfItems: parseInt(String(goldData.numberOfItems)) || 1,
            itemDescription: String(goldData.itemDescription || ''),
            verificationDate: goldData.verificationDate ? new Date(String(goldData.verificationDate)) : new Date(),
            verifiedBy: userId || 'system',
            remarks: String(goldData.remarks || ''),
          }
        });
      }
    }

    // Handle Vehicle Loan Details
    if (updateData.vehicleLoanDetails && isVehicleLoan(loan.loanType)) {
      const vehicleData = updateData.vehicleLoanDetails as Record<string, unknown>;
      
      // Check if vehicle loan detail already exists
      const existingVehicleDetail = await db.vehicleLoanDetail.findUnique({
        where: { loanApplicationId: loanId }
      });

      if (existingVehicleDetail) {
        await db.vehicleLoanDetail.update({
          where: { loanApplicationId: loanId },
          data: {
            vehicleType: String(vehicleData.vehicleType || ''),
            vehicleNumber: String(vehicleData.vehicleNumber || ''),
            manufacturer: String(vehicleData.manufacturer || ''),
            model: String(vehicleData.model || ''),
            yearOfManufacture: parseInt(String(vehicleData.yearOfManufacture)) || new Date().getFullYear(),
            valuationAmount: parseFloat(String(vehicleData.valuationAmount)) || 0,
            loanAmount: parseFloat(String(vehicleData.loanAmount)) || 0,
            ownerName: String(vehicleData.ownerName || ''),
            rcBookPhoto: String(vehicleData.rcBookPhoto || ''),
            vehiclePhoto: String(vehicleData.vehiclePhoto || ''),
            chassisNumber: String(vehicleData.chassisNumber || ''),
            engineNumber: String(vehicleData.engineNumber || ''),
            fuelType: String(vehicleData.fuelType || ''),
            color: String(vehicleData.color || ''),
            verificationDate: vehicleData.verificationDate ? new Date(String(vehicleData.verificationDate)) : new Date(),
            verifiedBy: userId || 'system',
            remarks: String(vehicleData.remarks || ''),
          }
        });
      } else {
        await db.vehicleLoanDetail.create({
          data: {
            loanApplicationId: loanId,
            vehicleType: String(vehicleData.vehicleType || ''),
            vehicleNumber: String(vehicleData.vehicleNumber || ''),
            manufacturer: String(vehicleData.manufacturer || ''),
            model: String(vehicleData.model || ''),
            yearOfManufacture: parseInt(String(vehicleData.yearOfManufacture)) || new Date().getFullYear(),
            valuationAmount: parseFloat(String(vehicleData.valuationAmount)) || 0,
            loanAmount: parseFloat(String(vehicleData.loanAmount)) || 0,
            ownerName: String(vehicleData.ownerName || ''),
            rcBookPhoto: String(vehicleData.rcBookPhoto || ''),
            vehiclePhoto: String(vehicleData.vehiclePhoto || ''),
            chassisNumber: String(vehicleData.chassisNumber || ''),
            engineNumber: String(vehicleData.engineNumber || ''),
            fuelType: String(vehicleData.fuelType || ''),
            color: String(vehicleData.color || ''),
            verificationDate: vehicleData.verificationDate ? new Date(String(vehicleData.verificationDate)) : new Date(),
            verifiedBy: userId || 'system',
            remarks: String(vehicleData.remarks || ''),
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      loan: updatedLoan
    });
    
  } catch (error) {
    console.error('[LOAN APPLY API] Error:', error);
    
    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: `Database error: ${error.code}`, details: error.message },
        { status: 400 }
      );
    }
    
    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update loan application', details: (error as Error).message },
      { status: 500 }
    );
  }
}
