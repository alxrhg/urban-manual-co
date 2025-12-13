/**
 * Observability Module
 *
 * Provides metrics tracking and error reporting for:
 * - Search quality monitoring
 * - Planner failure tracking
 *
 * Integrates with Sentry for error tracking and custom metrics table for analytics.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-load Sentry to avoid issues in test environments
let Sentry: typeof import('@sentry/nextjs') | null = null;

async function getSentry() {
  if (Sentry === null) {
    try {
      Sentry = await import('@sentry/nextjs');
    } catch {
      // Sentry not available (e.g., in tests)
      Sentry = null;
    }
  }
  return Sentry;
}

// Sync Sentry access for breadcrumbs (best-effort)
function getSentrySync() {
  return Sentry;
}

// ============================================================================
// Types
// ============================================================================

export type SearchQualityEvent =
  | 'search_performed'
  | 'search_no_results'
  | 'search_fallback_triggered'
  | 'search_slow_response'
  | 'search_error';

export type PlannerEvent =
  | 'planner_request'
  | 'planner_success'
  | 'planner_failure'
  | 'planner_timeout'
  | 'planner_tool_error'
  | 'planner_validation_error';

export interface SearchMetricPayload {
  query: string;
  tier: 'vector-semantic' | 'fulltext' | 'ai-fields' | 'keyword' | 'none';
  resultCount: number;
  responseTimeMs: number;
  city?: string;
  category?: string;
  userId?: string;
  error?: string;
  fallbackReason?: string;
}

export interface PlannerMetricPayload {
  prompt: string;
  userId?: string;
  tripId?: string;
  toolsCalled: string[];
  toolErrors: string[];
  iterationCount: number;
  durationMs: number;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
}

// ============================================================================
// Lazy Supabase Client
// ============================================================================

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.warn('[Observability] Missing Supabase credentials');
      return null;
    }

    _supabase = createClient(url, key);
  }
  return _supabase;
}

// ============================================================================
// Search Quality Observability
// ============================================================================

/**
 * Track search quality metrics
 */
export async function trackSearchQuality(
  event: SearchQualityEvent,
  payload: Partial<SearchMetricPayload>
): Promise<void> {
  const timestamp = new Date().toISOString();

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SearchQuality] ${event}`, payload);
  }

  // Lazy-load Sentry
  const sentry = await getSentry();

  // Add Sentry breadcrumb for tracing
  if (sentry) {
    sentry.addBreadcrumb({
      category: 'search',
      message: event,
      level: event.includes('error') ? 'error' : 'info',
      data: {
        query: payload.query?.substring(0, 100), // Truncate for privacy
        tier: payload.tier,
        resultCount: payload.resultCount,
        responseTimeMs: payload.responseTimeMs,
      },
    });

    // Report errors to Sentry
    if (event === 'search_error' && payload.error) {
      sentry.captureMessage(`Search Error: ${payload.error}`, {
        level: 'error',
        tags: {
          type: 'search_quality',
          tier: payload.tier,
        },
        extra: payload,
      });
    }

    // Track slow responses
    if (event === 'search_slow_response' || (payload.responseTimeMs && payload.responseTimeMs > 3000)) {
      sentry.captureMessage(`Slow search response: ${payload.responseTimeMs}ms`, {
        level: 'warning',
        tags: {
          type: 'search_performance',
          tier: payload.tier,
        },
        extra: {
          query: payload.query?.substring(0, 100),
          responseTimeMs: payload.responseTimeMs,
        },
      });
    }
  }

  // Persist to database for analytics
  try {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('observability_metrics').insert({
        event_type: 'search',
        event_name: event,
        payload: {
          ...payload,
          query: payload.query?.substring(0, 200), // Truncate for storage
        },
        created_at: timestamp,
      });
    }
  } catch (error) {
    console.warn('[SearchQuality] Failed to persist metric:', error);
  }
}

/**
 * Create a search quality tracker for a single search operation
 */
export function createSearchTracker(query: string, options?: { city?: string; category?: string; userId?: string }) {
  const startTime = Date.now();
  let recorded = false;

  return {
    /**
     * Record successful search result
     */
    success(resultCount: number, tier: SearchMetricPayload['tier']): void {
      if (recorded) return;
      recorded = true;

      const responseTimeMs = Date.now() - startTime;

      trackSearchQuality(
        resultCount === 0 ? 'search_no_results' : 'search_performed',
        {
          query,
          tier,
          resultCount,
          responseTimeMs,
          ...options,
        }
      );

      // Also track slow responses
      if (responseTimeMs > 3000) {
        trackSearchQuality('search_slow_response', {
          query,
          tier,
          resultCount,
          responseTimeMs,
          ...options,
        });
      }
    },

    /**
     * Record fallback to lower-quality search tier
     */
    fallback(tier: SearchMetricPayload['tier'], reason: string): void {
      trackSearchQuality('search_fallback_triggered', {
        query,
        tier,
        resultCount: 0,
        responseTimeMs: Date.now() - startTime,
        fallbackReason: reason,
        ...options,
      });
    },

    /**
     * Record search error
     */
    error(error: Error | string): void {
      if (recorded) return;
      recorded = true;

      trackSearchQuality('search_error', {
        query,
        tier: 'none',
        resultCount: 0,
        responseTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : error,
        ...options,
      });
    },
  };
}

// ============================================================================
// Planner Failure Observability
// ============================================================================

/**
 * Track trip planner metrics
 */
export async function trackPlannerMetric(
  event: PlannerEvent,
  payload: Partial<PlannerMetricPayload>
): Promise<void> {
  const timestamp = new Date().toISOString();

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Planner] ${event}`, {
      prompt: payload.prompt?.substring(0, 50),
      success: payload.success,
      toolsCalled: payload.toolsCalled,
    });
  }

  // Lazy-load Sentry
  const sentry = await getSentry();

  if (sentry) {
    // Add Sentry breadcrumb for tracing
    sentry.addBreadcrumb({
      category: 'planner',
      message: event,
      level: event.includes('failure') || event.includes('error') ? 'error' : 'info',
      data: {
        toolsCalled: payload.toolsCalled?.length || 0,
        iterationCount: payload.iterationCount,
        durationMs: payload.durationMs,
        success: payload.success,
      },
    });

    // Report failures to Sentry
    if (event === 'planner_failure' || event === 'planner_tool_error') {
      sentry.captureMessage(`Planner ${event}: ${payload.errorMessage || 'Unknown error'}`, {
        level: 'error',
        tags: {
          type: 'planner_failure',
          errorType: payload.errorType,
        },
        extra: {
          prompt: payload.prompt?.substring(0, 200),
          toolsCalled: payload.toolsCalled,
          toolErrors: payload.toolErrors,
          iterationCount: payload.iterationCount,
          durationMs: payload.durationMs,
        },
      });
    }

    // Track timeouts
    if (event === 'planner_timeout') {
      sentry.captureMessage(`Planner timeout after ${payload.durationMs}ms`, {
        level: 'warning',
        tags: {
          type: 'planner_timeout',
        },
        extra: {
          prompt: payload.prompt?.substring(0, 200),
          iterationCount: payload.iterationCount,
          toolsCalled: payload.toolsCalled,
        },
      });
    }
  }

  // Persist to database for analytics
  try {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('observability_metrics').insert({
        event_type: 'planner',
        event_name: event,
        payload: {
          ...payload,
          prompt: payload.prompt?.substring(0, 500), // Truncate for storage
        },
        user_id: payload.userId,
        created_at: timestamp,
      });
    }
  } catch (error) {
    console.warn('[Planner] Failed to persist metric:', error);
  }
}

/**
 * Create a planner tracker for a single planning operation
 */
export function createPlannerTracker(prompt: string, options?: { userId?: string; tripId?: string }) {
  const startTime = Date.now();
  const toolsCalled: string[] = [];
  const toolErrors: string[] = [];
  let iterationCount = 0;

  return {
    /**
     * Record a tool being called
     */
    toolCalled(toolName: string): void {
      toolsCalled.push(toolName);
    },

    /**
     * Record a tool error
     */
    toolError(toolName: string, error: string): void {
      toolErrors.push(`${toolName}: ${error}`);
    },

    /**
     * Increment iteration count
     */
    iteration(): void {
      iterationCount++;
    },

    /**
     * Record successful planning completion
     */
    success(): void {
      trackPlannerMetric('planner_success', {
        prompt,
        toolsCalled,
        toolErrors,
        iterationCount,
        durationMs: Date.now() - startTime,
        success: true,
        ...options,
      });
    },

    /**
     * Record planning failure
     */
    failure(errorType: string, errorMessage: string): void {
      trackPlannerMetric('planner_failure', {
        prompt,
        toolsCalled,
        toolErrors,
        iterationCount,
        durationMs: Date.now() - startTime,
        success: false,
        errorType,
        errorMessage,
        ...options,
      });
    },

    /**
     * Record timeout
     */
    timeout(): void {
      trackPlannerMetric('planner_timeout', {
        prompt,
        toolsCalled,
        toolErrors,
        iterationCount,
        durationMs: Date.now() - startTime,
        success: false,
        errorType: 'timeout',
        errorMessage: `Exceeded max iterations (${iterationCount})`,
        ...options,
      });
    },

    /**
     * Record validation error (bad input)
     */
    validationError(message: string): void {
      trackPlannerMetric('planner_validation_error', {
        prompt,
        toolsCalled: [],
        toolErrors: [],
        iterationCount: 0,
        durationMs: Date.now() - startTime,
        success: false,
        errorType: 'validation',
        errorMessage: message,
        ...options,
      });
    },
  };
}

// ============================================================================
// Aggregation Helpers (for dashboards)
// ============================================================================

export interface SearchQualityStats {
  totalSearches: number;
  noResultsCount: number;
  fallbackCount: number;
  errorCount: number;
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  tierDistribution: Record<string, number>;
}

export interface PlannerStats {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  avgDurationMs: number;
  avgToolsPerRequest: number;
  errorDistribution: Record<string, number>;
}

/**
 * Get search quality stats for a time period
 */
export async function getSearchQualityStats(
  startDate: Date,
  endDate: Date
): Promise<SearchQualityStats | null> {
  try {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('observability_metrics')
      .select('event_name, payload')
      .eq('event_type', 'search')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error || !data) return null;

    const responseTimes: number[] = [];
    const tierCounts: Record<string, number> = {};

    let noResults = 0;
    let fallbacks = 0;
    let errors = 0;

    for (const row of data) {
      const payload = row.payload as SearchMetricPayload;

      if (payload.responseTimeMs) {
        responseTimes.push(payload.responseTimeMs);
      }

      if (payload.tier) {
        tierCounts[payload.tier] = (tierCounts[payload.tier] || 0) + 1;
      }

      if (row.event_name === 'search_no_results') noResults++;
      if (row.event_name === 'search_fallback_triggered') fallbacks++;
      if (row.event_name === 'search_error') errors++;
    }

    responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(responseTimes.length * 0.95);

    return {
      totalSearches: data.length,
      noResultsCount: noResults,
      fallbackCount: fallbacks,
      errorCount: errors,
      avgResponseTimeMs: responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0,
      p95ResponseTimeMs: responseTimes[p95Index] || 0,
      tierDistribution: tierCounts,
    };
  } catch (error) {
    console.error('[Observability] Failed to get search stats:', error);
    return null;
  }
}

/**
 * Get planner stats for a time period
 */
export async function getPlannerStats(
  startDate: Date,
  endDate: Date
): Promise<PlannerStats | null> {
  try {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('observability_metrics')
      .select('event_name, payload')
      .eq('event_type', 'planner')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error || !data) return null;

    const durations: number[] = [];
    const toolCounts: number[] = [];
    const errorTypes: Record<string, number> = {};

    let successes = 0;
    let failures = 0;
    let timeouts = 0;

    for (const row of data) {
      const payload = row.payload as PlannerMetricPayload;

      if (payload.durationMs) {
        durations.push(payload.durationMs);
      }

      if (payload.toolsCalled) {
        toolCounts.push(payload.toolsCalled.length);
      }

      if (row.event_name === 'planner_success') successes++;
      if (row.event_name === 'planner_failure') {
        failures++;
        if (payload.errorType) {
          errorTypes[payload.errorType] = (errorTypes[payload.errorType] || 0) + 1;
        }
      }
      if (row.event_name === 'planner_timeout') timeouts++;
    }

    return {
      totalRequests: data.length,
      successCount: successes,
      failureCount: failures,
      timeoutCount: timeouts,
      avgDurationMs: durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0,
      avgToolsPerRequest: toolCounts.length > 0
        ? toolCounts.reduce((a, b) => a + b, 0) / toolCounts.length
        : 0,
      errorDistribution: errorTypes,
    };
  } catch (error) {
    console.error('[Observability] Failed to get planner stats:', error);
    return null;
  }
}
