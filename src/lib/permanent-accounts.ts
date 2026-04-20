/**
 * PERMANENT CHART OF ACCOUNTS CONFIGURATION
 * 
 * This file contains the permanent chart of accounts that will be created
 * for every company in the system. These accounts cannot be deleted.
 * 
 * When a new company is created, these accounts are automatically initialized.
 */

// Account types as strings (not enum in schema)
type AccountType = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY';

export interface PermanentAccount {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  isSystemAccount: boolean;
  description: string;
}

// Permanent Chart of Accounts for Mirror Companies (C1, C2)
// These accounts are created automatically when a company is set up
export const PERMANENT_CHART_OF_ACCOUNTS: PermanentAccount[] = [
  // ========== ASSETS (1000-1999) ==========
  { 
    accountCode: '1000', 
    accountName: 'Bank', 
    accountType: 'ASSET', 
    isSystemAccount: true, 
    description: 'Bank Account - All bank transactions' 
  },
  { 
    accountCode: '1100', 
    accountName: 'Cash in Hand', 
    accountType: 'ASSET', 
    isSystemAccount: true, 
    description: 'Cash on hand for daily operations' 
  },
  { 
    accountCode: '1200', 
    accountName: 'Loans Receivable', 
    accountType: 'ASSET', 
    isSystemAccount: true, 
    description: 'Loans given to customers (Mirror Loans)' 
  },
  { 
    accountCode: '1300', 
    accountName: 'Interest Receivable', 
    accountType: 'ASSET', 
    isSystemAccount: true, 
    description: 'Accrued interest from loans' 
  },
  { 
    accountCode: '1400', 
    accountName: 'Staff Advance', 
    accountType: 'ASSET', 
    isSystemAccount: false, 
    description: 'Advance payments to staff' 
  },
  { 
    accountCode: '1500', 
    accountName: 'Security Deposit', 
    accountType: 'ASSET', 
    isSystemAccount: false, 
    description: 'Deposits paid to landlords, utilities, etc.' 
  },
  { 
    accountCode: '1600', 
    accountName: 'Fixed Assets', 
    accountType: 'ASSET', 
    isSystemAccount: false, 
    description: 'Office equipment, furniture, vehicles' 
  },
  { 
    accountCode: '1700', 
    accountName: 'Prepaid Expenses', 
    accountType: 'ASSET', 
    isSystemAccount: false, 
    description: 'Expenses paid in advance' 
  },
  
  // ========== LIABILITIES (2000-2999) ==========
  { 
    accountCode: '2000', 
    accountName: 'Accounts Payable', 
    accountType: 'LIABILITY', 
    isSystemAccount: true, 
    description: 'Amounts owed to suppliers and vendors' 
  },
  { 
    accountCode: '2100', 
    accountName: 'Borrowed Money', 
    accountType: 'LIABILITY', 
    isSystemAccount: true, 
    description: 'Money borrowed from banks or individuals' 
  },
  { 
    accountCode: '2200', 
    accountName: 'Customer Deposits', 
    accountType: 'LIABILITY', 
    isSystemAccount: false, 
    description: 'Advance payments from customers' 
  },
  { 
    accountCode: '2300', 
    accountName: 'Interest Payable', 
    accountType: 'LIABILITY', 
    isSystemAccount: true, 
    description: 'Interest owed on borrowed money' 
  },
  { 
    accountCode: '2400', 
    accountName: 'Staff Payable', 
    accountType: 'LIABILITY', 
    isSystemAccount: false, 
    description: 'Salary and wages payable to staff' 
  },
  
  // ========== INCOME (3000-3999) ==========
  { 
    accountCode: '3000', 
    accountName: 'Interest Income', 
    accountType: 'INCOME', 
    isSystemAccount: true, 
    description: 'Interest earned on loans given' 
  },
  { 
    accountCode: '3100', 
    accountName: 'Processing Fee Income', 
    accountType: 'INCOME', 
    isSystemAccount: true, 
    description: 'Loan processing fees charged' 
  },
  { 
    accountCode: '3200', 
    accountName: 'Penalty Income', 
    accountType: 'INCOME', 
    isSystemAccount: false, 
    description: 'Late payment penalties collected' 
  },
  { 
    accountCode: '3300', 
    accountName: 'Mirror Interest Income', 
    accountType: 'INCOME', 
    isSystemAccount: true, 
    description: 'Interest income from mirror loans' 
  },
  { 
    accountCode: '3400', 
    accountName: 'Other Income', 
    accountType: 'INCOME', 
    isSystemAccount: false, 
    description: 'Miscellaneous income' 
  },
  
  // ========== EXPENSES (4000-4999) ==========
  { 
    accountCode: '4000', 
    accountName: 'Interest Expense', 
    accountType: 'EXPENSE', 
    isSystemAccount: true, 
    description: 'Interest paid on borrowed money' 
  },
  { 
    accountCode: '4100', 
    accountName: 'Salary Expense', 
    accountType: 'EXPENSE', 
    isSystemAccount: false, 
    description: 'Staff salaries and wages' 
  },
  { 
    accountCode: '4200', 
    accountName: 'Office Expenses', 
    accountType: 'EXPENSE', 
    isSystemAccount: false, 
    description: 'Office supplies, utilities, rent' 
  },
  { 
    accountCode: '4300', 
    accountName: 'Bad Debt Expense', 
    accountType: 'EXPENSE', 
    isSystemAccount: false, 
    description: 'Uncollectible loans written off' 
  },
  { 
    accountCode: '4400', 
    accountName: 'Travel Expense', 
    accountType: 'EXPENSE', 
    isSystemAccount: false, 
    description: 'Staff travel and conveyance' 
  },
  { 
    accountCode: '4500', 
    accountName: 'Communication Expense', 
    accountType: 'EXPENSE', 
    isSystemAccount: false, 
    description: 'Phone, internet, postage' 
  },
  {
    accountCode: '5500',
    accountName: 'Irrecoverable Debt',
    accountType: 'EXPENSE',
    isSystemAccount: true,
    description: 'Interest written off when only principal is collected (Principal-Only payments)'
  },

  // ========== EQUITY (5000-5999) ==========
  { 
    accountCode: '5000', 
    accountName: "Owner's Capital", 
    accountType: 'EQUITY', 
    isSystemAccount: true, 
    description: "Owner's investment in the business" 
  },
  { 
    accountCode: '5100', 
    accountName: 'Retained Earnings', 
    accountType: 'EQUITY', 
    isSystemAccount: true, 
    description: 'Accumulated profits not distributed' 
  },
  { 
    accountCode: '5200', 
    accountName: 'Drawings', 
    accountType: 'EQUITY', 
    isSystemAccount: false, 
    description: "Owner's withdrawals from business" 
  },
];

// Helper function to get accounts by type
export function getAccountsByType(type: AccountType): PermanentAccount[] {
  return PERMANENT_CHART_OF_ACCOUNTS.filter(acc => acc.accountType === type);
}

// Helper function to get system accounts (cannot be deleted)
export function getSystemAccounts(): PermanentAccount[] {
  return PERMANENT_CHART_OF_ACCOUNTS.filter(acc => acc.isSystemAccount);
}
