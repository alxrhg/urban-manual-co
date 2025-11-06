/**
 * Taste Profile Generation API
 * Generates or updates a user's taste profile from their interactions
 *
 * POST /api/taste/generate
 * Body: { user_id: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { tasteSignalExtractor } from '@/services/taste/signal-extractor'
import { tasteEmbeddingGenerator } from '@/services/taste/embedding-generator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Step 1: Extract taste signals from interactions
    console.log(`[TasteProfile] Extracting signals for user ${user_id}`)
    const signals = await tasteSignalExtractor.extractSignals(user_id, 30)

    // Save signals
    await tasteSignalExtractor.saveSignals(signals)

    // Step 2: Generate taste profile with embeddings
    console.log(`[TasteProfile] Generating embeddings for user ${user_id}`)
    const profile = await tasteEmbeddingGenerator.generateTasteProfile(
      user_id,
      signals
    )

    // Step 3: Save taste profile
    await tasteEmbeddingGenerator.saveTasteProfile(profile)

    console.log(
      `[TasteProfile] Successfully generated profile for user ${user_id} (confidence: ${profile.confidence_score.toFixed(2)})`
    )

    return NextResponse.json({
      success: true,
      profile: {
        user_id: profile.user_id,
        confidence_score: profile.confidence_score,
        interaction_count: profile.interaction_count,
        top_cuisines: Object.entries(profile.cuisine_preferences)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([cuisine, count]) => ({ cuisine, count })),
        avg_price_point: profile.avg_price_point,
        novelty_seeking: profile.novelty_seeking,
      },
    })
  } catch (error) {
    console.error('[TasteProfile] Generation error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate taste profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve existing profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    const { createClient } = await import('@supabase/supabase-js')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile, error } = await supabase
      .from('taste_profiles')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      profile,
    })
  } catch (error) {
    console.error('[TasteProfile] Retrieval error:', error)

    return NextResponse.json(
      {
        error: 'Failed to retrieve taste profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
