/**
 * Mood List API
 * Returns all available moods and mood metadata
 *
 * GET /api/mood/list
 * GET /api/mood/list?category=energy
 * GET /api/mood/list?user_id=... (includes suggestions)
 */

import { NextRequest, NextResponse } from 'next/server'
import { moodFilter } from '@/services/mood/mood-filter'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const user_id = searchParams.get('user_id')

    if (category) {
      // Get moods by category
      const moodsByCategory = await moodFilter.getMoodsByCategory()
      return NextResponse.json({
        success: true,
        category,
        moods: moodsByCategory[category] || [],
      })
    }

    // Get all moods grouped by category
    const moodsByCategory = await moodFilter.getMoodsByCategory()

    // If user_id provided, include personalized suggestions
    let suggestedMoods: string[] = []
    if (user_id) {
      suggestedMoods = await moodFilter.getSuggestedMoods(user_id, 5)
    }

    return NextResponse.json({
      success: true,
      moods_by_category: moodsByCategory,
      suggested_moods: suggestedMoods,
      total_moods: Object.values(moodsByCategory).flat().length,
    })
  } catch (error) {
    console.error('[MoodList] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch moods',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
