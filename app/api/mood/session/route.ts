/**
 * Mood Session API
 * Tracks user mood sessions for personalization
 *
 * POST /api/mood/session
 * Body: { user_id: string, mood: string, session_id: string }
 *
 * PUT /api/mood/session
 * Body: { session_id: string, interactions_count: number, saved_count: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { moodFilter } from '@/services/mood/mood-filter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, mood, session_id } = body

    if (!user_id || !mood || !session_id) {
      return NextResponse.json(
        { error: 'user_id, mood, and session_id are required' },
        { status: 400 }
      )
    }

    await moodFilter.startMoodSession(user_id, mood, session_id)

    console.log(`[MoodSession] Started session ${session_id} for user ${user_id}, mood: ${mood}`)

    return NextResponse.json({
      success: true,
      session_id,
      mood,
    })
  } catch (error) {
    console.error('[MoodSession] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to start mood session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, interactions_count, saved_count } = body

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      )
    }

    await moodFilter.updateMoodSession(
      session_id,
      interactions_count || 0,
      saved_count || 0
    )

    console.log(`[MoodSession] Updated session ${session_id}`)

    return NextResponse.json({
      success: true,
      session_id,
    })
  } catch (error) {
    console.error('[MoodSession] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to update mood session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
