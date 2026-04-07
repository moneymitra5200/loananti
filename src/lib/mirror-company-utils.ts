/**
 * Mirror Company Utilities
 * 
 * Mirror companies are identified by the `isMirrorCompany` flag in the Company model.
 * Interest rate for mirror loans is set PER LOAN, not per company.
 * This gives flexibility to use different rates for different loans.
 */

export type CompanyType = 'MIRROR_COMPANY' | 'ORIGINAL_COMPANY' | 'UNKNOWN';

export interface CompanyIdentification {
  id: string;
  name: string;
  code: string | null;
  isMirrorCompany?: boolean;
}

export interface MirrorCompanyConfig {
  id: string;
  name: string;
  code: string | null;
  companyType: CompanyType;
  displayName: string;
}

/**
 * Identifies company type based on isMirrorCompany flag
 */
export function identifyCompanyType(company: CompanyIdentification): CompanyType {
  // Primary: Check the isMirrorCompany flag
  if (company.isMirrorCompany === true) {
    return 'MIRROR_COMPANY';
  }
  if (company.isMirrorCompany === false) {
    return 'ORIGINAL_COMPANY';
  }
  
  // Fallback: Check by code/name patterns
  const code = (company.code || '').toUpperCase().trim();
  const name = (company.name || '').toLowerCase().trim();
  
  // Code patterns for mirror companies (C1, C2)
  if (code === 'C1' || code === 'C2' || code === 'COMPANY1' || code === 'COMPANY2') {
    return 'MIRROR_COMPANY';
  }
  
  // Code patterns for original company (C3)
  if (code === 'C3' || code === 'COMPANY3') {
    return 'ORIGINAL_COMPANY';
  }
  
  // Name patterns
  if (name.includes('mirror') || name.includes('company 1') || name.includes('company 2')) {
    return 'MIRROR_COMPANY';
  }
  
  if (name.includes('original') || name.includes('customer') || name.includes('company 3')) {
    return 'ORIGINAL_COMPANY';
  }
  
  return 'UNKNOWN';
}

/**
 * Gets mirror companies from a list of companies
 * Returns only companies with isMirrorCompany = true
 */
export function getMirrorCompanies<T extends CompanyIdentification>(companies: T[]): (T & MirrorCompanyConfig)[] {
  console.log('[getMirrorCompanies] Input companies:', companies.map(c => ({ 
    id: c.id, 
    name: c.name, 
    code: c.code, 
    isMirrorCompany: c.isMirrorCompany 
  })));
  
  // Filter companies that are marked as mirror companies
  const mirrorCompanies = companies.filter(c => c.isMirrorCompany === true);
  
  const result = mirrorCompanies.map(company => ({
    ...company,
    companyType: 'MIRROR_COMPANY' as CompanyType,
    displayName: `${company.name} (${company.code || 'N/A'})`
  }));
  
  console.log('[getMirrorCompanies] Output mirror companies:', result.map(c => ({
    name: c.name,
    code: c.code,
    displayName: c.displayName
  })));
  
  return result;
}

/**
 * Gets the original company (non-mirror company)
 */
export function getOriginalCompany<T extends CompanyIdentification>(companies: T[]): T | undefined {
  // First, try to find a company with isMirrorCompany = false
  const originalCompany = companies.find(c => c.isMirrorCompany === false);
  if (originalCompany) {
    return originalCompany;
  }
  
  // Fallback: Find by code/name patterns
  return companies.find(c => {
    const code = (c.code || '').toUpperCase().trim();
    const name = (c.name || '').toLowerCase().trim();
    
    return code === 'C3' || 
           code === 'COMPANY3' || 
           name.includes('original') || 
           name.includes('customer') ||
           name.includes('company 3');
  });
}
