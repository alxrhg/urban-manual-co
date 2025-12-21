/**
 * Health Check Endpoint for Subtitle Generation Service
 *
 * GET /api/subtitles/health
 *
 * Returns the status of the subtitle generation service
 * including configuration checks for required services.
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isAnthropicConfigured } from '@/lib/ai/anthropic';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  version: string;
  services: {
    anthropic: boolean;
    supabase: boolean;
    webhookSecret: boolean;
    apiSecret: boolean;
  };
  stats?: {
    totalDestinations: number;
    withSubtitles: number;
    pendingSubtitles: number;
  };
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const anthropicConfigured = isAnthropicConfigured();
  const webhookSecretConfigured = !!process.env.SUPABASE_WEBHOOK_SECRET;
  const apiSecretConfigured = !!process.env.SUBTITLE_API_SECRET;

  // Check Supabase connection
  let supabaseConnected = false;
  let stats: HealthStatus['stats'] | undefined;

  try {
    const supabase = createServiceRoleClient();

    // Test connection with a simple count query
    const { count: totalCount, error: totalError } = await supabase
      .from('destinations')
      .select('*', { count: 'exact', head: true });

    if (!totalError) {
      supabaseConnected = true;

      // Get stats
      const { count: subtitleCount } = await supabase
        .from('destinations')
        .select('*', { count: 'exact', head: true })
        .not('subtitle', 'is', null);

      stats = {
        totalDestinations: totalCount || 0,
        withSubtitles: subtitleCount || 0,
        pendingSubtitles: (totalCount || 0) - (subtitleCount || 0),
      };
    }
  } catch (error) {
    console.error('[Health] Supabase connection error:', error);
  }

  // Determine overall status
  let status: HealthStatus['status'] = 'ok';
  if (!anthropicConfigured || !supabaseConnected) {
    status = 'error';
  } else if (!webhookSecretConfigured || !apiSecretConfigured) {
    status = 'degraded';
  }

  const healthResponse: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      anthropic: anthropicConfigured,
      supabase: supabaseConnected,
      webhookSecret: webhookSecretConfigured,
      apiSecret: apiSecretConfigured,
    },
    stats,
  };

  const statusCode = status === 'ok' ? 200 : status === 'degraded' ? 200 : 503;

  return NextResponse.json(healthResponse, { status: statusCode });
}
