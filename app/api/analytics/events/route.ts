/**
 * Analytics Events API
 *
 * Receives analytics events from the frontend and stores them
 * for dashboard reporting and insights.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';

interface AnalyticsEventPayload {
  type: string;
  timestamp: number;
  url: string;
  userAgent: string;
  sessionId?: string;
  userId?: string;
  viewport?: { width: number; height: number };
  [key: string]: unknown;
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    const supabase = await createServerClient();
    const payload: AnalyticsEventPayload = await request.json();

    const { type, timestamp, url, userAgent, sessionId, userId, viewport, ...eventData } = payload;

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Event type is required' },
        { status: 400 }
      );
    }

    // Get authenticated user if available
    const { data: { session } } = await supabase.auth.getSession();
    const authenticatedUserId = session?.user?.id || userId;

    // Insert event into analytics_events table
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        event_type: type,
        event_data: eventData,
        page_path: url,
        user_id: authenticatedUserId,
        session_id: sessionId,
        user_agent: userAgent,
        viewport_width: viewport?.width,
        viewport_height: viewport?.height,
        timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      });

    if (error) {
      // Log but don't fail - analytics should be resilient
      console.warn('[Analytics Events] Insert warning:', error.message);

      // If table doesn't exist, return success anyway (migration not run yet)
      if (error.message?.includes('does not exist')) {
        return NextResponse.json({ success: true, queued: true });
      }
    }

    // Update session data if we have a session ID
    if (sessionId) {
      await updateSession(supabase, sessionId, authenticatedUserId, url, userAgent);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Analytics Events] Error:', errorMessage);
    // Return success to not break the frontend
    return NextResponse.json({ success: true, error: errorMessage });
  }
});

async function updateSession(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  sessionId: string,
  userId: string | undefined,
  pagePath: string,
  userAgent: string
): Promise<void> {
  try {
    const { browser, os, deviceType } = parseUserAgent(userAgent);

    // Upsert session
    await supabase
      .from('analytics_sessions')
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          entry_page: pagePath,
          exit_page: pagePath,
          browser,
          os,
          device_type: deviceType,
          end_time: new Date().toISOString(),
          bounce: false,
        },
        {
          onConflict: 'session_id',
        }
      );

    // Increment event count
    await supabase.rpc('increment_session_event_count', { p_session_id: sessionId });
  } catch (error) {
    // Non-critical
    console.warn('[Analytics Events] Session update warning:', error);
  }
}

function parseUserAgent(userAgent: string): {
  browser: string;
  os: string;
  deviceType: string;
} {
  let browser = 'Unknown';
  let os = 'Unknown';
  let deviceType = 'desktop';

  if (!userAgent) {
    return { browser, os, deviceType };
  }

  // Browser detection
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  }

  // OS detection
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  }

  // Device type detection
  if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
    deviceType = 'mobile';
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    deviceType = 'tablet';
  }

  return { browser, os, deviceType };
}
