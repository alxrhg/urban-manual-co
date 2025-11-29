/**
 * Data Fetching Hook
 *
 * Provides consistent data fetching patterns with:
 * - Loading states
 * - Error handling
 * - Caching
 * - Refetch capability
 * - Optimistic updates
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Loading state enum for consistent loading indicators
 */
export enum LoadingState {
  /** Initial state, no data fetched yet */
  Idle = 'idle',
  /** Currently fetching data */
  Loading = 'loading',
  /** Data successfully loaded */
  Success = 'success',
  /** Error occurred during fetch */
  Error = 'error',
  /** Refreshing data (already have stale data) */
  Refreshing = 'refreshing',
  /** Revalidating in background */
  Revalidating = 'revalidating',
}

interface UseDataFetchingOptions<T> {
  /** Initial data */
  initialData?: T;
  /** Whether to fetch immediately on mount */
  immediate?: boolean;
  /** Cache key for deduplication */
  cacheKey?: string;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Transform response data */
  transform?: (data: unknown) => T;
  /** Retry configuration */
  retry?: {
    count: number;
    delay: number;
    backoff?: boolean;
  };
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

interface UseDataFetchingResult<T> {
  /** Current data */
  data: T | undefined;
  /** Current loading state */
  loadingState: LoadingState;
  /** Error if any */
  error: Error | null;
  /** Whether currently loading (convenience helper) */
  isLoading: boolean;
  /** Whether currently refreshing (convenience helper) */
  isRefreshing: boolean;
  /** Whether fetch was successful */
  isSuccess: boolean;
  /** Whether fetch had an error */
  isError: boolean;
  /** Fetch data */
  fetch: () => Promise<T | undefined>;
  /** Refresh data (shows refreshing state) */
  refresh: () => Promise<T | undefined>;
  /** Mutate data optimistically */
  mutate: (newData: T | ((prev: T | undefined) => T)) => void;
  /** Reset to initial state */
  reset: () => void;
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();

/**
 * Hook for data fetching with consistent patterns
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, fetch, refresh } = useDataFetching(
 *   async () => {
 *     const response = await fetch('/api/destinations');
 *     return response.json();
 *   },
 *   { immediate: true, cacheKey: 'destinations' }
 * );
 * ```
 */
export function useDataFetching<T>(
  fetcher: () => Promise<T>,
  options: UseDataFetchingOptions<T> = {}
): UseDataFetchingResult<T> {
  const {
    initialData,
    immediate = false,
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes default
    transform,
    retry = { count: 0, delay: 1000, backoff: true },
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [loadingState, setLoadingState] = useState<LoadingState>(
    LoadingState.Idle
  );
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const fetchCountRef = useRef(0);

  // Check cache on mount
  useEffect(() => {
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        setData(cached.data as T);
        setLoadingState(LoadingState.Success);
      }
    }
  }, [cacheKey, cacheTTL]);

  const fetchWithRetry = useCallback(
    async (isRefresh = false): Promise<T | undefined> => {
      const currentFetch = ++fetchCountRef.current;

      // Set appropriate loading state
      if (isRefresh && data) {
        setLoadingState(LoadingState.Refreshing);
      } else if (data) {
        setLoadingState(LoadingState.Revalidating);
      } else {
        setLoadingState(LoadingState.Loading);
      }
      setError(null);

      let lastError: Error | null = null;
      const maxAttempts = retry.count + 1;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const rawResult = await fetcher();

          // Check if still mounted and this is the latest fetch
          if (!mountedRef.current || currentFetch !== fetchCountRef.current) {
            return undefined;
          }

          const result = transform ? transform(rawResult) : rawResult;

          // Update cache
          if (cacheKey) {
            cache.set(cacheKey, { data: result, timestamp: Date.now() });
          }

          setData(result);
          setLoadingState(LoadingState.Success);
          onSuccess?.(result);
          return result;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          // If not the last attempt, wait before retrying
          if (attempt < maxAttempts - 1) {
            const delay = retry.backoff
              ? retry.delay * Math.pow(2, attempt)
              : retry.delay;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      // All attempts failed
      if (mountedRef.current && currentFetch === fetchCountRef.current) {
        setError(lastError);
        setLoadingState(LoadingState.Error);
        onError?.(lastError!);
      }

      return undefined;
    },
    [fetcher, data, transform, cacheKey, retry, onSuccess, onError]
  );

  const fetch = useCallback(() => fetchWithRetry(false), [fetchWithRetry]);
  const refresh = useCallback(() => fetchWithRetry(true), [fetchWithRetry]);

  const mutate = useCallback(
    (newData: T | ((prev: T | undefined) => T)) => {
      const updatedData =
        typeof newData === 'function'
          ? (newData as (prev: T | undefined) => T)(data)
          : newData;

      setData(updatedData);

      // Update cache
      if (cacheKey) {
        cache.set(cacheKey, { data: updatedData, timestamp: Date.now() });
      }
    },
    [data, cacheKey]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setLoadingState(LoadingState.Idle);
    setError(null);
    if (cacheKey) {
      cache.delete(cacheKey);
    }
  }, [initialData, cacheKey]);

  // Fetch on mount if immediate
  useEffect(() => {
    if (immediate) {
      fetch();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [immediate]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    loadingState,
    error,
    isLoading: loadingState === LoadingState.Loading,
    isRefreshing:
      loadingState === LoadingState.Refreshing ||
      loadingState === LoadingState.Revalidating,
    isSuccess: loadingState === LoadingState.Success,
    isError: loadingState === LoadingState.Error,
    fetch,
    refresh,
    mutate,
    reset,
  };
}

/**
 * Helper to clear cache
 */
export function clearCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Helper to get cache size
 */
export function getCacheSize(): number {
  return cache.size;
}
