/**
 * useRecentSearches Hook
 *
 * Manages recent search query history in localStorage.
 * Distinct from useRecentlyViewed which tracks viewed destinations.
 */

import { useEffect, useState, useCallback } from 'react';

export interface RecentSearch {
  query: string;
  timestamp: number;
  resultCount?: number;
  filters?: {
    city?: string;
    category?: string;
  };
}

const MAX_RECENT_SEARCHES = 10;
const STORAGE_KEY = 'recentSearches';

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentSearches(parsed);
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  }, []);

  const addSearch = useCallback(
    (
      query: string,
      options?: { resultCount?: number; filters?: { city?: string; category?: string } }
    ) => {
      if (!query.trim() || query.trim().length < 2) return;

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        let searches: RecentSearch[] = stored ? JSON.parse(stored) : [];

        // Remove duplicate queries (case-insensitive)
        searches = searches.filter(
          (s) => s.query.toLowerCase() !== query.toLowerCase().trim()
        );

        // Add new search at the beginning
        searches.unshift({
          query: query.trim(),
          timestamp: Date.now(),
          resultCount: options?.resultCount,
          filters: options?.filters,
        });

        // Keep only MAX_RECENT_SEARCHES
        searches = searches.slice(0, MAX_RECENT_SEARCHES);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
        setRecentSearches(searches);
      } catch (error) {
        console.error('Failed to add recent search:', error);
      }
    },
    []
  );

  const removeSearch = useCallback((query: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let searches: RecentSearch[] = stored ? JSON.parse(stored) : [];

      searches = searches.filter(
        (s) => s.query.toLowerCase() !== query.toLowerCase()
      );

      localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
      setRecentSearches(searches);
    } catch (error) {
      console.error('Failed to remove recent search:', error);
    }
  }, []);

  const clearSearches = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecentSearches([]);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  }, []);

  return {
    recentSearches,
    addSearch,
    removeSearch,
    clearSearches,
  };
}
