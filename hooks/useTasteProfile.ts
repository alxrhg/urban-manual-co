/**
 * React Hooks for Taste Profiles
 * Easy integration of taste-based personalization
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import useSWR from 'swr'

// ============================================
// Types
// ============================================

export interface TasteProfile {
  user_id: string
  confidence_score: number
  interaction_count: number

  // Food
  cuisine_preferences: Record<string, number>
  michelin_affinity: number
  avg_price_point: number

  // Adventure
  novelty_seeking: number

  // Meta
  created_at: string
  updated_at: string
}

export interface MatchScore {
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
}

// ============================================
// Hooks
// ============================================

/**
 * Get user's taste profile
 */
export function useTasteProfile() {
  const { user } = useAuth()

  const { data, error, isLoading, mutate } = useSWR(
    user?.id ? `/api/taste/generate?user_id=${user.id}` : null,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) {
        if (res.status === 404) {
          // Profile doesn't exist yet
          return null
        }
        throw new Error('Failed to fetch taste profile')
      }
      const json = await res.json()
      return json.profile as TasteProfile
    }
  )

  const generateProfile = async () => {
    if (!user?.id) return

    const res = await fetch('/api/taste/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })

    if (!res.ok) {
      throw new Error('Failed to generate taste profile')
    }

    // Refresh the data
    mutate()
  }

  return {
    profile: data,
    isLoading,
    error,
    generateProfile,
    hasProfile: !!data,
  }
}

/**
 * Check if user has sufficient data for taste profile
 */
export function useTasteProfileEligibility() {
  const { user } = useAuth()
  const [isEligible, setIsEligible] = useState(false)
  const [interactionCount, setInteractionCount] = useState(0)

  useEffect(() => {
    if (!user?.id) {
      setIsEligible(false)
      return
    }

    const checkEligibility = async () => {
      const res = await fetch(`/api/taste/eligibility?user_id=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setInteractionCount(data.interaction_count)
        setIsEligible(data.interaction_count >= 10) // Minimum 10 interactions
      }
    }

    checkEligibility()
  }, [user?.id])

  return {
    isEligible,
    interactionCount,
    minRequired: 10,
  }
}

/**
 * Get taste-based recommendations
 */
export function useTasteRecommendations(limit: number = 20) {
  const { user } = useAuth()
  const { profile } = useTasteProfile()

  const { data, error, isLoading } = useSWR(
    user?.id && profile ? `/api/taste/recommendations?user_id=${user.id}&limit=${limit}` : null,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch recommendations')
      const json = await res.json()
      return json.recommendations as MatchScore[]
    }
  )

  return {
    recommendations: data || [],
    isLoading,
    error,
  }
}

/**
 * Get match score for specific destination
 */
export function useDestinationMatch(destinationId: number | null) {
  const { user } = useAuth()

  const { data, error, isLoading } = useSWR(
    user?.id && destinationId ? `/api/taste/match?user_id=${user.id}&destination_id=${destinationId}` : null,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch match score')
      const json = await res.json()
      return json.match as MatchScore
    }
  )

  return {
    match: data,
    isLoading,
    error,
  }
}

/**
 * Get top cuisines from taste profile
 */
export function useTopCuisines(limit: number = 5) {
  const { profile } = useTasteProfile()

  if (!profile?.cuisine_preferences) {
    return []
  }

  return Object.entries(profile.cuisine_preferences)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([cuisine, count]) => ({ cuisine, count }))
}

/**
 * Get confidence level label
 */
export function useProfileConfidenceLabel() {
  const { profile } = useTasteProfile()

  if (!profile) return 'No Profile'

  const confidence = profile.confidence_score

  if (confidence < 0.3) return 'Low Confidence'
  if (confidence < 0.6) return 'Medium Confidence'
  if (confidence < 0.85) return 'High Confidence'
  return 'Very High Confidence'
}
