/**
 * Weather-Aware Recommendations API
 * Get recommendations adjusted for current weather
 *
 * GET /api/weather/recommendations?user_id=...&city=Paris&limit=20&weather_weight=0.2
 */

import { NextRequest, NextResponse } from 'next/server'
import { weatherRecommendationFilter } from '@/services/weather/weather-recommendation-filter'
import { tasteMatcher } from '@/services/taste/matcher'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    const city = searchParams.get('city')
    const limit = parseInt(searchParams.get('limit') || '20')
    const weatherWeight = parseFloat(searchParams.get('weather_weight') || '0.2')

    if (!user_id || !city) {
      return NextResponse.json(
        { error: 'user_id and city are required' },
        { status: 400 }
      )
    }

    console.log(
      `[WeatherRecs] Getting weather-aware recommendations for user ${user_id} in ${city}`
    )

    // Get taste-based recommendations
    const tasteRecs = await tasteMatcher.getCachedMatches(user_id, limit * 2)

    if (tasteRecs.length === 0) {
      return NextResponse.json({
        success: true,
        recommendations: [],
        message: 'No taste profile found. Please complete onboarding first.',
      })
    }

    // Apply weather filtering
    const weatherAdjusted = await weatherRecommendationFilter.applyWeatherFilter(
      city,
      tasteRecs,
      weatherWeight
    )

    const topResults = weatherAdjusted.slice(0, limit)

    console.log(
      `[WeatherRecs] Found ${topResults.length} weather-adjusted recommendations`
    )

    return NextResponse.json({
      success: true,
      count: topResults.length,
      recommendations: topResults,
      weather_weight: weatherWeight,
    })
  } catch (error) {
    console.error('[WeatherRecs] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to get weather-aware recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
