/**
 * Taste Matching Service
 * Calculates user-destination compatibility using taste profiles
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// Types
// ============================================

export interface MatchScore {
  user_id: string
  destination_id: number
  overall_score: number
  dimension_scores: {
    food: number
    ambiance: number
    price: number
    adventure: number
    culture: number
  }
  confidence: number
  reasons: string[]
}

interface TasteProfile {
  user_id: string
  food_embedding?: number[]
  ambiance_embedding?: number[]
  culture_embedding?: number[]
  avg_price_point: number
  novelty_seeking: number
  formality_preference: number
  michelin_affinity: number
  confidence_score: number
}

interface DestinationProfile {
  destination_id: number
  food_embedding?: number[]
  ambiance_embedding?: number[]
  culture_embedding?: number[]
  price_level: number
  novelty_score: number
  formality_score: number
  michelin_status: boolean
}

// ============================================
// Taste Matcher
// ============================================

export class TasteMatcher {
  /**
   * Calculate match score between user and destination
   */
  async calculateMatch(
    userId: string,
    destinationId: number
  ): Promise<MatchScore | null> {
    // Fetch user taste profile
    const userProfile = await this.getUserProfile(userId)
    if (!userProfile) {
      console.log(`No taste profile found for user ${userId}`)
      return null
    }

    // Fetch destination taste profile
    const destProfile = await this.getDestinationProfile(destinationId)
    if (!destProfile) {
      console.log(`No taste profile found for destination ${destinationId}`)
      return null
    }

    // Calculate dimension scores
    const foodScore = this.calculateFoodMatch(userProfile, destProfile)
    const ambianceScore = this.calculateAmbianceMatch(userProfile, destProfile)
    const priceScore = this.calculatePriceMatch(userProfile, destProfile)
    const adventureScore = this.calculateAdventureMatch(userProfile, destProfile)
    const cultureScore = this.calculateCultureMatch(userProfile, destProfile)

    // Calculate weighted overall score
    const overallScore =
      foodScore * 0.35 +
      ambianceScore * 0.25 +
      priceScore * 0.20 +
      adventureScore * 0.10 +
      cultureScore * 0.10

    // Generate reasons
    const reasons = this.generateReasons(
      userProfile,
      destProfile,
      {
        food: foodScore,
        ambiance: ambianceScore,
        price: priceScore,
        adventure: adventureScore,
        culture: cultureScore,
      }
    )

    return {
      user_id: userId,
      destination_id: destinationId,
      overall_score: overallScore,
      dimension_scores: {
        food: foodScore,
        ambiance: ambianceScore,
        price: priceScore,
        adventure: adventureScore,
        culture: cultureScore,
      },
      confidence: userProfile.confidence_score,
      reasons,
    }
  }

  /**
   * Calculate and cache match scores for all destinations
   */
  async calculateAllMatches(userId: string): Promise<MatchScore[]> {
    // Get all destinations with profiles
    const destinations = await this.getAllDestinationIds()

    const matches: MatchScore[] = []

    for (const destId of destinations) {
      const match = await this.calculateMatch(userId, destId)
      if (match && match.overall_score > 0.3) {
        // Only keep matches above threshold
        matches.push(match)
      }
    }

    // Sort by score
    matches.sort((a, b) => b.overall_score - a.overall_score)

    return matches
  }

  /**
   * Save match scores to cache
   */
  async cacheMatchScores(matches: MatchScore[]): Promise<void> {
    const records = matches.map(match => ({
      user_id: match.user_id,
      destination_id: match.destination_id,
      overall_score: match.overall_score,
      food_match: match.dimension_scores.food,
      ambiance_match: match.dimension_scores.ambiance,
      price_match: match.dimension_scores.price,
      adventure_match: match.dimension_scores.adventure,
      culture_match: match.dimension_scores.culture,
      confidence: match.confidence,
      calculated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }))

    // Batch insert with upsert
    const { error } = await supabase
      .from('taste_match_scores')
      .upsert(records, {
        onConflict: 'user_id,destination_id'
      })

    if (error) {
      throw new Error(`Failed to cache match scores: ${error.message}`)
    }
  }

  /**
   * Get cached match scores for user
   */
  async getCachedMatches(
    userId: string,
    limit: number = 50
  ): Promise<MatchScore[]> {
    const { data, error } = await supabase
      .from('taste_match_scores')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('overall_score', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching cached matches:', error)
      return []
    }

    return (data || []).map(record => ({
      user_id: record.user_id,
      destination_id: record.destination_id,
      overall_score: record.overall_score,
      dimension_scores: {
        food: record.food_match,
        ambiance: record.ambiance_match,
        price: record.price_match,
        adventure: record.adventure_match,
        culture: record.culture_match,
      },
      confidence: record.confidence,
      reasons: [], // Not stored in cache
    }))
  }

  // ============================================
  // Dimension Matching
  // ============================================

  private calculateFoodMatch(
    user: TasteProfile,
    dest: DestinationProfile
  ): number {
    let score = 0

    // Embedding similarity (if available)
    if (user.food_embedding && dest.food_embedding) {
      const similarity = this.cosineSimilarity(
        user.food_embedding,
        dest.food_embedding
      )
      score += similarity * 0.7
    } else {
      score += 0.5 // Neutral if no embeddings
    }

    // Michelin match
    if (dest.michelin_status && user.michelin_affinity > 0.6) {
      score += 0.2
    }

    // Experimental match (inverse if user prefers traditional)
    score += 0.1

    return Math.min(score, 1)
  }

  private calculateAmbianceMatch(
    user: TasteProfile,
    dest: DestinationProfile
  ): number {
    let score = 0

    // Embedding similarity
    if (user.ambiance_embedding && dest.ambiance_embedding) {
      const similarity = this.cosineSimilarity(
        user.ambiance_embedding,
        dest.ambiance_embedding
      )
      score += similarity * 0.7
    } else {
      score += 0.5
    }

    // Formality match
    if (dest.formality_score !== undefined && user.formality_preference !== undefined) {
      const formalityDiff = Math.abs(user.formality_preference - dest.formality_score)
      score += (1 - formalityDiff) * 0.3
    }

    return Math.min(score, 1)
  }

  private calculatePriceMatch(
    user: TasteProfile,
    dest: DestinationProfile
  ): number {
    const priceDiff = Math.abs(user.avg_price_point - dest.price_level)

    // Inverse relationship: smaller diff = higher score
    // Allow ±1 price level without penalty
    if (priceDiff <= 1) {
      return 1.0
    } else if (priceDiff <= 2) {
      return 0.6
    } else {
      return 0.2
    }
  }

  private calculateAdventureMatch(
    user: TasteProfile,
    dest: DestinationProfile
  ): number {
    let score = 0

    // Novelty match
    if (dest.novelty_score !== undefined && user.novelty_seeking !== undefined) {
      const noveltyDiff = Math.abs(user.novelty_seeking - dest.novelty_score)
      score = 1 - noveltyDiff
    } else {
      score = 0.5
    }

    return Math.min(score, 1)
  }

  private calculateCultureMatch(
    user: TasteProfile,
    dest: DestinationProfile
  ): number {
    if (user.culture_embedding && dest.culture_embedding) {
      return this.cosineSimilarity(user.culture_embedding, dest.culture_embedding)
    }
    return 0.5 // Neutral
  }

  // ============================================
  // Reason Generation
  // ============================================

  private generateReasons(
    user: TasteProfile,
    dest: DestinationProfile,
    scores: Record<string, number>
  ): string[] {
    const reasons: string[] = []

    // Sort dimension scores
    const sortedDimensions = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3) // Top 3 reasons

    for (const [dimension, score] of sortedDimensions) {
      if (score >= 0.7) {
        reasons.push(this.getDimensionReason(dimension, user, dest))
      }
    }

    return reasons
  }

  private getDimensionReason(
    dimension: string,
    user: TasteProfile,
    dest: DestinationProfile
  ): string {
    switch (dimension) {
      case 'food':
        return dest.michelin_status
          ? 'Matches your preference for Michelin-quality dining'
          : 'Cuisine aligns with your taste preferences'

      case 'ambiance':
        return user.formality_preference > 0.6
          ? 'Sophisticated atmosphere you appreciate'
          : 'Casual, relaxed vibe matching your style'

      case 'price':
        return `Price point ($${dest.price_level}) fits your typical budget`

      case 'adventure':
        return user.novelty_seeking > 0.6
          ? 'Unique experience for adventurous tastes'
          : 'Familiar and reliable choice'

      case 'culture':
        return 'Cultural significance aligns with your interests'

      default:
        return 'Great match for your preferences'
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    if (normA === 0 || normB === 0) return 0

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  private async getUserProfile(userId: string): Promise<TasteProfile | null> {
    const { data, error } = await supabase
      .from('taste_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) return null

    // Parse embeddings from PostgreSQL arrays
    return {
      user_id: data.user_id,
      food_embedding: this.parseEmbedding(data.food_embedding),
      ambiance_embedding: this.parseEmbedding(data.ambiance_embedding),
      culture_embedding: this.parseEmbedding(data.culture_embedding),
      avg_price_point: data.avg_price_point || 2.5,
      novelty_seeking: data.novelty_seeking || 0.5,
      formality_preference: data.formality_preference || 0.5,
      michelin_affinity: data.michelin_affinity || 0.5,
      confidence_score: data.confidence_score || 0,
    }
  }

  private async getDestinationProfile(
    destinationId: number
  ): Promise<DestinationProfile | null> {
    const { data, error } = await supabase
      .from('destination_taste_profiles')
      .select('*')
      .eq('destination_id', destinationId)
      .single()

    if (error || !data) return null

    return {
      destination_id: data.destination_id,
      food_embedding: this.parseEmbedding(data.food_embedding),
      ambiance_embedding: this.parseEmbedding(data.ambiance_embedding),
      culture_embedding: this.parseEmbedding(data.culture_embedding),
      price_level: data.price_level || 2,
      novelty_score: data.novelty_score || 0.5,
      formality_score: data.formality_score || 0.5,
      michelin_status: data.michelin_status || false,
    }
  }

  private async getAllDestinationIds(): Promise<number[]> {
    const { data, error } = await supabase
      .from('destination_taste_profiles')
      .select('destination_id')

    if (error) {
      console.error('Error fetching destination IDs:', error)
      return []
    }

    return (data || []).map(d => d.destination_id)
  }

  private parseEmbedding(embedding: any): number[] | undefined {
    if (!embedding) return undefined

    if (Array.isArray(embedding)) {
      return embedding as number[]
    }

    // If stored as string, parse it
    if (typeof embedding === 'string') {
      try {
        return JSON.parse(embedding.replace(/^\[|\]$/g, ''))
      } catch (e) {
        return undefined
      }
    }

    return undefined
  }
}

// ============================================
// Singleton Instance
// ============================================

export const tasteMatcher = new TasteMatcher()
