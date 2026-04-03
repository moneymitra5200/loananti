import { create } from 'zustand';

interface Company {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  defaultInterestRate?: number;
  defaultInterestType?: string;
  enableMirrorLoan?: boolean;
  mirrorInterestRate?: number | null;
  mirrorInterestType?: string;
  maxLoanAmount?: number;
  minLoanAmount?: number;
  maxTenureMonths?: number;
}

interface CompaniesState {
  companies: Company[];
  loading: boolean;
  lastFetch: number | null;
  
  // Actions
  setCompanies: (companies: Company[]) => void;
  addCompany: (company: Company) => void;
  updateCompany: (companyId: string, updates: Partial<Company>) => void;
  removeCompany: (companyId: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Helpers
  needsRefresh: () => boolean;
  setLastFetch: () => void;
  clearCache: () => void;
  getCompanyById: (id: string) => Company | undefined;
}

const CACHE_TTL = 120000; // 2 minutes

export const useCompaniesStore = create<CompaniesState>((set, get) => ({
  companies: [],
  loading: false,
  lastFetch: null,

  setCompanies: (companies) => set({ companies, lastFetch: Date.now() }),
  addCompany: (company) => set((state) => ({ companies: [company, ...state.companies] })),
  updateCompany: (companyId, updates) => set((state) => ({
    companies: state.companies.map((c) => c.id === companyId ? { ...c, ...updates } : c),
  })),
  removeCompany: (companyId) => set((state) => ({
    companies: state.companies.filter((c) => c.id !== companyId),
  })),
  setLoading: (loading) => set({ loading }),

  needsRefresh: () => {
    const { lastFetch } = get();
    return !lastFetch || Date.now() - lastFetch > CACHE_TTL;
  },

  setLastFetch: () => set({ lastFetch: Date.now() }),
  clearCache: () => set({ lastFetch: null }),
  getCompanyById: (id: string) => get().companies.find(c => c.id === id),
}));
