export interface Loan {
  id: string;
  applicationNo: string;
  status: string;
  requestedAmount: number;
  loanType: string;
  createdAt: string;
  riskScore: number;
  fraudFlag: boolean;
  purpose: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  sessionForm?: any;
  loanForm?: any;
  company?: {
    id: string;
    name: string;
    code: string;
  };
  companyId?: string;
  requestedTenure?: number;
  requestedInterestRate?: number;
  disbursedAmount?: number;
  disbursedAt?: string;
  disbursementMode?: string;
  disbursementRef?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  dateOfBirth?: string;
  employmentType?: string;
  employerName?: string;
  monthlyIncome?: number;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  bankBranch?: string;
  accountHolderName?: string;
  // Documents
  panCardDoc?: string;
  aadhaarFrontDoc?: string;
  aadhaarBackDoc?: string;
  incomeProofDoc?: string;
  addressProofDoc?: string;
  photoDoc?: string;
  bankStatementDoc?: string;
  salarySlipDoc?: string;
  electionCardDoc?: string;
  housePhotoDoc?: string;
  otherDocs?: string;
  // References
  reference1Name?: string;
  reference1Phone?: string;
  reference1Relation?: string;
  reference1Address?: string;
  reference2Name?: string;
  reference2Phone?: string;
  reference2Relation?: string;
  reference2Address?: string;
  // Additional fields
  fatherName?: string;
  motherName?: string;
  gender?: string;
  maritalStatus?: string;
  employerAddress?: string;
  designation?: string;
  yearsInEmployment?: number;
  annualIncome?: number;
  otherIncome?: number;
  incomeSource?: string;
  // Loan type specific
  goldLoanDetail?: any;
  vehicleLoanDetail?: any;
  // Additional for active loans
  identifier?: string;
  approvedAmount?: number;
  interestRate?: number;
  tenure?: number;
  emiAmount?: number;
  // Interest Only Loan fields
  isInterestOnlyLoan?: boolean;
  totalInterestOnlyPaid?: number;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  currentBalance: number;
  ifscCode?: string;
  branchName?: string;
  isDefault: boolean;
  companyId?: string;
  company?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface Stats {
  pendingDisbursements: number;
  totalDisbursed: number;
}

export interface MirrorLoanInfo {
  isMirrorLoan: boolean;
  mirrorCompanyId?: string;
  mirrorCompanyName?: string;
  originalCompanyName?: string;
  originalCompanyId?: string;
  pendingMirrorLoanId?: string;
  // Extra EMI Information
  extraEMICount?: number;
  mirrorTenure?: number;
  originalTenure?: number;
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
  roleId?: string;
  roleType?: string;
  role?: {
    id: string;
    name: string;
    role: string;
  };
  isActive: boolean;
}

export interface DisbursementForm {
  disbursedAmount: number;
  disbursementMode: string;
  disbursementRef: string;
  remarks: string;
  selectedBankAccountId: string;
  agreementSigned: boolean;
  // Extra EMI Payment Page (for mirror loans)
  extraEMIPaymentPageId?: string;
  // Split Payment fields
  useSplitPayment?: boolean;
  bankAmount?: number;
  cashAmount?: number;
}

export interface ExpandedSections {
  customer: boolean;
  loan: boolean;
  bank: boolean;
  employment: boolean;
  references: boolean;
}
