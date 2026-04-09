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
  requestedTenure?: number;
  requestedInterestRate?: number;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  sessionForm?: any;
  loanForm?: any;
  company?: any;
  currentHandlerId?: string;
  assignedAgentId?: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  agentCode?: string;
}

export interface Stats {
  pending: number;
  inProgress: number;
  active: number;
  rejected: number;
}
