'use client';

import { useCallback, useRef } from 'react';

interface OptimisticAction<T> {
  optimisticUpdate: () => void;
  rollback: () => void;
  execute: () => Promise<T>;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for performing optimistic updates with automatic rollback on error
 */
export function useOptimisticAction() {
  const pendingActionsRef = useRef<Map<string, () => void>>(new Map());

  const execute = useCallback(async <T>(
    actionId: string,
    config: OptimisticAction<T>
  ): Promise<T | null> => {
    const { optimisticUpdate, rollback, execute, onSuccess, onError } = config;

    // Apply optimistic update immediately
    optimisticUpdate();

    // Store rollback function
    pendingActionsRef.current.set(actionId, rollback);

    try {
      const result = await execute();
      
      // Clear pending action on success
      pendingActionsRef.current.delete(actionId);
      
      onSuccess?.(result);
      return result;
    } catch (error) {
      // Rollback on error
      rollback();
      pendingActionsRef.current.delete(actionId);
      
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      return null;
    }
  }, []);

  const rollbackAll = useCallback(() => {
    pendingActionsRef.current.forEach((rollback) => rollback());
    pendingActionsRef.current.clear();
  }, []);

  return { execute, rollbackAll };
}

/**
 * Fetch multiple endpoints in parallel
 */
export async function parallelFetch<T extends Record<string, unknown>>(
  endpoints: Record<string, string>
): Promise<T> {
  const entries = Object.entries(endpoints);
  const promises = entries.map(([key, url]) => 
    fetch(url)
      .then(res => res.json())
      .then(data => [key, data] as [string, unknown])
      .catch(error => [key, { error: error.message }] as [string, unknown])
  );

  const results = await Promise.all(promises);
  return Object.fromEntries(results) as T;
}

/**
 * Fetch with deduplication - prevents multiple identical requests
 */
const pendingRequests = new Map<string, Promise<any>>();

export async function dedupedFetch<T>(url: string): Promise<T> {
  // Check if request is already pending
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url)!;
  }

  const promise = fetch(url)
    .then(res => res.json())
    .finally(() => {
      pendingRequests.delete(url);
    });

  pendingRequests.set(url, promise);
  return promise;
}

/**
 * Hook for fetching data with loading state
 */
export function useDataFetch<T>() {
  const loadingRef = useRef(false);

  const fetchWithLoading = useCallback(async (
    url: string,
    onSuccess: (data: T) => void,
    onError?: (error: Error) => void
  ) => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        onSuccess(data);
      } else {
        onError?.(new Error(data.error || 'Failed to fetch'));
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      loadingRef.current = false;
    }
  }, []);

  return { fetchWithLoading, isLoading: loadingRef.current };
}
