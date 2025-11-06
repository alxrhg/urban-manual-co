/**
 * Onboarding Processor Service
 * Processes onboarding responses and bootstraps taste profiles
 */

import { createClient } from '@supabase/supabase-js'
import { tasteEmbeddingGenerator } from '../taste/embedding-generator'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// Types
// ============================================

export interface OnboardingResponses {
  user_id: string
  preferred_cuisines: string[]
  avoided_cuisines?: string[]
  typical_budget: number // 1-4
  splurge_willingness?: number // 0-1
  preferred_ambiance: string[]
  formality_preference?: number // 0-1
  primary_dining_context: 'solo' | 'couples' | 'groups' | 'family'
  group_size_preference?: number
  novelty_seeking: number // 0-1
  tourist_vs_local: number // 0-1
  dietary_restrictions?: string[]
  interests?: string[]
  travel_frequency?: string
  preferred_travel_style?: string
  favorite_moods?: string[]
  time_spent_seconds?: number
}

export interface OnboardingQuestion {
  id: string
  question_key: string
  question_text: string
  question_type: 'multi_select' | 'single_select' | 'scale' | 'ranking'
  category: string
  options: any
  required: boolean
  order_index: number
}

// ============================================
// Onboarding Processor
// ============================================

export class OnboardingProcessor {
  /**
   * Save onboarding responses
   */
  async saveResponses(responses: OnboardingResponses): Promise<void> {
    const { error } = await supabase
      .from('onboarding_responses')
      .upsert(responses, { onConflict: 'user_id' })

    if (error) {
      throw new Error(`Failed to save onboarding responses: ${error.message}`)
    }
  }

  /**
   * Bootstrap taste profile from onboarding
   */
  async bootstrapTasteProfile(userId: string): Promise<void> {
    // Get onboarding responses
    const { data: responses, error: fetchError } = await supabase
      .from('onboarding_responses')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (fetchError || !responses) {
      throw new Error('No onboarding responses found')
    }

    // Build cuisine preferences
    const cuisinePreferences: Record<string, number> = {}
    for (const cuisine of responses.preferred_cuisines || []) {
      cuisinePreferences[cuisine] = 5 // Start with weight of 5
    }

    // Generate embeddings from preferred cuisines and ambiance
    const cuisineText = (responses.preferred_cuisines || []).join(', ')
    const ambianceText = (responses.preferred_ambiance || []).join(', ')
    const interestsText = (responses.interests || []).join(', ')

    let foodEmbedding: number[] | null = null
    let ambianceEmbedding: number[] | null = null
    let cultureEmbedding: number[] | null = null

    try {
      if (cuisineText) {
        foodEmbedding = await tasteEmbeddingGenerator['generateEmbedding'](
          `Preferences: ${cuisineText} cuisine`
        )
      }

      if (ambianceText) {
        ambianceEmbedding = await tasteEmbeddingGenerator['generateEmbedding'](
          `Ambiance preferences: ${ambianceText}`
        )
      }

      if (interestsText) {
        cultureEmbedding = await tasteEmbeddingGenerator['generateEmbedding'](
          `Cultural interests: ${interestsText}`
        )
      }
    } catch (error) {
      console.error('Failed to generate embeddings:', error)
      // Continue without embeddings
    }

    // Determine michelin affinity from budget
    const michelinAffinity = responses.typical_budget >= 3 ? 0.6 : 0.3

    // Determine formality from ambiance preferences
    const formalAmbiance = ['elegant', 'upscale', 'fine_dining', 'sophisticated']
    const casualAmbiance = ['casual', 'relaxed', 'laid_back', 'informal']

    const formalCount = (responses.preferred_ambiance || []).filter(a =>
      formalAmbiance.some(fa => a.toLowerCase().includes(fa))
    ).length
    const casualCount = (responses.preferred_ambiance || []).filter(a =>
      casualAmbiance.some(ca => a.toLowerCase().includes(ca))
    ).length

    const formalityPreference = responses.formality_preference ||
      (formalCount > casualCount ? 0.7 : casualCount > formalCount ? 0.3 : 0.5)

    // Create taste profile
    const tasteProfile = {
      user_id: userId,
      food_embedding: foodEmbedding,
      ambiance_embedding: ambianceEmbedding,
      culture_embedding: cultureEmbedding,
      cuisine_preferences: cuisinePreferences,
      michelin_affinity: michelinAffinity,
      street_food_affinity: responses.typical_budget <= 2 ? 0.7 : 0.3,
      fine_dining_affinity: responses.typical_budget >= 3 ? 0.7 : 0.3,
      experimental_score: responses.novelty_seeking,
      avg_price_point: responses.typical_budget,
      price_variance: responses.splurge_willingness || 0.3,
      formality_preference: formalityPreference,
      novelty_seeking: responses.novelty_seeking,
      tourist_vs_local: responses.tourist_vs_local,
      confidence_score: 0.4, // Bootstrap confidence (lower than interaction-based)
      interaction_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Save taste profile
    const { error: saveError } = await supabase
      .from('taste_profiles')
      .upsert(tasteProfile, { onConflict: 'user_id' })

    if (saveError) {
      throw new Error(`Failed to bootstrap taste profile: ${saveError.message}`)
    }

    console.log(`[Onboarding] Bootstrapped taste profile for user ${userId}`)
  }

  /**
   * Get onboarding questions
   */
  async getQuestions(): Promise<OnboardingQuestion[]> {
    const { data, error } = await supabase
      .from('onboarding_questions')
      .select('*')
      .eq('active', true)
      .order('order_index')

    if (error) {
      throw new Error(`Failed to fetch onboarding questions: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get onboarding progress for user
   */
  async getProgress(userId: string): Promise<{
    completed: boolean
    total_questions: number
    answered_questions: number
    progress_percentage: number
  }> {
    const { data, error } = await supabase.rpc('get_onboarding_progress', {
      uid: userId,
    })

    if (error) {
      throw new Error(`Failed to get onboarding progress: ${error.message}`)
    }

    return data[0] || {
      completed: false,
      total_questions: 0,
      answered_questions: 0,
      progress_percentage: 0,
    }
  }

  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('onboarding_responses')
      .select('id')
      .eq('user_id', userId)
      .single()

    return !error && !!data
  }

  /**
   * Get user's onboarding responses
   */
  async getResponses(userId: string): Promise<OnboardingResponses | null> {
    const { data, error } = await supabase
      .from('onboarding_responses')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      return null
    }

    return data as OnboardingResponses
  }

  /**
   * Process complete onboarding flow
   */
  async processOnboarding(responses: OnboardingResponses): Promise<void> {
    // Save responses
    await this.saveResponses(responses)

    // Bootstrap taste profile
    await this.bootstrapTasteProfile(responses.user_id)

    // Save user's favorite moods
    if (responses.favorite_moods && responses.favorite_moods.length > 0) {
      const sessionId = `onboarding-${responses.user_id}-${Date.now()}`

      for (const mood of responses.favorite_moods) {
        await supabase.from('user_mood_history').insert({
          user_id: responses.user_id,
          mood_key: mood,
          session_id: sessionId,
          selected_at: new Date().toISOString(),
          interactions_count: 0,
          saved_count: 0,
        })
      }
    }

    console.log(`[Onboarding] Completed onboarding for user ${responses.user_id}`)
  }

  /**
   * Get initial recommendations based on onboarding
   */
  async getInitialRecommendations(
    userId: string,
    limit: number = 20
  ): Promise<number[]> {
    const responses = await this.getResponses(userId)

    if (!responses) {
      throw new Error('No onboarding responses found')
    }

    // Query destinations that match onboarding preferences
    let query = supabase
      .from('destinations')
      .select('id')
      .limit(limit)

    // Filter by cuisine if specified
    if (responses.preferred_cuisines && responses.preferred_cuisines.length > 0) {
      query = query.in('cuisine_type', responses.preferred_cuisines)
    }

    // Filter by price level
    const priceRange = this.getPriceRange(responses.typical_budget)
    query = query.in('price_level', priceRange)

    // Filter by mood if specified
    if (responses.favorite_moods && responses.favorite_moods.length > 0) {
      // Get destinations with these moods
      const { data: moodDestinations } = await supabase
        .from('destination_moods')
        .select('destination_id')
        .in('mood_key', responses.favorite_moods)
        .gte('strength', 0.5)
        .limit(limit * 2)

      if (moodDestinations && moodDestinations.length > 0) {
        const destIds = moodDestinations.map(d => d.destination_id)
        query = query.in('id', destIds)
      }
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get initial recommendations: ${error.message}`)
    }

    return (data || []).map(d => d.id)
  }

  /**
   * Helper: Get price range from budget
   */
  private getPriceRange(budget: number): number[] {
    // Allow ±1 price level
    const range = [budget]

    if (budget > 1) range.push(budget - 1)
    if (budget < 4) range.push(budget + 1)

    return range
  }
}

// ============================================
// Singleton Instance
// ============================================

export const onboardingProcessor = new OnboardingProcessor()
