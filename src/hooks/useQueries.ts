/**
 * React Query Hooks for Data Fetching
 * Provides cached, optimized data fetching for all dashboards
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys
export const queryKeys = {
  // Loans
  loans: (filters: Record<string, any>) => ['loans', filters] as const,
  loan: (id: string) => ['loan', id] as const,
  activeLoans: () => ['activeLoans'] as const,
  
  // Users
  users: (filters: Record<string, any>) => ['users', filters] as const,
  user: (id: string) => ['user', id] as const,
  
  // Companies
  companies: () => ['companies'] as const,
  company: (id: string) => ['company', id] as const,
  
  // EMI
  emiSchedule: (loanId: string) => ['emiSchedule', loanId] as const,
  emiCalendar: (month: string) => ['emiCalendar', month] as const,
  
  // Stats
  dashboardStats: (role: string, userId?: string) => ['dashboardStats', role, userId] as const,
  
  // Settings
  settings: () => ['settings'] as const,
};

// Fetch helper
async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return res.json();
}

// ============ LOANS ============

/**
 * Fetch loans list with caching
 */
export function useLoans(filters: {
  role?: string;
  customerId?: string;
  companyId?: string;
  agentId?: string;
  staffId?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  
  return useQuery({
    queryKey: queryKeys.loans(filters),
    queryFn: () => fetchApi(`/api/loan/list?${params.toString()}`),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetch single loan details
 */
export function useLoan(loanId: string | null) {
  return useQuery({
    queryKey: queryKeys.loan(loanId || ''),
    queryFn: () => fetchApi(`/api/loan/details?loanId=${loanId}`),
    enabled: !!loanId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch active loans
 */
export function useActiveLoans() {
  return useQuery({
    queryKey: queryKeys.activeLoans(),
    queryFn: () => fetchApi('/api/loan/all-active'),
    staleTime: 30 * 1000,
  });
}

// ============ USERS ============

/**
 * Fetch users list
 */
export function useUsers(filters?: { role?: string; companyId?: string }) {
  const params = new URLSearchParams();
  if (filters?.role) params.set('role', filters.role);
  if (filters?.companyId) params.set('companyId', filters.companyId);
  
  return useQuery({
    queryKey: queryKeys.users(filters || {}),
    queryFn: () => fetchApi(`/api/user?${params.toString()}`),
    staleTime: 60 * 1000,
  });
}

// ============ COMPANIES ============

/**
 * Fetch companies list
 */
export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies(),
    queryFn: () => fetchApi('/api/company?isActive=true'),
    staleTime: 5 * 60 * 1000, // 5 minutes - companies rarely change
  });
}

// ============ EMI ============

/**
 * Fetch EMI schedule for a loan
 */
export function useEMISchedule(loanId: string | null) {
  return useQuery({
    queryKey: queryKeys.emiSchedule(loanId || ''),
    queryFn: () => fetchApi(`/api/emi?loanId=${loanId}`),
    enabled: !!loanId,
    staleTime: 30 * 1000,
  });
}

// ============ SETTINGS ============

/**
 * Fetch system settings
 */
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings(),
    queryFn: () => fetchApi('/api/settings'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============ MUTATIONS ============

/**
 * Invalidate all loan-related queries
 */
export function useInvalidateLoans() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['loans'] });
    queryClient.invalidateQueries({ queryKey: ['activeLoans'] });
    queryClient.invalidateQueries({ queryKey: ['loan'] });
    queryClient.invalidateQueries({ queryKey: ['emiSchedule'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
  };
}

/**
 * Invalidate all user-related queries
 */
export function useInvalidateUsers() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['user'] });
  };
}

/**
 * Generic mutation hook
 */
export function useApiMutation<TData, TVariables>(
  url: string,
  options?: {
    method?: 'POST' | 'PUT' | 'DELETE';
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    invalidateKeys?: string[][];
  }
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (variables: TVariables) =>
      fetchApi<TData>(url, {
        method: options?.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      }),
    onSuccess: (data) => {
      options?.onSuccess?.(data);
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    },
    onError: options?.onError,
  });
}
