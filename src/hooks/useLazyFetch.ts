'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

interface CacheData {
  [key: string]: {
    data: any;
    timestamp: number;
  };
}

// Simple in-memory cache
const cache: CacheData = {};
const CACHE_TTL = 30000; // 30 seconds

export function useLazyFetch<T>(url: string | null, autoFetch: boolean = false) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (fetchUrl: string, forceRefresh: boolean = false) => {
    // Check cache first
    if (!forceRefresh && cache[fetchUrl] && Date.now() - cache[fetchUrl].timestamp < CACHE_TTL) {
      setData(cache[fetchUrl].data);
      return cache[fetchUrl].data;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(fetchUrl);
      const result = await response.json();
      
      // Cache the result
      cache[fetchUrl] = {
        data: result,
        timestamp: Date.now()
      };
      
      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch && url) {
      fetchData(url);
    }
  }, [url, autoFetch, fetchData]);

  const refresh = useCallback(() => {
    if (url) {
      return fetchData(url, true);
    }
  }, [url, fetchData]);

  return { data, loading, error, fetchData, refresh, setData };
}

// Hook for fetching data only when tab is active
export function useTabData<T>(
  fetchFn: () => Promise<T>,
  isActive: boolean,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (isActive && !fetched) {
      let cancelled = false;
      
      const executeFetch = async () => {
        setLoading(true);
        try {
          const result = await fetchFn();
          if (!cancelled) {
            setData(result);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
            setFetched(true);
          }
        }
      };
      
      executeFetch();
      
      return () => {
        cancelled = true;
      };
    }
  }, [isActive, fetched, ...deps]);

  const refresh = useCallback(() => {
    setFetched(false);
  }, []);

  return { data, loading, refresh, setData };
}

// Clear cache utility
export function clearCache(key?: string) {
  if (key) {
    delete cache[key];
  } else {
    Object.keys(cache).forEach(k => delete cache[k]);
  }
}
