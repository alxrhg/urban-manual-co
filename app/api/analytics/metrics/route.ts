/**
 * Performance Metrics API
 *
 * Receives Core Web Vitals and custom performance metrics
 * from the frontend for monitoring and reporting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';

interface PerformanceMetricPayload {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
  timestamp: number;
  url: string;
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    const supabase = await createServerClient();

    // Handle both JSON and sendBeacon (which sends as text)
    let payload: PerformanceMetricPayload;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const text = await request.text();
      payload = JSON.parse(text);
    }

    const { name, value, rating, delta, id, navigationType, timestamp, url } = payload;

    if (!name || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'Metric name and value are required' },
        { status: 400 }
      );
    }

    // Get authenticated user if available
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Get session ID from request header or cookie
    const sessionId = request.headers.get('x-session-id') ||
      request.cookies.get('um_session_id')?.value;

    // Insert metric into performance_metrics table
    const { error } = await supabase
      .from('performance_metrics')
      .insert({
        metric_name: name,
        metric_value: value,
        rating: rating || 'unknown',
        delta: delta || 0,
        metric_id: id,
        navigation_type: navigationType,
        page_path: url,
        user_id: userId,
        session_id: sessionId,
        user_agent: request.headers.get('user-agent') || '',
        timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      });

    if (error) {
      // Log but don't fail - metrics collection should be resilient
      console.warn('[Performance Metrics] Insert warning:', error.message);

      // If table doesn't exist, return success anyway (migration not run yet)
      if (error.message?.includes('does not exist')) {
        return NextResponse.json({ success: true, queued: true });
      }
    }

    // Log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vital Received] ${name}: ${value.toFixed(name === 'CLS' ? 3 : 0)} (${rating})`);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Performance Metrics] Error:', errorMessage);
    // Return success to not break the frontend
    return NextResponse.json({ success: true, error: errorMessage });
  }
});

// GET endpoint for fetching aggregated metrics
export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const searchParams = request.nextUrl.searchParams;

  const days = parseInt(searchParams.get('days') || '7', 10);
  const metricName = searchParams.get('metric');

  try {
    // Get web vitals summary
    const { data: summary, error: summaryError } = await supabase
      .rpc('get_web_vitals_summary', {
        p_start_date: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: new Date().toISOString(),
      });

    if (summaryError) {
      console.warn('[Performance Metrics] Summary error:', summaryError.message);
    }

    // Get trends if specific metric requested
    let trends = null;
    if (metricName) {
      const { data: trendData, error: trendError } = await supabase
        .rpc('get_performance_trends', {
          p_metric_name: metricName,
          p_days: days,
        });

      if (trendError) {
        console.warn('[Performance Metrics] Trend error:', trendError.message);
      }

      trends = trendData;
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: summary || [],
        trends,
        period: { days, start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() },
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Performance Metrics] GET Error:', errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
});
