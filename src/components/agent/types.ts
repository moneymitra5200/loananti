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
  company?: any;
  requestedTenure?: number;
  requestedInterestRate?: number;
  currentHandlerId?: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  staffCode: string;
  isActive: boolean;
}

export interface SessionForm {
  approvedAmount: number;
  interestRate: number;
  tenure: number;
  interestType: 'FLAT' | 'REDUCING';
  specialConditions: string;
}

export interface CalculatedEMI {
  emi: number;
  totalInterest: number;
  totalAmount: number;
  principal: number;
}
