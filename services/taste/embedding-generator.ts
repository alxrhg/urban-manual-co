/**
 * Taste Embedding Generator
 * Generates multi-dimensional taste vectors using OpenAI embeddings
 */

import OpenAI from 'openai'
import { TasteSignals } from './signal-extractor'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// Types
// ============================================

export interface TasteProfile {
  user_id: string

  // Food dimension
  food_embedding: number[]
  cuisine_preferences: Record<string, number>
  michelin_affinity: number
  street_food_affinity: number
  fine_dining_affinity: number
  experimental_score: number

  // Ambiance dimension
  ambiance_embedding: number[]
  crowd_tolerance: number
  formality_preference: number
  indoor_outdoor_ratio: number
  modern_vs_historic: number

  // Price dimension
  avg_price_point: number
  price_variance: number
  value_sensitivity: number
  splurge_frequency: number

  // Adventure dimension
  novelty_seeking: number
  tourist_vs_local: number
  spontaneity_score: number
  risk_tolerance: number

  // Culture dimension
  culture_embedding: number[]
  art_affinity: number
  history_affinity: number
  architecture_affinity: number

  // Meta
  confidence_score: number
  interaction_count: number
  version: number
}

// ============================================
// Embedding Generator
// ============================================

export class TasteEmbeddingGenerator {
  /**
   * Generate complete taste profile from signals
   */
  async generateTasteProfile(
    userId: string,
    signals: TasteSignals
  ): Promise<TasteProfile> {
    // Generate embeddings for each dimension
    const foodEmbedding = await this.generateFoodEmbedding(signals)
    const ambianceEmbedding = await this.generateAmbianceEmbedding(signals)
    const cultureEmbedding = await this.generateCultureEmbedding(signals)

    // Calculate dimension scores
    const foodScores = this.calculateFoodScores(signals)
    const ambianceScores = this.calculateAmbianceScores(signals)
    const priceScores = this.calculatePriceScores(signals)
    const adventureScores = this.calculateAdventureScores(signals)
    const cultureScores = this.calculateCultureScores(signals)

    // Calculate confidence
    const interactionCount = await this.getInteractionCount(userId)
    const confidenceScore = this.calculateConfidence(interactionCount)

    return {
      user_id: userId,

      // Food
      food_embedding: foodEmbedding,
      cuisine_preferences: signals.cuisine_distribution,
      michelin_affinity: foodScores.michelin_affinity,
      street_food_affinity: foodScores.street_food_affinity,
      fine_dining_affinity: foodScores.fine_dining_affinity,
      experimental_score: foodScores.experimental_score,

      // Ambiance
      ambiance_embedding: ambianceEmbedding,
      crowd_tolerance: ambianceScores.crowd_tolerance,
      formality_preference: ambianceScores.formality_preference,
      indoor_outdoor_ratio: ambianceScores.indoor_outdoor_ratio,
      modern_vs_historic: ambianceScores.modern_vs_historic,

      // Price
      avg_price_point: priceScores.avg_price_point,
      price_variance: priceScores.price_variance,
      value_sensitivity: priceScores.value_sensitivity,
      splurge_frequency: priceScores.splurge_frequency,

      // Adventure
      novelty_seeking: adventureScores.novelty_seeking,
      tourist_vs_local: adventureScores.tourist_vs_local,
      spontaneity_score: adventureScores.spontaneity_score,
      risk_tolerance: adventureScores.risk_tolerance,

      // Culture
      culture_embedding: cultureEmbedding,
      art_affinity: cultureScores.art_affinity,
      history_affinity: cultureScores.history_affinity,
      architecture_affinity: cultureScores.architecture_affinity,

      // Meta
      confidence_score: confidenceScore,
      interaction_count: interactionCount,
      version: 1,
    }
  }

  /**
   * Save taste profile to database
   */
  async saveTasteProfile(profile: TasteProfile): Promise<void> {
    const { error } = await supabase
      .from('taste_profiles')
      .upsert({
        user_id: profile.user_id,

        // Food
        food_embedding: `[${profile.food_embedding.join(',')}]`, // Convert to PostgreSQL array
        cuisine_preferences: profile.cuisine_preferences,
        michelin_affinity: profile.michelin_affinity,
        street_food_affinity: profile.street_food_affinity,
        fine_dining_affinity: profile.fine_dining_affinity,
        experimental_score: profile.experimental_score,

        // Ambiance
        ambiance_embedding: `[${profile.ambiance_embedding.join(',')}]`,
        crowd_tolerance: profile.crowd_tolerance,
        formality_preference: profile.formality_preference,
        indoor_outdoor_ratio: profile.indoor_outdoor_ratio,
        modern_vs_historic: profile.modern_vs_historic,

        // Price
        avg_price_point: profile.avg_price_point,
        price_variance: profile.price_variance,
        value_sensitivity: profile.value_sensitivity,
        splurge_frequency: profile.splurge_frequency,

        // Adventure
        novelty_seeking: profile.novelty_seeking,
        tourist_vs_local: profile.tourist_vs_local,
        spontaneity_score: profile.spontaneity_score,
        risk_tolerance: profile.risk_tolerance,

        // Culture
        culture_embedding: `[${profile.culture_embedding.join(',')}]`,
        art_affinity: profile.art_affinity,
        history_affinity: profile.history_affinity,
        architecture_affinity: profile.architecture_affinity,

        // Meta
        confidence_score: profile.confidence_score,
        interaction_count: profile.interaction_count,
        version: profile.version,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      throw new Error(`Failed to save taste profile: ${error.message}`)
    }
  }

  // ============================================
  // Embedding Generation
  // ============================================

  private async generateFoodEmbedding(signals: TasteSignals): Promise<number[]> {
    // Build text description of food preferences
    const cuisineList = Object.entries(signals.cuisine_distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cuisine]) => cuisine)
      .join(', ')

    const description = `User enjoys ${cuisineList} cuisine. ${
      signals.avg_engagement_by_cuisine
        ? `Highest engagement with ${this.getTopCuisine(signals.avg_engagement_by_cuisine)}.`
        : ''
    }`

    return this.generateEmbedding(description)
  }

  private async generateAmbianceEmbedding(signals: TasteSignals): Promise<number[]> {
    const categoryPrefs = Object.entries(signals.category_distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat)
      .join(', ')

    const description = `User prefers ${categoryPrefs} type venues. ${
      signals.preferred_time_of_day.length > 0
        ? `Most active during ${signals.preferred_time_of_day.join(' and ')}.`
        : ''
    }`

    return this.generateEmbedding(description)
  }

  private async generateCultureEmbedding(signals: TasteSignals): Promise<number[]> {
    // Check if user engages with cultural content
    const culturalCategories = ['museum', 'gallery', 'theater', 'historical-site']
    const hasCulturalInterest = Object.keys(signals.category_distribution).some(cat =>
      culturalCategories.some(cultCat => cat.toLowerCase().includes(cultCat))
    )

    const description = hasCulturalInterest
      ? 'User shows interest in cultural activities, museums, and historical sites.'
      : 'User has limited cultural venue engagement.'

    return this.generateEmbedding(description)
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small', // 384 dimensions
        input: text,
      })

      return response.data[0].embedding
    } catch (error) {
      console.error('OpenAI embedding generation failed:', error)
      // Return zero vector as fallback
      return new Array(384).fill(0)
    }
  }

  // ============================================
  // Score Calculations
  // ============================================

  private calculateFoodScores(signals: TasteSignals) {
    // Michelin affinity: based on fine dining category presence
    const michelinAffinity = this.estimateMichelinAffinity(signals)

    // Street food affinity: based on casual/budget preferences
    const streetFoodAffinity = this.estimateStreetFoodAffinity(signals)

    // Fine dining: price level 3-4 preference
    const fineDiningAffinity = this.estimateFineDiningAffinity(signals)

    // Experimental: variety of cuisines
    const experimentalScore = signals.exploration_rate || 0.5

    return {
      michelin_affinity: michelinAffinity,
      street_food_affinity: streetFoodAffinity,
      fine_dining_affinity: fineDiningAffinity,
      experimental_score: experimentalScore,
    }
  }

  private calculateAmbianceScores(signals: TasteSignals) {
    // Crowd tolerance: inferred from category preferences
    const crowdTolerance = 0.5 // Default

    // Formality: based on price distribution
    const formalityPreference = this.calculateFormality(signals.price_distribution)

    // Indoor/outdoor: from category distribution
    const indoorOutdoorRatio = 0.5 // Default

    // Modern vs historic: placeholder
    const modernVsHistoric = 0.5

    return {
      crowd_tolerance: crowdTolerance,
      formality_preference: formalityPreference,
      indoor_outdoor_ratio: indoorOutdoorRatio,
      modern_vs_historic: modernVsHistoric,
    }
  }

  private calculatePriceScores(signals: TasteSignals) {
    const priceValues = Object.entries(signals.price_distribution).map(([price, count]) => ({
      price: parseInt(price),
      count,
    }))

    if (priceValues.length === 0) {
      return {
        avg_price_point: 2.5,
        price_variance: 0,
        value_sensitivity: 0.5,
        splurge_frequency: 0.2,
      }
    }

    // Calculate weighted average
    const totalCount = priceValues.reduce((sum, p) => sum + p.count, 0)
    const avgPricePoint = priceValues.reduce(
      (sum, p) => sum + p.price * p.count,
      0
    ) / totalCount

    // Calculate variance
    const priceVariance = Math.sqrt(
      priceValues.reduce(
        (sum, p) => sum + Math.pow(p.price - avgPricePoint, 2) * p.count,
        0
      ) / totalCount
    )

    // Value sensitivity: prefer good engagement at lower prices
    const valueSensitivity = this.calculateValueSensitivity(signals)

    // Splurge frequency: % of price level 4
    const splurgeFrequency = (signals.price_distribution['4'] || 0) / totalCount

    return {
      avg_price_point: avgPricePoint,
      price_variance: priceVariance,
      value_sensitivity: valueSensitivity,
      splurge_frequency: splurgeFrequency,
    }
  }

  private calculateAdventureScores(signals: TasteSignals) {
    return {
      novelty_seeking: signals.exploration_rate,
      tourist_vs_local: 0, // Neutral by default
      spontaneity_score: 0.5,
      risk_tolerance: signals.exploration_rate,
    }
  }

  private calculateCultureScores(signals: TasteSignals) {
    const culturalCategories = ['museum', 'gallery', 'theater', 'historical']

    let culturalCount = 0
    for (const [category, count] of Object.entries(signals.category_distribution)) {
      if (culturalCategories.some(c => category.toLowerCase().includes(c))) {
        culturalCount += count
      }
    }

    const totalCount = Object.values(signals.category_distribution).reduce((a, b) => a + b, 0)
    const culturalRatio = totalCount > 0 ? culturalCount / totalCount : 0

    return {
      art_affinity: culturalRatio,
      history_affinity: culturalRatio,
      architecture_affinity: culturalRatio,
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private estimateMichelinAffinity(signals: TasteSignals): number {
    const fineDiningEngagement = signals.avg_engagement_by_price?.['4'] || 0
    return Math.min(fineDiningEngagement, 1)
  }

  private estimateStreetFoodAffinity(signals: TasteSignals): number {
    const budgetEngagement = signals.avg_engagement_by_price?.['1'] || 0
    return Math.min(budgetEngagement, 1)
  }

  private estimateFineDiningAffinity(signals: TasteSignals): number {
    const priceDistribution = signals.price_distribution
    const total = Object.values(priceDistribution).reduce((a, b) => a + b, 0)

    if (total === 0) return 0

    const highEnd = (priceDistribution['3'] || 0) + (priceDistribution['4'] || 0)
    return highEnd / total
  }

  private calculateFormality(priceDistribution: Record<string, number>): number {
    const total = Object.values(priceDistribution).reduce((a, b) => a + b, 0)

    if (total === 0) return 0.5

    // Higher prices = more formal
    const weightedSum = Object.entries(priceDistribution).reduce(
      (sum, [price, count]) => sum + parseInt(price) * count,
      0
    )

    return (weightedSum / total - 1) / 3 // Normalize to 0-1
  }

  private calculateValueSensitivity(signals: TasteSignals): number {
    const avg1 = signals.avg_engagement_by_price?.['1'] || 0
    const avg4 = signals.avg_engagement_by_price?.['4'] || 0

    // High value sensitivity = high engagement at low prices
    return Math.max(0, avg1 - avg4 * 0.5)
  }

  private getTopCuisine(avgEngagement: Record<string, number>): string {
    const entries = Object.entries(avgEngagement)
    if (entries.length === 0) return 'various cuisines'

    const top = entries.sort((a, b) => b[1] - a[1])[0]
    return top[0]
  }

  private async getInteractionCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('enriched_interactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) {
      console.error('Error counting interactions:', error)
      return 0
    }

    return count || 0
  }

  private calculateConfidence(interactionCount: number): number {
    // Logarithmic growth: log(count + 1) / log(100)
    // 10 interactions = ~0.5, 50 interactions = ~0.85
    return Math.min(Math.log(interactionCount + 1) / Math.log(100), 0.95)
  }
}

// ============================================
// Singleton Instance
// ============================================

export const tasteEmbeddingGenerator = new TasteEmbeddingGenerator()
