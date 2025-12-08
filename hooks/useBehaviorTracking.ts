/**
 * Behavior Tracking Hook
 *
 * Collects user behavior signals for the intelligence algorithms.
 * Captures: dwell time, scroll depth, clicks, hovers, and more.
 *
 * These signals feed into TasteDNA and other algorithms to learn
 * user preferences over time.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// TYPES
// ============================================

export interface BehaviorEvent {
  event_type: EventType;
  destination_slug?: string;
  destination_id?: number;
  timestamp: Date;
  context: EventContext;
}

export type EventType =
  | 'page_view'
  | 'destination_view'
  | 'destination_click'
  | 'destination_hover'
  | 'destination_save'
  | 'destination_unsave'
  | 'search_query'
  | 'search_result_click'
  | 'scroll_depth'
  | 'dwell_time'
  | 'chat_message'
  | 'itinerary_create'
  | 'itinerary_add'
  | 'filter_apply'
  | 'map_interaction';

export interface EventContext {
  // Page context
  page_path?: string;
  referrer?: string;

  // Scroll tracking
  scroll_depth_percent?: number;
  max_scroll_depth?: number;

  // Dwell time (ms)
  dwell_time_ms?: number;

  // Search context
  search_query?: string;
  search_result_position?: number;

  // Destination context
  destination_category?: string;
  destination_city?: string;
  destination_price_level?: number;

  // Session context
  session_id?: string;
  time_of_day?: string;
  day_of_week?: number;

  // Device context
  viewport_width?: number;
  viewport_height?: number;
  is_mobile?: boolean;

  // Interaction details
  element_id?: string;
  click_position?: { x: number; y: number };

  // Custom metadata
  metadata?: Record<string, any>;
}

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Batch events before sending
  BATCH_SIZE: 10,
  BATCH_INTERVAL_MS: 5000,

  // Dwell time thresholds
  DWELL_TIME_SHORT_MS: 3000,
  DWELL_TIME_MEDIUM_MS: 10000,
  DWELL_TIME_LONG_MS: 30000,

  // Scroll depth milestones
  SCROLL_MILESTONES: [25, 50, 75, 100],

  // Hover time before counting
  HOVER_THRESHOLD_MS: 500,

  // API endpoint
  API_ENDPOINT: '/api/behavior/track',
};

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useBehaviorTracking() {
  const { user } = useAuth();
  const eventQueueRef = useRef<BehaviorEvent[]>([]);
  const sessionIdRef = useRef<string>(generateSessionId());
  const pageLoadTimeRef = useRef<number>(Date.now());
  const maxScrollDepthRef = useRef<number>(0);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================
  // CORE TRACKING FUNCTION
  // ==========================================

  const trackEvent = useCallback((
    event_type: EventType,
    destination_slug?: string,
    destination_id?: number,
    additionalContext?: Partial<EventContext>
  ) => {
    const event: BehaviorEvent = {
      event_type,
      destination_slug,
      destination_id,
      timestamp: new Date(),
      context: {
        page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        session_id: sessionIdRef.current,
        time_of_day: getTimeOfDay(),
        day_of_week: new Date().getDay(),
        viewport_width: typeof window !== 'undefined' ? window.innerWidth : undefined,
        viewport_height: typeof window !== 'undefined' ? window.innerHeight : undefined,
        is_mobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
        ...additionalContext,
      },
    };

    eventQueueRef.current.push(event);

    // Flush if batch is full
    if (eventQueueRef.current.length >= CONFIG.BATCH_SIZE) {
      flushEvents();
    }
  }, []);

  // ==========================================
  // FLUSH EVENTS TO SERVER
  // ==========================================

  const flushEvents = useCallback(async () => {
    if (eventQueueRef.current.length === 0) return;

    const events = [...eventQueueRef.current];
    eventQueueRef.current = [];

    try {
      await fetch(CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          events,
        }),
      });
    } catch (error) {
      // Put events back in queue on failure
      eventQueueRef.current = [...events, ...eventQueueRef.current];
      console.warn('[BehaviorTracking] Failed to send events:', error);
    }
  }, [user?.id]);

  // ==========================================
  // SPECIALIZED TRACKING FUNCTIONS
  // ==========================================

  /**
   * Track destination view (card or detail page)
   */
  const trackDestinationView = useCallback((
    destination_slug: string,
    destination_id?: number,
    context?: {
      category?: string;
      city?: string;
      price_level?: number;
      source?: 'search' | 'recommendation' | 'browse' | 'map';
    }
  ) => {
    trackEvent('destination_view', destination_slug, destination_id, {
      destination_category: context?.category,
      destination_city: context?.city,
      destination_price_level: context?.price_level,
      metadata: { source: context?.source },
    });
  }, [trackEvent]);

  /**
   * Track destination click (opening detail)
   */
  const trackDestinationClick = useCallback((
    destination_slug: string,
    destination_id?: number,
    position?: number
  ) => {
    trackEvent('destination_click', destination_slug, destination_id, {
      search_result_position: position,
    });
  }, [trackEvent]);

  /**
   * Track destination hover (interest signal)
   */
  const trackDestinationHover = useCallback((
    destination_slug: string,
    destination_id?: number
  ) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Only track if hover lasts > threshold
    hoverTimeoutRef.current = setTimeout(() => {
      trackEvent('destination_hover', destination_slug, destination_id);
    }, CONFIG.HOVER_THRESHOLD_MS);
  }, [trackEvent]);

  /**
   * Cancel hover tracking (mouse left)
   */
  const cancelHoverTracking = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  /**
   * Track save/unsave action
   */
  const trackSave = useCallback((
    destination_slug: string,
    destination_id?: number,
    isSave: boolean = true
  ) => {
    trackEvent(
      isSave ? 'destination_save' : 'destination_unsave',
      destination_slug,
      destination_id
    );
  }, [trackEvent]);

  /**
   * Track search query
   */
  const trackSearch = useCallback((query: string) => {
    trackEvent('search_query', undefined, undefined, {
      search_query: query,
    });
  }, [trackEvent]);

  /**
   * Track search result click
   */
  const trackSearchResultClick = useCallback((
    destination_slug: string,
    destination_id: number | undefined,
    query: string,
    position: number
  ) => {
    trackEvent('search_result_click', destination_slug, destination_id, {
      search_query: query,
      search_result_position: position,
    });
  }, [trackEvent]);

  /**
   * Track scroll depth (call periodically)
   */
  const trackScrollDepth = useCallback((scrollPercent: number) => {
    // Only track if we've passed a milestone
    const milestone = CONFIG.SCROLL_MILESTONES.find(
      m => scrollPercent >= m && maxScrollDepthRef.current < m
    );

    if (milestone) {
      maxScrollDepthRef.current = milestone;
      trackEvent('scroll_depth', undefined, undefined, {
        scroll_depth_percent: milestone,
        max_scroll_depth: maxScrollDepthRef.current,
      });
    }
  }, [trackEvent]);

  /**
   * Track dwell time (call on page leave)
   */
  const trackDwellTime = useCallback((destination_slug?: string) => {
    const dwellTime = Date.now() - pageLoadTimeRef.current;

    trackEvent('dwell_time', destination_slug, undefined, {
      dwell_time_ms: dwellTime,
      max_scroll_depth: maxScrollDepthRef.current,
    });
  }, [trackEvent]);

  /**
   * Track chat message
   */
  const trackChatMessage = useCallback((
    message: string,
    intent?: string
  ) => {
    trackEvent('chat_message', undefined, undefined, {
      metadata: {
        message_length: message.length,
        intent,
      },
    });
  }, [trackEvent]);

  /**
   * Track filter application
   */
  const trackFilter = useCallback((filters: Record<string, any>) => {
    trackEvent('filter_apply', undefined, undefined, {
      metadata: { filters },
    });
  }, [trackEvent]);

  // ==========================================
  // AUTO-TRACKING SETUP
  // ==========================================

  useEffect(() => {
    // Flush events periodically
    const flushInterval = setInterval(flushEvents, CONFIG.BATCH_INTERVAL_MS);

    // Track scroll depth
    const handleScroll = () => {
      if (typeof window === 'undefined') return;
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      trackScrollDepth(scrollPercent);
    };

    // Track dwell time on page leave
    const handleBeforeUnload = () => {
      trackDwellTime();
      flushEvents();
    };

    // Track visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackDwellTime();
        flushEvents();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(flushInterval);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushEvents();
    };
  }, [flushEvents, trackDwellTime, trackScrollDepth]);

  // Reset page load time and scroll depth on route change
  useEffect(() => {
    pageLoadTimeRef.current = Date.now();
    maxScrollDepthRef.current = 0;
  }, [typeof window !== 'undefined' ? window.location.pathname : '']);

  // ==========================================
  // RETURN PUBLIC API
  // ==========================================

  return {
    // Core
    trackEvent,
    flushEvents,

    // Destination tracking
    trackDestinationView,
    trackDestinationClick,
    trackDestinationHover,
    cancelHoverTracking,
    trackSave,

    // Search tracking
    trackSearch,
    trackSearchResultClick,

    // Engagement tracking
    trackScrollDepth,
    trackDwellTime,

    // Other
    trackChatMessage,
    trackFilter,

    // Session info
    sessionId: sessionIdRef.current,
  };
}

// ============================================
// HELPERS
// ============================================

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

// ============================================
// EXPORT TYPE FOR USE IN COMPONENTS
// ============================================

export type BehaviorTrackingHook = ReturnType<typeof useBehaviorTracking>;
