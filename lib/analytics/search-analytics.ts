/**
 * Search Analytics Service
 *
 * Comprehensive tracking for search quality, filter usage, and user engagement.
 * This module provides detailed analytics for:
 * - Search queries (including zero-result searches)
 * - Filter applications and combinations
 * - Destination engagement and popularity
 * - Conversion events (trip creates, shares, exports)
 */

// ============================================
// TYPES
// ============================================

export interface SearchAnalyticsEvent {
  query: string;
  resultCount: number;
  filters?: SearchFilters;
  timestamp: Date;
  sessionId: string;
  source?: 'search_bar' | 'chat' | 'filter' | 'suggestion' | 'voice';
  responseTimeMs?: number;
  page?: number;
}

export interface SearchFilters {
  city?: string;
  category?: string;
  michelin?: boolean;
  crown?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  openNow?: boolean;
  sortBy?: string;
}

export interface FilterAnalyticsEvent {
  filterType: string;
  filterValue: string | number | boolean;
  action: 'apply' | 'remove' | 'clear_all';
  activeFilters: SearchFilters;
  resultCountBefore?: number;
  resultCountAfter?: number;
}

export interface DestinationEngagementEvent {
  destinationSlug: string;
  destinationId?: number;
  action: 'view' | 'click' | 'hover' | 'save' | 'unsave' | 'share' | 'external_link';
  position?: number; // Position in search results
  source: 'search' | 'recommendation' | 'browse' | 'map' | 'trip' | 'collection';
  searchQuery?: string;
  category?: string;
  city?: string;
}

export interface ConversionEvent {
  type: 'trip_create' | 'trip_save' | 'trip_share' | 'trip_export' | 'itinerary_add' | 'account_create';
  metadata?: Record<string, unknown>;
}

// ============================================
// SESSION MANAGEMENT
// ============================================

function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('search_analytics_session');
  if (!sessionId) {
    sessionId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('search_analytics_session', sessionId);
  }
  return sessionId;
}

function getOrCreateAnalyticsId(): string {
  if (typeof window === 'undefined') return '';

  let analyticsId = localStorage.getItem('um_analytics_id');
  if (!analyticsId) {
    analyticsId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
    localStorage.setItem('um_analytics_id', analyticsId);
  }
  return analyticsId;
}

// ============================================
// GTAG INTEGRATION
// ============================================

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function sendToGtag(eventName: string, params: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.gtag) return;

  try {
    window.gtag('event', eventName, params);
  } catch (error) {
    console.warn('[SearchAnalytics] gtag error:', error);
  }
}

// ============================================
// BEHAVIOR API INTEGRATION
// ============================================

async function sendToBehaviorAPI(events: Array<{
  event_type: string;
  destination_slug?: string;
  destination_id?: number;
  timestamp: string;
  context: Record<string, unknown>;
}>): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    await fetch('/api/behavior/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
  } catch (error) {
    console.warn('[SearchAnalytics] Behavior API error:', error);
  }
}

// ============================================
// SEARCH TRACKING
// ============================================

/**
 * Track a search query with results
 * Captures: query text, result count, filters applied, response time
 * Special handling for zero-result searches to identify quality issues
 */
export function trackSearch(event: SearchAnalyticsEvent): void {
  const sessionId = getSessionId();
  const analyticsId = getOrCreateAnalyticsId();
  const isZeroResults = event.resultCount === 0;

  // Send to Google Analytics
  sendToGtag('search', {
    search_term: event.query,
    results_count: event.resultCount,
    is_zero_results: isZeroResults,
    source: event.source || 'search_bar',
    response_time_ms: event.responseTimeMs,
    has_filters: Boolean(event.filters && Object.keys(event.filters).some(k =>
      event.filters![k as keyof SearchFilters] !== undefined
    )),
    page: event.page || 1,
  });

  // Track zero-result searches separately for quality monitoring
  if (isZeroResults) {
    sendToGtag('zero_result_search', {
      search_term: event.query,
      filters_applied: JSON.stringify(event.filters || {}),
      source: event.source,
    });
  }

  // Send to behavior tracking API
  sendToBehaviorAPI([{
    event_type: isZeroResults ? 'search_zero_results' : 'search_query',
    timestamp: event.timestamp.toISOString(),
    context: {
      search_query: event.query,
      result_count: event.resultCount,
      is_zero_results: isZeroResults,
      filters: event.filters,
      source: event.source,
      response_time_ms: event.responseTimeMs,
      page: event.page,
      session_id: sessionId,
      analytics_id: analyticsId,
      page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    },
  }]);
}

/**
 * Track a search with results - simplified version for common use
 */
export function trackSearchResults(
  query: string,
  resultCount: number,
  options?: {
    filters?: SearchFilters;
    source?: SearchAnalyticsEvent['source'];
    responseTimeMs?: number;
    page?: number;
  }
): void {
  trackSearch({
    query,
    resultCount,
    filters: options?.filters,
    source: options?.source,
    responseTimeMs: options?.responseTimeMs,
    page: options?.page,
    timestamp: new Date(),
    sessionId: getSessionId(),
  });
}

/**
 * Track zero-result searches specifically for quality monitoring
 */
export function trackZeroResultSearch(
  query: string,
  filters?: SearchFilters,
  source?: SearchAnalyticsEvent['source']
): void {
  trackSearch({
    query,
    resultCount: 0,
    filters,
    source,
    timestamp: new Date(),
    sessionId: getSessionId(),
  });
}

// ============================================
// FILTER TRACKING
// ============================================

/**
 * Track filter application/removal
 * Captures: which filters are used most, filter combinations, impact on results
 */
export function trackFilterChange(event: FilterAnalyticsEvent): void {
  const sessionId = getSessionId();

  // Send to Google Analytics
  sendToGtag('filter_change', {
    filter_type: event.filterType,
    filter_value: String(event.filterValue),
    action: event.action,
    active_filter_count: Object.keys(event.activeFilters).filter(k =>
      event.activeFilters[k as keyof SearchFilters] !== undefined
    ).length,
    result_count_change: event.resultCountAfter !== undefined && event.resultCountBefore !== undefined
      ? event.resultCountAfter - event.resultCountBefore
      : undefined,
  });

  // Send to behavior tracking API
  sendToBehaviorAPI([{
    event_type: 'filter_apply',
    timestamp: new Date().toISOString(),
    context: {
      filter_type: event.filterType,
      filter_value: event.filterValue,
      action: event.action,
      active_filters: event.activeFilters,
      result_count_before: event.resultCountBefore,
      result_count_after: event.resultCountAfter,
      session_id: sessionId,
      page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    },
  }]);
}

/**
 * Track when all filters are cleared
 */
export function trackClearAllFilters(previousFilters: SearchFilters): void {
  const filterCount = Object.keys(previousFilters).filter(k =>
    previousFilters[k as keyof SearchFilters] !== undefined
  ).length;

  sendToGtag('clear_all_filters', {
    filter_count_cleared: filterCount,
    filters_cleared: JSON.stringify(previousFilters),
  });

  trackFilterChange({
    filterType: 'all',
    filterValue: 'cleared',
    action: 'clear_all',
    activeFilters: {},
  });
}

// ============================================
// DESTINATION ENGAGEMENT TRACKING
// ============================================

/**
 * Track destination engagement (views, clicks, saves, etc.)
 */
export function trackDestinationEngagement(event: DestinationEngagementEvent): void {
  const sessionId = getSessionId();

  // Map action to GA event name
  const gaEventMap: Record<string, string> = {
    view: 'destination_view',
    click: 'destination_click',
    hover: 'destination_hover',
    save: 'destination_save',
    unsave: 'destination_unsave',
    share: 'destination_share',
    external_link: 'destination_external_click',
  };

  sendToGtag(gaEventMap[event.action] || 'destination_action', {
    destination_slug: event.destinationSlug,
    destination_id: event.destinationId,
    action: event.action,
    position: event.position,
    source: event.source,
    search_term: event.searchQuery,
    category: event.category,
    city: event.city,
  });

  // Send to behavior tracking API
  sendToBehaviorAPI([{
    event_type: `destination_${event.action}`,
    destination_slug: event.destinationSlug,
    destination_id: event.destinationId,
    timestamp: new Date().toISOString(),
    context: {
      search_result_position: event.position,
      source: event.source,
      search_query: event.searchQuery,
      destination_category: event.category,
      destination_city: event.city,
      session_id: sessionId,
      page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    },
  }]);
}

/**
 * Track destination click from search results
 */
export function trackSearchResultClick(
  destinationSlug: string,
  position: number,
  searchQuery: string,
  destinationId?: number
): void {
  trackDestinationEngagement({
    destinationSlug,
    destinationId,
    action: 'click',
    position,
    source: 'search',
    searchQuery,
  });
}

// ============================================
// CONVERSION TRACKING
// ============================================

/**
 * Track conversion events (trip creates, saves, shares, exports)
 * These are key business metrics for measuring user engagement
 */
export function trackConversion(event: ConversionEvent): void {
  const sessionId = getSessionId();
  const analyticsId = getOrCreateAnalyticsId();

  // Send to Google Analytics with proper conversion tracking
  sendToGtag('conversion', {
    conversion_type: event.type,
    ...event.metadata,
  });

  // Also send as a specific event for easier filtering
  sendToGtag(event.type, {
    ...event.metadata,
    session_id: sessionId,
  });

  // Send to behavior tracking API
  sendToBehaviorAPI([{
    event_type: event.type,
    timestamp: new Date().toISOString(),
    context: {
      conversion_type: event.type,
      metadata: event.metadata,
      session_id: sessionId,
      analytics_id: analyticsId,
      page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    },
  }]);
}

/**
 * Track trip creation
 */
export function trackTripCreate(tripData: {
  city: string;
  days: number;
  itemCount?: number;
  source?: 'manual' | 'ai_generated' | 'template';
}): void {
  trackConversion({
    type: 'trip_create',
    metadata: {
      city: tripData.city,
      trip_days: tripData.days,
      item_count: tripData.itemCount || 0,
      creation_source: tripData.source || 'manual',
    },
  });
}

/**
 * Track trip save
 */
export function trackTripSave(tripData: {
  tripId: string;
  city: string;
  days: number;
  itemCount: number;
  isFirstSave: boolean;
}): void {
  trackConversion({
    type: 'trip_save',
    metadata: {
      trip_id: tripData.tripId,
      city: tripData.city,
      trip_days: tripData.days,
      item_count: tripData.itemCount,
      is_first_save: tripData.isFirstSave,
    },
  });
}

/**
 * Track trip share
 */
export function trackTripShare(tripData: {
  tripId?: string;
  city: string;
  shareMethod: 'copy_link' | 'native_share' | 'social';
  platform?: string;
}): void {
  trackConversion({
    type: 'trip_share',
    metadata: {
      trip_id: tripData.tripId,
      city: tripData.city,
      share_method: tripData.shareMethod,
      platform: tripData.platform,
    },
  });
}

/**
 * Track trip export (PDF, calendar, etc.)
 */
export function trackTripExport(tripData: {
  tripId?: string;
  city: string;
  exportFormat: 'pdf' | 'ical' | 'google_calendar' | 'csv';
  itemCount: number;
}): void {
  trackConversion({
    type: 'trip_export',
    metadata: {
      trip_id: tripData.tripId,
      city: tripData.city,
      export_format: tripData.exportFormat,
      item_count: tripData.itemCount,
    },
  });
}

/**
 * Track adding item to itinerary
 */
export function trackItineraryAdd(data: {
  destinationSlug: string;
  destinationId?: number;
  city: string;
  category?: string;
  tripDay: number;
  source: 'search' | 'recommendation' | 'browse' | 'map';
}): void {
  trackConversion({
    type: 'itinerary_add',
    metadata: {
      destination_slug: data.destinationSlug,
      destination_id: data.destinationId,
      city: data.city,
      category: data.category,
      trip_day: data.tripDay,
      source: data.source,
    },
  });

  // Also track as destination engagement
  trackDestinationEngagement({
    destinationSlug: data.destinationSlug,
    destinationId: data.destinationId,
    action: 'save',
    source: data.source,
    category: data.category,
    city: data.city,
  });
}

// ============================================
// DROP-OFF / FUNNEL TRACKING
// ============================================

export type FunnelStep =
  | 'landing'
  | 'search_start'
  | 'search_results'
  | 'destination_view'
  | 'trip_start'
  | 'trip_add_first'
  | 'trip_add_multiple'
  | 'trip_save'
  | 'trip_share';

/**
 * Track funnel progression
 * Helps identify where users drop off in the conversion process
 */
export function trackFunnelStep(step: FunnelStep, metadata?: Record<string, unknown>): void {
  const sessionId = getSessionId();
  const analyticsId = getOrCreateAnalyticsId();

  // Store completed steps in session for funnel analysis
  const completedSteps = JSON.parse(sessionStorage.getItem('funnel_steps') || '[]') as string[];
  if (!completedSteps.includes(step)) {
    completedSteps.push(step);
    sessionStorage.setItem('funnel_steps', JSON.stringify(completedSteps));
  }

  sendToGtag('funnel_step', {
    step_name: step,
    step_number: completedSteps.length,
    previous_step: completedSteps.length > 1 ? completedSteps[completedSteps.length - 2] : undefined,
    ...metadata,
  });

  sendToBehaviorAPI([{
    event_type: 'funnel_step',
    timestamp: new Date().toISOString(),
    context: {
      step: step,
      step_number: completedSteps.length,
      completed_steps: completedSteps,
      metadata,
      session_id: sessionId,
      analytics_id: analyticsId,
      page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    },
  }]);
}

/**
 * Get current funnel progress for the session
 */
export function getFunnelProgress(): FunnelStep[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(sessionStorage.getItem('funnel_steps') || '[]') as FunnelStep[];
}

// ============================================
// SEARCH QUALITY METRICS
// ============================================

/**
 * Calculate and track search quality metrics
 * Called periodically to aggregate search quality data
 */
export function trackSearchQualityMetrics(metrics: {
  totalSearches: number;
  zeroResultSearches: number;
  averageResultCount: number;
  averageResponseTime: number;
  topQueries: Array<{ query: string; count: number }>;
  topZeroResultQueries: Array<{ query: string; count: number }>;
}): void {
  const zeroResultRate = metrics.totalSearches > 0
    ? (metrics.zeroResultSearches / metrics.totalSearches) * 100
    : 0;

  sendToGtag('search_quality_report', {
    total_searches: metrics.totalSearches,
    zero_result_searches: metrics.zeroResultSearches,
    zero_result_rate: zeroResultRate.toFixed(2),
    average_result_count: metrics.averageResultCount.toFixed(1),
    average_response_time_ms: metrics.averageResponseTime.toFixed(0),
  });
}

// ============================================
// UTILITY EXPORTS
// ============================================

export { getSessionId, getOrCreateAnalyticsId };
