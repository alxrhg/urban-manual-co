/**
 * Feed Hook
 * Manages feed state and infinite scrolling
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface FeedCard {
  destination_id: number;
  destination: any;
  score: number;
  reason: string;
  position: number;
  factors?: {
    personalization?: number;
    quality?: number;
    collaborative?: number;
    popularity?: number;
    freshness?: number;
  };
}

export function useFeed() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<FeedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const BATCH_SIZE = 10;

  const loadFeed = useCallback(
    async (isRefresh = false) => {
      if (!user) {
        setError('Please sign in to see your personalized feed');
        return;
      }

      if (loading) return;

      setLoading(true);
      setError(null);

      try {
        const currentOffset = isRefresh ? 0 : offset;

        const response = await fetch(
          `/api/feed/for-you?limit=${BATCH_SIZE}&offset=${currentOffset}`
        );

        if (!response.ok) {
          throw new Error('Failed to load feed');
        }

        const data = await response.json();

        if (isRefresh) {
          setFeed(data.feed || []);
          setOffset(BATCH_SIZE);
          setHasMore((data.feed || []).length === BATCH_SIZE);
        } else {
          setFeed(prev => [...prev, ...(data.feed || [])]);
          setOffset(prev => prev + BATCH_SIZE);
          setHasMore((data.feed || []).length === BATCH_SIZE);
        }
      } catch (err: any) {
        console.error('Error loading feed:', err);
        setError(err.message || 'Failed to load feed');
      } finally {
        setLoading(false);
      }
    },
    [user, loading, offset]
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadFeed(false);
    }
  }, [loading, hasMore, loadFeed]);

  const refresh = useCallback(() => {
    loadFeed(true);
  }, [loadFeed]);

  // Initial load
  useEffect(() => {
    if (user && feed.length === 0 && !loading) {
      loadFeed(true);
    }
  }, [user]); // Only run when user changes

  return {
    feed,
    loading,
    hasMore,
    error,
    loadMore,
    refresh,
  };
}
