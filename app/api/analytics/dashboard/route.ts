/**
 * Analytics Dashboard API
 *
 * Provides aggregated analytics data for the admin dashboard
 * including web vitals, user metrics, and event summaries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';

interface DashboardData {
  dau: number;
  dauChange: number;
  avgSessionDuration: number;
  sessionDurationChange: number;
  conversionRate: number;
  conversionChange: number;
  bounceRate: number;
  bounceChange: number;
  webVitals: {
    lcp: VitalMetric;
    fid: VitalMetric;
    cls: VitalMetric;
    inp: VitalMetric;
    fcp: VitalMetric;
    ttfb: VitalMetric;
  };
  topEvents: EventCount[];
  dailyTrends: DailyMetric[];
  funnel: FunnelStage[];
}

interface VitalMetric {
  value: number;
  target: number;
  status: 'good' | 'needs-improvement' | 'poor';
  goodPercentage: number;
  sampleCount: number;
}

interface EventCount {
  eventType: string;
  count: number;
  uniqueUsers: number;
}

interface DailyMetric {
  date: string;
  users: number;
  sessions: number;
  pageViews: number;
}

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
}

const VITAL_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000, unit: 'ms' },
  FID: { good: 100, poor: 300, unit: 'ms' },
  CLS: { good: 0.1, poor: 0.25, unit: '' },
  INP: { good: 200, poor: 500, unit: 'ms' },
  FCP: { good: 1800, poor: 3000, unit: 'ms' },
  TTFB: { good: 800, poor: 1800, unit: 'ms' },
};

export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const searchParams = request.nextUrl.searchParams;

  const days = parseInt(searchParams.get('days') || '7', 10);
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

  try {
    // Fetch all data in parallel
    const [
      webVitalsSummary,
      eventCounts,
      dailyAnalytics,
      currentDau,
      prevDau,
    ] = await Promise.all([
      fetchWebVitalsSummary(supabase, startDate, now),
      fetchEventCounts(supabase, startDate, now),
      fetchDailyAnalytics(supabase, days),
      fetchDailyActiveUsers(supabase, startDate, now),
      fetchDailyActiveUsers(supabase, prevStartDate, startDate),
    ]);

    // Calculate DAU change
    const dauChange = prevDau > 0 ? ((currentDau - prevDau) / prevDau) * 100 : 0;

    // Build web vitals object
    const webVitals = buildWebVitalsObject(webVitalsSummary);

    // Build funnel from event counts
    const funnel = buildConversionFunnel(eventCounts);

    // Calculate bounce rate and session metrics
    const { bounceRate, avgSessionDuration, conversionRate } = await fetchSessionMetrics(
      supabase,
      startDate,
      now
    );

    const { bounceRate: prevBounceRate, avgSessionDuration: prevAvgSessionDuration, conversionRate: prevConversionRate } =
      await fetchSessionMetrics(supabase, prevStartDate, startDate);

    const response: DashboardData = {
      dau: currentDau,
      dauChange,
      avgSessionDuration,
      sessionDurationChange: prevAvgSessionDuration > 0
        ? ((avgSessionDuration - prevAvgSessionDuration) / prevAvgSessionDuration) * 100
        : 0,
      conversionRate,
      conversionChange: prevConversionRate > 0
        ? ((conversionRate - prevConversionRate) / prevConversionRate) * 100
        : 0,
      bounceRate,
      bounceChange: prevBounceRate > 0 ? ((bounceRate - prevBounceRate) / prevBounceRate) * 100 : 0,
      webVitals,
      topEvents: eventCounts.slice(0, 10),
      dailyTrends: dailyAnalytics,
      funnel,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Analytics Dashboard] Error:', errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
});

async function fetchWebVitalsSummary(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  startDate: Date,
  endDate: Date
): Promise<Record<string, VitalMetric>> {
  try {
    const { data, error } = await supabase.rpc('get_web_vitals_summary', {
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error) {
      console.warn('[Analytics Dashboard] Web vitals error:', error.message);
      return {};
    }

    const result: Record<string, VitalMetric> = {};
    for (const row of data || []) {
      const threshold = VITAL_THRESHOLDS[row.metric_name as keyof typeof VITAL_THRESHOLDS];
      result[row.metric_name] = {
        value: row.avg_value,
        target: threshold?.good || 0,
        status: row.status as 'good' | 'needs-improvement' | 'poor',
        goodPercentage: row.good_percentage || 0,
        sampleCount: row.sample_count || 0,
      };
    }

    return result;
  } catch {
    return {};
  }
}

async function fetchEventCounts(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  startDate: Date,
  endDate: Date
): Promise<EventCount[]> {
  try {
    const { data, error } = await supabase.rpc('get_event_counts', {
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    });

    if (error) {
      console.warn('[Analytics Dashboard] Event counts error:', error.message);
      return [];
    }

    return (data || []).map((row: { event_type: string; event_count: number; unique_users: number }) => ({
      eventType: row.event_type,
      count: row.event_count,
      uniqueUsers: row.unique_users,
    }));
  } catch {
    return [];
  }
}

async function fetchDailyAnalytics(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  days: number
): Promise<DailyMetric[]> {
  try {
    const { data, error } = await supabase.rpc('get_daily_analytics', {
      p_days: days,
    });

    if (error) {
      console.warn('[Analytics Dashboard] Daily analytics error:', error.message);
      return [];
    }

    return (data || []).map((row: { date: string; unique_users: number; unique_sessions: number; page_views: number }) => ({
      date: row.date,
      users: row.unique_users,
      sessions: row.unique_sessions,
      pageViews: row.page_views,
    }));
  } catch {
    return [];
  }
}

async function fetchDailyActiveUsers(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  startDate: Date,
  endDate: Date
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('analytics_sessions')
      .select('user_id', { count: 'exact', head: true })
      .gte('start_time', startDate.toISOString())
      .lt('start_time', endDate.toISOString())
      .not('user_id', 'is', null);

    if (error) {
      console.warn('[Analytics Dashboard] DAU error:', error.message);
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}

async function fetchSessionMetrics(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  startDate: Date,
  endDate: Date
): Promise<{ bounceRate: number; avgSessionDuration: number; conversionRate: number }> {
  try {
    const { data, error } = await supabase
      .from('analytics_sessions')
      .select('bounce, duration_seconds, event_count')
      .gte('start_time', startDate.toISOString())
      .lt('start_time', endDate.toISOString());

    if (error || !data || data.length === 0) {
      return { bounceRate: 0, avgSessionDuration: 0, conversionRate: 0 };
    }

    const totalSessions = data.length;
    const bouncedSessions = data.filter((s) => s.bounce === true).length;
    const totalDuration = data.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const conversions = data.filter((s) => (s.event_count || 0) >= 3).length;

    return {
      bounceRate: totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0,
      avgSessionDuration: totalSessions > 0 ? totalDuration / totalSessions : 0,
      conversionRate: totalSessions > 0 ? (conversions / totalSessions) * 100 : 0,
    };
  } catch {
    return { bounceRate: 0, avgSessionDuration: 0, conversionRate: 0 };
  }
}

function buildWebVitalsObject(summary: Record<string, VitalMetric>): DashboardData['webVitals'] {
  const defaultMetric: VitalMetric = {
    value: 0,
    target: 0,
    status: 'good',
    goodPercentage: 0,
    sampleCount: 0,
  };

  return {
    lcp: summary['LCP'] || { ...defaultMetric, target: VITAL_THRESHOLDS.LCP.good },
    fid: summary['FID'] || { ...defaultMetric, target: VITAL_THRESHOLDS.FID.good },
    cls: summary['CLS'] || { ...defaultMetric, target: VITAL_THRESHOLDS.CLS.good },
    inp: summary['INP'] || { ...defaultMetric, target: VITAL_THRESHOLDS.INP.good },
    fcp: summary['FCP'] || { ...defaultMetric, target: VITAL_THRESHOLDS.FCP.good },
    ttfb: summary['TTFB'] || { ...defaultMetric, target: VITAL_THRESHOLDS.TTFB.good },
  };
}

function buildConversionFunnel(eventCounts: EventCount[]): FunnelStage[] {
  const eventMap = new Map(eventCounts.map((e) => [e.eventType, e.count]));

  const stages = [
    { name: 'Page Views', eventType: 'page_view' },
    { name: 'Destination Viewed', eventType: 'destination_viewed' },
    { name: 'Destination Saved', eventType: 'destination_saved' },
    { name: 'Trip Created', eventType: 'trip_created' },
    { name: 'Trip Shared', eventType: 'trip_shared' },
  ];

  const totalViews = eventMap.get('page_view') || 1;

  return stages.map((stage) => {
    const count = eventMap.get(stage.eventType) || 0;
    return {
      name: stage.name,
      count,
      percentage: (count / totalViews) * 100,
    };
  });
}
