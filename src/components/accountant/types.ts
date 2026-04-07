// ============================================
// ACCOUNTANT DASHBOARD TYPES
// ============================================

export interface Company {
  id: string;
  name: string;
  code: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  ownerName?: string | null;
  ifscCode: string | null;
  currentBalance: number;
  isDefault: boolean;
  upiId: string | null;
  qrCodeUrl?: string | null;
  isActive: boolean;
  companyId?: string;
}

export interface BankTransaction {
  id: string;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string;
  transactionDate: Date;
  bankAccount: { bankName: string; accountNumber: string };
}

export interface Expense {
  id: string;
  expenseNumber: string;
  expenseType: string;
  description: string;
  amount: number;
  paymentDate: Date;
  paymentMode: string;
}

export interface Income {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: Date;
  source: string;
}

export interface ActiveLoan {
  id: string;
  applicationNo: string;
  customer: { name: string; phone: string };
  disbursedAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  status: string;
  emiSchedules: { totalAmount: number; paidAmount: number; paymentStatus: string }[];
}

export interface AuditLog {
  id: string;
  action: string;
  module: string;
  description: string;
  createdAt: Date;
}

// Double-Entry Accounting Types
export interface ChartOfAccountItem {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  description: string | null;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  isSystemAccount: boolean;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  narration: string | null;
  loanId: string | null;
  customerId: string | null;
  account: {
    accountCode: string;
    accountName: string;
    accountType: string;
  };
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: Date;
  referenceType: string | null;
  narration: string | null;
  totalDebit: number;
  totalCredit: number;
  isAutoEntry: boolean;
  isReversed: boolean;
  isApproved: boolean;
  createdAt: Date;
  lines: JournalEntryLine[];
}

export interface TrialBalanceItem {
  accountCode: string;
  accountName: string;
  accountType: string;
  debitBalance: number;
  creditBalance: number;
}

export interface LedgerEntry {
  date: Date;
  entryNumber: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  referenceType?: string;
  referenceId?: string;
}

// Form Types
export interface BankForm {
  bankName: string;
  accountNumber: string;
  accountName: string;
  ownerName: string;
  ifscCode: string;
  branchName: string;
  accountType: string;
  openingBalance: number;
  upiId: string;
  qrCodeUrl: string;
  isDefault: boolean;
}

export interface ExpenseForm {
  expenseType: string;
  description: string;
  amount: number;
  paymentMode: string;
  paymentDate: string;
}

export interface IncomeForm {
  type: string;
  description: string;
  amount: number;
  source: string;
  date: string;
}

// Trial Balance Summary
export interface TrialBalanceSummary {
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

// Balance Sheet Types
export interface BalanceSheetItem {
  accountName: string;
  amount: number;
}

export interface BalanceSheet {
  assets: BalanceSheetItem[];
  totalAssets: number;
  liabilities: BalanceSheetItem[];
  totalLiabilities: number;
  equity: BalanceSheetItem[];
  totalEquity: number;
}

// Stats Type
export interface Stats {
  totalBankBalance: number;
  totalCashBalance: number;
  totalLoanDisbursed: number;
  totalEmiCollected: number;
  totalLoans: number;
  totalOutstanding: number;
  pendingEmis: number;
  overdueEmis: number;
  totalExpenses: number;
  netProfit: number;
}

// Profit & Loss Type
export interface ProfitLoss {
  revenue: BalanceSheetItem[];
  totalRevenue: number;
  expenses: BalanceSheetItem[];
  totalExpenses: number;
  netProfit: number;
}

// Menu Item Type
export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}
