import { createClient } from '@supabase/supabase-js';
import type { UserInteraction } from '@/types/personalization';

type DestinationEventType = 'view' | 'save' | 'visited';

export interface DestinationTrackingEvent {
  type?: DestinationEventType;
  destinationId?: number;
  destinationSlug?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown> | null;
  context?: {
    source?: string;
    searchQuery?: string;
  } | null;
}

interface BatchedTrackingEvent extends DestinationTrackingEvent {
  destinationId?: number;
  destinationSlug?: string;
}

const TRACKING_ENDPOINT = '/api/profile/events';
const BATCH_SIZE = 15;
const DEBOUNCE_MS = 750;
const MAX_QUEUE_LENGTH = 120;

const pendingEvents: BatchedTrackingEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;
let isUnloadHandlerAttached = false;
let currentUserId: string | null = null;

function clearFlushTimer() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

async function flushTrackingQueue(): Promise<void> {
  if (isFlushing) {
    return;
  }

  if (pendingEvents.length === 0) {
    clearFlushTimer();
    return;
  }

  // Only attempt to flush in browser contexts
  if (typeof window === 'undefined') {
    return;
  }

  const eventsToSend = pendingEvents.splice(0, BATCH_SIZE);
  clearFlushTimer();
  isFlushing = true;

  try {
    await fetch(TRACKING_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ events: eventsToSend }),
    });
  } catch (error) {
    console.warn('[Tracking] Failed to persist events', error);
    // Requeue events at the front to retry later
    pendingEvents.unshift(...eventsToSend);
  } finally {
    isFlushing = false;
    if (pendingEvents.length > 0) {
      scheduleFlush();
    }
  }
}

function scheduleFlush(): void {
  if (pendingEvents.length === 0) {
    clearFlushTimer();
    return;
  }

  if (flushTimer) {
    return;
  }

  flushTimer = setTimeout(() => {
    flushTrackingQueue().catch((error) => {
      console.error('[Tracking] Flush error', error);
    });
  }, DEBOUNCE_MS);
}

function ensureUnloadHandler() {
  if (typeof window === 'undefined' || isUnloadHandlerAttached) {
    return;
  }

  const flushAndWait = () => {
    if (pendingEvents.length === 0) {
      return;
    }

    try {
      navigator.sendBeacon(
        TRACKING_ENDPOINT,
        JSON.stringify({ events: pendingEvents.splice(0, pendingEvents.length) }),
      );
    } catch (error) {
      console.debug('[Tracking] Beacon failed, falling back to synchronous flush', error);
      // Synchronously flush as a last resort
      fetch(TRACKING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        keepalive: true,
        body: JSON.stringify({ events: pendingEvents.splice(0, pendingEvents.length) }),
      }).catch(() => {
        // Ignore errors at this stage
      });
    }
  };

  window.addEventListener('beforeunload', flushAndWait);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAndWait();
    }
  });

  isUnloadHandlerAttached = true;
}

function enqueueTrackingEvent(event: BatchedTrackingEvent): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!currentUserId) {
    return;
  }

  ensureUnloadHandler();

  if (pendingEvents.length >= MAX_QUEUE_LENGTH) {
    pendingEvents.splice(0, pendingEvents.length - MAX_QUEUE_LENGTH + 1);
  }

  pendingEvents.push({ ...event, occurredAt: event.occurredAt ?? new Date().toISOString() });

  if (pendingEvents.length >= BATCH_SIZE) {
    flushTrackingQueue().catch((error) => {
      console.error('[Tracking] Immediate flush failed', error);
    });
  } else {
    scheduleFlush();
  }
}

export function setTrackingUser(userId: string | null): void {
  currentUserId = userId;

  if (!userId && pendingEvents.length > 0) {
    pendingEvents.length = 0;
  }
}

export function trackDestinationViewed(event: DestinationTrackingEvent): void {
  if (!currentUserId) {
    return;
  }

  enqueueTrackingEvent({
    ...event,
    type: 'view',
  });
}

export function trackDestinationSaved(event: DestinationTrackingEvent & { saved?: boolean }): void {
  if (!currentUserId || (event.saved === false)) {
    return;
  }

  enqueueTrackingEvent({
    ...event,
    type: 'save',
  });
}

export function trackDestinationVisited(event: DestinationTrackingEvent & { visited?: boolean }): void {
  if (!currentUserId || event.visited === false) {
    return;
  }

  enqueueTrackingEvent({
    ...event,
    type: 'visited',
  });
}

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '' || value.includes('placeholder') || value.includes('invalid')) {
    // Only log error if we're actually trying to use it (not just checking)
    return '';
  }
  return value;
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
// Support both new (publishable) and legacy (anon) key naming
const supabaseAnonKey = 
  getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
  getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const hasValidConfig = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder') && !supabaseAnonKey.includes('placeholder');

// Session ID management (for anonymous tracking)
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem('um_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('um_session_id', sessionId);
  }
  return sessionId;
}

// Initialize session (compatibility function)
export function initializeSession(): void {
  if (typeof window !== 'undefined') {
    getSessionId();
  }
}

// Legacy tracking functions (for backward compatibility)
export function trackPageView(data?: { pageType?: string }): void {
  // Legacy function - can be enhanced to use PersonalizationTracker
  if (typeof window !== 'undefined') {
    console.debug('[Tracking] Page view:', data);
  }
}

export function trackDestinationClick(data?: { destinationId?: number; destinationSlug?: string; position?: number; source?: string }): void {
  // Legacy function - can be enhanced to use PersonalizationTracker
  if (typeof window !== 'undefined') {
    console.debug('[Tracking] Destination click:', data);
  }
}

export function trackSearch(data?: { query?: string }): void {
  // Legacy function - can be enhanced to use PersonalizationTracker
  if (typeof window !== 'undefined') {
    console.debug('[Tracking] Search:', data);
  }
}

export function trackFilterChange(data?: { filterType?: string; value?: any }): void {
  // Legacy function - can be enhanced to use PersonalizationTracker
  if (typeof window !== 'undefined') {
    console.debug('[Tracking] Filter change:', data);
  }
}

export { getSessionId };

export class PersonalizationTracker {
  private supabase = hasValidConfig
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
  private userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  /**
   * Track destination view
   */
  async trackView(
    destinationId: number,
    source?: string,
    searchQuery?: string
  ): Promise<void> {
    if (!this.userId || !this.supabase) return;

    try {
      // Add to visit history
      await this.supabase.from('visit_history').insert({
        user_id: this.userId,
        destination_id: destinationId,
        source,
        search_query: searchQuery,
      });

      // Add interaction
      await this.trackInteraction(destinationId, 'view');
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  }

  /**
   * Track save/unsave
   */
  async trackSave(destinationId: number, collectionId?: string): Promise<void> {
    if (!this.userId || !this.supabase) return;

    try {
      await this.supabase.from('saved_destinations').insert({
        user_id: this.userId,
        destination_id: destinationId,
        collection_id: collectionId,
      });

      await this.trackInteraction(destinationId, 'save');
    } catch (error) {
      console.error('Failed to track save:', error);
    }
  }

  /**
   * Track unsave
   */
  async trackUnsave(destinationId: number): Promise<void> {
    if (!this.userId || !this.supabase) return;

    try {
      await this.supabase
        .from('saved_destinations')
        .delete()
        .eq('user_id', this.userId)
        .eq('destination_id', destinationId);

      await this.trackInteraction(destinationId, 'unsave');
    } catch (error) {
      console.error('Failed to track unsave:', error);
    }
  }

  /**
   * Track external link clicks
   */
  async trackExternalClick(
    destinationId: number,
    type: 'website' | 'maps'
  ): Promise<void> {
    if (!this.userId) return;

    try {
      await this.trackInteraction(
        destinationId,
        type === 'website' ? 'click_website' : 'click_maps'
      );
    } catch (error) {
      console.error('Failed to track external click:', error);
    }
  }

  /**
   * Track share action
   */
  async trackShare(destinationId: number): Promise<void> {
    if (!this.userId) return;

    try {
      await this.trackInteraction(destinationId, 'share');
    } catch (error) {
      console.error('Failed to track share:', error);
    }
  }

  /**
   * Generic interaction tracking
   */
  private async trackInteraction(
    destinationId: number,
    type: UserInteraction['interaction_type']
  ): Promise<void> {
    if (!this.userId || !this.supabase) return;

    try {
      await this.supabase.from('user_interactions').insert({
        user_id: this.userId,
        destination_id: destinationId,
        interaction_type: type,
      });
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }

  /**
   * Update visit duration when user leaves page
   */
  async updateVisitDuration(
    destinationId: number,
    durationSeconds: number
  ): Promise<void> {
    if (!this.userId) return;

    try {
      // Get the most recent visit for this destination
      const { data: recentVisit } = await (this.supabase as any)
        .from('visit_history')
        .select('id')
        .eq('user_id', this.userId)
        .eq('destination_id', destinationId)
        .order('visited_at', { ascending: false })
        .limit(1)
        .single();

      if (recentVisit) {
        const visit = recentVisit as any;
        await (this.supabase as any)
          .from('visit_history')
          .update({ duration_seconds: durationSeconds })
          .eq('id', visit.id);
      }
    } catch (error) {
      console.error('Failed to update visit duration:', error);
    }
  }
}
