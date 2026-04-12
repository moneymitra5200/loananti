'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PrefetchDataProviderProps {
  userId?: string;
  userRole?: string;
  companyId?: string;
}

/**
 * Aggressive prefetch – fires ALL role-relevant requests in parallel the moment the
 * user is known (or even before, for public data). The goal is <200ms to first data.
 */
export default function PrefetchDataProvider({
  userId,
  userRole,
  companyId,
}: PrefetchDataProviderProps) {
  const queryClient = useQueryClient();
  const prefetchedFor = useRef<string | null>(null);

  useEffect(() => {
    // Re-prefetch when user changes (e.g. different role logs in)
    const key = `${userId}:${userRole}`;
    if (prefetchedFor.current === key) return;
    prefetchedFor.current = key;

    const p = (queryKey: any[], url: string, ttl = 60_000) =>
      queryClient.prefetchQuery({
        queryKey,
        queryFn: () =>
          fetch(url, { cache: 'no-store' })
            .then(r => {
              if (!r.ok) throw new Error(`${url} → ${r.status}`);
              return r.json();
            })
            .catch(() => null),       // never throw – prefetch is best-effort
        staleTime: ttl,
        gcTime: ttl * 2,
      });

    const batch: Promise<void>[] = [];

    // ── Always prefetch (public / lightweight) ─────────────────────────────
    batch.push(p(['settings'],     '/api/settings',                      5 * 60_000));
    batch.push(p(['cmsServices'],  '/api/cms/service?type=all',          5 * 60_000));
    batch.push(p(['cmsProducts'],  '/api/cms/product?isActive=true',     5 * 60_000));
    batch.push(p(['companies'],    '/api/company?isActive=true',         5 * 60_000));

    if (!userId || !userRole) {
      Promise.allSettled(batch);   // public prefetch only — user not known yet
      return;
    }

    // ── Role-specific prefetch ──────────────────────────────────────────────
    batch.push(p(['user', userId], `/api/user/${userId}`, 60_000));

    if (userRole === 'CUSTOMER') {
      batch.push(p(['customerLoans', userId], `/api/loan/list?customerId=${userId}`, 30_000));
      batch.push(p(['customerProfile', userId], `/api/user/${userId}`, 60_000));
    } else {
      // All staff roles need active loans + offline loans
      batch.push(p(['activeLoans'], '/api/loan/all-active', 30_000));
      batch.push(p(['offlineLoans'], '/api/offline-loan?page=1&limit=50', 30_000));

      const today = new Date();
      const ym = `${today.getFullYear()}-${today.getMonth() + 1}`;
      batch.push(p(
        ['emiCalendar', ym],
        `/api/emi-reminder?action=calendar&userId=${userId}&userRole=${userRole}&year=${today.getFullYear()}&month=${today.getMonth() + 1}`,
        30_000,
      ));
      batch.push(p(
        ['emiTodayTomorrow'],
        `/api/emi-reminder?action=today-tomorrow&userId=${userId}&userRole=${userRole}`,
        30_000,
      ));
    }

    // Role-tailored extras
    if (['SUPER_ADMIN', 'ACCOUNTANT', 'CASHIER'].includes(userRole)) {
      batch.push(p(['users', 'STAFF'],   '/api/user?role=STAFF',   60_000));
      batch.push(p(['users', 'AGENT'],   '/api/user?role=AGENT',   60_000));
      batch.push(p(['users', 'CASHIER'], '/api/user?role=CASHIER', 60_000));
      batch.push(p(['users', 'COMPANY'], '/api/user?role=COMPANY', 60_000));
    }

    if (userRole === 'SUPER_ADMIN') {
      batch.push(p(['allUsers'], '/api/user', 60_000));
      batch.push(p(['systemStats'], '/api/stats', 30_000));
    }

    if (userRole === 'AGENT') {
      batch.push(p(['agentLoans', userId], `/api/loan/list?role=AGENT&agentId=${userId}`, 30_000));
    }

    if (userRole === 'STAFF') {
      batch.push(p(['staffLoans', userId], `/api/loan/list?role=STAFF&staffId=${userId}`, 30_000));
    }

    if (companyId) {
      batch.push(p(['company', companyId], `/api/company?id=${companyId}`, 5 * 60_000));
      batch.push(p(['companyLoans', companyId], `/api/loan/list?companyId=${companyId}`, 30_000));
    }

    // Fire all in parallel — don't await, app should not block on prefetch
    Promise.allSettled(batch).then(() => {
      /* prefetch done — data is in cache */
    });
  }, [userId, userRole, companyId, queryClient]);

  return null;
}
