/**
 * Mirror Loan Utility Functions
 * 
 * This module handles EMI calculations for both FLAT and REDUCING interest methods,
 * and manages the creation and synchronization of mirror loans.
 */

// ==================== Types ====================

export interface EMICalculation {
  emiAmount: number;
  totalAmount: number;
  totalInterest: number;
  principal: number;
  schedule: EMIScheduleItem[];
}

export interface EMIScheduleItem {
  installmentNumber: number;
  principal: number;
  interest: number;
  emi: number;
  outstandingPrincipal: number;
  dueDate?: Date;
}

export interface MirrorLoanCalculation {
  originalLoan: EMICalculation;
  mirrorLoan: EMICalculation;
  extraEMICount: number;
  leftoverAmount: number;
  adjustmentType: 'REDUCE_EMI' | 'LEFTOVER_AMOUNT';
}

export type InterestType = 'FLAT' | 'REDUCING';
export type MirrorType = 'COMPANY_1_15_PERCENT' | 'COMPANY_2_SAME_RATE';

// ==================== EMI Calculations ====================

/**
 * Calculate EMI using FLAT interest method
 * Interest is calculated on the full principal for the entire tenure
 * 
 * Formula:
 * Total Interest = Principal × Rate × Tenure / 100
 * Total Amount = Principal + Total Interest
 * EMI = Total Amount / Tenure
 */
export function calculateFlatEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): EMICalculation {
  // Calculate total interest (flat rate on full principal)
  const totalInterest = Math.round(principal * (annualRate / 100) * (tenureMonths / 12) * 100) / 100;
  const totalAmount = principal + totalInterest;
  const emiAmount = Math.round(totalAmount / tenureMonths * 100) / 100;
  
  // Generate schedule
  const schedule: EMIScheduleItem[] = [];
  const interestPerMonth = Math.round(totalInterest / tenureMonths * 100) / 100;
  const principalPerMonth = Math.round(principal / tenureMonths * 100) / 100;
  
  for (let i = 1; i <= tenureMonths; i++) {
    schedule.push({
      installmentNumber: i,
      principal: principalPerMonth,
      interest: interestPerMonth,
      emi: emiAmount,
      outstandingPrincipal: Math.max(0, principal - (principalPerMonth * i))
    });
  }
  
  return {
    emiAmount,
    totalAmount,
    totalInterest,
    principal,
    schedule
  };
}

/**
 * Calculate EMI using REDUCING balance method
 * Interest is calculated on the outstanding principal each month
 * 
 * Formula:
 * EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 * Where:
 * P = Principal
 * r = Monthly interest rate (annual rate / 12 / 100)
 * n = Tenure in months
 */
export function calculateReducingEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): EMICalculation {
  const monthlyRate = annualRate / 12 / 100;
  
  // Calculate EMI using reducing balance formula
  let emiAmount: number;
  if (monthlyRate === 0) {
    emiAmount = principal / tenureMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    emiAmount = (principal * monthlyRate * factor) / (factor - 1);
  }
  emiAmount = Math.round(emiAmount * 100) / 100;
  
  // Generate schedule
  const schedule: EMIScheduleItem[] = [];
  let outstandingPrincipal = principal;
  let totalInterest = 0;
  
  for (let i = 1; i <= tenureMonths; i++) {
    const interest = Math.round(outstandingPrincipal * monthlyRate * 100) / 100;
    const principalPaid = Math.round((emiAmount - interest) * 100) / 100;
    
    totalInterest += interest;
    outstandingPrincipal = Math.max(0, outstandingPrincipal - principalPaid);
    
    schedule.push({
      installmentNumber: i,
      principal: principalPaid,
      interest,
      emi: emiAmount,
      outstandingPrincipal
    });
  }
  
  return {
    emiAmount,
    totalAmount: Math.round((principal + totalInterest) * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    principal,
    schedule
  };
}

/**
 * Calculate EMI based on interest type
 */
export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  interestType: InterestType
): EMICalculation {
  if (interestType === 'FLAT') {
    return calculateFlatEMI(principal, annualRate, tenureMonths);
  }
  return calculateReducingEMI(principal, annualRate, tenureMonths);
}

// ==================== Mirror Loan Calculations ====================

/**
 * Calculate mirror loan with same EMI but different interest rate/type
 * 
 * @param principal - Loan amount
 * @param originalRate - Original loan interest rate
 * @param originalTenure - Original loan tenure
 * @param originalType - Original loan interest type (usually FLAT)
 * @param mirrorRate - Mirror loan interest rate (15% or same as original)
 * @param mirrorType - Mirror loan interest type (always REDUCING)
 */
export function calculateMirrorLoan(
  principal: number,
  originalRate: number,
  originalTenure: number,
  originalType: InterestType,
  mirrorRate: number,
  mirrorType: InterestType = 'REDUCING'
): MirrorLoanCalculation {
  // Calculate original loan EMI
  const originalLoan = calculateEMI(principal, originalRate, originalTenure, originalType);
  
  // For mirror loan, use the SAME EMI amount but with mirror rate
  const emiAmount = originalLoan.emiAmount;
  
  // Calculate reducing balance schedule with same EMI
  const monthlyRate = mirrorRate / 12 / 100;
  const schedule: EMIScheduleItem[] = [];
  let outstandingPrincipal = principal;
  let totalInterest = 0;
  let installmentNumber = 1;
  
  // Calculate how many EMIs needed with same EMI amount but reducing interest
  while (outstandingPrincipal > 0 && installmentNumber <= originalTenure + 5) {
    const interest = Math.round(outstandingPrincipal * monthlyRate * 100) / 100;
    let principalPaid = Math.round((emiAmount - interest) * 100) / 100;
    
    // Handle last EMI - adjust to clear remaining principal
    if (principalPaid >= outstandingPrincipal) {
      principalPaid = outstandingPrincipal;
      const lastEMI = principalPaid + interest;
      
      totalInterest += interest;
      outstandingPrincipal = 0;
      
      schedule.push({
        installmentNumber,
        principal: principalPaid,
        interest,
        emi: lastEMI, // Last EMI can be different
        outstandingPrincipal: 0
      });
      
      installmentNumber++;
      break;
    }
    
    totalInterest += interest;
    outstandingPrincipal = Math.max(0, outstandingPrincipal - principalPaid);
    
    schedule.push({
      installmentNumber,
      principal: principalPaid,
      interest,
      emi: emiAmount, // Use the FIXED EMI amount for all regular installments
      outstandingPrincipal
    });
    
    installmentNumber++;
  }
  
  const mirrorTenure = schedule.length;
  const mirrorTotalInterest = Math.round(totalInterest * 100) / 100;
  
  // Calculate EMI differences
  const extraEMICount = originalTenure - mirrorTenure;
  
  // Check for leftover amount (difference between fixed EMI and last EMI)
  const lastEMI = schedule[schedule.length - 1];
  const leftoverAmount = lastEMI ? Math.max(0, Math.round((emiAmount - lastEMI.emi) * 100) / 100) : 0;
  
  const mirrorLoan: EMICalculation = {
    emiAmount,
    totalAmount: Math.round((principal + mirrorTotalInterest) * 100) / 100,
    totalInterest: mirrorTotalInterest,
    principal,
    schedule
  };
  
  return {
    originalLoan,
    mirrorLoan,
    extraEMICount: Math.max(0, extraEMICount),
    leftoverAmount,
    adjustmentType: extraEMICount > 0 ? 'REDUCE_EMI' : 'LEFTOVER_AMOUNT'
  };
}

/**
 * Calculate Company 1 Mirror (15% Reducing)
 */
export function calculateCompany1Mirror(
  principal: number,
  originalRate: number,
  originalTenure: number,
  originalType: InterestType
): MirrorLoanCalculation {
  return calculateMirrorLoan(
    principal,
    originalRate,
    originalTenure,
    originalType,
    15, // Fixed 15% for Company 1
    'REDUCING'
  );
}

/**
 * Calculate Company 2 Mirror (Same Rate, Reducing)
 */
export function calculateCompany2Mirror(
  principal: number,
  originalRate: number,
  originalTenure: number,
  originalType: InterestType
): MirrorLoanCalculation {
  return calculateMirrorLoan(
    principal,
    originalRate,
    originalTenure,
    originalType,
    originalRate, // Same rate as original
    'REDUCING'
  );
}

// ==================== EMI Sync Logic ====================

/**
 * When an EMI is paid in original loan, calculate the corresponding
 * principal and interest for the mirror loan
 */
export function calculateMirrorEMIBreakdown(
  mirrorPrincipal: number,
  mirrorRate: number,
  emiNumber: number,
  emiAmount: number
): { principal: number; interest: number } {
  const monthlyRate = mirrorRate / 12 / 100;
  const interest = Math.round(mirrorPrincipal * monthlyRate * 100) / 100;
  const principal = Math.min(
    Math.round((emiAmount - interest) * 100) / 100,
    mirrorPrincipal
  );
  
  return { principal, interest };
}

/**
 * Get adjustment message for loan details page
 */
export function getAdjustmentMessage(
  extraEMICount: number,
  leftoverAmount: number
): { message: string; type: 'info' | 'warning' | 'success' } {
  if (extraEMICount > 0) {
    return {
      message: `This loan has ${extraEMICount} extra EMI(s) remaining. The mirror loan will complete in fewer EMIs due to lower interest.`,
      type: 'info'
    };
  }
  
  if (leftoverAmount >= 9.5) {
    return {
      message: `After all EMIs, ₹${leftoverAmount.toFixed(2)} will need to be adjusted.`,
      type: 'warning'
    };
  }
  
  if (leftoverAmount > 0 && leftoverAmount < 9.5) {
    return {
      message: `₹${leftoverAmount.toFixed(2)} leftover amount will be adjusted in the last EMI.`,
      type: 'info'
    };
  }
  
  return {
    message: 'EMI amounts are perfectly aligned between original and mirror loans.',
    type: 'success'
  };
}

// ==================== Constants ====================

export const MIRROR_LOAN_CONSTANTS = {
  COMPANY_1_RATE: 15, // Fixed 15% for Company 1
  LEFTOVER_THRESHOLD: 9.5, // Amount to determine EMI count adjustment
  DEFAULT_INTEREST_TYPE: 'FLAT' as InterestType,
  MIRROR_INTEREST_TYPE: 'REDUCING' as InterestType
};


// ==================== EMI Sync Functions ====================

/**
 * Sync EMI payment from original loan to mirror loan
 * This should be called when an EMI is paid on the original loan
 */
export async function syncMirrorLoanPayment(
  originalLoanId: string,
  installmentNumber: number,
  paidAmount: number,
  paidBy: string
): Promise<{ success: boolean; mirrorLoans: string[] }> {
  // This function should be called from the server-side API
  // It will be implemented in the API route directly
  return { success: false, mirrorLoans: [] };
}

/**
 * Get mirror loan mapping for a loan (for use in payment sync)
 */
export interface MirrorLoanMappingInfo {
  id: string;
  loanApplicationId: string;
  originalLoanId: string;
  mirrorType: string;
  mirrorCompanyId: string;
  originalCompanyId: string;
  extraEMICount: number;
  leftoverAmount: number;
  mirrorSyncEnabled: boolean;
  originalInterestRate: number;
  originalInterestType: string;
  mirrorInterestRate: number;
  mirrorInterestType: string;
  originalEMIAmount: number;
  originalTenure: number;
  mirrorEMIAmount: number;
  mirrorTenure: number;
}

export function getMirrorEMIBreakdownForInstallment(
  outstandingPrincipal: number,
  mirrorRate: number,
  emiAmount: number
): { principal: number; interest: number } {
  const monthlyRate = mirrorRate / 12 / 100;
  const interest = Math.round(outstandingPrincipal * monthlyRate * 100) / 100;
  const principal = Math.min(
    Math.round((emiAmount - interest) * 100) / 100,
    outstandingPrincipal
  );
  
  return { principal, interest };
}
