/**
 * Explainable Recommendations API
 * Generates recommendations with human-readable reasons using Gemini AI
 *
 * GET /api/recommendations/explainable?user_id=...&limit=20
 */

import { NextRequest, NextResponse } from 'next/server'
import { explainableRecommender } from '@/services/recommendations/explainable'
import { tasteMatcher } from '@/services/taste/matcher'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    console.log(`[ExplainableRecs] Generating for user ${user_id}, limit: ${limit}`)

    // Step 1: Get taste-based match scores
    const matches = await tasteMatcher.calculateAllMatches(user_id)

    if (matches.length === 0) {
      return NextResponse.json({
        recommendations: [],
        message: 'No taste profile found. Please generate a taste profile first.',
      })
    }

    // Step 2: Take top N matches
    const topMatches = matches.slice(0, limit)

    // Step 3: Generate explanations for top matches
    console.log(`[ExplainableRecs] Generating explanations for ${topMatches.length} destinations`)
    const recommendations = await explainableRecommender.generateBatchExplanations(
      user_id,
      topMatches
    )

    console.log(
      `[ExplainableRecs] Successfully generated ${recommendations.length} explainable recommendations`
    )

    return NextResponse.json({
      success: true,
      count: recommendations.length,
      recommendations,
    })
  } catch (error) {
    console.error('[ExplainableRecs] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate explainable recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Get explanation for specific destination
 *
 * POST /api/recommendations/explainable
 * Body: { user_id: string, destination_id: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, destination_id } = body

    if (!user_id || !destination_id) {
      return NextResponse.json(
        { error: 'user_id and destination_id are required' },
        { status: 400 }
      )
    }

    // Calculate match score
    const matchScore = await tasteMatcher.calculateMatch(user_id, destination_id)

    if (!matchScore) {
      return NextResponse.json(
        { error: 'Could not calculate match score. Check if taste profile exists.' },
        { status: 404 }
      )
    }

    // Generate explanation
    const recommendation = await explainableRecommender.generateExplanation(
      user_id,
      destination_id,
      matchScore
    )

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Failed to generate explanation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      recommendation,
    })
  } catch (error) {
    console.error('[ExplainableRecs] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate explanation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
