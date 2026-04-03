'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface PrefetchDataProviderProps {
  userId?: string;
  userRole?: string;
  companyId?: string;
}

/**
 * Prefetches all dashboard data on app load for instant navigation
 * This component should be placed at the root level
 */
export default function PrefetchDataProvider({ 
  userId, 
  userRole, 
  companyId 
}: PrefetchDataProviderProps) {
  const queryClient = useQueryClient();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    // Only prefetch once per session
    if (hasPrefetched.current) return;
    hasPrefetched.current = true;

    const prefetchData = async () => {
      const startTime = performance.now();
      console.log('[Prefetch] Starting data prefetch...');

      // Prefetch all data in parallel for maximum speed
      const prefetchPromises: Promise<void>[] = [];

      // 1. Settings (always needed)
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['settings'],
          queryFn: () => fetch('/api/settings').then(r => r.json()),
          staleTime: 5 * 60 * 1000,
        })
      );

      // 2. CMS Services (landing page data)
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['cmsServices'],
          queryFn: () => fetch('/api/cms/service?type=all').then(r => r.json()),
          staleTime: 5 * 60 * 1000,
        })
      );

      // 3. CMS Products (loan products)
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['cmsProducts'],
          queryFn: () => fetch('/api/cms/product?isActive=true').then(r => r.json()),
          staleTime: 5 * 60 * 1000,
        })
      );

      // 4. Companies list
      prefetchPromises.push(
        queryClient.prefetchQuery({
          queryKey: ['companies'],
          queryFn: () => fetch('/api/company?isActive=true').then(r => r.json()),
          staleTime: 5 * 60 * 1000,
        })
      );

      // 5. User-specific data (if logged in)
      if (userId && userRole) {
        // User details
        prefetchPromises.push(
          queryClient.prefetchQuery({
            queryKey: ['user', userId],
            queryFn: () => fetch(`/api/user/${userId}`).then(r => r.json()),
            staleTime: 60 * 1000,
          })
        );

        // Role-based data
        if (['SUPER_ADMIN', 'ACCOUNTANT', 'CASHIER'].includes(userRole)) {
          // All users
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['users', { role: 'STAFF' }],
              queryFn: () => fetch('/api/user?role=STAFF').then(r => r.json()),
              staleTime: 60 * 1000,
            })
          );

          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['users', { role: 'AGENT' }],
              queryFn: () => fetch('/api/user?role=AGENT').then(r => r.json()),
              staleTime: 60 * 1000,
            })
          );

          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['users', { role: 'CASHIER' }],
              queryFn: () => fetch('/api/user?role=CASHIER').then(r => r.json()),
              staleTime: 60 * 1000,
            })
          );
        }

        // Active loans (for all roles except CUSTOMER)
        if (userRole !== 'CUSTOMER') {
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['activeLoans'],
              queryFn: () => fetch('/api/loan/all-active').then(r => r.json()),
              staleTime: 30 * 1000,
            })
          );

          // Offline loans
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['offlineLoans'],
              queryFn: () => fetch('/api/offline-loan?page=1&limit=50').then(r => r.json()),
              staleTime: 30 * 1000,
            })
          );

          // EMI reminders
          const today = new Date();
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['emiCalendar', `${today.getFullYear()}-${today.getMonth() + 1}`],
              queryFn: () => fetch(`/api/emi-reminder?action=calendar&userId=${userId}&userRole=${userRole}&year=${today.getFullYear()}&month=${today.getMonth() + 1}`).then(r => r.json()),
              staleTime: 30 * 1000,
            })
          );

          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['emiTodayTomorrow'],
              queryFn: () => fetch(`/api/emi-reminder?action=today-tomorrow&userId=${userId}&userRole=${userRole}`).then(r => r.json()),
              staleTime: 30 * 1000,
            })
          );
        }

        // Customer-specific data
        if (userRole === 'CUSTOMER') {
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['customerLoans', userId],
              queryFn: () => fetch(`/api/loan/list?customerId=${userId}`).then(r => r.json()),
              staleTime: 30 * 1000,
            })
          );
        }

        // Agent/Staff specific data
        if (userRole === 'AGENT' || userRole === 'STAFF') {
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['agentLoans', userId],
              queryFn: () => fetch(`/api/loan/list?agentId=${userId}`).then(r => r.json()),
              staleTime: 30 * 1000,
            })
          );
        }

        // Company-specific data
        if (companyId) {
          prefetchPromises.push(
            queryClient.prefetchQuery({
              queryKey: ['company', companyId],
              queryFn: () => fetch(`/api/company?id=${companyId}`).then(r => r.json()),
              staleTime: 5 * 60 * 1000,
            })
          );
        }
      }

      // Wait for all prefetches to complete
      await Promise.allSettled(prefetchPromises);

      const endTime = performance.now();
      console.log(`[Prefetch] Completed in ${(endTime - startTime).toFixed(0)}ms`);
    };

    // Start prefetching immediately
    prefetchData();
  }, [userId, userRole, companyId, queryClient]);

  return null; // This component doesn't render anything
}
