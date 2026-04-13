/**
 * High-performance in-memory cache utility
 * - Zero dependencies (no Redis needed)
 * - Stale-While-Revalidate (SWR) pattern for non-blocking UX
 * - Auto cleanup of expired keys to prevent memory leaks
 * - Hit/miss stats for observability
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  staleWhileRevalidate?: number; // extra ms after TTL where stale data is served while refreshing
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private revalidating: Set<string> = new Set();

  constructor() {
    // Auto-cleanup expired keys every 5 minutes to prevent memory leaks
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  /** Remove expired entries to keep memory lean */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      const maxAge = entry.ttl + (entry.staleWhileRevalidate || 0);
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
        removed++;
      }
    }
    if (removed > 0 && process.env.NODE_ENV !== 'production') {
      console.debug(`[Cache] Cleaned ${removed} expired keys. Remaining: ${this.cache.size}`);
    }
  }

  /** Get a value from cache (returns null if expired) */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      // Expired — check if still in SWR window
      const swrWindow = entry.staleWhileRevalidate || 0;
      if (swrWindow === 0 || age > entry.ttl + swrWindow) {
        this.cache.delete(key);
        this.misses++;
        return null;
      }
      // SWR: return stale data (caller will trigger background revalidation)
      this.hits++;
      return entry.data;
    }

    this.hits++;
    return entry.data;
  }

  /** Check if a key is expired but still in the SWR window */
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    const age = Date.now() - entry.timestamp;
    return age > entry.ttl;
  }

  /** Set a value in cache */
  set<T>(key: string, data: T, ttlMs: number = 60000, staleWhileRevalidate = 0): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
      staleWhileRevalidate,
    });
  }

  /** Delete a value from cache */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /** Delete all keys matching a pattern string */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /** Clear all cache entries */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /** Get cache statistics */
  getStats(): { size: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? `${Math.round((this.hits / total) * 100)}%` : '0%',
    };
  }

  /**
   * Cache-aside helper: returns cached data immediately if fresh.
   * If stale-while-revalidate: returns stale data AND triggers a background refresh.
   * If no data: waits for the fetcher and caches the result.
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 60000,
    staleWhileRevalidateMs = 0
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      // Background revalidation if SWR and stale
      if (staleWhileRevalidateMs > 0 && this.isStale(key) && !this.revalidating.has(key)) {
        this.revalidating.add(key);
        fetcher()
          .then(data => {
            this.set(key, data, ttlMs, staleWhileRevalidateMs);
          })
          .catch(err => {
            console.warn(`[Cache SWR] Background refresh failed for key "${key}":`, err?.message);
          })
          .finally(() => {
            this.revalidating.delete(key);
          });
      }
      return cached;
    }

    // Cache miss — fetch and store
    const data = await fetcher();
    this.set(key, data, ttlMs, staleWhileRevalidateMs);
    return data;
  }
}

// Singleton cache instance
export const cache = new MemoryCache();

// ── Cache key generators ──────────────────────────────────────────────────
export const CacheKeys = {
  // User
  user:        (userId: string) =>  `user:${userId}`,
  userByEmail: (email: string)  =>  `user:email:${email}`,
  usersByRole: (role: string)   =>  `users:role:${role}`,
  usersList:   ()               =>  'users:list',

  // Loan
  loan:           (loanId: string)       => `loan:${loanId}`,
  loansByStatus:  (status: string)       => `loans:status:${status}`,
  loansByRole:    (role: string, userId?: string) => `loans:${role}${userId ? `:${userId}` : ''}`,
  loanDetails:    (loanId: string)       => `loan:details:${loanId}`,
  allActiveLoans: ()                     => 'loans:active:all',

  // EMI
  emiSchedule:  (loanId: string)              => `emi:schedule:${loanId}`,
  emiCalendar:  (userId: string, date: string) => `emi:calendar:${userId}:${date}`,
  pendingEMIs:  (userId: string)              => `emi:pending:${userId}`,

  // Company
  company:       (companyId: string) => `company:${companyId}`,
  companiesList: ()                  => 'companies:list',

  // Settings
  systemSettings:  () => 'settings:system',
  paymentSettings: () => 'settings:payment',

  // Credit
  creditSummary: (userId: string) => `credit:summary:${userId}`,

  // Dashboard stats
  dashboardStats: (role: string, userId?: string) =>
    `dashboard:stats:${role}${userId ? `:${userId}` : ''}`,

  // CMS (mostly static)
  CMS_SERVICES:    'cms:services',
  CMS_BANNERS:     'cms:banners',
  CMS_TESTIMONIALS:'cms:testimonials',
  LOAN_STATS:      'stats:loans',
  USER_COUNT:      'stats:user_count',
  COMPANY_COUNT:   'stats:company_count',

  // Receipts
  receiptTemplates: () => 'receipt:templates',
};

// ── TTL presets (milliseconds) ────────────────────────────────────────────
export const CacheTTL = {
  SHORT:     30_000,   //  30 seconds — frequently changing
  MEDIUM:    60_000,   //   1 minute  — normal data
  LONG:     300_000,   //   5 minutes — rarely changing
  VERY_LONG:900_000,   //  15 minutes — near-static (CMS, settings)
};

// ── Invalidation helpers ──────────────────────────────────────────────────
export function invalidateUserCache(userId?: string): void {
  if (userId) {
    cache.deletePattern(`user:${userId}`);
    cache.deletePattern(`credit:summary:${userId}`);
    cache.deletePattern(`emi:pending:${userId}`);
    cache.deletePattern(`emi:calendar:${userId}`);
  }
  cache.delete('users:list');
  cache.deletePattern('users:role:');
  cache.deletePattern('dashboard:stats:');
}

export function invalidateLoanCache(loanId?: string): void {
  if (loanId) {
    cache.deletePattern(`loan:${loanId}`);
    cache.deletePattern(`emi:schedule:${loanId}`);
  }
  cache.deletePattern('loans:');
  cache.deletePattern('dashboard:stats:');
}

export function invalidatePaymentCache(): void {
  cache.delete('settings:payment');
  cache.deletePattern('emi:');
  cache.deletePattern('credit:');
  cache.deletePattern('dashboard:stats:');
}

export function invalidateCompanyCache(companyId?: string): void {
  if (companyId) {
    cache.deletePattern(`company:${companyId}`);
  }
  cache.delete('companies:list');
  cache.deletePattern('dashboard:stats:');
}

export default cache;
