/**
 * Analytics Module
 *
 * Centralized exports for all analytics functionality.
 * Import from '@/lib/analytics' for convenient access to all tracking functions.
 */

// Search analytics (client-side)
export {
  // Search tracking
  trackSearch,
  trackSearchResults,
  trackZeroResultSearch,

  // Filter tracking
  trackFilterChange,
  trackClearAllFilters,

  // Destination engagement
  trackDestinationEngagement,
  trackSearchResultClick,

  // Conversion tracking
  trackConversion,
  trackTripCreate,
  trackTripSave,
  trackTripShare,
  trackTripExport,
  trackItineraryAdd,

  // Funnel tracking
  trackFunnelStep,
  getFunnelProgress,

  // Search quality metrics
  trackSearchQualityMetrics,

  // Session utilities
  getSessionId,
  getOrCreateAnalyticsId,

  // Types
  type SearchAnalyticsEvent,
  type SearchFilters,
  type FilterAnalyticsEvent,
  type DestinationEngagementEvent,
  type ConversionEvent,
  type FunnelStep,
} from './search-analytics';

// Server-side analytics
export {
  trackServerSearch,
  trackServerConversion,
  trackServerFilterUsage,
  trackDestinationPopularity,
  type ServerSearchEvent,
  type ServerConversionEvent,
} from './server-analytics';

// Legacy tracking (for backwards compatibility)
export { trackEvent } from './track';

// User profile analytics
export * from './userProfile';

// Recommendation boost analytics
export * from './recommendationBoost';
