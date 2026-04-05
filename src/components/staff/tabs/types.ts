// Shared types for Staff Dashboard tabs

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
  customer: { id: string; name: string; email: string; phone: string; };
  sessionForm?: any;
  loanForm?: any;
  company?: { id?: string; name: string; code?: string };
  requestedTenure?: number;
  requestedInterestRate?: number;
  currentHandlerId?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  fatherName?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  dateOfBirth?: string;
  employmentType?: string;
  employerName?: string;
  monthlyIncome?: number;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  // Extended fields for active loans
  identifier?: string;
  approvedAmount?: number;
  interestRate?: number;
  tenure?: number;
  emiAmount?: number;
  disbursementDate?: string;
  nextEmi?: { id?: string; dueDate: string; amount: number; status: string; installmentNumber?: number };
  emiSchedules?: any[];
}
