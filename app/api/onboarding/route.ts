/**
 * Onboarding API
 * Handles onboarding flow for new users
 *
 * GET /api/onboarding?user_id=... - Get questions and progress
 * POST /api/onboarding - Submit onboarding responses
 */

import { NextRequest, NextResponse } from 'next/server'
import { onboardingProcessor } from '@/services/onboarding/onboarding-processor'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    // Get onboarding questions
    const questions = await onboardingProcessor.getQuestions()

    // If user_id provided, include progress
    let progress = null
    let responses = null

    if (user_id) {
      progress = await onboardingProcessor.getProgress(user_id)
      responses = await onboardingProcessor.getResponses(user_id)
    }

    return NextResponse.json({
      success: true,
      questions,
      progress,
      responses,
    })
  } catch (error) {
    console.error('[Onboarding] GET error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch onboarding data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    console.log(`[Onboarding] Processing onboarding for user ${body.user_id}`)

    // Process complete onboarding
    await onboardingProcessor.processOnboarding(body)

    // Get initial recommendations
    const recommendationIds = await onboardingProcessor.getInitialRecommendations(
      body.user_id,
      20
    )

    console.log(
      `[Onboarding] Complete! Generated ${recommendationIds.length} initial recommendations`
    )

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      recommendations_count: recommendationIds.length,
      recommendation_ids: recommendationIds,
    })
  } catch (error) {
    console.error('[Onboarding] POST error:', error)

    return NextResponse.json(
      {
        error: 'Failed to process onboarding',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
