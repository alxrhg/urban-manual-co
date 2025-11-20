import { useState, useCallback } from 'react';
import { Destination } from '@/types/destination';

interface UseDestinationLoadingReturn {
  isLoading: boolean;
  loadingDestinations: Set<string>;
  startLoading: (slugs: string[]) => void;
  finishLoading: (slug: string) => void;
  finishAllLoading: () => void;
  isDestinationLoading: (slug: string) => boolean;
}

/**
 * Shared loading state hook for destinations
 * Used by both grid and map views to coordinate loading states
 */
export function useDestinationLoading(): UseDestinationLoadingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDestinations, setLoadingDestinations] = useState<Set<string>>(new Set());

  const startLoading = useCallback((slugs: string[]) => {
    setIsLoading(true);
    setLoadingDestinations(prev => {
      const next = new Set(prev);
      slugs.forEach(slug => next.add(slug));
      return next;
    });
  }, []);

  const finishLoading = useCallback((slug: string) => {
    setLoadingDestinations(prev => {
      const next = new Set(prev);
      next.delete(slug);
      if (next.size === 0) {
        setIsLoading(false);
      }
      return next;
    });
  }, []);

  const finishAllLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingDestinations(new Set());
  }, []);

  const isDestinationLoading = useCallback((slug: string) => {
    return loadingDestinations.has(slug);
  }, [loadingDestinations]);

  return {
    isLoading,
    loadingDestinations,
    startLoading,
    finishLoading,
    finishAllLoading,
    isDestinationLoading,
  };
}

