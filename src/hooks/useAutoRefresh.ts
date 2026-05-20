'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoRefreshOptions {
  /** Fetch function to call on each refresh cycle */
  onRefresh: () => void | Promise<void>;
  /** Interval in ms. Default: 30000 (30s). Set 0 to disable polling. */
  intervalMs?: number;
  /** Whether polling is active (e.g. pass false when no companyId). Default: true */
  enabled?: boolean;
  /** Minimum ms between visibility-change refreshes. Default: 15000 (15s) */
  visibilityThrottleMs?: number;
}

/**
 * useAutoRefresh — drops into any data-fetching component to provide:
 *  • Automatic polling every `intervalMs` (only when tab is visible)
 *  • Immediate refresh when the tab regains focus (throttled)
 *  • A `lastUpdated` Date that UI can display as "Updated X ago"
 */
export function useAutoRefresh({
  onRefresh,
  intervalMs = 30_000,
  enabled = true,
  visibilityThrottleMs = 15_000,
}: UseAutoRefreshOptions) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const lastRefreshTimeRef = useRef<number>(0);

  // Always keep ref current to avoid stale closures
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const doRefresh = useCallback(async () => {
    if (!enabled) return;
    try {
      await onRefreshRef.current();
    } catch {
      // swallow — caller handles errors
    }
    lastRefreshTimeRef.current = Date.now();
    setLastUpdated(new Date());
  }, [enabled]);

  // ── Interval polling ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        doRefresh();
      }
    }, intervalMs);

    return () => clearInterval(id);
  }, [enabled, intervalMs, doRefresh]);

  // ── Visibility-change refresh ───────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastRefreshTimeRef.current;
        if (elapsed >= visibilityThrottleMs) {
          doRefresh();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, visibilityThrottleMs, doRefresh]);

  return { lastUpdated, forceRefresh: doRefresh };
}

/** Returns a human-readable "X seconds/minutes ago" string */
export function useRelativeTime(date: Date | null): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!date) { setLabel(''); return; }

    const update = () => {
      const secs = Math.floor((Date.now() - date.getTime()) / 1000);
      if (secs < 5) setLabel('just now');
      else if (secs < 60) setLabel(`${secs}s ago`);
      else if (secs < 3600) setLabel(`${Math.floor(secs / 60)}m ago`);
      else setLabel(`${Math.floor(secs / 3600)}h ago`);
    };

    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, [date]);

  return label;
}
