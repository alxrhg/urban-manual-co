/**
 * useSearchAnalytics Hook
 *
 * React hook for tracking search analytics in client components.
 * Provides easy-to-use functions for tracking searches, filters,
 * and destination interactions.
 */

import { useCallback, useRef } from 'react';
import {
  trackSearch,
  trackSearchResults,
  trackZeroResultSearch,
  trackFilterChange,
  trackClearAllFilters,
  trackDestinationEngagement,
  trackSearchResultClick,
  trackFunnelStep,
  type SearchFilters,
  type SearchAnalyticsEvent,
  type FilterAnalyticsEvent,
  type DestinationEngagementEvent,
  type FunnelStep,
} from '@/lib/analytics/search-analytics';

// ============================================
// TYPES
// ============================================

export interface UseSearchAnalyticsReturn {
  // Search tracking
  trackSearchQuery: (
    query: string,
    resultCount: number,
    options?: {
      filters?: SearchFilters;
      source?: SearchAnalyticsEvent['source'];
      responseTimeMs?: number;
      page?: number;
    }
  ) => void;
  trackZeroResults: (query: string, filters?: SearchFilters) => void;

  // Filter tracking
  trackFilterApply: (
    filterType: string,
    filterValue: string | number | boolean,
    activeFilters: SearchFilters,
    resultCountAfter?: number
  ) => void;
  trackFilterRemove: (
    filterType: string,
    filterValue: string | number | boolean,
    activeFilters: SearchFilters
  ) => void;
  trackFiltersClear: (previousFilters: SearchFilters) => void;

  // Destination engagement
  trackDestinationView: (
    slug: string,
    options?: {
      id?: number;
      position?: number;
      source?: DestinationEngagementEvent['source'];
      searchQuery?: string;
      category?: string;
      city?: string;
    }
  ) => void;
  trackDestinationClick: (
    slug: string,
    position: number,
    searchQuery?: string,
    id?: number
  ) => void;
  trackDestinationSave: (
    slug: string,
    id?: number,
    options?: {
      category?: string;
      city?: string;
      source?: DestinationEngagementEvent['source'];
    }
  ) => void;
  trackDestinationShare: (
    slug: string,
    id?: number
  ) => void;

  // Funnel tracking
  trackFunnel: (step: FunnelStep, metadata?: Record<string, unknown>) => void;

  // Timing helpers
  startSearchTimer: () => void;
  getSearchDuration: () => number;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useSearchAnalytics(): UseSearchAnalyticsReturn {
  const searchStartTimeRef = useRef<number>(0);
  const lastResultCountRef = useRef<number>(0);

  // ==========================================
  // TIMING HELPERS
  // ==========================================

  const startSearchTimer = useCallback(() => {
    searchStartTimeRef.current = Date.now();
  }, []);

  const getSearchDuration = useCallback(() => {
    if (searchStartTimeRef.current === 0) return 0;
    return Date.now() - searchStartTimeRef.current;
  }, []);

  // ==========================================
  // SEARCH TRACKING
  // ==========================================

  const trackSearchQuery = useCallback((
    query: string,
    resultCount: number,
    options?: {
      filters?: SearchFilters;
      source?: SearchAnalyticsEvent['source'];
      responseTimeMs?: number;
      page?: number;
    }
  ) => {
    lastResultCountRef.current = resultCount;
    const responseTime = options?.responseTimeMs ?? getSearchDuration();

    trackSearchResults(query, resultCount, {
      filters: options?.filters,
      source: options?.source,
      responseTimeMs: responseTime,
      page: options?.page,
    });
  }, [getSearchDuration]);

  const trackZeroResults = useCallback((query: string, filters?: SearchFilters) => {
    lastResultCountRef.current = 0;
    trackZeroResultSearch(query, filters);
  }, []);

  // ==========================================
  // FILTER TRACKING
  // ==========================================

  const trackFilterApply = useCallback((
    filterType: string,
    filterValue: string | number | boolean,
    activeFilters: SearchFilters,
    resultCountAfter?: number
  ) => {
    trackFilterChange({
      filterType,
      filterValue,
      action: 'apply',
      activeFilters,
      resultCountBefore: lastResultCountRef.current,
      resultCountAfter,
    });

    if (resultCountAfter !== undefined) {
      lastResultCountRef.current = resultCountAfter;
    }
  }, []);

  const trackFilterRemove = useCallback((
    filterType: string,
    filterValue: string | number | boolean,
    activeFilters: SearchFilters
  ) => {
    trackFilterChange({
      filterType,
      filterValue,
      action: 'remove',
      activeFilters,
      resultCountBefore: lastResultCountRef.current,
    });
  }, []);

  const trackFiltersClear = useCallback((previousFilters: SearchFilters) => {
    trackClearAllFilters(previousFilters);
    lastResultCountRef.current = 0;
  }, []);

  // ==========================================
  // DESTINATION ENGAGEMENT
  // ==========================================

  const trackDestinationView = useCallback((
    slug: string,
    options?: {
      id?: number;
      position?: number;
      source?: DestinationEngagementEvent['source'];
      searchQuery?: string;
      category?: string;
      city?: string;
    }
  ) => {
    trackDestinationEngagement({
      destinationSlug: slug,
      destinationId: options?.id,
      action: 'view',
      position: options?.position,
      source: options?.source || 'browse',
      searchQuery: options?.searchQuery,
      category: options?.category,
      city: options?.city,
    });

    // Track funnel step
    trackFunnelStep('destination_view', { destination: slug });
  }, []);

  const trackDestinationClick = useCallback((
    slug: string,
    position: number,
    searchQuery?: string,
    id?: number
  ) => {
    trackSearchResultClick(slug, position, searchQuery || '', id);
  }, []);

  const trackDestinationSave = useCallback((
    slug: string,
    id?: number,
    options?: {
      category?: string;
      city?: string;
      source?: DestinationEngagementEvent['source'];
    }
  ) => {
    trackDestinationEngagement({
      destinationSlug: slug,
      destinationId: id,
      action: 'save',
      source: options?.source || 'browse',
      category: options?.category,
      city: options?.city,
    });
  }, []);

  const trackDestinationShare = useCallback((
    slug: string,
    id?: number
  ) => {
    trackDestinationEngagement({
      destinationSlug: slug,
      destinationId: id,
      action: 'share',
      source: 'browse',
    });
  }, []);

  // ==========================================
  // FUNNEL TRACKING
  // ==========================================

  const trackFunnel = useCallback((step: FunnelStep, metadata?: Record<string, unknown>) => {
    trackFunnelStep(step, metadata);
  }, []);

  // ==========================================
  // RETURN
  // ==========================================

  return {
    // Search tracking
    trackSearchQuery,
    trackZeroResults,

    // Filter tracking
    trackFilterApply,
    trackFilterRemove,
    trackFiltersClear,

    // Destination engagement
    trackDestinationView,
    trackDestinationClick,
    trackDestinationSave,
    trackDestinationShare,

    // Funnel tracking
    trackFunnel,

    // Timing helpers
    startSearchTimer,
    getSearchDuration,
  };
}

export default useSearchAnalytics;
