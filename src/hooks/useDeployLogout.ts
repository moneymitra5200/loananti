'use client';

/**
 * useDeployLogout — Detects when the app has been redeployed and immediately
 * clears the user's session, forcing a re-login for security.
 *
 * How it works:
 * 1. On mount, fetch the app's build ID from /api/health (a lightweight endpoint).
 * 2. Store the build ID in sessionStorage.
 * 3. Every 3 minutes, re-fetch and compare.
 * 4. If the build ID has changed → new deployment → clear all auth tokens & reload.
 */

import { useEffect, useRef } from 'react';

const CHECK_INTERVAL = 3 * 60 * 1000; // 3 minutes
const STORAGE_KEY = 'app_build_id';

async function fetchBuildId(): Promise<string | null> {
  try {
    // Use cache-busting to ensure we always get the latest
    const res = await fetch(`/api/health?t=${Date.now()}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Return ETag header or build timestamp from body
    return res.headers.get('etag') || data.buildId || data.ts || null;
  } catch {
    return null;
  }
}

function clearAuthAndReload() {
  try {
    // Clear all auth storage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('app_settings_cache');
    localStorage.removeItem('app_settings_timestamp');
    sessionStorage.clear();
  } catch {}

  // Reload to landing/login page
  window.location.href = '/?redeployed=1';
}

export function useDeployLogout() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      const buildId = await fetchBuildId();
      if (!buildId || !mountedRef.current) return;

      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // First visit — store current build ID
        sessionStorage.setItem(STORAGE_KEY, buildId);
      } else if (stored !== buildId) {
        // Build ID changed → new deployment → force logout
        console.info('[useDeployLogout] New deployment detected. Logging out for security.');
        clearAuthAndReload();
        return;
      }

      // Start periodic checks
      intervalRef.current = setInterval(async () => {
        if (!mountedRef.current) return;
        const newBuildId = await fetchBuildId();
        if (!newBuildId) return;

        const current = sessionStorage.getItem(STORAGE_KEY);
        if (current && current !== newBuildId) {
          console.info('[useDeployLogout] New deployment detected mid-session. Logging out.');
          clearAuthAndReload();
        } else if (newBuildId) {
          sessionStorage.setItem(STORAGE_KEY, newBuildId);
        }
      }, CHECK_INTERVAL);
    };

    init();

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
