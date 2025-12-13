/**
 * Quality Telemetry API
 *
 * Receives quality events from the frontend for analysis:
 * - Chip views and clicks (CTR)
 * - Save actions with attribution
 * - Add-to-trip actions
 * - Undo events (negative signals)
 *
 * Data is used for scientific iteration on recommendations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';
import type { QualityEvent } from '@/lib/intelligence/types';

// ============================================
// TYPES
// ============================================

interface TrackingPayload {
  sessionId: string;
  events: QualityEvent[];
}

// ============================================
// POST - Receive quality events
// ============================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();

  // Get authenticated user (optional - we track anonymous too)
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  const payload: TrackingPayload = await request.json();
  const { sessionId, events } = payload;

  if (!events || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No events provided',
    }, { status: 400 });
  }

  // Transform events to database format
  const dbEvents = events.map(event => ({
    user_id: userId,
    session_id: sessionId,
    event_type: event.eventType,
    source_type: event.sourceType,
    source_id: event.sourceId,
    source_label: event.sourceLabel,
    position: event.position,
    total_items: event.totalItems,
    recommendation_source: event.recommendationSource,
    recommendation_score: event.recommendationScore,
    destination_slug: event.destinationSlug,
    destination_id: event.destinationId,
    destination_category: event.destinationCategory,
    page_context: event.pageContext,
    feature_context: event.featureContext,
    result_type: event.resultType,
    dwell_time_ms: event.dwellTimeMs,
    metadata: event.metadata || {},
  }));

  // Insert events
  const { error } = await supabase
    .from('quality_events')
    .insert(dbEvents);

  if (error) {
    // Table might not exist yet - log but don't fail
    if (error.message?.includes('does not exist')) {
      console.warn('[Quality Track] Table not yet created, skipping');
      return NextResponse.json({
        success: true,
        data: { processed: 0, pending_migration: true },
      });
    }

    console.error('[Quality Track] Insert error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to store events',
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: { processed: events.length },
  });
});

// ============================================
// GET - Retrieve quality metrics
// ============================================

export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();

  // Check for admin access
  const { data: { session } } = await supabase.auth.getSession();
  const isAdmin = session?.user?.user_metadata?.role === 'admin';

  if (!isAdmin) {
    return NextResponse.json({
      success: false,
      error: 'Admin access required',
    }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get('days') || '30', 10);
  const metric = searchParams.get('metric') || 'summary';

  try {
    let data;

    switch (metric) {
      case 'summary':
        const { data: summary } = await supabase.rpc('get_quality_summary', { p_days: days });
        data = summary;
        break;

      case 'ctr':
        const { data: ctr } = await supabase.rpc('get_quality_ctr_by_source', { p_days: days });
        data = ctr;
        break;

      case 'save_rate':
        const { data: saveRate } = await supabase.rpc('get_quality_save_rate', { p_days: days });
        data = saveRate;
        break;

      case 'undo_rate':
        const { data: undoRate } = await supabase.rpc('get_quality_undo_rate', { p_days: days });
        data = undoRate;
        break;

      case 'position_ctr':
        const sourceType = searchParams.get('source_type') || null;
        const { data: positionCtr } = await supabase.rpc('get_quality_position_ctr', {
          p_source_type: sourceType,
          p_days: days,
        });
        data = positionCtr;
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid metric type',
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data,
      meta: { days, metric },
    });
  } catch (error: unknown) {
    // Functions might not exist yet
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('does not exist')) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { days, metric, pending_migration: true },
      });
    }

    console.error('[Quality Track] Query error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve metrics',
    }, { status: 500 });
  }
});
