'use client';

/**
 * Global Refresh Context
 * ─────────────────────
 * Provides an instant, lightweight refresh signal to ALL components
 * without prop-drilling or parent re-fetches.
 *
 * How it works:
 *   1. RefreshProvider wraps the app in DashboardLayout
 *   2. Socket.io 'dashboard:refresh' increments a global counter
 *   3. Any component uses `useRefresh()` and re-fetches when refreshKey changes
 *   4. Any component calls `triggerRefresh()` after a local write to notify all sections
 *
 * Usage in any component:
 *   const { refreshKey, triggerRefresh } = useRefresh();
 *   useEffect(() => { fetchMyData(); }, [refreshKey]);
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface RefreshContextValue {
  /** Increments on every refresh event. Use as a useEffect dependency to re-fetch. */
  refreshKey: number;
  /** Call after any write operation to instantly notify all sections to re-fetch. */
  triggerRefresh: () => void;
  /** Timestamp of the last refresh */
  lastRefreshedAt: Date | null;
}

const RefreshContext = createContext<RefreshContextValue>({
  refreshKey: 0,
  triggerRefresh: () => {},
  lastRefreshedAt: null,
});

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Throttle: max one refresh per 2 seconds to prevent cascade re-renders
  const lastFireRef = useRef(0);

  const triggerRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastFireRef.current < 2000) return;
    lastFireRef.current = now;
    setRefreshKey(k => k + 1);
    setLastRefreshedAt(new Date());
  }, []);

  // Listen to Socket.io events via the global socket set by useRealtime
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRefresh = () => triggerRefresh();

    const attach = () => {
      const socket = (window as any).__realtimeSocket;
      if (!socket) return false;
      socket.on('dashboard:refresh', handleRefresh);
      socket.on('report:invalidated', handleRefresh);
      socket.on('payment:received', handleRefresh);
      return true;
    };

    // Socket may not be ready immediately — poll for up to 10 seconds
    if (!attach()) {
      let polls = 0;
      const timer = setInterval(() => {
        if (attach() || ++polls > 20) clearInterval(timer);
      }, 500);
      return () => {
        clearInterval(timer);
        const s = (window as any).__realtimeSocket;
        if (s) {
          s.off('dashboard:refresh', handleRefresh);
          s.off('report:invalidated', handleRefresh);
          s.off('payment:received', handleRefresh);
        }
      };
    }

    return () => {
      const s = (window as any).__realtimeSocket;
      if (s) {
        s.off('dashboard:refresh', handleRefresh);
        s.off('report:invalidated', handleRefresh);
        s.off('payment:received', handleRefresh);
      }
    };
  }, [triggerRefresh]);

  // Refresh on tab becoming visible (handles background → foreground)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') triggerRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [triggerRefresh]);

  return (
    <RefreshContext.Provider value={{ refreshKey, triggerRefresh, lastRefreshedAt }}>
      {children}
    </RefreshContext.Provider>
  );
}

/** Use this in any component that needs to auto-refresh when data changes. */
export function useRefresh() {
  return useContext(RefreshContext);
}
