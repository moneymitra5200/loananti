'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: data is fresh for 60 seconds (increased for better performance)
            staleTime: 60 * 1000,
            // Cache time: keep unused data for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Don't refetch on window focus by default (reduces API calls)
            refetchOnWindowFocus: false,
            // Refetch on reconnect when internet comes back
            refetchOnReconnect: true,
            // Retry failed requests once
            retry: 1,
            // Retry delay with exponential backoff
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Use structural sharing for better performance
            structuralSharing: true,
            // Don't refetch on mount if data exists
            refetchOnMount: false,
          },
          mutations: {
            // Retry mutations once
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
