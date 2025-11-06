/**
 * Weather-Based Recommendation Filter
 * Adjusts recommendations based on current weather conditions
 */

import { weatherService, WeatherData, WeatherScore } from './weather-service'
import { MatchScore } from '../taste/matcher'

// ============================================
// Types
// ============================================

export interface WeatherAdjustedRecommendation extends MatchScore {
  weather_score: number
  weather_boost: number
  weather_reason: string
  final_score: number
}

// ============================================
// Weather Recommendation Filter
// ============================================

export class WeatherRecommendationFilter {
  /**
   * Apply weather filtering to recommendations
   */
  async applyWeatherFilter(
    city: string,
    recommendations: MatchScore[],
    weatherWeight: number = 0.2
  ): Promise<WeatherAdjustedRecommendation[]> {
    // Get current weather
    const weather = await weatherService.getWeather(city)

    // Calculate weather scores for all destinations
    const weatherScores = await Promise.all(
      recommendations.map((rec) =>
        weatherService.calculateWeatherScore(rec.destination_id, weather)
      )
    )

    const weatherScoreMap = new Map(
      weatherScores.map((ws) => [ws.destination_id, ws])
    )

    // Combine taste scores with weather scores
    const adjusted = recommendations.map((rec) => {
      const weatherScore = weatherScoreMap.get(rec.destination_id)

      if (!weatherScore) {
        return {
          ...rec,
          weather_score: 0.7,
          weather_boost: 0,
          weather_reason: 'No weather data',
          final_score: rec.overall_score,
        }
      }

      // Combined score: taste * (1 - weatherWeight) + weather * weatherWeight
      const tasteComponent = rec.overall_score * (1 - weatherWeight)
      const weatherComponent = weatherScore.weather_score * weatherWeight

      const finalScore = tasteComponent + weatherComponent

      return {
        ...rec,
        weather_score: weatherScore.weather_score,
        weather_boost: weatherScore.boost_applied,
        weather_reason: weatherScore.reason,
        final_score: finalScore,
      }
    })

    // Sort by final score
    adjusted.sort((a, b) => b.final_score - a.final_score)

    return adjusted
  }

  /**
   * Get weather-first recommendations
   * Start with weather-appropriate destinations, then apply taste
   */
  async getWeatherFirstRecommendations(
    userId: string,
    city: string,
    limit: number = 20
  ): Promise<WeatherAdjustedRecommendation[]> {
    // Get weather-appropriate destinations
    const weatherScores = await weatherService.getWeatherAppropriateDestinations(
      city,
      limit * 2
    )

    // For each destination, we'd need to get taste scores
    // Simplified: return weather scores as recommendations
    // In production, you'd combine with taste profiles

    return weatherScores.map((ws) => ({
      user_id: userId,
      destination_id: ws.destination_id,
      overall_score: ws.weather_score,
      dimension_scores: {
        food: 0.5,
        ambiance: 0.5,
        price: 0.5,
        adventure: 0.5,
        culture: 0.5,
      },
      confidence: 0.5,
      reasons: [],
      weather_score: ws.weather_score,
      weather_boost: ws.boost_applied,
      weather_reason: ws.reason,
      final_score: ws.weather_score,
    }))
  }

  /**
   * Get weather alert for destination
   */
  async getWeatherAlert(
    destinationId: number,
    city: string
  ): Promise<{
    hasAlert: boolean
    severity: 'info' | 'warning' | 'critical'
    message: string
  } | null> {
    const weather = await weatherService.getWeather(city)
    const weatherScore = await weatherService.calculateWeatherScore(
      destinationId,
      weather
    )

    if (weatherScore.weather_score >= 0.7) {
      return null // No alert needed
    }

    let severity: 'info' | 'warning' | 'critical'
    let message: string

    if (weatherScore.weather_score < 0.4) {
      severity = 'critical'
      message = `Not recommended due to current weather: ${weatherScore.reason}`
    } else if (weatherScore.weather_score < 0.6) {
      severity = 'warning'
      message = `Weather may affect your experience: ${weatherScore.reason}`
    } else {
      severity = 'info'
      message = `Consider the weather: ${weatherScore.reason}`
    }

    return {
      hasAlert: true,
      severity,
      message,
    }
  }

  /**
   * Get alternative suggestions for bad weather
   */
  async getWeatherAlternatives(
    city: string,
    originalDestinationId: number,
    limit: number = 5
  ): Promise<number[]> {
    const weather = await weatherService.getWeather(city)

    // If bad weather (rain, storm, extreme cold/heat), suggest indoor alternatives
    const isBadWeather =
      weather.weather_condition === 'rain' ||
      weather.weather_condition === 'storm' ||
      weather.temperature < 5 ||
      weather.temperature > 35

    if (!isBadWeather) {
      return []
    }

    // Get indoor destinations with weather_dependent = false
    const weatherScores = await weatherService.getWeatherAppropriateDestinations(
      city,
      limit * 2
    )

    // Filter for high weather scores (indoor venues)
    return weatherScores
      .filter((ws) => ws.weather_score >= 0.8)
      .slice(0, limit)
      .map((ws) => ws.destination_id)
  }

  /**
   * Get best time to visit based on weather preferences
   */
  async getBestTimeToVisit(
    destinationId: number
  ): Promise<{
    bestMonths: string[]
    worstMonths: string[]
    reason: string
  } | null> {
    // This would require historical weather data
    // Simplified implementation
    return {
      bestMonths: ['April', 'May', 'September', 'October'],
      worstMonths: ['July', 'August', 'January', 'February'],
      reason: 'Based on historical weather patterns and destination preferences',
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

export const weatherRecommendationFilter = new WeatherRecommendationFilter()
