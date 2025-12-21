/**
 * Server-side Analytics Service
 *
 * Tracks analytics events from API routes and server components.
 * Stores events in the database for later analysis.
 */

import { createServerClient } from '@/lib/supabase/server';

// ============================================
// TYPES
// ============================================

export interface ServerSearchEvent {
  query: string;
  resultCount: number;
  isZeroResults: boolean;
  filters?: Record<string, unknown>;
  responseTimeMs: number;
  userId?: string;
  sessionId?: string;
  source?: string;
  userAgent?: string;
  ip?: string;
}

export interface ServerConversionEvent {
  type: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// SEARCH TRACKING
// ============================================

/**
 * Track a search event on the server
 * Stores in behavior_events table for analysis
 */
export async function trackServerSearch(event: ServerSearchEvent): Promise<void> {
  try {
    const supabase = await createServerClient();

    // Store in behavior_events table
    await supabase.from('behavior_events').insert({
      user_id: event.userId,
      event_type: event.isZeroResults ? 'search_zero_results' : 'search_query',
      event_context: {
        search_query: event.query,
        result_count: event.resultCount,
        is_zero_results: event.isZeroResults,
        filters: event.filters,
        response_time_ms: event.responseTimeMs,
        source: event.source || 'api',
        session_id: event.sessionId,
        user_agent: event.userAgent,
      },
      created_at: new Date().toISOString(),
    });

    // If zero results, also log to search_analytics for quality monitoring
    if (event.isZeroResults) {
      await logZeroResultSearch(event.query, event.filters, event.userId);
    }
  } catch (error) {
    // Don't fail the request if analytics fails
    console.warn('[ServerAnalytics] Failed to track search:', error);
  }
}

/**
 * Log zero-result searches for quality analysis
 */
async function logZeroResultSearch(
  query: string,
  filters?: Record<string, unknown>,
  userId?: string
): Promise<void> {
  try {
    const supabase = await createServerClient();

    // Try to insert into search_analytics table
    // This table can be used for analyzing search quality
    const { error } = await supabase.from('search_analytics').insert({
      query: query.toLowerCase().trim(),
      result_count: 0,
      filters: filters || {},
      user_id: userId,
      is_zero_results: true,
      created_at: new Date().toISOString(),
    });

    // Table might not exist, which is OK
    if (error && !error.message?.includes('does not exist')) {
      console.warn('[ServerAnalytics] Zero-result log warning:', error.message);
    }
  } catch (error) {
    // Non-critical, just log
    console.warn('[ServerAnalytics] Zero-result log error:', error);
  }
}

// ============================================
// CONVERSION TRACKING
// ============================================

/**
 * Track a conversion event on the server
 */
export async function trackServerConversion(event: ServerConversionEvent): Promise<void> {
  try {
    const supabase = await createServerClient();

    await supabase.from('behavior_events').insert({
      user_id: event.userId,
      event_type: event.type,
      event_context: {
        conversion_type: event.type,
        session_id: event.sessionId,
        ...event.metadata,
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[ServerAnalytics] Failed to track conversion:', error);
  }
}

// ============================================
// FILTER TRACKING
// ============================================

/**
 * Track filter usage on the server
 */
export async function trackServerFilterUsage(
  filters: Record<string, unknown>,
  resultCount: number,
  userId?: string
): Promise<void> {
  try {
    const supabase = await createServerClient();

    // Extract active filters
    const activeFilters = Object.entries(filters)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => ({ type: key, value }));

    if (activeFilters.length === 0) return;

    await supabase.from('behavior_events').insert({
      user_id: userId,
      event_type: 'filter_usage',
      event_context: {
        filters: filters,
        active_filter_count: activeFilters.length,
        filter_types: activeFilters.map(f => f.type),
        result_count: resultCount,
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[ServerAnalytics] Failed to track filter usage:', error);
  }
}

// ============================================
// DESTINATION POPULARITY
// ============================================

/**
 * Increment destination view/click counts
 */
export async function trackDestinationPopularity(
  destinationSlug: string,
  action: 'view' | 'click' | 'save',
  userId?: string
): Promise<void> {
  try {
    const supabase = await createServerClient();

    if (action === 'view') {
      await supabase.rpc('increment_views_by_slug', { dest_slug: destinationSlug });
    } else if (action === 'save') {
      await supabase.rpc('increment_saves', { dest_slug: destinationSlug });
    }

    // Also log the event
    await supabase.from('behavior_events').insert({
      user_id: userId,
      event_type: `destination_${action}`,
      destination_slug: destinationSlug,
      event_context: {
        action,
      },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[ServerAnalytics] Failed to track destination popularity:', error);
  }
}
