/**
 * Quality Telemetry Client
 *
 * Tracks recommendation quality signals for scientific iteration:
 * - CTR on chips (views vs clicks)
 * - Save actions with recommendation attribution
 * - Add-to-trip actions with context
 * - Undo rates for quality measurement
 */

import type {
  QualityEvent,
  QualityEventType,
  QualitySourceType,
  RecommendationSource,
  QualityPageContext,
  QualityFeatureContext,
  RecommendationContext,
} from '@/lib/intelligence/types';

// ============================================
// SESSION MANAGEMENT
// ============================================

function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = localStorage.getItem('um_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('um_session_id', sessionId);
  }
  return sessionId;
}

// ============================================
// EVENT QUEUE (batching for efficiency)
// ============================================

let eventQueue: QualityEvent[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 2000; // 2 seconds
const MAX_QUEUE_SIZE = 20;

function scheduleFlush() {
  if (flushTimeout) return;

  flushTimeout = setTimeout(() => {
    flushEvents();
    flushTimeout = null;
  }, FLUSH_INTERVAL);
}

async function flushEvents() {
  if (eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue = [];

  try {
    await fetch('/api/quality/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getSessionId(),
        events,
      }),
    });
  } catch (error) {
    console.warn('[Quality Telemetry] Failed to send events:', error);
    // Re-queue failed events (limit to prevent memory issues)
    eventQueue = [...events.slice(0, 10), ...eventQueue].slice(0, MAX_QUEUE_SIZE);
  }
}

function queueEvent(event: QualityEvent) {
  eventQueue.push(event);

  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEvents();
  } else {
    scheduleFlush();
  }
}

// ============================================
// TRACKING FUNCTIONS
// ============================================

/**
 * Track chip view (for CTR calculation)
 */
export function trackChipView(params: {
  sourceType: QualitySourceType;
  sourceId: string;
  sourceLabel: string;
  position?: number;
  totalItems?: number;
  pageContext?: QualityPageContext;
  featureContext?: QualityFeatureContext;
  recommendationSource?: RecommendationSource;
}) {
  if (typeof window === 'undefined') return;

  queueEvent({
    eventType: 'chip_view',
    ...params,
  });
}

/**
 * Track chip click
 */
export function trackChipClick(params: {
  sourceType: QualitySourceType;
  sourceId: string;
  sourceLabel: string;
  position?: number;
  totalItems?: number;
  pageContext?: QualityPageContext;
  featureContext?: QualityFeatureContext;
  recommendationSource?: RecommendationSource;
  destinationSlug?: string;
  destinationId?: number;
  destinationCategory?: string;
}) {
  if (typeof window === 'undefined') return;

  queueEvent({
    eventType: 'chip_click',
    ...params,
  });
}

/**
 * Track chip removal
 */
export function trackChipRemove(params: {
  sourceType: QualitySourceType;
  sourceId: string;
  sourceLabel: string;
  pageContext?: QualityPageContext;
  featureContext?: QualityFeatureContext;
}) {
  if (typeof window === 'undefined') return;

  queueEvent({
    eventType: 'chip_remove',
    ...params,
  });
}

/**
 * Track save action with recommendation attribution
 */
export function trackSave(params: {
  destinationSlug: string;
  destinationId?: number;
  destinationCategory?: string;
  pageContext?: QualityPageContext;
  featureContext?: QualityFeatureContext;
  recommendationSource?: RecommendationSource;
  recommendationScore?: number;
  position?: number;
  metadata?: Record<string, unknown>;
}) {
  if (typeof window === 'undefined') return;

  queueEvent({
    eventType: 'save',
    sourceType: 'recommendation',
    ...params,
  });

  // Flush immediately for important actions
  flushEvents();
}

/**
 * Track add-to-trip action with context
 */
export function trackAddToTrip(params: {
  destinationSlug: string;
  destinationId?: number;
  destinationCategory?: string;
  pageContext?: QualityPageContext;
  featureContext?: QualityFeatureContext;
  recommendationSource?: RecommendationSource;
  recommendationScore?: number;
  position?: number;
  metadata?: Record<string, unknown>;
}) {
  if (typeof window === 'undefined') return;

  queueEvent({
    eventType: 'add_to_trip',
    sourceType: 'recommendation',
    ...params,
  });

  // Flush immediately for important actions
  flushEvents();
}

/**
 * Track undo action (negative signal)
 */
export function trackUndo(params: {
  originalAction: 'save' | 'add_to_trip';
  destinationSlug?: string;
  destinationId?: number;
  pageContext?: QualityPageContext;
  recommendationSource?: RecommendationSource;
}) {
  if (typeof window === 'undefined') return;

  queueEvent({
    eventType: 'undo',
    resultType: 'reversed',
    destinationSlug: params.destinationSlug,
    destinationId: params.destinationId,
    pageContext: params.pageContext,
    recommendationSource: params.recommendationSource,
    metadata: {
      original_action: params.originalAction,
    },
  });

  // Flush immediately
  flushEvents();
}

// ============================================
// CONTEXT MANAGEMENT
// ============================================

/**
 * Store recommendation context for later attribution
 * Uses sessionStorage to persist across navigations
 */
export function setRecommendationContext(
  destinationSlug: string,
  context: RecommendationContext
) {
  if (typeof window === 'undefined') return;

  try {
    const key = `rec_ctx_${destinationSlug}`;
    sessionStorage.setItem(key, JSON.stringify({
      ...context,
      timestamp: Date.now(),
    }));
  } catch (e) {
    // Ignore storage errors
  }
}

/**
 * Get stored recommendation context
 */
export function getRecommendationContext(
  destinationSlug: string
): RecommendationContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = `rec_ctx_${destinationSlug}`;
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;

    const context = JSON.parse(stored);

    // Expire after 30 minutes
    if (Date.now() - context.timestamp > 30 * 60 * 1000) {
      sessionStorage.removeItem(key);
      return null;
    }

    return context;
  } catch (e) {
    return null;
  }
}

/**
 * Clear recommendation context
 */
export function clearRecommendationContext(destinationSlug: string) {
  if (typeof window === 'undefined') return;

  try {
    const key = `rec_ctx_${destinationSlug}`;
    sessionStorage.removeItem(key);
  } catch (e) {
    // Ignore
  }
}

// ============================================
// BATCH VIEW TRACKING (for lists)
// ============================================

/**
 * Track views for a list of chips/recommendations
 * Automatically assigns positions
 */
export function trackChipListView(params: {
  sourceType: QualitySourceType;
  items: Array<{ id: string; label: string }>;
  pageContext?: QualityPageContext;
  featureContext?: QualityFeatureContext;
  recommendationSource?: RecommendationSource;
}) {
  if (typeof window === 'undefined') return;

  const { items, ...common } = params;

  items.forEach((item, index) => {
    trackChipView({
      ...common,
      sourceId: item.id,
      sourceLabel: item.label,
      position: index,
      totalItems: items.length,
    });
  });
}

// ============================================
// HOOK FOR COMPONENTS
// ============================================

/**
 * Create tracked click handler for chips
 * Wraps the original onClick with tracking
 */
export function createTrackedChipClick(
  originalOnClick: (() => void) | undefined,
  trackingParams: Parameters<typeof trackChipClick>[0]
): () => void {
  return () => {
    trackChipClick(trackingParams);
    originalOnClick?.();
  };
}

/**
 * Create tracked remove handler for chips
 */
export function createTrackedChipRemove(
  originalOnRemove: (() => void) | undefined,
  trackingParams: Parameters<typeof trackChipRemove>[0]
): () => void {
  return () => {
    trackChipRemove(trackingParams);
    originalOnRemove?.();
  };
}

// ============================================
// UTILITY
// ============================================

/**
 * Force flush any pending events (call before navigation)
 */
export function flushQualityEvents() {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  flushEvents();
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushQualityEvents);
  window.addEventListener('pagehide', flushQualityEvents);
}
