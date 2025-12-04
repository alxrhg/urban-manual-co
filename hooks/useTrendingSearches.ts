/**
 * useTrendingSearches Hook
 *
 * Fetches trending search queries from the API.
 * Caches results for 5 minutes to reduce API calls.
 */

import { useEffect, useState, useCallback } from 'react';

export interface TrendingSearch {
  query: string;
  count: number;
}

interface UseTrendingSearchesOptions {
  limit?: number;
  days?: number;
  enabled?: boolean;
}

const CACHE_KEY = 'trendingSearches';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  trending: TrendingSearch[];
  timestamp: number;
}

export function useTrendingSearches(options: UseTrendingSearchesOptions = {}) {
  const { limit = 5, days = 7, enabled = true } = options;

  const [trending, setTrending] = useState<TrendingSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTrending = useCallback(async () => {
    if (!enabled) return;

    // Check cache first
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: CachedData = JSON.parse(cached);
        if (Date.now() - data.timestamp < CACHE_DURATION) {
          setTrending(data.trending.slice(0, limit));
          return;
        }
      }
    } catch {
      // Cache read failed, continue with fetch
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/search/trending?limit=${limit}&days=${days}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch trending searches');
      }

      const data = await response.json();
      const trendingData = data.trending || [];

      setTrending(trendingData);

      // Cache the result
      try {
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            trending: trendingData,
            timestamp: Date.now(),
          })
        );
      } catch {
        // Cache write failed, ignore
      }
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch trending searches:', err);
    } finally {
      setIsLoading(false);
    }
  }, [limit, days, enabled]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  return {
    trending,
    isLoading,
    error,
    refetch: fetchTrending,
  };
}
