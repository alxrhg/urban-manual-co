/**
 * Weather Service
 * Fetches and caches weather data from OpenWeatherMap API
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// Types
// ============================================

export interface WeatherData {
  city: string
  country?: string
  temperature: number // Celsius
  feels_like: number
  weather_condition: string
  weather_description: string
  humidity: number
  wind_speed: number
  precipitation_probability?: number
  sunrise?: Date
  sunset?: Date
  uv_index?: number
  fetched_at: Date
  expires_at: Date
}

export interface WeatherScore {
  destination_id: number
  weather_score: number
  reason: string
  boost_applied: number
}

// ============================================
// Weather Service
// ============================================

export class WeatherService {
  private readonly CACHE_DURATION_HOURS = 1
  private readonly API_KEY = process.env.OPENWEATHERMAP_API_KEY

  /**
   * Get current weather for a city
   */
  async getWeather(city: string, country?: string): Promise<WeatherData> {
    // Check cache first
    const cached = await this.getCachedWeather(city, country)
    if (cached) {
      return cached
    }

    // Fetch from API
    const weather = await this.fetchWeatherFromAPI(city, country)

    // Cache the result
    await this.cacheWeather(weather)

    return weather
  }

  /**
   * Get cached weather data
   */
  private async getCachedWeather(
    city: string,
    country?: string
  ): Promise<WeatherData | null> {
    const query = supabase
      .from('weather_cache')
      .select('*')
      .eq('city', city)
      .gt('expires_at', new Date().toISOString())

    if (country) {
      query.eq('country', country)
    }

    const { data, error } = await query.single()

    if (error || !data) {
      return null
    }

    return {
      city: data.city,
      country: data.country,
      temperature: data.temperature,
      feels_like: data.feels_like,
      weather_condition: data.weather_condition,
      weather_description: data.weather_description,
      humidity: data.humidity,
      wind_speed: data.wind_speed,
      precipitation_probability: data.precipitation_probability,
      sunrise: data.sunrise ? new Date(data.sunrise) : undefined,
      sunset: data.sunset ? new Date(data.sunset) : undefined,
      uv_index: data.uv_index,
      fetched_at: new Date(data.fetched_at),
      expires_at: new Date(data.expires_at),
    }
  }

  /**
   * Fetch weather from OpenWeatherMap API
   */
  private async fetchWeatherFromAPI(
    city: string,
    country?: string
  ): Promise<WeatherData> {
    if (!this.API_KEY) {
      throw new Error('OPENWEATHERMAP_API_KEY not configured')
    }

    const locationQuery = country ? `${city},${country}` : city
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      locationQuery
    )}&appid=${this.API_KEY}&units=metric`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      city,
      country: country || data.sys?.country,
      temperature: data.main.temp,
      feels_like: data.main.feels_like,
      weather_condition: this.mapWeatherCondition(data.weather[0].main),
      weather_description: data.weather[0].description,
      humidity: data.main.humidity,
      wind_speed: data.wind.speed,
      precipitation_probability: data.rain?.['1h'] || data.snow?.['1h'],
      sunrise: data.sys.sunrise ? new Date(data.sys.sunrise * 1000) : undefined,
      sunset: data.sys.sunset ? new Date(data.sys.sunset * 1000) : undefined,
      fetched_at: new Date(),
      expires_at: new Date(Date.now() + this.CACHE_DURATION_HOURS * 60 * 60 * 1000),
    }
  }

  /**
   * Map OpenWeatherMap conditions to our standardized conditions
   */
  private mapWeatherCondition(condition: string): string {
    const mapping: Record<string, string> = {
      Clear: 'sunny',
      Clouds: 'cloudy',
      Rain: 'rain',
      Drizzle: 'rain',
      Thunderstorm: 'storm',
      Snow: 'snow',
      Mist: 'foggy',
      Smoke: 'foggy',
      Haze: 'foggy',
      Dust: 'dusty',
      Fog: 'foggy',
      Sand: 'dusty',
      Ash: 'dusty',
      Squall: 'windy',
      Tornado: 'storm',
    }

    return mapping[condition] || 'partly_cloudy'
  }

  /**
   * Cache weather data
   */
  private async cacheWeather(weather: WeatherData): Promise<void> {
    const { error } = await supabase.from('weather_cache').upsert(
      {
        city: weather.city,
        country: weather.country,
        temperature: weather.temperature,
        feels_like: weather.feels_like,
        weather_condition: weather.weather_condition,
        weather_description: weather.weather_description,
        humidity: weather.humidity,
        wind_speed: weather.wind_speed,
        precipitation_probability: weather.precipitation_probability,
        sunrise: weather.sunrise?.toISOString(),
        sunset: weather.sunset?.toISOString(),
        uv_index: weather.uv_index,
        fetched_at: weather.fetched_at.toISOString(),
        expires_at: weather.expires_at.toISOString(),
      },
      { onConflict: 'city,country' }
    )

    if (error) {
      console.error('Failed to cache weather:', error)
    }
  }

  /**
   * Calculate weather score for destination
   */
  async calculateWeatherScore(
    destinationId: number,
    weather: WeatherData
  ): Promise<WeatherScore> {
    // Get destination weather preferences
    const { data: prefs, error } = await supabase
      .from('destination_weather_preferences')
      .select('*')
      .eq('destination_id', destinationId)
      .single()

    if (error || !prefs) {
      // No preferences, return neutral score
      return {
        destination_id: destinationId,
        weather_score: 0.7,
        reason: 'No weather preferences set',
        boost_applied: 0,
      }
    }

    let score = 0.7 // Start neutral
    const reasons: string[] = []

    // If not weather-dependent, high score
    if (!prefs.weather_dependent) {
      return {
        destination_id: destinationId,
        weather_score: 0.9,
        reason: 'Indoor destination, weather independent',
        boost_applied: 0.2,
      }
    }

    // Check temperature range
    if (
      prefs.ideal_temperature_min &&
      weather.temperature < prefs.ideal_temperature_min
    ) {
      score -= 0.2
      reasons.push('Too cold')
    }

    if (
      prefs.ideal_temperature_max &&
      weather.temperature > prefs.ideal_temperature_max
    ) {
      score -= 0.2
      reasons.push('Too hot')
    }

    // Check ideal conditions
    if (
      prefs.ideal_weather_conditions &&
      prefs.ideal_weather_conditions.includes(weather.weather_condition)
    ) {
      score += 0.2
      reasons.push('Perfect weather')
    }

    // Check conditions to avoid
    if (
      prefs.avoid_weather_conditions &&
      prefs.avoid_weather_conditions.includes(weather.weather_condition)
    ) {
      score -= 0.3
      reasons.push(`${weather.weather_condition} not ideal`)
    }

    // Special conditions
    if (prefs.requires_good_visibility && weather.weather_condition === 'foggy') {
      score -= 0.2
      reasons.push('Poor visibility')
    }

    if (prefs.heat_sensitive && weather.temperature > 30) {
      score -= 0.2
      reasons.push('Too hot for this venue')
    }

    if (prefs.cold_sensitive && weather.temperature < 10) {
      score -= 0.3
      reasons.push('Too cold for this venue')
    }

    // Clamp score
    score = Math.max(0, Math.min(1, score))
    const boost = score - 0.7

    return {
      destination_id: destinationId,
      weather_score: score,
      reason: reasons.join(', ') || 'Weather acceptable',
      boost_applied: boost,
    }
  }

  /**
   * Get weather-appropriate destinations for a city
   */
  async getWeatherAppropriateDestinations(
    city: string,
    limit: number = 20
  ): Promise<WeatherScore[]> {
    // Get current weather
    const weather = await this.getWeather(city)

    // Get all destinations in this city
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('id')
      .eq('city', city)
      .limit(limit * 2) // Get more than needed to filter

    if (error || !destinations) {
      return []
    }

    // Calculate weather scores for each
    const scores = await Promise.all(
      destinations.map((dest) =>
        this.calculateWeatherScore(dest.id, weather)
      )
    )

    // Sort by score and return top results
    return scores.sort((a, b) => b.weather_score - a.weather_score).slice(0, limit)
  }

  /**
   * Get current season for location
   */
  getCurrentSeason(latitude: number): 'spring' | 'summer' | 'fall' | 'winter' {
    const month = new Date().getMonth() + 1 // 1-12
    const isNorthern = latitude >= 0

    if (isNorthern) {
      if (month >= 3 && month <= 5) return 'spring'
      if (month >= 6 && month <= 8) return 'summer'
      if (month >= 9 && month <= 11) return 'fall'
      return 'winter'
    } else {
      if (month >= 3 && month <= 5) return 'fall'
      if (month >= 6 && month <= 8) return 'winter'
      if (month >= 9 && month <= 11) return 'spring'
      return 'summer'
    }
  }

  /**
   * Check if destination is in ideal season
   */
  async isIdealSeason(destinationId: number, latitude: number): Promise<boolean> {
    const season = this.getCurrentSeason(latitude)

    const { data: prefs } = await supabase
      .from('destination_weather_preferences')
      .select('best_seasons, worst_seasons')
      .eq('destination_id', destinationId)
      .single()

    if (!prefs) return true // No preferences, always good

    if (prefs.worst_seasons && prefs.worst_seasons.includes(season)) {
      return false
    }

    if (prefs.best_seasons && prefs.best_seasons.length > 0) {
      return prefs.best_seasons.includes(season)
    }

    return true
  }

  /**
   * Get weather emoji
   */
  getWeatherEmoji(condition: string): string {
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

    return emojiMap[condition] || '🌤️'
  }
}

// ============================================
// Singleton Instance
// ============================================

export const weatherService = new WeatherService()
