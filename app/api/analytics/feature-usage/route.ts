import { NextRequest, NextResponse } from 'next/server';
import {
  apiRatelimit,
  createRateLimitResponse,
  getIdentifier,
  isUpstashConfigured,
  memoryApiRatelimit,
} from '@/lib/rate-limit';
import { createServerClient } from '@/lib/supabase-server';
import { resolveSupabaseClient } from '@/app/api/_utils/supabase';

const SUPPORTED_EVENT_TYPES = ['page_view', 'chat_message', 'suggestion_accepted'] as const;
type SupportedEventType = (typeof SUPPORTED_EVENT_TYPES)[number];
const SUPPORTED_EVENT_TYPE_SET = new Set<string>(SUPPORTED_EVENT_TYPES);

interface FeatureUsagePayload {
  eventType: string;
  userId?: string | null;
  payload?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSupportedEventType(value: string): value is SupportedEventType {
  return SUPPORTED_EVENT_TYPE_SET.has(value);
}

export async function POST(request: NextRequest) {
  try {
    let body: FeatureUsagePayload;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { eventType, userId, payload } = body || {};

    if (typeof eventType !== 'string' || !isSupportedEventType(eventType)) {
      return NextResponse.json(
        {
          error: 'Invalid eventType provided',
          allowedEventTypes: Array.from(SUPPORTED_EVENT_TYPES),
        },
        { status: 400 }
      );
    }

    if (userId !== undefined && userId !== null && typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId must be a string when provided' }, { status: 400 });
    }

    if (payload !== undefined && !isRecord(payload)) {
      return NextResponse.json(
        {
          error: 'payload must be an object',
        },
        { status: 400 }
      );
    }

    let sessionUserId: string | null = null;
    try {
      const supabaseAuth = await createServerClient();
      const { data } = await supabaseAuth.auth.getUser();
      sessionUserId = data?.user?.id ?? null;
    } catch (error) {
      // Auth lookup is best-effort; continue anonymously if it fails
      console.debug('Feature usage auth lookup failed (continuing anonymously):', error);
    }

    if (sessionUserId && userId && sessionUserId !== userId) {
      return NextResponse.json(
        {
          error: 'Authenticated user does not match payload userId',
        },
        { status: 403 }
      );
    }

    const finalUserId = sessionUserId ?? (userId?.trim() ? userId : null) ?? null;

    const identifier = getIdentifier(request, finalUserId ?? undefined);
    const ratelimit = isUpstashConfigured() ? apiRatelimit : memoryApiRatelimit;
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    if (!success) {
      return createRateLimitResponse(
        'Too many analytics events. Please slow down.',
        limit,
        remaining,
        reset
      );
    }

    const supabase = resolveSupabaseClient();
    const metadata = {
      path: request.nextUrl?.pathname,
      referer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
      identifier,
    };

    if (!supabase) {
      console.warn('Feature usage analytics: Supabase client not configured. Event not stored.');
      return NextResponse.json(
        {
          success: false,
          stored: false,
          message: 'Analytics storage not configured',
        },
        { status: 202 }
      );
    }

    const { error } = await supabase.from('feature_usage_events').insert({
      event_type: eventType,
      user_id: finalUserId,
      payload: payload ?? {},
      metadata,
    });

    if (error) {
      console.error('Failed to persist feature usage event:', error);
      return NextResponse.json(
        {
          error: 'Failed to persist analytics event',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stored: true,
    });
  } catch (error) {
    console.error('Unexpected feature usage analytics error:', error);
    return NextResponse.json(
      {
        error: 'Unexpected error recording analytics event',
      },
      { status: 500 }
    );
  }
}
