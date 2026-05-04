import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
  totalActiveLoans: number;
  onlineLoanCount: number;
  offlineLoanCount: number;
  totalCustomers: number;
  pendingLoans: number;
  disbursedLoans: number;
  closedLoans: number;
  totalCompanies: number;
  totalAgents: number;
  totalStaff: number;
  todayEMIs: number;
  overdueEMIs: number;
  generatedAt: string;
  cached?: boolean;
}

interface UseStatsOptions {
  role?: string;
  userId?: string;
  companyId?: string;
  /** Refetch interval in ms. Default = 30 seconds */
  refetchInterval?: number;
  enabled?: boolean;
}

/**
 * useStats — fetches all dashboard counters in one fast parallel DB call.
 * 
 * Usage:
 *   const { stats, loading } = useStats({ role: user?.role, userId: user?.id });
 *   // stats.totalActiveLoans, stats.overdueEMIs, etc.
 */
export function useStats({
  role = 'SUPER_ADMIN',
  userId = '',
  companyId = '',
  refetchInterval = 0,  // DISABLED — socket events trigger refresh, not polling
  enabled = true,
}: UseStatsOptions = {}) {
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (userId) params.set('userId', userId);
  if (companyId) params.set('companyId', companyId);

  const { data, isLoading, error, refetch } = useQuery<DashboardStats>({
    queryKey: ['stats', role, userId, companyId],
    queryFn: async () => {
      const res = await fetch(`/api/stats?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    staleTime: 25_000,          // treat data as fresh for 25s
    gcTime: 60_000,             // keep in cache 60s after unmount
    refetchInterval: refetchInterval || false, // disabled by default — socket events trigger refetch()
    refetchIntervalInBackground: false,
    enabled: enabled && !!(role),
    retry: 2,
    retryDelay: 1000,
  });

  const defaults: DashboardStats = {
    totalActiveLoans: 0,
    onlineLoanCount: 0,
    offlineLoanCount: 0,
    totalCustomers: 0,
    pendingLoans: 0,
    disbursedLoans: 0,
    closedLoans: 0,
    totalCompanies: 0,
    totalAgents: 0,
    totalStaff: 0,
    todayEMIs: 0,
    overdueEMIs: 0,
    generatedAt: '',
  };

  return {
    stats: data ?? defaults,
    loading: isLoading,
    error,
    refetch,
  };
}

export type { DashboardStats };
