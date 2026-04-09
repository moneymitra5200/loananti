import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isLocked?: boolean;
  createdAt: string;
  companyId?: string;
  companyObj?: { id: string; name: string; code: string };
  agentId?: string;
  agent?: { id: string; name: string; agentCode: string };
  agentCode?: string;
  staffCode?: string;
  cashierCode?: string;
  accountantCode?: string;
  companyCredit?: number;
  personalCredit?: number;
}

interface UsersState {
  users: User[];
  agents: User[];
  staff: User[];
  cashiers: User[];
  accountants: User[];
  customers: User[];
  loading: boolean;
  lastFetch: number | null;
  
  // Actions
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  removeUser: (userId: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Helpers
  needsRefresh: () => boolean;
  setLastFetch: () => void;
  clearCache: () => void;
  
  // Getters
  getUsersByRole: (role: string) => User[];
}

const CACHE_TTL = 60000; // 1 minute

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  agents: [],
  staff: [],
  cashiers: [],
  accountants: [],
  customers: [],
  loading: false,
  lastFetch: null,

  setUsers: (users) => {
    const agents = users.filter(u => u.role === 'AGENT');
    const staff = users.filter(u => u.role === 'STAFF');
    const cashiers = users.filter(u => u.role === 'CASHIER');
    const accountants = users.filter(u => u.role === 'ACCOUNTANT');
    const customers = users.filter(u => u.role === 'CUSTOMER');
    set({ users, agents, staff, cashiers, accountants, customers, lastFetch: Date.now() });
  },
  
  addUser: (user) => set((state) => ({ 
    users: [user, ...state.users],
    lastFetch: null, // Invalidate cache
  })),
  
  updateUser: (userId, updates) => set((state) => {
    const updatedUsers = state.users.map((u) => u.id === userId ? { ...u, ...updates } : u);
    return {
      users: updatedUsers,
      agents: updatedUsers.filter(u => u.role === 'AGENT'),
      staff: updatedUsers.filter(u => u.role === 'STAFF'),
      cashiers: updatedUsers.filter(u => u.role === 'CASHIER'),
      accountants: updatedUsers.filter(u => u.role === 'ACCOUNTANT'),
      customers: updatedUsers.filter(u => u.role === 'CUSTOMER'),
    };
  }),
  
  removeUser: (userId) => set((state) => {
    const filteredUsers = state.users.filter((u) => u.id !== userId);
    return {
      users: filteredUsers,
      agents: filteredUsers.filter(u => u.role === 'AGENT'),
      staff: filteredUsers.filter(u => u.role === 'STAFF'),
      cashiers: filteredUsers.filter(u => u.role === 'CASHIER'),
      accountants: filteredUsers.filter(u => u.role === 'ACCOUNTANT'),
      customers: filteredUsers.filter(u => u.role === 'CUSTOMER'),
    };
  }),
  
  setLoading: (loading) => set({ loading }),

  needsRefresh: () => {
    const { lastFetch } = get();
    return !lastFetch || Date.now() - lastFetch > CACHE_TTL;
  },

  setLastFetch: () => set({ lastFetch: Date.now() }),
  clearCache: () => set({ lastFetch: null }),
  
  getUsersByRole: (role: string) => {
    const { users } = get();
    return users.filter(u => u.role === role);
  },
}));
