/**
 * Mood Filter API
 * Filters recommendations based on user's selected mood
 *
 * GET /api/mood/filter?user_id=...&mood=...&limit=20
 */

import { NextRequest, NextResponse } from 'next/server'
import { moodFilter } from '@/services/mood/mood-filter'
import { tasteMatcher } from '@/services/taste/matcher'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const mood = searchParams.get('mood')
    const limit = parseInt(searchParams.get('limit') || '20')
    const approach = searchParams.get('approach') || 'mood_first' // 'mood_first' or 'taste_first'

    if (!user_id || !mood) {
      return NextResponse.json(
        { error: 'user_id and mood are required' },
        { status: 400 }
      )
    }

    console.log(`[MoodFilter] Filtering for user ${user_id}, mood: ${mood}, approach: ${approach}`)

    let recommendations

    if (approach === 'mood_first') {
      // Mood-first: Start with destinations matching mood, then apply taste
      recommendations = await moodFilter.getMoodRecommendations(
        user_id,
        mood,
        limit,
        0.3 // 30% taste weight
      )
    } else {
      // Taste-first: Start with taste matches, then filter by mood
      const tasteMatches = await tasteMatcher.getCachedMatches(user_id, limit * 2)
      recommendations = await moodFilter.filterByMood(user_id, mood, tasteMatches)
      recommendations = recommendations.slice(0, limit)
    }

    console.log(`[MoodFilter] Found ${recommendations.length} mood-filtered recommendations`)

    return NextResponse.json({
      success: true,
      mood,
      approach,
      count: recommendations.length,
      recommendations,
    })
  } catch (error) {
    console.error('[MoodFilter] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to filter by mood',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
