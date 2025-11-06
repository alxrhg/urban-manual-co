/**
 * Batch Tracking API Endpoint
 * Processes batched tracking events from the client
 *
 * POST /api/tracking/batch
 * Body: { events: InteractionSignal[], session_id: string, user_id?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============================================
// Types
// ============================================

interface TrackingEvent {
  // Identifiers
  destination_id?: number
  session_id: string
  user_id?: string

  // Mouse & Cursor
  hover_duration_ms?: number
  hover_count?: number
  cursor_path_complexity?: number
  click_hesitation_ms?: number

  // Scroll
  scroll_depth_percentage?: number
  max_scroll_depth?: number
  scroll_velocity_avg?: number
  scroll_direction_changes?: number
  time_to_first_scroll_ms?: number

  // Dwell & Engagement
  dwell_time_ms: number
  active_time_ms?: number
  tab_switches?: number
  idle_time_ms?: number
  engagement_score?: number

  // Content
  images_viewed?: string[]
  image_interactions?: number
  text_selections?: number
  text_copied?: boolean
  video_played?: boolean
  video_watch_duration_ms?: number

  // Navigation
  back_button_used?: boolean
  external_link_hovers?: number
  share_button_hovers?: number
  save_button_hovers?: number
  booking_link_clicks?: number

  // Clicks
  click_count?: number
  double_click_count?: number
  right_click_count?: number

  // Context
  viewport_width?: number
  viewport_height?: number
  device_orientation?: string
  battery_level?: number
  connection_type?: string

  // Source
  source?: string
  referrer_page?: string
  search_query?: string
  position_in_list?: number

  // Timestamps
  client_timestamp?: number
  sequence_number?: number
}

interface BatchRequest {
  events: TrackingEvent[]
  session_id: string
  user_id?: string
}

// ============================================
// Supabase Client (Service Role)
// ============================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// ============================================
// Helper Functions
// ============================================

function calculateEngagementScore(event: TrackingEvent): number {
  if (event.engagement_score !== undefined) {
    return event.engagement_score
  }

  let score = 0

  // Dwell time (normalized to 0-1, max at 5 minutes)
  if (event.dwell_time_ms) {
    score += Math.min(event.dwell_time_ms / 300000, 1) * 0.3
  }

  // Scroll depth
  if (event.scroll_depth_percentage) {
    score += (event.scroll_depth_percentage / 100) * 0.2
  }

  // Hover duration
  if (event.hover_duration_ms) {
    score += Math.min(event.hover_duration_ms / 10000, 1) * 0.1
  }

  // Active time ratio
  if (event.active_time_ms && event.dwell_time_ms > 0) {
    const activeRatio = event.active_time_ms / event.dwell_time_ms
    score += activeRatio * 0.2
  }

  // Action signals
  if (event.text_copied) score += 0.1
  if (event.image_interactions && event.image_interactions > 2) score += 0.1

  return Math.min(score, 1)
}

async function ensureSession(sessionId: string, userId?: string): Promise<string | null> {
  // Check if session exists
  const { data: existingSession } = await supabase
    .from('user_sessions')
    .select('id')
    .eq('session_id', sessionId)
    .single()

  if (existingSession) {
    return existingSession.id
  }

  // Create new session
  const { data: newSession, error } = await supabase
    .from('user_sessions')
    .insert({
      session_id: sessionId,
      user_id: userId,
      device_type: 'unknown', // Will be updated from first event
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[Tracking] Failed to create session:', error)
    return null
  }

  return newSession.id
}

async function saveEnrichedInteractions(
  events: TrackingEvent[],
  sessionDbId: string | null
): Promise<{ success: number; failed: number }> {
  let successCount = 0
  let failedCount = 0

  for (const event of events) {
    try {
      const engagementScore = calculateEngagementScore(event)

      const interaction = {
        user_id: event.user_id || null,
        destination_id: event.destination_id || null,
        session_id: sessionDbId,

        // Mouse & Cursor
        hover_duration_ms: event.hover_duration_ms || null,
        hover_count: event.hover_count || null,
        cursor_path_complexity: event.cursor_path_complexity || null,
        click_hesitation_ms: event.click_hesitation_ms || null,

        // Scroll
        scroll_depth_percentage: event.scroll_depth_percentage || null,
        max_scroll_depth: event.max_scroll_depth || null,
        scroll_velocity_avg: event.scroll_velocity_avg || null,
        scroll_direction_changes: event.scroll_direction_changes || null,
        time_to_first_scroll_ms: event.time_to_first_scroll_ms || null,

        // Dwell & Engagement
        dwell_time_ms: event.dwell_time_ms,
        active_time_ms: event.active_time_ms || null,
        engagement_score: engagementScore,
        tab_switches: event.tab_switches || null,
        idle_time_ms: event.idle_time_ms || null,

        // Content
        images_viewed: event.images_viewed || null,
        image_interactions: event.image_interactions || null,
        text_selections: event.text_selections || null,
        text_copied: event.text_copied || false,
        video_played: event.video_played || false,
        video_watch_duration_ms: event.video_watch_duration_ms || null,

        // Navigation
        back_button_used: event.back_button_used || false,
        external_link_hovers: event.external_link_hovers || null,
        share_button_hovers: event.share_button_hovers || null,
        save_button_hovers: event.save_button_hovers || null,
        booking_link_clicks: event.booking_link_clicks || null,

        // Clicks
        click_count: event.click_count || null,
        double_click_count: event.double_click_count || null,
        right_click_count: event.right_click_count || null,

        // Context
        viewport_width: event.viewport_width || null,
        viewport_height: event.viewport_height || null,
        device_orientation: event.device_orientation || null,
        battery_level: event.battery_level || null,
        connection_type: event.connection_type || null,

        // Source
        source: event.source || null,
        referrer_page: event.referrer_page || null,
        search_query: event.search_query || null,
        position_in_list: event.position_in_list || null,

        // Metadata
        metadata: {
          client_timestamp: event.client_timestamp,
          sequence_number: event.sequence_number,
        },
      }

      const { error } = await supabase
        .from('enriched_interactions')
        .insert(interaction)

      if (error) {
        console.error('[Tracking] Failed to save interaction:', error)
        failedCount++
      } else {
        successCount++
      }
    } catch (error) {
      console.error('[Tracking] Error processing event:', error)
      failedCount++
    }
  }

  return { success: successCount, failed: failedCount }
}

// ============================================
// Rate Limiting (Simple in-memory)
// ============================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60 // 60 requests per minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(identifier)

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    return true
  }

  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  limit.count++
  return true
}

// ============================================
// API Handler
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Parse body
    const body: BatchRequest = await request.json()

    // Validation
    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: events array required' },
        { status: 400 }
      )
    }

    if (!body.session_id) {
      return NextResponse.json(
        { error: 'Invalid request: session_id required' },
        { status: 400 }
      )
    }

    // Rate limiting
    const identifier = body.user_id || body.session_id
    if (!checkRateLimit(identifier)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Ensure session exists
    const sessionDbId = await ensureSession(body.session_id, body.user_id)

    // Save interactions
    const result = await saveEnrichedInteractions(body.events, sessionDbId)

    // Clean up old rate limit entries (every 100 requests)
    if (Math.random() < 0.01) {
      const now = Date.now()
      for (const [key, value] of rateLimitMap.entries()) {
        if (now > value.resetAt) {
          rateLimitMap.delete(key)
        }
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      processed: body.events.length,
      saved: result.success,
      failed: result.failed,
    })
  } catch (error) {
    console.error('[Tracking] Batch processing error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// ============================================
// Health Check (GET)
// ============================================

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'tracking-batch-api',
    version: '1.0.0',
  })
}
