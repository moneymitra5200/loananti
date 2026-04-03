/**
 * Mirror Company Utilities
 * 
 * PERMANENT MIRROR LOAN CONFIGURATION:
 * - Company 1: 15% REDUCING (Mirror Loan Provider)
 * - Company 2: 24% REDUCING (Mirror Loan Provider)
 * - Company 3: Original Company (Customer-Facing, NOT a mirror)
 */

export type CompanyType = 'COMPANY_1' | 'COMPANY_2' | 'COMPANY_3' | 'UNKNOWN';

export interface CompanyIdentification {
  id: string;
  name: string;
  code: string | null;
}

export interface MirrorCompanyConfig {
  id: string;
  name: string;
  code: string | null;
  companyType: CompanyType;
  mirrorInterestRate: number;
  mirrorInterestType: 'REDUCING';
  mirrorType: 'COMPANY_1_15_PERCENT' | 'COMPANY_2_SAME_RATE';
  displayName: string;
  isCompany1: boolean;
}

/**
 * Identifies company type based on code or name patterns
 */
export function identifyCompanyType(company: CompanyIdentification): CompanyType {
  const code = (company.code || '').toUpperCase().trim();
  const name = (company.name || '').toLowerCase().trim();
  
  console.log('[identifyCompanyType] Checking company:', { code, name });
  
  // === EXACT CODE MATCHES (highest priority) ===
  if (code === 'COMPANY1' || code === 'COMPANY_1' || code === 'C1' || code === '1') return 'COMPANY_1';
  if (code === 'COMPANY2' || code === 'COMPANY_2' || code === 'C2' || code === '2') return 'COMPANY_2';
  if (code === 'COMPANY3' || code === 'COMPANY_3' || code === 'C3' || code === '3') return 'COMPANY_3';
  
  // === CODE PATTERN MATCHES ===
  // Check for C-1, C_1, COMP-1, etc.
  if (/^C[-_]?1$/i.test(code)) return 'COMPANY_1';
  if (/^C[-_]?2$/i.test(code)) return 'COMPANY_2';
  if (/^C[-_]?3$/i.test(code)) return 'COMPANY_3';
  
  // Check for any code containing the number
  if (/\b1\b/.test(code) || code.endsWith('1')) return 'COMPANY_1';
  if (/\b2\b/.test(code) || code.endsWith('2')) return 'COMPANY_2';
  if (/\b3\b/.test(code) || code.endsWith('3')) return 'COMPANY_3';
  
  // === NAME PATTERN MATCHES ===
  if (name.includes('company 1') || name.includes('company1')) return 'COMPANY_1';
  if (name.includes('company 2') || name.includes('company2')) return 'COMPANY_2';
  if (name.includes('company 3') || name.includes('company3')) return 'COMPANY_3';
  
  if (name.includes('mirror 1') || name.includes('mirror1')) return 'COMPANY_1';
  if (name.includes('mirror 2') || name.includes('mirror2')) return 'COMPANY_2';
  
  // Company 3 specific patterns
  if (name.includes('original') || name.includes('customer') || name.includes('main')) return 'COMPANY_3';
  
  return 'UNKNOWN';
}

/**
 * Gets mirror company configuration for a list of companies
 * Returns only Company 1 and Company 2 (Company 3 is NOT a mirror)
 */
export function getMirrorCompanies<T extends CompanyIdentification>(companies: T[]): (T & MirrorCompanyConfig)[] {
  console.log('[getMirrorCompanies] Input companies:', companies.map(c => ({ id: c.id, name: c.name, code: c.code })));
  
  // Sort by creation date if available, otherwise use original order
  const sortedCompanies = [...companies].sort((a: any, b: any) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB;
  });
  
  // Try to identify by code/name first
  let company1 = sortedCompanies.find(c => identifyCompanyType(c) === 'COMPANY_1');
  let company2 = sortedCompanies.find(c => identifyCompanyType(c) === 'COMPANY_2');
  let company3 = sortedCompanies.find(c => identifyCompanyType(c) === 'COMPANY_3');
  
  // Fallback: Use order-based assignment if no companies identified
  const identifiedCount = [company1, company2, company3].filter(Boolean).length;
  
  if (identifiedCount === 0) {
    console.log('[getMirrorCompanies] No companies identified by code/name, using order-based fallback');
    
    if (sortedCompanies.length >= 3) {
      company1 = sortedCompanies[0];
      company2 = sortedCompanies[1];
      company3 = sortedCompanies[2];
    } else if (sortedCompanies.length === 2) {
      company1 = sortedCompanies[0];
      company2 = sortedCompanies[1];
    }
  }
  
  console.log('[getMirrorCompanies] Identified:', {
    company1: company1?.name,
    company2: company2?.name,
    company3: company3?.name
  });
  
  // Build mirror companies list (ONLY Company 1 and Company 2)
  const mirrorCompanies: (T & MirrorCompanyConfig)[] = [];
  
  if (company1) {
    mirrorCompanies.push({
      ...company1,
      companyType: 'COMPANY_1',
      mirrorInterestRate: 15,
      mirrorInterestType: 'REDUCING',
      mirrorType: 'COMPANY_1_15_PERCENT',
      displayName: 'Company 1 - 15% Reducing',
      isCompany1: true
    });
  }
  
  if (company2) {
    mirrorCompanies.push({
      ...company2,
      companyType: 'COMPANY_2',
      mirrorInterestRate: 24,
      mirrorInterestType: 'REDUCING',
      mirrorType: 'COMPANY_2_SAME_RATE',
      displayName: 'Company 2 - 24% Reducing',
      isCompany1: false
    });
  }
  
  console.log('[getMirrorCompanies] Output mirror companies:', mirrorCompanies.map(c => ({
    name: c.name,
    code: c.code,
    displayName: c.displayName,
    mirrorInterestRate: c.mirrorInterestRate
  })));
  
  return mirrorCompanies;
}

/**
 * Gets Company 3 (the original/customer-facing company)
 */
export function getOriginalCompany<T extends CompanyIdentification>(companies: T[]): T | undefined {
  const sortedCompanies = [...companies].sort((a: any, b: any) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB;
  });
  
  // Try to identify by code/name
  let company3 = sortedCompanies.find(c => identifyCompanyType(c) === 'COMPANY_3');
  
  // Fallback: Use third company if not identified
  if (!company3 && sortedCompanies.length >= 3) {
    company3 = sortedCompanies[2];
  }
  
  return company3;
}

/**
 * PERMANENT MIRROR LOAN RATES
 */
export const MIRROR_RATES = {
  COMPANY_1: 15,  // 15% REDUCING
  COMPANY_2: 24,  // 24% REDUCING
} as const;
