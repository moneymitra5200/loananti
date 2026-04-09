/**
 * API Response Cache Utility
 * Reduces database load and improves response times
 */

import { cache, CacheTTL } from './cache';
import { NextResponse } from 'next/server';

interface CachedResponse {
  data: any;
  timestamp: number;
}

/**
 * Wrap an API handler with caching
 */
export function withCache<T>(
  key: string,
  ttl: number = CacheTTL.SHORT,
  fetcher: () => Promise<T>
): Promise<T> {
  return cache.getOrSet(key, fetcher, ttl);
}

/**
 * Create a cached API response
 */
export function cachedResponse(data: any, cached: boolean = false) {
  return NextResponse.json({ ...data, cached });
}

/**
 * Cache keys for common API endpoints
 */
export const APICacheKeys = {
  // Dashboard stats
  superAdminStats: () => 'api:stats:superadmin',
  cashierStats: (userId: string) => `api:stats:cashier:${userId}`,
  agentStats: (userId: string) => `api:stats:agent:${userId}`,
  staffStats: (userId: string) => `api:stats:staff:${userId}`,
  accountantStats: (userId: string) => `api:stats:accountant:${userId}`,
  
  // Lists
  loansList: (filters: string) => `api:loans:${filters}`,
  usersList: (filters: string) => `api:users:${filters}`,
  companiesList: () => 'api:companies:list',
  activeLoans: () => 'api:loans:active',
  
  // EMI
  emiSchedule: (loanId: string) => `api:emi:schedule:${loanId}`,
  emiCalendar: (month: string) => `api:emi:calendar:${month}`,
  
  // Settings
  systemSettings: () => 'api:settings:system',
  companySettings: (companyId: string) => `api:settings:company:${companyId}`,
  
  // Credit
  userCredit: (userId: string) => `api:credit:${userId}`,
  companyCredit: (companyId: string) => `api:credit:company:${companyId}`,
};

/**
 * Invalidate related caches after mutations
 */
export function invalidateAfterLoanMutation(loanId?: string) {
  cache.deletePattern('api:loans:');
  cache.deletePattern('api:stats:');
  cache.deletePattern('api:emi:');
  if (loanId) {
    cache.deletePattern(`api:emi:schedule:${loanId}`);
  }
}

export function invalidateAfterUserMutation(userId?: string) {
  cache.deletePattern('api:users:');
  cache.deletePattern('api:stats:');
  cache.deletePattern('api:credit:');
  if (userId) {
    cache.deletePattern(`api:credit:${userId}`);
  }
}

export function invalidateAfterPaymentMutation() {
  cache.deletePattern('api:emi:');
  cache.deletePattern('api:credit:');
  cache.deletePattern('api:stats:');
}

/**
 * Prefetch common data for dashboards
 */
export async function prefetchDashboardData(role: string, userId?: string) {
  const promises: Promise<any>[] = [];
  
  // Prefetch based on role
  switch (role) {
    case 'SUPER_ADMIN':
      promises.push(
        withCache(APICacheKeys.superAdminStats(), CacheTTL.SHORT, async () => ({})),
        withCache(APICacheKeys.loansList('all'), CacheTTL.SHORT, async () => []),
        withCache(APICacheKeys.usersList('all'), CacheTTL.SHORT, async () => [])
      );
      break;
    case 'CASHIER':
      if (userId) {
        promises.push(
          withCache(APICacheKeys.cashierStats(userId), CacheTTL.SHORT, async () => ({})),
          withCache(APICacheKeys.activeLoans(), CacheTTL.SHORT, async () => [])
        );
      }
      break;
  }
  
  await Promise.allSettled(promises);
}
