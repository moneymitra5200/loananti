/**
 * COMPLETE GNUCASH-STYLE ACCOUNTING LIBRARY
 * Money Mitra Loan Management System
 * 
 * This library handles all automatic journal entries following
 * proper double-entry accounting principles like GnuCash.
 * 
 * IMPORTANT RULES:
 * 1. Principal is NEVER treated as income
 * 2. Only interest and fees are income
 * 3. Mirror loans: Only ONE entry in MIRROR company (not in original company)
 * 4. Extra EMI interest: Goes to Company 3 (personal)
 */

import { db } from '@/lib/db';

// Account types as strings (not enum in schema)
type AccountType = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY';

// ============================================
// COMPLETE CHART OF ACCOUNTS FOR LOAN BUSINESS
// Following GnuCash Structure
// ============================================

export const COMPLETE_CHART_OF_ACCOUNTS: Array<{
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  parentCode?: string;
  isSystemAccount: boolean;
  description: string;
  level: number;
}> = [
  // ==================== ASSETS (Debit Balance) ====================
  // 1.1 Current Assets
  { accountCode: '1000', accountName: 'Current Assets', accountType: 'ASSET', isSystemAccount: true, description: 'Assets that can be converted to cash within 1 year', level: 1 },
  
  // 1.1.1 Cash & Cash Equivalents
  { accountCode: '1100', accountName: 'Cash and Cash Equivalents', accountType: 'ASSET', parentCode: '1000', isSystemAccount: true, description: 'Cash and bank balances', level: 2 },
  { accountCode: '1101', accountName: 'Cash in Hand', accountType: 'ASSET', parentCode: '1100', isSystemAccount: true, description: 'Physical cash on hand', level: 3 },
  { accountCode: '1102', accountName: 'Bank Accounts', accountType: 'ASSET', parentCode: '1100', isSystemAccount: true, description: 'All bank accounts', level: 3 },
  { accountCode: '1103', accountName: 'Bank - Main Operating', accountType: 'ASSET', parentCode: '1102', isSystemAccount: true, description: 'Primary operating bank account', level: 4 },
  { accountCode: '1104', accountName: 'Bank - Secondary', accountType: 'ASSET', parentCode: '1102', isSystemAccount: false, description: 'Secondary bank account', level: 4 },
  { accountCode: '1105', accountName: 'Petty Cash', accountType: 'ASSET', parentCode: '1101', isSystemAccount: false, description: 'Petty cash fund', level: 4 },
  
  // 1.1.2 Loans Receivable (Core Business)
  { accountCode: '1200', accountName: 'Loans Receivable', accountType: 'ASSET', parentCode: '1000', isSystemAccount: true, description: 'Money given as loans to customers', level: 2 },
  { accountCode: '1201', accountName: 'Online Loans Receivable', accountType: 'ASSET', parentCode: '1200', isSystemAccount: true, description: 'Online loans principal outstanding', level: 3 },
  { accountCode: '1202', accountName: 'Online Loans - Active', accountType: 'ASSET', parentCode: '1201', isSystemAccount: true, description: 'Active online loans', level: 4 },
  { accountCode: '1203', accountName: 'Online Loans - Closed', accountType: 'ASSET', parentCode: '1201', isSystemAccount: true, description: 'Closed online loans', level: 4 },
  { accountCode: '1210', accountName: 'Offline Loans Receivable', accountType: 'ASSET', parentCode: '1200', isSystemAccount: true, description: 'Offline loans principal outstanding', level: 3 },
  { accountCode: '1211', accountName: 'Offline Loans - Active', accountType: 'ASSET', parentCode: '1210', isSystemAccount: true, description: 'Active offline loans', level: 4 },
  { accountCode: '1212', accountName: 'Offline Loans - Closed', accountType: 'ASSET', parentCode: '1210', isSystemAccount: true, description: 'Closed offline loans', level: 4 },
  
  // 1.1.3 Receivables
  { accountCode: '1300', accountName: 'Accounts Receivable', accountType: 'ASSET', parentCode: '1000', isSystemAccount: true, description: 'Money owed to the business', level: 2 },
  { accountCode: '1301', accountName: 'Interest Receivable', accountType: 'ASSET', parentCode: '1300', isSystemAccount: true, description: 'Interest accrued but not received', level: 3 },
  { accountCode: '1302', accountName: 'EMI Receivable', accountType: 'ASSET', parentCode: '1300', isSystemAccount: true, description: 'EMI due but not paid', level: 3 },
  { accountCode: '1303', accountName: 'Processing Fee Receivable', accountType: 'ASSET', parentCode: '1300', isSystemAccount: true, description: 'Processing fees to be collected', level: 3 },
  { accountCode: '1304', accountName: 'Penalty Receivable', accountType: 'ASSET', parentCode: '1300', isSystemAccount: true, description: 'Late payment penalties receivable', level: 3 },
  
  // 1.2 Fixed Assets
  { accountCode: '1500', accountName: 'Fixed Assets', accountType: 'ASSET', isSystemAccount: true, description: 'Long-term assets', level: 1 },
  { accountCode: '1501', accountName: 'Office Equipment', accountType: 'ASSET', parentCode: '1500', isSystemAccount: false, description: 'Office equipment and furniture', level: 2 },
  { accountCode: '1502', accountName: 'Computers', accountType: 'ASSET', parentCode: '1500', isSystemAccount: false, description: 'Computers and IT equipment', level: 2 },
  { accountCode: '1503', accountName: 'Vehicles', accountType: 'ASSET', parentCode: '1500', isSystemAccount: false, description: 'Company vehicles', level: 2 },
  
  // ==================== LIABILITIES (Credit Balance) ====================
  // 2.1 Current Liabilities
  { accountCode: '2000', accountName: 'Current Liabilities', accountType: 'LIABILITY', isSystemAccount: true, description: 'Obligations due within 1 year', level: 1 },
  { accountCode: '2001', accountName: 'Accounts Payable', accountType: 'LIABILITY', parentCode: '2000', isSystemAccount: true, description: 'Money owed to vendors', level: 2 },
  { accountCode: '2002', accountName: 'Salary Payable', accountType: 'LIABILITY', parentCode: '2000', isSystemAccount: true, description: 'Salaries owed to employees', level: 2 },
  { accountCode: '2003', accountName: 'Interest Payable', accountType: 'LIABILITY', parentCode: '2000', isSystemAccount: true, description: 'Interest owed on borrowed funds', level: 2 },
  
  // 2.2 Long-term Liabilities
  { accountCode: '2100', accountName: 'Long-term Liabilities', accountType: 'LIABILITY', isSystemAccount: true, description: 'Obligations due after 1 year', level: 1 },
  { accountCode: '2101', accountName: 'Bank Loans', accountType: 'LIABILITY', parentCode: '2100', isSystemAccount: true, description: 'Loans from banks for capital', level: 2 },
  { accountCode: '2102', accountName: 'Bank Loan - SBI', accountType: 'LIABILITY', parentCode: '2101', isSystemAccount: false, description: 'SBI loan outstanding', level: 3 },
  { accountCode: '2103', accountName: 'Bank Loan - HDFC', accountType: 'LIABILITY', parentCode: '2101', isSystemAccount: false, description: 'HDFC loan outstanding', level: 3 },
  { accountCode: '2110', accountName: 'Investor Capital', accountType: 'LIABILITY', parentCode: '2100', isSystemAccount: true, description: 'Capital from investors', level: 2 },
  { accountCode: '2120', accountName: 'Borrowed Funds', accountType: 'LIABILITY', parentCode: '2100', isSystemAccount: true, description: 'Funds borrowed from other sources', level: 2 },
  
  // ==================== EQUITY (Credit Balance) ====================
  { accountCode: '3000', accountName: 'Equity', accountType: 'EQUITY', isSystemAccount: true, description: 'Owner\'s stake in business', level: 1 },
  { accountCode: '3001', accountName: 'Opening Balance Equity', accountType: 'EQUITY', parentCode: '3000', isSystemAccount: true, description: 'Initial capital from bank + cash', level: 2 },
  { accountCode: '3002', accountName: 'Owner\'s Capital', accountType: 'EQUITY', parentCode: '3000', isSystemAccount: true, description: 'Owner\'s capital investment', level: 2 },
  { accountCode: '3003', accountName: 'Retained Earnings', accountType: 'EQUITY', parentCode: '3000', isSystemAccount: true, description: 'Accumulated profits from previous years', level: 2 },
  { accountCode: '3004', accountName: 'Current Year Profit', accountType: 'EQUITY', parentCode: '3000', isSystemAccount: true, description: 'Profit/loss for current year', level: 2 },
  
  // ==================== INCOME (Credit Balance) ====================
  { accountCode: '4000', accountName: 'Income', accountType: 'INCOME', isSystemAccount: true, description: 'Revenue earned', level: 1 },
  
  // 4.1 Operating Income
  { accountCode: '4100', accountName: 'Operating Income', accountType: 'INCOME', parentCode: '4000', isSystemAccount: true, description: 'Income from core business', level: 2 },
  
  // 4.1.1 Interest Income (Main Income)
  { accountCode: '4110', accountName: 'Interest Income', accountType: 'INCOME', parentCode: '4100', isSystemAccount: true, description: 'Interest earned on loans', level: 3 },
  { accountCode: '4111', accountName: 'Interest Income - Online Loans', accountType: 'INCOME', parentCode: '4110', isSystemAccount: true, description: 'Interest from online loans', level: 4 },
  { accountCode: '4112', accountName: 'Interest Income - Offline Loans', accountType: 'INCOME', parentCode: '4110', isSystemAccount: true, description: 'Interest from offline loans', level: 4 },
  { accountCode: '4113', accountName: 'Interest Income - Mirror Loans', accountType: 'INCOME', parentCode: '4110', isSystemAccount: true, description: 'Interest profit from mirror loans (Company 3)', level: 4 },
  { accountCode: '4114', accountName: 'Penal Interest', accountType: 'INCOME', parentCode: '4110', isSystemAccount: true, description: 'Penal interest charged', level: 4 },
  
  // 4.1.2 Fee Income
  { accountCode: '4120', accountName: 'Fee Income', accountType: 'INCOME', parentCode: '4100', isSystemAccount: true, description: 'Fees collected', level: 3 },
  { accountCode: '4121', accountName: 'Processing Fee Income', accountType: 'INCOME', parentCode: '4120', isSystemAccount: true, description: 'Processing fees collected', level: 4 },
  { accountCode: '4122', accountName: 'Late Fee Income', accountType: 'INCOME', parentCode: '4120', isSystemAccount: true, description: 'Late payment charges', level: 4 },
  { accountCode: '4123', accountName: 'Bounce Charges Income', accountType: 'INCOME', parentCode: '4120', isSystemAccount: true, description: 'Cheque/ECS bounce charges', level: 4 },
  { accountCode: '4124', accountName: 'Foreclosure Charges', accountType: 'INCOME', parentCode: '4120', isSystemAccount: true, description: 'Foreclosure/prepayment fees', level: 4 },
  { accountCode: '4125', accountName: 'Documentation Charges', accountType: 'INCOME', parentCode: '4120', isSystemAccount: false, description: 'Document processing fees', level: 4 },
  
  // 4.2 Other Income
  { accountCode: '4200', accountName: 'Other Income', accountType: 'INCOME', parentCode: '4000', isSystemAccount: true, description: 'Non-operating income', level: 2 },
  { accountCode: '4201', accountName: 'Bank Interest Received', accountType: 'INCOME', parentCode: '4200', isSystemAccount: true, description: 'Interest from bank deposits', level: 3 },
  { accountCode: '4202', accountName: 'Bad Debt Recovery', accountType: 'INCOME', parentCode: '4200', isSystemAccount: false, description: 'Recovered bad debts', level: 3 },
  
  // ==================== EXPENSES (Debit Balance) ====================
  { accountCode: '5000', accountName: 'Expenses', accountType: 'EXPENSE', isSystemAccount: true, description: 'Costs incurred', level: 1 },
  
  // 5.1 Operating Expenses
  { accountCode: '5100', accountName: 'Operating Expenses', accountType: 'EXPENSE', parentCode: '5000', isSystemAccount: true, description: 'Day-to-day business costs', level: 2 },
  
  // 5.1.1 Employee Expenses
  { accountCode: '5110', accountName: 'Employee Expenses', accountType: 'EXPENSE', parentCode: '5100', isSystemAccount: true, description: 'Staff-related costs', level: 3 },
  { accountCode: '5111', accountName: 'Staff Salary', accountType: 'EXPENSE', parentCode: '5110', isSystemAccount: true, description: 'Employee salaries', level: 4 },
  { accountCode: '5112', accountName: 'Staff Welfare', accountType: 'EXPENSE', parentCode: '5110', isSystemAccount: false, description: 'Employee benefits', level: 4 },
  { accountCode: '5113', accountName: 'PF Contribution', accountType: 'EXPENSE', parentCode: '5110', isSystemAccount: false, description: 'Provident fund contribution', level: 4 },
  
  // 5.1.2 Administrative Expenses
  { accountCode: '5120', accountName: 'Administrative Expenses', accountType: 'EXPENSE', parentCode: '5100', isSystemAccount: true, description: 'Office administration costs', level: 3 },
  { accountCode: '5121', accountName: 'Office Rent', accountType: 'EXPENSE', parentCode: '5120', isSystemAccount: true, description: 'Office rent expense', level: 4 },
  { accountCode: '5122', accountName: 'Utilities', accountType: 'EXPENSE', parentCode: '5120', isSystemAccount: true, description: 'Electricity, water, internet', level: 4 },
  { accountCode: '5123', accountName: 'Office Supplies', accountType: 'EXPENSE', parentCode: '5120', isSystemAccount: false, description: 'Stationery and supplies', level: 4 },
  { accountCode: '5124', accountName: 'Repairs & Maintenance', accountType: 'EXPENSE', parentCode: '5120', isSystemAccount: false, description: 'Office maintenance', level: 4 },
  
  // 5.1.3 Professional Fees
  { accountCode: '5130', accountName: 'Professional Fees', accountType: 'EXPENSE', parentCode: '5100', isSystemAccount: true, description: 'Professional services', level: 3 },
  { accountCode: '5131', accountName: 'Audit Fees', accountType: 'EXPENSE', parentCode: '5130', isSystemAccount: true, description: 'Audit and accounting fees', level: 4 },
  { accountCode: '5132', accountName: 'Legal Fees', accountType: 'EXPENSE', parentCode: '5130', isSystemAccount: true, description: 'Legal consultation fees', level: 4 },
  { accountCode: '5133', accountName: 'Consultant Fees', accountType: 'EXPENSE', parentCode: '5130', isSystemAccount: false, description: 'Consultancy charges', level: 4 },
  
  // 5.1.4 Marketing & Travel
  { accountCode: '5140', accountName: 'Marketing & Travel', accountType: 'EXPENSE', parentCode: '5100', isSystemAccount: true, description: 'Marketing and travel costs', level: 3 },
  { accountCode: '5141', accountName: 'Marketing Expense', accountType: 'EXPENSE', parentCode: '5140', isSystemAccount: true, description: 'Marketing and advertising', level: 4 },
  { accountCode: '5142', accountName: 'Travel Expense', accountType: 'EXPENSE', parentCode: '5140', isSystemAccount: true, description: 'Travel and conveyance', level: 4 },
  
  // 5.2 Financial Expenses
  { accountCode: '5200', accountName: 'Financial Expenses', accountType: 'EXPENSE', parentCode: '5000', isSystemAccount: true, description: 'Finance-related costs', level: 2 },
  { accountCode: '5201', accountName: 'Interest Expense', accountType: 'EXPENSE', parentCode: '5200', isSystemAccount: true, description: 'Interest paid on borrowed funds', level: 3 },
  { accountCode: '5202', accountName: 'Interest Expense - Bank Loans', accountType: 'EXPENSE', parentCode: '5201', isSystemAccount: true, description: 'Interest paid to banks', level: 4 },
  { accountCode: '5203', accountName: 'Bank Charges', accountType: 'EXPENSE', parentCode: '5200', isSystemAccount: true, description: 'Bank transaction fees', level: 3 },
  { accountCode: '5204', accountName: 'Commission Paid', accountType: 'EXPENSE', parentCode: '5200', isSystemAccount: true, description: 'Agent commissions', level: 3 },
  
  // 5.3 Bad Debts & Provisions
  { accountCode: '5300', accountName: 'Bad Debts & Provisions', accountType: 'EXPENSE', parentCode: '5000', isSystemAccount: true, description: 'Loan losses and provisions', level: 2 },
  { accountCode: '5301', accountName: 'Bad Debt Written Off', accountType: 'EXPENSE', parentCode: '5300', isSystemAccount: true, description: 'Uncollectible loans written off', level: 3 },
  { accountCode: '5302', accountName: 'Provision for Bad Debts', accountType: 'EXPENSE', parentCode: '5300', isSystemAccount: true, description: 'Provision for potential losses', level: 3 },
  
  // 5.4 Depreciation
  { accountCode: '5400', accountName: 'Depreciation', accountType: 'EXPENSE', parentCode: '5000', isSystemAccount: true, description: 'Asset depreciation', level: 2 },
  { accountCode: '5401', accountName: 'Depreciation - Furniture', accountType: 'EXPENSE', parentCode: '5400', isSystemAccount: false, description: 'Furniture depreciation', level: 3 },
  { accountCode: '5402', accountName: 'Depreciation - Computers', accountType: 'EXPENSE', parentCode: '5400', isSystemAccount: false, description: 'Computer depreciation', level: 3 },
  { accountCode: '5403', accountName: 'Depreciation - Vehicles', accountType: 'EXPENSE', parentCode: '5400', isSystemAccount: false, description: 'Vehicle depreciation', level: 3 },
];

// Simplified chart of accounts for backward compatibility
export const DEFAULT_CHART_OF_ACCOUNTS = COMPLETE_CHART_OF_ACCOUNTS.filter(a => a.level <= 2);

// ============================================
// ACCOUNT CODE CONSTANTS
// ============================================

export const ACCOUNT_CODES = {
  // Assets
  CASH_IN_HAND: '1101',
  BANK_MAIN: '1103',
  LOANS_RECEIVABLE: '1200',
  ONLINE_LOANS_RECEIVABLE: '1201',
  OFFLINE_LOANS_RECEIVABLE: '1210',
  INTEREST_RECEIVABLE: '1301',
  EMI_RECEIVABLE: '1302',
  
  // Liabilities
  BANK_LOANS: '2101',
  INVESTOR_CAPITAL: '2110',
  BORROWED_FUNDS: '2120',
  
  // Equity
  OPENING_BALANCE_EQUITY: '3001',
  OWNERS_CAPITAL: '3002',
  RETAINED_EARNINGS: '3003',
  CURRENT_YEAR_PROFIT: '3004',
  
  // Income
  INTEREST_INCOME: '4110',

  PROCESSING_FEE_INCOME: '4121',
  LATE_FEE_INCOME: '4122',
  BOUNCE_CHARGES_INCOME: '4123',
  
  // Expenses
  STAFF_SALARY: '5111',
  OFFICE_RENT: '5121',
  UTILITIES: '5122',
  INTEREST_EXPENSE: '5201',
  INTEREST_EXPENSE_BANK: '5202',
  BANK_CHARGES: '5203',
  COMMISSION_PAID: '5204',
  BAD_DEBT_WRITTEN_OFF: '5301',
};

// ============================================
// INITIALIZATION FUNCTIONS
// ============================================

/**
 * Initialize complete chart of accounts for a company
 */
export async function initializeCompleteChartOfAccounts(companyId: string) {
  const existingAccounts = await db.chartOfAccount.count({
    where: { companyId }
  });
  
  if (existingAccounts > 0) {
    return { message: 'Chart of accounts already initialized', count: existingAccounts };
  }
  
  // Create accounts
  for (const account of COMPLETE_CHART_OF_ACCOUNTS) {
    let parentAccountId: string | null = null;
    
    if (account.parentCode) {
      const parent = await db.chartOfAccount.findFirst({
        where: { companyId, accountCode: account.parentCode }
      });
      if (parent) {
        parentAccountId = parent.id;
      }
    }
    
    await db.chartOfAccount.create({
      data: {
        companyId,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        parentAccountId,
        isSystemAccount: account.isSystemAccount,
        description: account.description,
        isActive: true,
        openingBalance: 0,
        currentBalance: 0,
      }
    });
  }
  
  return { message: 'Chart of accounts initialized', count: COMPLETE_CHART_OF_ACCOUNTS.length };
}

// Legacy function for compatibility
export async function initializeChartOfAccounts(companyId: string) {
  return initializeCompleteChartOfAccounts(companyId);
}

// ============================================
// JOURNAL ENTRY FUNCTIONS
// ============================================

/**
 * Get account by code
 */
export async function getAccountByCode(accountCode: string, companyId: string) {
  return db.chartOfAccount.findFirst({
    where: { accountCode, companyId }
  });
}

/**
 * Generate journal entry number
 */
export async function generateEntryNumber(companyId: string) {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  const lastEntry = await db.journalEntry.findFirst({
    where: { 
      companyId,
      entryNumber: { startsWith: `JE${year}${month}` }
    },
    orderBy: { entryNumber: 'desc' }
  });
  
  let sequence = 1;
  if (lastEntry) {
    const lastSequence = parseInt(lastEntry.entryNumber.slice(-5));
    sequence = lastSequence + 1;
  }
  
  return `JE${year}${month}${sequence.toString().padStart(5, '0')}`;
}

/**
 * Create journal entry with double-entry validation
 */
export async function createJournalEntry(data: {
  companyId: string;
  entryDate: Date;
  narration?: string;
  referenceType?: string;
  referenceId?: string;
  lines: Array<{
    accountCode: string;
    debitAmount: number;
    creditAmount: number;
    narration?: string;
    loanId?: string;
    customerId?: string;
  }>;
  paymentMode?: string;
  chequeNumber?: string;
  chequeDate?: Date;
  bankRefNumber?: string;
  bankAccountId?: string;
  createdById: string;
  isAutoEntry?: boolean;
}) {
  const totalDebit = data.lines.reduce((sum, line) => sum + line.debitAmount, 0);
  const totalCredit = data.lines.reduce((sum, line) => sum + line.creditAmount, 0);
  
  // Validate double-entry (GnuCash rule: Debit MUST equal Credit)
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal entry not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}. Every transaction must have equal debits and credits.`);
  }
  
  const entryNumber = await generateEntryNumber(data.companyId);
  
  // Get accounts for all lines
  const accountCodes = [...new Set(data.lines.map(l => l.accountCode))];
  const accounts = await db.chartOfAccount.findMany({
    where: { accountCode: { in: accountCodes }, companyId: data.companyId }
  });
  
  const accountMap = new Map(accounts.map(a => [a.accountCode, a]));
  
  // Validate all accounts exist
  for (const code of accountCodes) {
    if (!accountMap.has(code)) {
      throw new Error(`Account not found: ${code}`);
    }
  }
  
  const entry = await db.journalEntry.create({
    data: {
      companyId: data.companyId,
      entryNumber,
      entryDate: data.entryDate,
      narration: data.narration,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      totalDebit,
      totalCredit,
      isAutoEntry: data.isAutoEntry || false,
      paymentMode: data.paymentMode,
      chequeNumber: data.chequeNumber,
      chequeDate: data.chequeDate,
      bankRefNumber: data.bankRefNumber,
      bankAccountId: data.bankAccountId,
      createdById: data.createdById,
      isApproved: true,
      approvedAt: new Date(),
      lines: {
        create: data.lines.map(line => ({
          accountId: accountMap.get(line.accountCode)!.id,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          narration: line.narration,
          loanId: line.loanId,
          customerId: line.customerId
        }))
      }
    },
    include: {
      lines: {
        include: {
          account: true
        }
      }
    }
  });
  
  // Update account balances
  for (const line of data.lines) {
    const account = accountMap.get(line.accountCode)!;
    
    // Balance calculation based on account type
    // Assets & Expenses: Debit increases, Credit decreases
    // Liabilities, Income & Equity: Credit increases, Debit decreases
    let balanceChange = 0;
    if (account.accountType === 'ASSET' || account.accountType === 'EXPENSE') {
      balanceChange = line.debitAmount - line.creditAmount;
    } else {
      balanceChange = line.creditAmount - line.debitAmount;
    }
    
    await db.chartOfAccount.update({
      where: { id: account.id },
      data: { currentBalance: account.currentBalance + balanceChange }
    });
  }
  
  return entry;
}

// ============================================
// LOAN DISBURSEMENT ENTRY
// ============================================

/**
 * Create journal entry for loan disbursement
 * 
 * GnuCash-Style Entry:
 * Debit: Loans Receivable (Asset increases)
 * Credit: Bank/Cash (Asset decreases)
 * Credit: Processing Fee Income (if fee deducted upfront)
 * 
 * MIRROR LOAN HANDLING:
 * - If isMirrorLoan = true: Entry in MIRROR company ONLY
 * - Original company gets the loan, mirror company provides funds
 * - Only ONE entry to avoid double-counting
 */
export async function postLoanDisbursementEntry(data: {
  loanId: string;
  companyId: string;
  customerId: string;
  principalAmount: number;
  processingFee: number;
  isOnlineLoan: boolean;
  isMirrorLoan?: boolean;
  mirrorCompanyId?: string;
  bankAccountId?: string;
  createdById: string;
  paymentMode?: string;
  chequeNumber?: string;
  bankRefNumber?: string;
}) {
  const lines: Array<{
    accountCode: string;
    debitAmount: number;
    creditAmount: number;
    narration: string;
    loanId?: string;
    customerId?: string;
  }> = [];
  
  // Determine the target company for the entry
  // MIRROR LOAN: Entry goes to MIRROR company (they provide the funds)
  // REGULAR LOAN: Entry goes to the loan's own company
  const targetCompanyId = data.isMirrorLoan ? data.mirrorCompanyId : data.companyId;
  
  if (!targetCompanyId) {
    throw new Error('Target company ID is required for journal entry');
  }
  
  // 1. Debit: Loans Receivable
  const loanAccountCode = data.isOnlineLoan 
    ? ACCOUNT_CODES.ONLINE_LOANS_RECEIVABLE 
    : ACCOUNT_CODES.OFFLINE_LOANS_RECEIVABLE;
  
  lines.push({
    accountCode: loanAccountCode,
    debitAmount: data.principalAmount,
    creditAmount: 0,
    narration: `Loan disbursement - ${data.isOnlineLoan ? 'Online' : 'Offline'} - Principal`,
    loanId: data.loanId,
    customerId: data.customerId
  });
  
  // 2. Credit: Bank/Cash (net disbursement)
  const netDisbursement = data.principalAmount - data.processingFee;
  const bankOrCash = data.paymentMode === 'CASH' ? ACCOUNT_CODES.CASH_IN_HAND : ACCOUNT_CODES.BANK_MAIN;
  
  lines.push({
    accountCode: bankOrCash,
    debitAmount: 0,
    creditAmount: netDisbursement,
    narration: `Net disbursement after processing fee`
  });
  
  // 3. Credit: Processing Fee Income (if deducted upfront)
  if (data.processingFee > 0) {
    lines.push({
      accountCode: ACCOUNT_CODES.PROCESSING_FEE_INCOME,
      debitAmount: 0,
      creditAmount: data.processingFee,
      narration: `Processing fee collected upfront`
    });
  }
  
  return createJournalEntry({
    companyId: targetCompanyId,
    entryDate: new Date(),
    narration: `Loan Disbursement - ${data.loanId} ${data.isMirrorLoan ? '(Mirror)' : ''}`,
    referenceType: data.isMirrorLoan ? 'MIRROR_LOAN_DISBURSEMENT' : 'LOAN_DISBURSEMENT',
    referenceId: data.loanId,
    lines,
    paymentMode: data.paymentMode || 'BANK_TRANSFER',
    chequeNumber: data.chequeNumber,
    bankRefNumber: data.bankRefNumber,
    bankAccountId: data.bankAccountId,
    createdById: data.createdById,
    isAutoEntry: true
  });
}

// ============================================
// EMI PAYMENT ENTRY
// ============================================

/**
 * Create journal entry for EMI payment
 * 
 * GnuCash-Style Entry:
 * Debit: Bank/Cash (Asset increases)
 * Credit: Loans Receivable (Asset decreases - principal repaid)
 * Credit: Interest Income (Income earned)
 * Credit: Late Fee Income (if penalty)
 * 
 * MIRROR LOAN HANDLING:
 * - Regular loan: Entry in loan's company
 * - Mirror loan: Entry in MIRROR company
 * - Extra interest profit: Entry in Company 3 (personal)
 */
export async function postEMIPaymentEntry(data: {
  loanId: string;
  companyId: string;
  customerId: string;
  principalAmount: number;
  interestAmount: number;
  penaltyAmount?: number;
  isOnlineLoan: boolean;
  isMirrorLoan?: boolean;
  mirrorCompanyId?: string;
  extraInterestProfit?: number; // For Company 3
  bankAccountId?: string;
  createdById: string;
  paymentMode?: string;
  chequeNumber?: string;
  bankRefNumber?: string;
  narration?: string;
}) {
  const lines: Array<{
    accountCode: string;
    debitAmount: number;
    creditAmount: number;
    narration: string;
    loanId?: string;
    customerId?: string;
  }> = [];
  
  const totalPayment = data.principalAmount + data.interestAmount + (data.penaltyAmount || 0);
  
  // 1. Debit: Bank/Cash
  const bankOrCash = data.paymentMode === 'CASH' ? ACCOUNT_CODES.CASH_IN_HAND : ACCOUNT_CODES.BANK_MAIN;
  
  lines.push({
    accountCode: bankOrCash,
    debitAmount: totalPayment,
    creditAmount: 0,
    narration: `EMI Payment received`,
    loanId: data.loanId,
    customerId: data.customerId
  });
  
  // 2. Credit: Loans Receivable (principal part)
  if (data.principalAmount > 0) {
    const loanAccountCode = data.isOnlineLoan 
      ? ACCOUNT_CODES.ONLINE_LOANS_RECEIVABLE 
      : ACCOUNT_CODES.OFFLINE_LOANS_RECEIVABLE;
    
    lines.push({
      accountCode: loanAccountCode,
      debitAmount: 0,
      creditAmount: data.principalAmount,
      narration: `Principal component`,
      loanId: data.loanId,
      customerId: data.customerId
    });
  }
  
  // 3. Credit: Interest Income
  if (data.interestAmount > 0) {
    const interestAccountCode = ACCOUNT_CODES.INTEREST_INCOME;
    
    lines.push({
      accountCode: interestAccountCode,
      debitAmount: 0,
      creditAmount: data.interestAmount,
      narration: `Interest component`,
      loanId: data.loanId,
      customerId: data.customerId
    });
  }
  
  // 4. Credit: Late Fee Income
  if (data.penaltyAmount && data.penaltyAmount > 0) {
    lines.push({
      accountCode: ACCOUNT_CODES.LATE_FEE_INCOME,
      debitAmount: 0,
      creditAmount: data.penaltyAmount,
      narration: `Late payment charges`,
      loanId: data.loanId,
      customerId: data.customerId
    });
  }
  
  // Determine target company
  const targetCompanyId = data.isMirrorLoan ? data.mirrorCompanyId : data.companyId;
  
  if (!targetCompanyId) {
    throw new Error('Target company ID is required for journal entry');
  }
  
  const entry = await createJournalEntry({
    companyId: targetCompanyId,
    entryDate: new Date(),
    narration: data.narration || `EMI Payment - ${data.loanId} ${data.isMirrorLoan ? '(Mirror)' : ''}`,
    referenceType: data.isMirrorLoan ? 'MIRROR_EMI_PAYMENT' : 'EMI_PAYMENT',
    referenceId: data.loanId,
    lines,
    paymentMode: data.paymentMode || 'BANK_TRANSFER',
    chequeNumber: data.chequeNumber,
    bankRefNumber: data.bankRefNumber,
    bankAccountId: data.bankAccountId,
    createdById: data.createdById,
    isAutoEntry: true
  });
  
  // If there's extra interest profit (for Company 3), create separate entry
  if (data.extraInterestProfit && data.extraInterestProfit > 0) {
    await createExtraInterestProfitEntry({
      loanId: data.loanId,
      companyId: data.companyId, // Company 3
      amount: data.extraInterestProfit,
      createdById: data.createdById
    });
  }
  
  return entry;
}

/**
 * Create entry for extra interest profit (Company 3)
 * This is the profit from mirror loan interest difference
 */
export async function createExtraInterestProfitEntry(data: {
  loanId: string;
  companyId: string;
  amount: number;
  createdById: string;
}) {
  const lines = [
    {
      accountCode: ACCOUNT_CODES.CASH_IN_HAND, // Or bank
      debitAmount: data.amount,
      creditAmount: 0,
      narration: `Extra interest profit from mirror loan`,
      loanId: data.loanId
    },
    {
      accountCode: ACCOUNT_CODES.INTEREST_INCOME,
      debitAmount: 0,
      creditAmount: data.amount,
      narration: `Interest profit (difference between original and mirror interest)`
    }
  ];
  
  return createJournalEntry({
    companyId: data.companyId,
    entryDate: new Date(),
    narration: `Extra Interest Profit - ${data.loanId}`,
    referenceType: 'EXTRA_INTEREST_PROFIT',
    referenceId: data.loanId,
    lines,
    createdById: data.createdById,
    isAutoEntry: true
  });
}

// ============================================
// OPENING BALANCE ENTRY
// ============================================

/**
 * Create opening balance entry
 * 
 * EQUITY = BANK OPENING BALANCE + CASH IN HAND
 * 
 * Entry:
 * Debit: Bank Account (opening balance)
 * Debit: Cash in Hand (opening balance)
 * Credit: Opening Balance Equity
 */
export async function postOpeningBalanceEntry(data: {
  companyId: string;
  bankOpeningBalance: number;
  cashOpeningBalance: number;
  createdById: string;
}) {
  const lines: Array<{
    accountCode: string;
    debitAmount: number;
    creditAmount: number;
    narration: string;
  }> = [];
  
  const totalEquity = data.bankOpeningBalance + data.cashOpeningBalance;
  
  // Debit: Bank Account
  if (data.bankOpeningBalance > 0) {
    lines.push({
      accountCode: ACCOUNT_CODES.BANK_MAIN,
      debitAmount: data.bankOpeningBalance,
      creditAmount: 0,
      narration: 'Opening balance - Bank'
    });
  }
  
  // Debit: Cash in Hand
  if (data.cashOpeningBalance > 0) {
    lines.push({
      accountCode: ACCOUNT_CODES.CASH_IN_HAND,
      debitAmount: data.cashOpeningBalance,
      creditAmount: 0,
      narration: 'Opening balance - Cash'
    });
  }
  
  // Credit: Opening Balance Equity
  if (totalEquity > 0) {
    lines.push({
      accountCode: ACCOUNT_CODES.OPENING_BALANCE_EQUITY,
      debitAmount: 0,
      creditAmount: totalEquity,
      narration: `Equity from opening balances (Bank + Cash)`
    });
  }
  
  if (lines.length === 0) {
    return null;
  }
  
  return createJournalEntry({
    companyId: data.companyId,
    entryDate: new Date(),
    narration: `Opening Balance Entry - Equity: ${totalEquity}`,
    referenceType: 'OPENING_BALANCE',
    lines,
    createdById: data.createdById,
    isAutoEntry: true
  });
}

// ============================================
// EXPENSE ENTRY
// ============================================

export async function postExpenseEntry(data: {
  companyId: string;
  expenseType: string;
  accountCode: string;
  amount: number;
  description: string;
  paymentMode: string;
  bankAccountId?: string;
  chequeNumber?: string;
  createdById: string;
}) {
  const lines = [
    {
      accountCode: data.accountCode,
      debitAmount: data.amount,
      creditAmount: 0,
      narration: data.description
    },
    {
      accountCode: data.paymentMode === 'CASH' ? ACCOUNT_CODES.CASH_IN_HAND : ACCOUNT_CODES.BANK_MAIN,
      debitAmount: 0,
      creditAmount: data.amount,
      narration: `Payment for ${data.expenseType}`
    }
  ];
  
  return createJournalEntry({
    companyId: data.companyId,
    entryDate: new Date(),
    narration: `Expense: ${data.description}`,
    referenceType: 'EXPENSE',
    lines,
    paymentMode: data.paymentMode,
    chequeNumber: data.chequeNumber,
    createdById: data.createdById,
    isAutoEntry: false
  });
}

// ============================================
// COMMISSION ENTRY
// ============================================

export async function postCommissionEntry(data: {
  companyId: string;
  agentId: string;
  amount: number;
  loanId?: string;
  createdById: string;
}) {
  const lines = [
    {
      accountCode: ACCOUNT_CODES.COMMISSION_PAID,
      debitAmount: data.amount,
      creditAmount: 0,
      narration: 'Agent commission',
      loanId: data.loanId
    },
    {
      accountCode: '2001', // Accounts Payable
      debitAmount: 0,
      creditAmount: data.amount,
      narration: 'Commission payable to agent'
    }
  ];
  
  return createJournalEntry({
    companyId: data.companyId,
    entryDate: new Date(),
    narration: `Agent Commission - Agent ID: ${data.agentId}`,
    referenceType: 'COMMISSION',
    referenceId: data.loanId,
    lines,
    createdById: data.createdById,
    isAutoEntry: true
  });
}

// ============================================
// BORROWED MONEY ENTRY
// ============================================

/**
 * Entry when borrowing money from bank
 * 
 * Debit: Bank Account (Asset increases)
 * Credit: Bank Loans (Liability increases)
 */
export async function postBorrowedMoneyEntry(data: {
  companyId: string;
  bankName: string;
  amount: number;
  createdById: string;
}) {
  const lines = [
    {
      accountCode: ACCOUNT_CODES.BANK_MAIN,
      debitAmount: data.amount,
      creditAmount: 0,
      narration: `Loan received from ${data.bankName}`
    },
    {
      accountCode: ACCOUNT_CODES.BANK_LOANS,
      debitAmount: 0,
      creditAmount: data.amount,
      narration: `Bank loan liability - ${data.bankName}`
    }
  ];
  
  return createJournalEntry({
    companyId: data.companyId,
    entryDate: new Date(),
    narration: `Borrowed Money - ${data.bankName}`,
    referenceType: 'BORROWED_MONEY',
    lines,
    createdById: data.createdById,
    isAutoEntry: true
  });
}

// ============================================
// INTEREST EXPENSE ENTRY (on borrowed money)
// ============================================

/**
 * Entry when paying interest on borrowed money
 * 
 * Debit: Interest Expense (Expense increases)
 * Credit: Bank Account (Asset decreases)
 */
export async function postInterestExpenseEntry(data: {
  companyId: string;
  amount: number;
  bankName?: string;
  createdById: string;
}) {
  const lines = [
    {
      accountCode: ACCOUNT_CODES.INTEREST_EXPENSE_BANK,
      debitAmount: data.amount,
      creditAmount: 0,
      narration: `Interest paid ${data.bankName ? `to ${data.bankName}` : ''}`
    },
    {
      accountCode: ACCOUNT_CODES.BANK_MAIN,
      debitAmount: 0,
      creditAmount: data.amount,
      narration: `Interest payment`
    }
  ];
  
  return createJournalEntry({
    companyId: data.companyId,
    entryDate: new Date(),
    narration: `Interest Expense - Paid ${data.amount}`,
    referenceType: 'INTEREST_EXPENSE',
    lines,
    createdById: data.createdById,
    isAutoEntry: true
  });
}

// ============================================
// REPORTING FUNCTIONS
// ============================================

/**
 * Get account balance
 */
export async function getAccountBalance(accountId: string, financialYearId?: string) {
  if (financialYearId) {
    const ledgerBalance = await db.ledgerBalance.findUnique({
      where: {
        accountId_financialYearId: {
          accountId,
          financialYearId
        }
      }
    });
    
    if (ledgerBalance) {
      return {
        opening: ledgerBalance.openingBalance,
        debits: ledgerBalance.totalDebits,
        credits: ledgerBalance.totalCredits,
        closing: ledgerBalance.closingBalance
      };
    }
  }
  
  const account = await db.chartOfAccount.findUnique({
    where: { id: accountId }
  });
  
  return {
    opening: account?.openingBalance || 0,
    closing: account?.currentBalance || 0
  };
}

/**
 * Get Trial Balance
 */
export async function getTrialBalance(companyId: string, asOfDate?: Date) {
  const accounts = await db.chartOfAccount.findMany({
    where: { companyId, isActive: true },
    orderBy: { accountCode: 'asc' }
  });
  
  const dateFilter = asOfDate ? new Date(asOfDate) : new Date();
  
  const trialBalance = await Promise.all(accounts.map(async (account) => {
    const lines = await db.journalEntryLine.aggregate({
      where: {
        accountId: account.id,
        journalEntry: {
          entryDate: { lte: dateFilter },
          isApproved: true,
          isReversed: false
        }
      },
      _sum: {
        debitAmount: true,
        creditAmount: true
      }
    });
    
    const totalDebit = lines._sum.debitAmount || 0;
    const totalCredit = lines._sum.creditAmount || 0;
    
    let balance = 0;
    let balanceType = '';
    
    if (['ASSET', 'EXPENSE'].includes(account.accountType)) {
      balance = account.openingBalance + totalDebit - totalCredit;
      balanceType = balance >= 0 ? 'DEBIT' : 'CREDIT';
    } else {
      balance = account.openingBalance + totalCredit - totalDebit;
      balanceType = balance >= 0 ? 'CREDIT' : 'DEBIT';
    }
    
    return {
      ...account,
      totalDebit,
      totalCredit,
      balance: Math.abs(balance),
      balanceType
    };
  }));
  
  const totalDebitBalance = trialBalance.filter(a => a.balanceType === 'DEBIT').reduce((sum, a) => sum + a.balance, 0);
  const totalCreditBalance = trialBalance.filter(a => a.balanceType === 'CREDIT').reduce((sum, a) => sum + a.balance, 0);
  
  return {
    accounts: trialBalance,
    totalDebitBalance,
    totalCreditBalance,
    isBalanced: Math.abs(totalDebitBalance - totalCreditBalance) < 0.01
  };
}

/**
 * Get Profit & Loss Statement
 */
export async function getProfitAndLoss(companyId: string, startDate: Date, endDate: Date) {
  const incomeAccounts = await db.chartOfAccount.findMany({
    where: { companyId, accountType: 'INCOME', isActive: true }
  });
  
  const expenseAccounts = await db.chartOfAccount.findMany({
    where: { companyId, accountType: 'EXPENSE', isActive: true }
  });
  
  const getAccountTotals = async (accounts: typeof incomeAccounts) => {
    return Promise.all(accounts.map(async (account) => {
      const lines = await db.journalEntryLine.aggregate({
        where: {
          accountId: account.id,
          journalEntry: {
            companyId,
            entryDate: { gte: startDate, lte: endDate },
            isApproved: true,
            isReversed: false
          }
        },
        _sum: {
          debitAmount: true,
          creditAmount: true
        }
      });
      
      // For income, credit increases balance
      const total = (lines._sum.creditAmount || 0) - (lines._sum.debitAmount || 0);
      
      return {
        ...account,
        amount: total
      };
    }));
  };
  
  const income = await getAccountTotals(incomeAccounts);
  const expenses = await getAccountTotals(expenseAccounts);
  
  const totalIncome = income.reduce((sum, acc) => sum + acc.amount, 0);
  const totalExpenses = expenses.reduce((sum, acc) => sum + acc.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  
  return {
    income: income.filter(a => a.amount !== 0),
    expenses: expenses.filter(a => a.amount !== 0),
    totalIncome,
    totalExpenses,
    netProfit,
    period: { startDate, endDate }
  };
}

/**
 * Get Balance Sheet
 */
export async function getBalanceSheet(companyId: string, asOfDate?: Date) {
  const dateFilter = asOfDate || new Date();
  
  const assetAccounts = await db.chartOfAccount.findMany({
    where: { companyId, accountType: 'ASSET', isActive: true }
  });
  
  const liabilityAccounts = await db.chartOfAccount.findMany({
    where: { companyId, accountType: 'LIABILITY', isActive: true }
  });
  
  const equityAccounts = await db.chartOfAccount.findMany({
    where: { companyId, accountType: 'EQUITY', isActive: true }
  });
  
  const getAccountBalances = async (accounts: typeof assetAccounts, isDebitBalance: boolean) => {
    return Promise.all(accounts.map(async (account) => {
      const lines = await db.journalEntryLine.aggregate({
        where: {
          accountId: account.id,
          journalEntry: {
            companyId,
            entryDate: { lte: dateFilter },
            isApproved: true,
            isReversed: false
          }
        },
        _sum: {
          debitAmount: true,
          creditAmount: true
        }
      });
      
      let balance: number;
      if (isDebitBalance) {
        balance = account.openingBalance + (lines._sum.debitAmount || 0) - (lines._sum.creditAmount || 0);
      } else {
        balance = account.openingBalance + (lines._sum.creditAmount || 0) - (lines._sum.debitAmount || 0);
      }
      
      return {
        ...account,
        amount: balance
      };
    }));
  };
  
  const assets = await getAccountBalances(assetAccounts, true);
  const liabilities = await getAccountBalances(liabilityAccounts, false);
  const equity = await getAccountBalances(equityAccounts, false);
  
  const totalAssets = assets.reduce((sum, acc) => sum + acc.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.amount, 0);
  const totalEquity = equity.reduce((sum, acc) => sum + acc.amount, 0);
  
  return {
    assets: assets.filter(a => a.amount !== 0),
    liabilities: liabilities.filter(a => a.amount !== 0),
    equity: equity.filter(a => a.amount !== 0),
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    asOfDate: dateFilter
  };
}

/**
 * Get Loan Ledger
 */
export async function getLoanLedger(loanId: string) {
  const entries = await db.journalEntry.findMany({
    where: {
      OR: [
        { referenceId: loanId },
        { lines: { some: { loanId } } }
      ]
    },
    include: {
      lines: {
        include: {
          account: true
        }
      }
    },
    orderBy: { entryDate: 'asc' }
  });
  
  return entries;
}

/**
 * Get Customer Ledger
 */
export async function getCustomerLedger(customerId: string, companyId: string) {
  const entries = await db.journalEntry.findMany({
    where: {
      companyId,
      lines: { some: { customerId } }
    },
    include: {
      lines: {
        include: {
          account: true
        }
      }
    },
    orderBy: { entryDate: 'desc' }
  });
  
  return entries;
}

/**
 * Get Receivables Aging Report
 */
export async function getReceivablesAging(companyId: string) {
  const loans = await db.loanApplication.findMany({
    where: {
      companyId,
      status: { in: ['ACTIVE', 'DISBURSED'] }
    },
    include: {
      customer: true,
      emiSchedules: {
        where: {
          paymentStatus: { in: ['PENDING', 'OVERDUE', 'PARTIALLY_PAID'] }
        },
        orderBy: { dueDate: 'asc' }
      }
    }
  });
  
  const today = new Date();
  const agingBuckets = {
    current: [] as Array<{
      loanId: string;
      applicationNo: string;
      customer: unknown;
      dueDate: Date;
      installmentNumber: number;
      outstanding: number;
      daysOverdue: number;
    }>,
    days30: [] as typeof agingBuckets.current,
    days60: [] as typeof agingBuckets.current,
    days90: [] as typeof agingBuckets.current,
    over90: [] as typeof agingBuckets.current
  };
  
  let totalOutstanding = 0;
  let totalOverdue = 0;
  
  for (const loan of loans) {
    for (const emi of loan.emiSchedules) {
      const outstanding = emi.totalAmount - emi.paidAmount;
      if (outstanding <= 0) continue;
      
      totalOutstanding += outstanding;
      
      const daysOverdue = Math.floor((today.getTime() - emi.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const emiData = {
        loanId: loan.id,
        applicationNo: loan.applicationNo,
        customer: loan.customer,
        dueDate: emi.dueDate,
        installmentNumber: emi.installmentNumber,
        outstanding,
        daysOverdue: Math.max(0, daysOverdue)
      };
      
      if (daysOverdue <= 0) {
        agingBuckets.current.push(emiData);
      } else {
        totalOverdue += outstanding;
        if (daysOverdue <= 30) {
          agingBuckets.days30.push(emiData);
        } else if (daysOverdue <= 60) {
          agingBuckets.days60.push(emiData);
        } else if (daysOverdue <= 90) {
          agingBuckets.days90.push(emiData);
        } else {
          agingBuckets.over90.push(emiData);
        }
      }
    }
  }
  
  return {
    ...agingBuckets,
    totalOutstanding,
    totalOverdue,
    currentTotal: agingBuckets.current.reduce((sum, e) => sum + e.outstanding, 0),
    days30Total: agingBuckets.days30.reduce((sum, e) => sum + e.outstanding, 0),
    days60Total: agingBuckets.days60.reduce((sum, e) => sum + e.outstanding, 0),
    days90Total: agingBuckets.days90.reduce((sum, e) => sum + e.outstanding, 0),
    over90Total: agingBuckets.over90.reduce((sum, e) => sum + e.outstanding, 0)
  };
}
