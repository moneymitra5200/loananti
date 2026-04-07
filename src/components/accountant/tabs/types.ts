// Shared types for accountant tabs

export interface ChartOfAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  currentBalance: number;
  description?: string;
  isActive: boolean;
  isSystemAccount: boolean;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: Date;
  narration: string;
  totalDebit: number;
  totalCredit: number;
  referenceType: string;
  isAutoEntry: boolean;
  isApproved: boolean;
  lines: Array<{
    id: string;
    accountId: string;
    account: ChartOfAccount;
    debitAmount: number;
    creditAmount: number;
    narration?: string;
    loanId?: string;
    customerId?: string;
  }>;
}

export interface FinancialYear {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isClosed: boolean;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  ifscCode?: string;
  branchName?: string;
  currentBalance: number;
  isDefault: boolean;
  upiId?: string;
  qrCodeUrl?: string;
  transactions?: BankTransaction[];
  totalCredits?: number;
  totalDebits?: number;
  companyId?: string;
  company?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface BankTransaction {
  id: string;
  transactionType: string;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string;
  transactionDate: Date;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
  };
}

export interface Expense {
  id: string;
  expenseNumber: string;
  expenseType: string;
  description: string;
  amount: number;
  paymentDate: Date;
  paymentMode: string;
  isApproved: boolean;
}

export interface ActiveLoan {
  id: string;
  identifier: string;
  loanType: 'ONLINE' | 'OFFLINE';
  status: string;
  requestedAmount: number;
  approvedAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  disbursementDate?: Date;
  createdAt: Date;
  customerId?: string;
  customer?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  companyId?: string;
  company?: {
    id: string;
    name: string;
    code: string;
  };
  nextEmi?: {
    dueDate: Date;
    amount: number;
    status: string;
  };
}

export interface MoneyLogStats {
  totalEMICollection: number;
  totalDisbursements: number;
  totalCredits: number;
  totalDebits: number;
  totalExpenses: number;
  emiCount: number;
  disbursementCount: number;
  expenseCount: number;
}

export interface LoanStats {
  totalOnline: number;
  totalOffline: number;
  totalOnlineAmount: number;
  totalOfflineAmount: number;
}

export interface DashboardStats {
  totalAssets: number;
  totalLiabilities: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  loanOutstanding: number;
  bankBalance: number;
  activeLoanCount: number;
  totalLoanAmount: number;
  monthlyEmiCollection: number;
}

export interface SecondaryPaymentPage {
  id: string;
  name: string;
  description?: string;
  upiId?: string;
  qrCodeUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  ifscCode?: string;
}

// Props interfaces for tab components
export interface OverviewTabProps {
  dashboardStats: DashboardStats;
  activeLoans: ActiveLoan[];
  journalEntries: JournalEntry[];
  profitAndLoss: any;
  companies: { id: string; name: string; code: string }[];
  selectedCompanyIds: string[];
  setActiveSection: (section: string) => void;
  setSelectedEntry: (entry: JournalEntry | null) => void;
  setShowJournalDialog: (show: boolean) => void;
  setShowExpenseDialog: (show: boolean) => void;
  setShowBankDialog: (show: boolean) => void;
  setShowEntryDetailDialog: (show: boolean) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

export interface JournalEntriesTabProps {
  journalEntries: JournalEntry[];
  setSelectedEntry: (entry: JournalEntry | null) => void;
  setShowJournalDialog: (show: boolean) => void;
  setShowEntryDetailDialog: (show: boolean) => void;
  handleExportReport: (type: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
  getReferenceTypeLabel: (type: string) => string;
}

export interface ActiveLoansTabProps {
  activeLoans: ActiveLoan[];
  loanStats: LoanStats;
  loanFilter: 'all' | 'online' | 'offline';
  setLoanFilter: (filter: 'all' | 'online' | 'offline') => void;
  fetchDashboardData: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

export interface MoneyLogsTabProps {
  moneyLogs: any[];
  moneyLogStats: MoneyLogStats;
  moneyLogFilter: 'all' | 'emi' | 'disbursement' | 'credit' | 'expense';
  setMoneyLogFilter: (filter: 'all' | 'emi' | 'disbursement' | 'credit' | 'expense') => void;
  fetchMoneyLogs: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

export interface ExpensesTabProps {
  expenses: Expense[];
  setSelectedExpense: (expense: Expense | null) => void;
  setShowExpenseDialog: (show: boolean) => void;
  setShowExpenseDetailDialog: (show: boolean) => void;
  confirmDelete: (type: string, id: string, name: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

export interface ChartOfAccountsTabProps {
  accounts: ChartOfAccount[];
  groupedAccounts: Record<string, ChartOfAccount[]>;
  selectedAccountType: string;
  setSelectedAccountType: (type: string) => void;
  setSelectedAccount: (account: ChartOfAccount | null) => void;
  setShowAccountDialog: (show: boolean) => void;
  setShowAccountDetailDialog: (show: boolean) => void;
  setShowLedgerDetailDialog: (show: boolean) => void;
  setSelectedLedgerAccount: (id: string) => void;
  fetchLedgerTransactions: (id: string) => void;
  confirmDelete: (type: string, id: string, name: string) => void;
  formatCurrency: (amount: number) => string;
  getAccountTypeColor: (type: string) => string;
}

export interface BankAccountsTabProps {
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  activeLoans: ActiveLoan[];
  secondaryPaymentPages: SecondaryPaymentPage[];
  dashboardStats: DashboardStats;
  scanningLoans: boolean;
  scanResults: any;
  scanPastLoanTransactions: () => void;
  setSelectedBankAccount: (account: BankAccount | null) => void;
  setShowBankDialog: (show: boolean) => void;
  setShowBankDetailDialog: (show: boolean) => void;
  setShowLedgerDetailDialog: (show: boolean) => void;
  setShowSecondaryPageDialog: (show: boolean) => void;
  setSelectedLedgerAccount: (id: string) => void;
  fetchLedgerTransactions: (id: string) => void;
  confirmDelete: (type: string, id: string, name: string) => void;
  handleDeleteSecondaryPage: (id: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

export interface TrialBalanceTabProps {
  trialBalance: any;
  handleExportReport: (type: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
  getAccountTypeColor: (type: string) => string;
}

export interface ReportsTabProps {
  profitAndLoss: any;
  dateRange: { startDate: Date; endDate: Date };
  handleExportReport: (type: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

export interface YearEndTabProps {
  financialYears: FinancialYear[];
  profitAndLoss: any;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}
