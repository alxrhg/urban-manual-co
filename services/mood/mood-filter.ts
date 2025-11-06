/**
 * Mood Filter Service
 * Filters recommendations based on user's selected mood
 */

import { createClient } from '@supabase/supabase-js'
import { MatchScore } from '../taste/matcher'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// Types
// ============================================

export interface MoodFilteredRecommendation extends MatchScore {
  mood_score: number
  mood_breakdown: Record<string, number>
}

export interface MoodSession {
  session_id: string
  mood_key: string
  user_id: string
  started_at: Date
}

// ============================================
// Mood Filter
// ============================================

export class MoodFilter {
  /**
   * Filter recommendations by mood
   */
  async filterByMood(
    userId: string,
    moodKey: string,
    recommendations: MatchScore[]
  ): Promise<MoodFilteredRecommendation[]> {
    // Get mood scores for all destinations in parallel
    const destinationIds = recommendations.map(r => r.destination_id)
    const moodScores = await this.getMoodScores(destinationIds, moodKey)

    // Combine taste match scores with mood scores
    const filtered = recommendations.map(rec => {
      const moodData = moodScores.get(rec.destination_id) || { score: 0, breakdown: {} }

      // Combined score: 60% taste + 40% mood
      const combined_score = rec.overall_score * 0.6 + moodData.score * 0.4

      return {
        ...rec,
        overall_score: combined_score,
        mood_score: moodData.score,
        mood_breakdown: moodData.breakdown,
      }
    })

    // Sort by combined score
    filtered.sort((a, b) => b.overall_score - a.overall_score)

    return filtered
  }

  /**
   * Get mood scores for multiple destinations
   */
  private async getMoodScores(
    destinationIds: number[],
    moodKey: string
  ): Promise<Map<number, { score: number; breakdown: Record<string, number> }>> {
    const scores = new Map()

    // Batch query for mood mappings
    const { data: mappings, error } = await supabase
      .from('destination_moods')
      .select('destination_id, mood_key, strength')
      .in('destination_id', destinationIds)

    if (error) {
      console.error('Failed to fetch mood mappings:', error)
      return scores
    }

    // Get mood compatibility matrix
    const { data: compatibility } = await supabase
      .from('mood_compatibility')
      .select('mood_key_b, compatibility_score')
      .eq('mood_key_a', moodKey)
      .gt('compatibility_score', 0)

    const compatibilityMap = new Map(
      (compatibility || []).map(c => [c.mood_key_b, c.compatibility_score])
    )

    // Group mappings by destination
    const byDestination = new Map<number, Array<{ mood_key: string; strength: number }>>()
    for (const mapping of mappings || []) {
      if (!byDestination.has(mapping.destination_id)) {
        byDestination.set(mapping.destination_id, [])
      }
      byDestination.get(mapping.destination_id)!.push({
        mood_key: mapping.mood_key,
        strength: mapping.strength,
      })
    }

    // Calculate scores for each destination
    for (const [destId, destMoods] of byDestination.entries()) {
      let directScore = 0
      let compatibilityBonus = 0
      const breakdown: Record<string, number> = {}

      for (const mood of destMoods) {
        if (mood.mood_key === moodKey) {
          // Direct match
          directScore = mood.strength
          breakdown[mood.mood_key] = mood.strength
        } else {
          // Compatible mood bonus
          const compat = compatibilityMap.get(mood.mood_key) || 0
          if (compat > 0) {
            compatibilityBonus += mood.strength * compat * 0.3
            breakdown[mood.mood_key] = mood.strength * compat * 0.3
          }
        }
      }

      const totalScore = Math.min(directScore + compatibilityBonus, 1.0)
      scores.set(destId, { score: totalScore, breakdown })
    }

    return scores
  }

  /**
   * Get mood recommendations (mood-first approach)
   * Returns destinations sorted primarily by mood fit
   */
  async getMoodRecommendations(
    userId: string,
    moodKey: string,
    limit: number = 20,
    tasteWeight: number = 0.3 // Lower weight for taste, higher for mood
  ): Promise<MoodFilteredRecommendation[]> {
    // Get all destinations with this mood (strength >= 0.5)
    const { data: moodDestinations, error } = await supabase
      .from('destination_moods')
      .select('destination_id, strength')
      .eq('mood_key', moodKey)
      .gte('strength', 0.5)
      .order('strength', { ascending: false })
      .limit(limit * 3) // Get more than needed to account for filtering

    if (error || !moodDestinations || moodDestinations.length === 0) {
      console.log(`No destinations found for mood: ${moodKey}`)
      return []
    }

    const destinationIds = moodDestinations.map(d => d.destination_id)

    // Get taste match scores for these destinations
    const { data: tasteScores } = await supabase
      .from('taste_match_scores')
      .select('*')
      .eq('user_id', userId)
      .in('destination_id', destinationIds)
      .gt('expires_at', new Date().toISOString())

    const tasteScoreMap = new Map(
      (tasteScores || []).map(s => [s.destination_id, s])
    )

    // Combine mood and taste scores
    const recommendations: MoodFilteredRecommendation[] = []

    for (const moodDest of moodDestinations) {
      const tasteScore = tasteScoreMap.get(moodDest.destination_id)
      const taste = tasteScore?.overall_score || 0.5 // Default neutral if no taste score

      // Combined score: mood-first (70% mood + 30% taste)
      const combined = moodDest.strength * (1 - tasteWeight) + taste * tasteWeight

      recommendations.push({
        user_id: userId,
        destination_id: moodDest.destination_id,
        overall_score: combined,
        dimension_scores: {
          food: tasteScore?.food_match || 0.5,
          ambiance: tasteScore?.ambiance_match || 0.5,
          price: tasteScore?.price_match || 0.5,
          adventure: tasteScore?.adventure_match || 0.5,
          culture: tasteScore?.culture_match || 0.5,
        },
        confidence: tasteScore?.confidence || 0.5,
        reasons: [],
        mood_score: moodDest.strength,
        mood_breakdown: { [moodKey]: moodDest.strength },
      })
    }

    // Sort by combined score
    recommendations.sort((a, b) => b.overall_score - a.overall_score)

    return recommendations.slice(0, limit)
  }

  /**
   * Track mood session
   */
  async startMoodSession(
    userId: string,
    moodKey: string,
    sessionId: string
  ): Promise<void> {
    await supabase.from('user_mood_history').insert({
      user_id: userId,
      mood_key: moodKey,
      session_id: sessionId,
      selected_at: new Date().toISOString(),
      interactions_count: 0,
      saved_count: 0,
    })
  }

  /**
   * Update mood session with interaction data
   */
  async updateMoodSession(
    sessionId: string,
    interactionsCount: number,
    savedCount: number
  ): Promise<void> {
    await supabase
      .from('user_mood_history')
      .update({
        interactions_count: interactionsCount,
        saved_count: savedCount,
        duration_minutes: Math.floor(
          (Date.now() - new Date().getTime()) / 1000 / 60
        ),
      })
      .eq('session_id', sessionId)
  }

  /**
   * Get user's mood preferences
   */
  async getUserMoodPreferences(
    userId: string
  ): Promise<Array<{ mood_key: string; frequency: number }>> {
    const { data, error } = await supabase.rpc('get_user_mood_preferences', {
      uid: userId,
    })

    if (error) {
      console.error('Failed to get user mood preferences:', error)
      return []
    }

    return data || []
  }

  /**
   * Get suggested moods based on user history
   */
  async getSuggestedMoods(userId: string, limit: number = 5): Promise<string[]> {
    const preferences = await this.getUserMoodPreferences(userId)

    // Return top moods by frequency
    return preferences.slice(0, limit).map(p => p.mood_key)
  }

  /**
   * Get mood metadata
   */
  async getMoodMetadata(moodKey: string): Promise<any> {
    const { data, error } = await supabase
      .from('mood_taxonomy')
      .select('*')
      .eq('mood_key', moodKey)
      .single()

    if (error) {
      console.error('Failed to fetch mood metadata:', error)
      return null
    }

    return data
  }

  /**
   * Get all available moods
   */
  async getAllMoods(): Promise<any[]> {
    const { data, error } = await supabase
      .from('mood_taxonomy')
      .select('*')
      .order('mood_category')
      .order('mood_name')

    if (error) {
      console.error('Failed to fetch moods:', error)
      return []
    }

    return data || []
  }

  /**
   * Get mood by category
   */
  async getMoodsByCategory(): Promise<Record<string, any[]>> {
    const moods = await this.getAllMoods()

    const byCategory: Record<string, any[]> = {}
    for (const mood of moods) {
      if (!byCategory[mood.mood_category]) {
        byCategory[mood.mood_category] = []
      }
      byCategory[mood.mood_category].push(mood)
    }

    return byCategory
  }
}

// ============================================
// Singleton Instance
// ============================================

export const moodFilter = new MoodFilter()
