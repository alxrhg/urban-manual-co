/**
 * React Hooks for Weather Integration
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import useSWR from 'swr'

// Types
export interface Weather {
  city: string
  country?: string
  temperature: number
  feels_like: number
  weather_condition: string
  weather_description: string
  humidity: number
  wind_speed: number
  emoji: string
  fetched_at: string
  expires_at: string
}

export interface WeatherAdjustedRecommendation {
  destination_id: number
  overall_score: number
  weather_score: number
  weather_boost: number
  weather_reason: string
  final_score: number
}

// Get current weather for a city
export function useWeather(city: string | null, country?: string) {
  const countryParam = country ? '&country=' + country : ''
  
  const { data, error, isLoading } = useSWR(
    city ? '/api/weather?city=' + city + countryParam : null,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch weather')
      const json = await res.json()
      return json.weather as Weather
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600000,
    }
  )

  return { weather: data, isLoading, error }
}

// Get weather-aware recommendations
export function useWeatherRecommendations(
  city: string | null,
  limit: number = 20,
  weatherWeight: number = 0.2
) {
  const { user } = useAuth()

  const url = user?.id && city
    ? '/api/weather/recommendations?user_id=' + user.id + '&city=' + city + '&limit=' + limit + '&weather_weight=' + weatherWeight
    : null

  const { data, error, isLoading, mutate } = useSWR(
    url,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch weather recommendations')
      const json = await res.json()
      return json.recommendations as WeatherAdjustedRecommendation[]
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  return { recommendations: data || [], isLoading, error, refresh: mutate }
}

// Get weather emoji
export function useWeatherEmoji(condition: string | undefined): string {
  const emojiMap: Record<string, string> = {
    sunny: '☀️',
    cloudy: '☁️',
    partly_cloudy: '⛅',
    rain: '🌧️',
    storm: '⛈️',
    snow: '❄️',
    foggy: '🌫️',
    windy: '💨',
    dusty: '🌪️',
  }
  return condition ? emojiMap[condition] || '🌤️' : '🌤️'
}

// Format temperature
export function useTemperatureFormat(
  temperature: number | undefined,
  unit: 'C' | 'F' = 'C'
): string {
  if (temperature === undefined) return '--°'
  if (unit === 'F') {
    const fahrenheit = (temperature * 9) / 5 + 32
    return Math.round(fahrenheit) + '°F'
  }
  return Math.round(temperature) + '°C'
}

// Get weather alert severity color
export function useWeatherAlertColor(score: number): {
  bg: string
  text: string
  border: string
} {
  if (score >= 0.7) {
    return { bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-200' }
  } else if (score >= 0.5) {
    return { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200' }
  } else {
    return { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200' }
  }
}
