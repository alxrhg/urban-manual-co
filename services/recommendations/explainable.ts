/**
 * Explainable AI Recommendation System
 * Generates human-readable reasons for recommendations using Gemini
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { MatchScore } from '../taste/matcher'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// Types
// ============================================

export interface RecommendationWithReason {
  destination: Destination
  match_score: number
  confidence: number
  reasons: ReasonFactor[]
  evidence: Evidence[]
}

export interface ReasonFactor {
  factor_type: 'taste_match' | 'social_proof' | 'timing' | 'location' | 'trending' | 'similar_to_liked'
  factor_name: string
  contribution_score: number // 0-1, how much this factor contributed
  explanation: string
  icon: string
}

export interface Evidence {
  type: 'user_history' | 'destination_attribute' | 'social_signal' | 'contextual'
  description: string
  data: any
}

interface Destination {
  id: number
  name: string
  slug: string
  category: string
  cuisine_type?: string
  price_level?: number
  rating?: number
  tags?: string[]
  city: string
}

interface UserContext {
  user_id: string
  top_cuisines: Array<{ cuisine: string; count: number }>
  avg_price_point: number
  novelty_seeking: number
  recent_likes: Destination[]
  saved_count: number
}

// ============================================
// Explainable Recommender
// ============================================

export class ExplainableRecommender {
  /**
   * Generate explainable recommendation with detailed reasons
   */
  async generateExplanation(
    userId: string,
    destinationId: number,
    matchScore: MatchScore
  ): Promise<RecommendationWithReason | null> {
    // Fetch destination details
    const destination = await this.getDestination(destinationId)
    if (!destination) return null

    // Fetch user context
    const userContext = await this.getUserContext(userId)

    // Extract reasons from match score
    const basicReasons = this.extractBasicReasons(matchScore, destination)

    // Generate AI-powered reasons using Gemini
    const aiReasons = await this.generateAIReasons(
      userContext,
      destination,
      matchScore
    )

    // Combine and rank reasons
    const allReasons = [...basicReasons, ...aiReasons]
    const topReasons = this.rankReasons(allReasons).slice(0, 4)

    // Generate evidence
    const evidence = await this.generateEvidence(userId, destination, matchScore)

    return {
      destination,
      match_score: matchScore.overall_score,
      confidence: matchScore.confidence,
      reasons: topReasons,
      evidence,
    }
  }

  /**
   * Generate reasons for multiple recommendations
   */
  async generateBatchExplanations(
    userId: string,
    matches: MatchScore[]
  ): Promise<RecommendationWithReason[]> {
    const explanations = await Promise.all(
      matches.map(match =>
        this.generateExplanation(userId, match.destination_id, match)
      )
    )

    return explanations.filter(e => e !== null) as RecommendationWithReason[]
  }

  // ============================================
  // Reason Extraction
  // ============================================

  private extractBasicReasons(
    match: MatchScore,
    destination: Destination
  ): ReasonFactor[] {
    const reasons: ReasonFactor[] = []

    // Food match reason
    if (match.dimension_scores.food >= 0.8) {
      reasons.push({
        factor_type: 'taste_match',
        factor_name: 'Cuisine Match',
        contribution_score: match.dimension_scores.food,
        explanation: destination.cuisine_type
          ? `Matches your love for ${destination.cuisine_type} cuisine`
          : 'Cuisine aligns with your preferences',
        icon: '🍽️',
      })
    }

    // Price match reason
    if (match.dimension_scores.price >= 0.9) {
      reasons.push({
        factor_type: 'taste_match',
        factor_name: 'Price Fit',
        contribution_score: match.dimension_scores.price,
        explanation: `Price point (${'$'.repeat(destination.price_level || 2)}) matches your typical budget`,
        icon: '💰',
      })
    }

    // Ambiance match reason
    if (match.dimension_scores.ambiance >= 0.75) {
      reasons.push({
        factor_type: 'taste_match',
        factor_name: 'Ambiance',
        contribution_score: match.dimension_scores.ambiance,
        explanation: 'Atmosphere perfectly suits your style',
        icon: '✨',
      })
    }

    // Adventure match reason
    if (match.dimension_scores.adventure >= 0.7) {
      reasons.push({
        factor_type: 'taste_match',
        factor_name: 'Discovery Factor',
        contribution_score: match.dimension_scores.adventure,
        explanation: destination.tags?.some(t => t.includes('hidden'))
          ? 'Hidden gem matching your adventurous taste'
          : 'Perfect level of familiarity for you',
        icon: '🗺️',
      })
    }

    return reasons
  }

  private async generateAIReasons(
    userContext: UserContext,
    destination: Destination,
    matchScore: MatchScore
  ): Promise<ReasonFactor[]> {
    const topCuisines = userContext.top_cuisines.slice(0, 3).map(c => c.cuisine).join(', ')

    const prompt = `
You are a restaurant recommendation expert. Generate 2-3 concise, specific reasons (15-25 words each) why this destination matches the user's taste.

User Profile:
- Top cuisines: ${topCuisines}
- Typical price range: ${'$'.repeat(Math.round(userContext.avg_price_point))}
- Exploration style: ${userContext.novelty_seeking > 0.6 ? 'Adventurous, seeks new experiences' : 'Prefers familiar, reliable choices'}
- Recently saved ${userContext.saved_count} places

Destination:
- Name: ${destination.name}
- Category: ${destination.category}
- Cuisine: ${destination.cuisine_type || 'N/A'}
- Price: ${'$'.repeat(destination.price_level || 2)}
- Rating: ${destination.rating || 'N/A'}/5
- Location: ${destination.city}
- Tags: ${destination.tags?.join(', ') || 'N/A'}

Match Scores:
- Food: ${(matchScore.dimension_scores.food * 100).toFixed(0)}%
- Ambiance: ${(matchScore.dimension_scores.ambiance * 100).toFixed(0)}%
- Price: ${(matchScore.dimension_scores.price * 100).toFixed(0)}%

Focus on:
1. The HIGHEST scoring dimension (most impactful factor)
2. Specific connections to user's history (if applicable)
3. Unique attributes of the destination

Be conversational, specific, and avoid generic phrases.

Return ONLY a JSON array of reasons:
[
  {
    "factor_type": "taste_match",
    "factor_name": "Short name (2-3 words)",
    "contribution_score": 0.85,
    "explanation": "Specific, engaging reason (15-25 words)",
    "icon": "emoji"
  }
]
`.trim()

    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()

      // Extract JSON from response (may have markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.error('Failed to parse Gemini response:', text)
        return []
      }

      const reasons = JSON.parse(jsonMatch[0]) as ReasonFactor[]
      return reasons
    } catch (error) {
      console.error('Gemini reason generation error:', error)
      return []
    }
  }

  // ============================================
  // Evidence Generation
  // ============================================

  private async generateEvidence(
    userId: string,
    destination: Destination,
    matchScore: MatchScore
  ): Promise<Evidence[]> {
    const evidence: Evidence[] = []

    // User history evidence
    const { data: recentInteractions } = await supabase
      .from('enriched_interactions')
      .select('destination_id, destinations(cuisine_type, category)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (recentInteractions && recentInteractions.length > 0) {
      // Count cuisine matches
      const cuisineMatches = recentInteractions.filter(
        (i: any) => i.destinations?.cuisine_type === destination.cuisine_type
      ).length

      if (cuisineMatches >= 3) {
        evidence.push({
          type: 'user_history',
          description: `You've enjoyed ${cuisineMatches} similar ${destination.cuisine_type} restaurants`,
          data: { count: cuisineMatches, cuisine: destination.cuisine_type },
        })
      }
    }

    // Destination attribute evidence
    if (destination.rating && destination.rating >= 4.5) {
      evidence.push({
        type: 'destination_attribute',
        description: `Highly rated (${destination.rating}/5)`,
        data: { rating: destination.rating },
      })
    }

    // Social proof evidence
    const { count: saveCount } = await supabase
      .from('saved_destinations')
      .select('*', { count: 'exact', head: true })
      .eq('destination_id', destination.id)

    if (saveCount && saveCount > 100) {
      evidence.push({
        type: 'social_signal',
        description: `${saveCount}+ users have saved this place`,
        data: { save_count: saveCount },
      })
    }

    return evidence
  }

  // ============================================
  // Reason Ranking
  // ============================================

  private rankReasons(reasons: ReasonFactor[]): ReasonFactor[] {
    return reasons.sort((a, b) => {
      // Sort by contribution score (descending)
      return b.contribution_score - a.contribution_score
    })
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async getDestination(destinationId: number): Promise<Destination | null> {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('id', destinationId)
      .single()

    if (error || !data) {
      console.error('Failed to fetch destination:', error)
      return null
    }

    return data as Destination
  }

  private async getUserContext(userId: string): Promise<UserContext> {
    // Get taste profile
    const { data: profile } = await supabase
      .from('taste_profiles')
      .select('cuisine_preferences, avg_price_point, novelty_seeking')
      .eq('user_id', userId)
      .single()

    // Get recent liked destinations
    const { data: savedDests } = await supabase
      .from('saved_destinations')
      .select('destination_id, destinations(id, name, slug, category, cuisine_type, city)')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })
      .limit(5)

    const topCuisines = profile?.cuisine_preferences
      ? Object.entries(profile.cuisine_preferences)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 5)
          .map(([cuisine, count]) => ({ cuisine, count: count as number }))
      : []

    return {
      user_id: userId,
      top_cuisines: topCuisines,
      avg_price_point: profile?.avg_price_point || 2.5,
      novelty_seeking: profile?.novelty_seeking || 0.5,
      recent_likes: (savedDests || []).map((s: any) => s.destinations).filter(Boolean),
      saved_count: savedDests?.length || 0,
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

export const explainableRecommender = new ExplainableRecommender()
