import { create } from 'zustand';

interface Loan {
  id: string;
  applicationNo: string;
  status: string;
  requestedAmount: number;
  loanType: string;
  createdAt: string;
  riskScore?: number;
  fraudFlag?: boolean;
  purpose?: string;
  requestedTenure?: number;
  requestedInterestRate?: number;
  customerId?: string;
  companyId?: string;
  currentHandlerId?: string;
  customer?: { id: string; name: string; email: string; phone: string };
  company?: { id: string; name: string; code: string };
  sessionForm?: any;
  loanForm?: any;
  disbursedAmount?: number;
  disbursedAt?: string;
  disbursementMode?: string;
  disbursementRef?: string;
  isInterestOnlyLoan?: boolean;
  isMirrorLoan?: boolean;
  totalInterestOnlyPaid?: number;
  // Allow additional properties from API
  [key: string]: any;
}

interface LoansState {
  loans: Loan[];
  activeLoans: Loan[];
  loading: boolean;
  lastFetch: number | null;
  activeLastFetch: number | null;
  
  // Actions
  setLoans: (loans: Loan[]) => void;
  setActiveLoans: (loans: Loan[]) => void;
  addLoan: (loan: Loan) => void;
  updateLoan: (loanId: string, updates: Partial<Loan>) => void;
  removeLoan: (loanId: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Optimistic updates
  optimisticUpdate: (loanId: string, updates: Partial<Loan>) => void;
  revertOptimisticUpdate: (loanId: string, originalData: Loan) => void;
  
  // Fetch helpers
  needsRefresh: () => boolean;
  activeNeedsRefresh: () => boolean;
  setLastFetch: () => void;
  setActiveLastFetch: () => void;
  clearCache: () => void;
}

const CACHE_TTL = 30000; // 30 seconds

export const useLoansStore = create<LoansState>((set, get) => ({
  loans: [],
  activeLoans: [],
  loading: false,
  lastFetch: null,
  activeLastFetch: null,

  setLoans: (loans) => set({ loans, lastFetch: Date.now() }),
  setActiveLoans: (activeLoans) => set({ activeLoans, activeLastFetch: Date.now() }),
  addLoan: (loan) => set((state) => ({ loans: [loan, ...state.loans] })),
  updateLoan: (loanId, updates) => set((state) => ({
    loans: state.loans.map((l) => l.id === loanId ? { ...l, ...updates } : l),
    activeLoans: state.activeLoans.map((l) => l.id === loanId ? { ...l, ...updates } : l),
  })),
  removeLoan: (loanId) => set((state) => ({
    loans: state.loans.filter((l) => l.id !== loanId),
    activeLoans: state.activeLoans.filter((l) => l.id !== loanId),
  })),
  setLoading: (loading) => set({ loading }),

  optimisticUpdate: (loanId, updates) => {
    set((state) => ({
      loans: state.loans.map((l) => l.id === loanId ? { ...l, ...updates } : l),
      activeLoans: state.activeLoans.map((l) => l.id === loanId ? { ...l, ...updates } : l),
    }));
  },

  revertOptimisticUpdate: (loanId, originalData) => {
    set((state) => ({
      loans: state.loans.map((l) => l.id === loanId ? originalData : l),
      activeLoans: state.activeLoans.map((l) => l.id === loanId ? originalData : l),
    }));
  },

  needsRefresh: () => {
    const { lastFetch } = get();
    return !lastFetch || Date.now() - lastFetch > CACHE_TTL;
  },

  activeNeedsRefresh: () => {
    const { activeLastFetch } = get();
    return !activeLastFetch || Date.now() - activeLastFetch > CACHE_TTL;
  },

  setLastFetch: () => set({ lastFetch: Date.now() }),
  setActiveLastFetch: () => set({ activeLastFetch: Date.now() }),
  clearCache: () => set({ lastFetch: null, activeLastFetch: null }),
}));
