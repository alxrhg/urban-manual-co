// Performance tracking (Core Web Vitals)
export {
  trackWebVitals,
  measurePerformance,
  trackApiPerformance,
  observeResourceTiming,
  type PerformanceMetricData,
} from './performance';

// Event tracking
export {
  trackEvent,
  trackPageView,
  trackDestinationView,
  trackDestinationSave,
  trackDestinationRemove,
  trackSearch,
  trackAISearch,
  trackTripCreated,
  trackTripShared,
  trackPlaceAddedToTrip,
  trackFilterApplied,
  trackExternalLinkClick,
  trackError,
  trackMapInteraction,
  trackOnboardingStep,
  getSessionId,
  type AnalyticsEvent,
} from './events';
