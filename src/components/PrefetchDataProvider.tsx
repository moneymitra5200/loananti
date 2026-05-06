'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PrefetchDataProviderProps {
  userId?: string;
  userRole?: string;
  companyId?: string;
}

/**
 * RESOURCE-OPTIMIZED prefetch — only fires the 4 lightest, most-reused queries.
 * Heavy queries (all-active loans, stats, user lists) are fetched lazily by each
 * component that needs them. This prevents the "15 simultaneous DB queries on login"
 * pattern that saturated Hostinger's shared connection pool.
 */
export default function PrefetchDataProvider({
  userId,
  userRole,
  companyId,
}: PrefetchDataProviderProps) {
  const queryClient = useQueryClient();
  const prefetchedFor = useRef<string | null>(null);

  useEffect(() => {
    const key = `${userId}:${userRole}`;
    if (prefetchedFor.current === key) return;
    prefetchedFor.current = key;

    const p = (queryKey: any[], url: string, ttl = 300_000) =>
      queryClient.prefetchQuery({
        queryKey,
        queryFn: () =>
          fetch(url, { cache: 'no-store' })
            .then(r => {
              if (!r.ok) throw new Error(`${url} → ${r.status}`);
              return r.json();
            })
            .catch(() => null),
        staleTime: ttl,
        gcTime: ttl * 2,
      });

    // ── Only prefetch the lightest, most universally-needed resources ──────
    // Settings and company list are tiny and cached for 5 minutes.
    // Everything else is fetched lazily by the component that renders it.
    // This cuts the login DB burst from ~15 simultaneous queries → 2-3.
    const coreBatch = [
      p(['settings'],   '/api/settings',            5 * 60_000),
      p(['companies'],  '/api/company?isActive=true', 5 * 60_000),
    ];

    // For customers, also prefetch their loan list (small, targeted query)
    if (userId && userRole === 'CUSTOMER') {
      coreBatch.push(p(['customerLoans', userId], `/api/loan/list?role=CUSTOMER&customerId=${userId}`, 60_000));
    }

    // Fire core batch immediately — just 2-3 lightweight queries
    Promise.allSettled(coreBatch);

    // ── Heavy queries are intentionally NOT prefetched here ────────────────
    // /api/loan/all-active   → fetched by the Loans tab when opened
    // /api/offline-loan      → fetched by Offline Loans tab when opened
    // /api/stats             → fetched by Stats widget when it mounts
    // /api/user?role=...     → fetched by User Management when opened
    // /api/emi-reminder      → fetched by EMI Calendar when it mounts
  }, [userId, userRole, companyId, queryClient]);

  return null;
}
