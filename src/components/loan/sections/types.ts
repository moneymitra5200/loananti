// Shared types for LoanDetailPanel sections

export interface LoanDetails {
  id: string;
  applicationNo: string;
  applicationLocation?: string;
  status: string;
  requestedAmount: number;
  requestedTenure?: number;
  requestedInterestRate?: number;
  loanType: string;
  purpose: string;
  createdAt: string;
  riskScore: number;
  fraudFlag: boolean;
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fatherName?: string;
  motherName?: string;
  gender?: string;
  maritalStatus?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  employmentType?: string;
  employerName?: string;
  employerAddress?: string;
  designation?: string;
  yearsInEmployment?: number;
  totalWorkExperience?: number;
  officePhone?: string;
  officeEmail?: string;
  monthlyIncome?: number;
  annualIncome?: number;
  otherIncome?: number;
  incomeSource?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  bankBranch?: string;
  accountType?: string;
  accountHolderName?: string;
  loanAmount?: number;
  tenure?: number;
  interestRate?: number;
  emiAmount?: number;
  processingFee?: number;
  reference1Name?: string;
  reference1Phone?: string;
  reference1Relation?: string;
  reference1Address?: string;
  reference2Name?: string;
  reference2Phone?: string;
  reference2Relation?: string;
  reference2Address?: string;
  panCardDoc?: string;
  aadhaarFrontDoc?: string;
  aadhaarBackDoc?: string;
  incomeProofDoc?: string;
  addressProofDoc?: string;
  photoDoc?: string;
  bankStatementDoc?: string;
  passbookDoc?: string;
  salarySlipDoc?: string;
  electionCardDoc?: string;
  housePhotoDoc?: string;
  otherDocs?: string;
  disbursedAmount?: number;
  disbursedAt?: string;
  disbursementMode?: string;
  disbursementRef?: string;
  disbursementProof?: string;
  rejectedById?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  submittedAt?: string;
  saApprovedAt?: string;
  companyApprovedAt?: string;
  agentApprovedAt?: string;
  loanFormCompletedAt?: string;
  sanctionCreatedAt?: string;
  customerApprovedAt?: string;
  finalApprovedAt?: string;
  closedAt?: string;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    panNumber?: string;
    aadhaarNumber?: string;
    dateOfBirth?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    employmentType?: string;
    monthlyIncome?: number;
    bankAccountNumber?: string;
    bankIfsc?: string;
    bankName?: string;
    createdAt?: string;
  };
  company?: {
    id: string;
    name: string;
    code: string;
    address?: string;
    city?: string;
    state?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  agent?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    agentCode?: string;
  };
  sessionForm?: {
    id: string;
    approvedAmount: number;
    interestRate: number;
    tenure: number;
    emiAmount: number;
    totalAmount: number;
    totalInterest: number;
    processingFee?: number;
    moratoriumPeriod?: number;
    latePaymentPenalty?: number;
    bounceCharges?: number;
    specialConditions?: string;
    startDate?: string;
    createdAt?: string;
    agent?: {
      id: string;
      name: string;
      agentCode?: string;
    };
  };
  loanForm?: {
    id: string;
    panVerified: boolean;
    aadhaarVerified: boolean;
    bankVerified: boolean;
    employmentVerified: boolean;
    addressVerified: boolean;
    incomeVerified: boolean;
    verificationRemarks?: string;
    verificationDate?: string;
    riskScore?: number;
    riskFactors?: string;
    fraudFlag?: boolean;
    fraudReason?: string;
    internalRemarks?: string;
    visitDate?: string;
    visitAddress?: string;
    visitRemarks?: string;
    visitLatitude?: number;
    visitLongitude?: number;
    visitPhotos?: string;
  };
  disbursedBy?: {
    id: string;
    name: string;
    email?: string;
  };
  workflowLogs?: Array<{
    id: string;
    action: string;
    newStatus: string;
    previousStatus?: string;
    remarks?: string;
    createdAt: string;
    actionBy?: {
      id: string;
      name: string;
      email?: string;
      role?: string;
    };
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    paymentMode?: string;
    paymentReference?: string;
    status: string;
    receiptNumber?: string;
    createdAt: string;
    cashier?: {
      id: string;
      name: string;
      cashierCode?: string;
    };
  }>;
  emiSchedules?: Array<any>;
  // Customer password for login
  plainPassword?: string;
  showPassword?: boolean;
  // Gold Loan Detail
  goldLoanDetail?: {
    id: string;
    grossWeight: number;
    netWeight: number;
    goldRate: number;
    valuationAmount: number;
    loanAmount: number;
    ownerName?: string;
    goldItemPhoto?: string;
    karat?: number;
    numberOfItems?: number;
    itemDescription?: string;
    verificationDate?: string;
    verifiedBy?: string;
    remarks?: string;
  };
  // Vehicle Loan Detail
  vehicleLoanDetail?: {
    id: string;
    vehicleType: string;
    vehicleNumber?: string;
    manufacturer?: string;
    model?: string;
    yearOfManufacture?: number;
    valuationAmount: number;
    loanAmount: number;
    ownerName?: string;
    rcBookPhoto?: string;
    vehiclePhoto?: string;
    chassisNumber?: string;
    engineNumber?: string;
    fuelType?: string;
    color?: string;
    verificationDate?: string;
    verifiedBy?: string;
    remarks?: string;
  };
}

export interface EMISchedule {
  id: string;
  emiNumber: number;
  dueDate: string;
  emiAmount: number;
  principalAmount: number;
  interestAmount: number;
  outstandingPrincipal: number;
  status: string;
  paidAmount?: number;
  paidPrincipal?: number;
  paidInterest?: number;
  paidDate?: string;
  paymentMode?: string;
  paymentRef?: string;
  proofUrl?: string;
  lateFee?: number;
  // Partial payment fields
  isPartialPayment?: boolean;
  partialPaymentCount?: number;
  remainingAmount?: number;
  nextPaymentDate?: string;
  // Interest only fields
  isInterestOnly?: boolean;
  principalDeferred?: boolean;
  notes?: string;
}

export interface EMIPaymentForm {
  amount: number;
  paymentMode: string;
  paymentRef: string;
  creditType: 'PERSONAL' | 'COMPANY';
  remarks: string;
  proofFile: File | null;
  paymentType: 'FULL' | 'PARTIAL' | 'INTEREST_ONLY' | 'PRINCIPAL_ONLY';
  remainingAmount: number;
  remainingPaymentDate: string;
  newDueDate: string;
  /** Amount of penalty waived by the role — passed to /api/emi/pay as penaltyWaiver */
  penaltyWaiver: number;
  /** Where the net penalty (after waiver) goes — CASH or BANK (ignored in SPLIT mode) */
  penaltyPaymentMode?: 'CASH' | 'BANK';
  /** Cash portion for split payment mode */
  splitCashAmount?: number;
  /** Online portion for split payment mode */
  splitOnlineAmount?: number;
  /** Staff-overridden principal component (optional — used only when staff edits the split) */
  editedPrincipal?: number;
  /** Staff-overridden interest component (optional — used only when staff edits the split) */
  editedInterest?: number;
}

