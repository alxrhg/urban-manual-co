/**
 * Taste Signal Extractor
 * Extracts behavioral taste signals from user interaction data
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// Types
// ============================================

export interface TasteSignals {
  user_id: string

  // Distribution signals
  cuisine_distribution: Record<string, number>
  price_distribution: Record<string, number>
  category_distribution: Record<string, number>

  // Engagement patterns
  high_engagement_destinations: string[]
  avg_engagement_by_cuisine: Record<string, number>
  avg_engagement_by_price: Record<string, number>

  // Behavioral patterns
  browsing_speed: number
  exploration_rate: number
  save_rate: number
  booking_intent_rate: number

  // Temporal patterns
  preferred_time_of_day: string[]
  preferred_day_of_week: number[]
}

interface InteractionWithDestination {
  destination_id: number
  engagement_score: number
  dwell_time_ms: number
  scroll_depth_percentage: number
  booking_link_clicks: number
  save_button_hovers: number
  created_at: string
  destination: {
    cuisine_type?: string
    price_level?: number
    category?: string
  }
}

// ============================================
// Signal Extraction
// ============================================

export class TasteSignalExtractor {
  /**
   * Extract taste signals from user's recent interactions
   */
  async extractSignals(
    userId: string,
    lookbackDays: number = 30
  ): Promise<TasteSignals> {
    // Fetch user's interactions with destination data
    const interactions = await this.fetchUserInteractions(userId, lookbackDays)

    if (interactions.length === 0) {
      return this.getEmptySignals(userId)
    }

    // Extract various signals
    const cuisineDistribution = this.extractCuisineDistribution(interactions)
    const priceDistribution = this.extractPriceDistribution(interactions)
    const categoryDistribution = this.extractCategoryDistribution(interactions)

    const highEngagementDestinations = this.extractHighEngagementDestinations(interactions)
    const avgEngagementByCuisine = this.calculateAvgEngagementByCuisine(interactions)
    const avgEngagementByPrice = this.calculateAvgEngagementByPrice(interactions)

    const browsingSpeed = this.calculateBrowsingSpeed(interactions)
    const explorationRate = this.calculateExplorationRate(interactions)
    const saveRate = this.calculateSaveRate(interactions)
    const bookingIntentRate = this.calculateBookingIntentRate(interactions)

    const preferredTimeOfDay = this.extractPreferredTimeOfDay(interactions)
    const preferredDayOfWeek = this.extractPreferredDayOfWeek(interactions)

    return {
      user_id: userId,
      cuisine_distribution: cuisineDistribution,
      price_distribution: priceDistribution,
      category_distribution: categoryDistribution,
      high_engagement_destinations: highEngagementDestinations,
      avg_engagement_by_cuisine: avgEngagementByCuisine,
      avg_engagement_by_price: avgEngagementByPrice,
      browsing_speed: browsingSpeed,
      exploration_rate: explorationRate,
      save_rate: saveRate,
      booking_intent_rate: bookingIntentRate,
      preferred_time_of_day: preferredTimeOfDay,
      preferred_day_of_week: preferredDayOfWeek,
    }
  }

  /**
   * Save signals to database
   */
  async saveSignals(signals: TasteSignals): Promise<void> {
    const { error } = await supabase
      .from('taste_signals')
      .upsert({
        user_id: signals.user_id,
        cuisine_distribution: signals.cuisine_distribution,
        price_distribution: signals.price_distribution,
        category_distribution: signals.category_distribution,
        high_engagement_destinations: signals.high_engagement_destinations,
        avg_engagement_by_cuisine: signals.avg_engagement_by_cuisine,
        avg_engagement_by_price: signals.avg_engagement_by_price,
        browsing_speed: signals.browsing_speed,
        exploration_rate: signals.exploration_rate,
        save_rate: signals.save_rate,
        booking_intent_rate: signals.booking_intent_rate,
        preferred_time_of_day: signals.preferred_time_of_day,
        preferred_day_of_week: signals.preferred_day_of_week,
        last_calculated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      throw new Error(`Failed to save taste signals: ${error.message}`)
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  private async fetchUserInteractions(
    userId: string,
    lookbackDays: number
  ): Promise<InteractionWithDestination[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)

    const { data, error } = await supabase
      .from('enriched_interactions')
      .select(`
        destination_id,
        engagement_score,
        dwell_time_ms,
        scroll_depth_percentage,
        booking_link_clicks,
        save_button_hovers,
        created_at,
        destinations:destination_id (
          cuisine_type,
          price_level,
          category
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching interactions:', error)
      return []
    }

    return data as any // Type assertion for joined data
  }

  private extractCuisineDistribution(
    interactions: InteractionWithDestination[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {}

    for (const interaction of interactions) {
      const cuisine = interaction.destination?.cuisine_type
      if (cuisine) {
        distribution[cuisine] = (distribution[cuisine] || 0) + 1
      }
    }

    return distribution
  }

  private extractPriceDistribution(
    interactions: InteractionWithDestination[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {}

    for (const interaction of interactions) {
      const price = interaction.destination?.price_level
      if (price) {
        const key = price.toString()
        distribution[key] = (distribution[key] || 0) + 1
      }
    }

    return distribution
  }

  private extractCategoryDistribution(
    interactions: InteractionWithDestination[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {}

    for (const interaction of interactions) {
      const category = interaction.destination?.category
      if (category) {
        distribution[category] = (distribution[category] || 0) + 1
      }
    }

    return distribution
  }

  private extractHighEngagementDestinations(
    interactions: InteractionWithDestination[]
  ): string[] {
    return interactions
      .filter(i => i.engagement_score >= 0.7)
      .map(i => i.destination_id.toString())
  }

  private calculateAvgEngagementByCuisine(
    interactions: InteractionWithDestination[]
  ): Record<string, number> {
    const cuisineEngagement: Record<string, { total: number; count: number }> = {}

    for (const interaction of interactions) {
      const cuisine = interaction.destination?.cuisine_type
      if (cuisine && interaction.engagement_score) {
        if (!cuisineEngagement[cuisine]) {
          cuisineEngagement[cuisine] = { total: 0, count: 0 }
        }
        cuisineEngagement[cuisine].total += interaction.engagement_score
        cuisineEngagement[cuisine].count += 1
      }
    }

    const result: Record<string, number> = {}
    for (const [cuisine, data] of Object.entries(cuisineEngagement)) {
      result[cuisine] = data.total / data.count
    }

    return result
  }

  private calculateAvgEngagementByPrice(
    interactions: InteractionWithDestination[]
  ): Record<string, number> {
    const priceEngagement: Record<string, { total: number; count: number }> = {}

    for (const interaction of interactions) {
      const price = interaction.destination?.price_level
      if (price && interaction.engagement_score) {
        const key = price.toString()
        if (!priceEngagement[key]) {
          priceEngagement[key] = { total: 0, count: 0 }
        }
        priceEngagement[key].total += interaction.engagement_score
        priceEngagement[key].count += 1
      }
    }

    const result: Record<string, number> = {}
    for (const [price, data] of Object.entries(priceEngagement)) {
      result[price] = data.total / data.count
    }

    return result
  }

  private calculateBrowsingSpeed(
    interactions: InteractionWithDestination[]
  ): number {
    if (interactions.length === 0) return 0.5

    const avgDwellTime = interactions.reduce(
      (sum, i) => sum + i.dwell_time_ms,
      0
    ) / interactions.length

    // Normalize: < 30s = fast (0), > 5min = slow (1)
    const normalized = Math.min(avgDwellTime / 300000, 1)
    return normalized
  }

  private calculateExplorationRate(
    interactions: InteractionWithDestination[]
  ): number {
    if (interactions.length === 0) return 0.5

    const uniqueDestinations = new Set(
      interactions.map(i => i.destination_id)
    ).size

    // Exploration = unique / total
    return uniqueDestinations / interactions.length
  }

  private calculateSaveRate(
    interactions: InteractionWithDestination[]
  ): number {
    if (interactions.length === 0) return 0

    const saveHovers = interactions.filter(i => i.save_button_hovers > 0).length
    return saveHovers / interactions.length
  }

  private calculateBookingIntentRate(
    interactions: InteractionWithDestination[]
  ): number {
    if (interactions.length === 0) return 0

    const bookingClicks = interactions.filter(i => i.booking_link_clicks > 0).length
    return bookingClicks / interactions.length
  }

  private extractPreferredTimeOfDay(
    interactions: InteractionWithDestination[]
  ): string[] {
    const hourCounts: Record<string, number> = {
      morning: 0,   // 6-11
      lunch: 0,     // 11-14
      afternoon: 0, // 14-17
      evening: 0,   // 17-21
      night: 0,     // 21-6
    }

    for (const interaction of interactions) {
      const hour = new Date(interaction.created_at).getHours()

      if (hour >= 6 && hour < 11) hourCounts.morning++
      else if (hour >= 11 && hour < 14) hourCounts.lunch++
      else if (hour >= 14 && hour < 17) hourCounts.afternoon++
      else if (hour >= 17 && hour < 21) hourCounts.evening++
      else hourCounts.night++
    }

    // Return top 2 time periods
    return Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([period]) => period)
  }

  private extractPreferredDayOfWeek(
    interactions: InteractionWithDestination[]
  ): number[] {
    const dayCounts: Record<number, number> = {
      0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
    }

    for (const interaction of interactions) {
      const day = new Date(interaction.created_at).getDay()
      dayCounts[day]++
    }

    // Return days with above-average activity
    const avgCount = interactions.length / 7
    return Object.entries(dayCounts)
      .filter(([_, count]) => count > avgCount)
      .map(([day]) => parseInt(day))
  }

  private getEmptySignals(userId: string): TasteSignals {
    return {
      user_id: userId,
      cuisine_distribution: {},
      price_distribution: {},
      category_distribution: {},
      high_engagement_destinations: [],
      avg_engagement_by_cuisine: {},
      avg_engagement_by_price: {},
      browsing_speed: 0.5,
      exploration_rate: 0.5,
      save_rate: 0,
      booking_intent_rate: 0,
      preferred_time_of_day: [],
      preferred_day_of_week: [],
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

export const tasteSignalExtractor = new TasteSignalExtractor()
