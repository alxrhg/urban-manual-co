/**
 * Weather API
 * Get current weather for a city
 *
 * GET /api/weather?city=Paris&country=FR
 */

import { NextRequest, NextResponse } from 'next/server'
import { weatherService } from '@/services/weather/weather-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const city = searchParams.get('city')
    const country = searchParams.get('country')

    if (!city) {
      return NextResponse.json({ error: 'city parameter is required' }, { status: 400 })
    }

    const weather = await weatherService.getWeather(city, country || undefined)

    return NextResponse.json({
      success: true,
      weather: {
        ...weather,
        emoji: weatherService.getWeatherEmoji(weather.weather_condition),
      },
    })
  } catch (error) {
    console.error('[Weather] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch weather',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
