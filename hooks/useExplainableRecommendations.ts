/**
 * React Hooks for Explainable Recommendations
 * Easy integration of AI-powered recommendation explanations
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import useSWR from 'swr'

// ============================================
// Types
// ============================================

export interface RecommendationWithReason {
  destination: {
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
  match_score: number
  confidence: number
  reasons: ReasonFactor[]
  evidence: Evidence[]
}

export interface ReasonFactor {
  factor_type: 'taste_match' | 'social_proof' | 'timing' | 'location' | 'trending' | 'similar_to_liked'
  factor_name: string
  contribution_score: number // 0-1
  explanation: string
  icon: string
}

export interface Evidence {
  type: 'user_history' | 'destination_attribute' | 'social_signal' | 'contextual'
  description: string
  data: any
}

// ============================================
// Hooks
// ============================================

/**
 * Get explainable recommendations for user
 */
export function useExplainableRecommendations(limit: number = 20) {
  const { user } = useAuth()

  const { data, error, isLoading, mutate } = useSWR(
    user?.id ? `/api/recommendations/explainable?user_id=${user.id}&limit=${limit}` : null,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error('Failed to fetch explainable recommendations')
      }
      const json = await res.json()
      return json.recommendations as RecommendationWithReason[]
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  return {
    recommendations: data || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

/**
 * Get explanation for specific destination
 */
export function useDestinationExplanation(destinationId: number | null) {
  const { user } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [recommendation, setRecommendation] = useState<RecommendationWithReason | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user?.id || !destinationId) {
      setRecommendation(null)
      return
    }

    const fetchExplanation = async () => {
      setIsGenerating(true)
      setError(null)

      try {
        const res = await fetch('/api/recommendations/explainable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            destination_id: destinationId,
          }),
        })

        if (!res.ok) {
          throw new Error('Failed to generate explanation')
        }

        const json = await res.json()
        setRecommendation(json.recommendation)
      } catch (err) {
        setError(err as Error)
      } finally {
        setIsGenerating(false)
      }
    }

    fetchExplanation()
  }, [user?.id, destinationId])

  return {
    recommendation,
    isGenerating,
    error,
  }
}

/**
 * Get top reason for a recommendation
 */
export function useTopReason(reasons: ReasonFactor[] | undefined) {
  if (!reasons || reasons.length === 0) return null

  // Return reason with highest contribution score
  return reasons.reduce((prev, current) =>
    prev.contribution_score > current.contribution_score ? prev : current
  )
}

/**
 * Get confidence level label and color
 */
export function useConfidenceLevel(confidence: number | undefined) {
  if (confidence === undefined) {
    return { label: 'Unknown', color: 'gray' }
  }

  if (confidence >= 0.85) {
    return { label: 'Very High', color: 'green' }
  } else if (confidence >= 0.7) {
    return { label: 'High', color: 'blue' }
  } else if (confidence >= 0.5) {
    return { label: 'Medium', color: 'yellow' }
  } else {
    return { label: 'Low', color: 'red' }
  }
}

/**
 * Format match score as percentage
 */
export function useMatchScoreLabel(score: number | undefined) {
  if (score === undefined) return 'N/A'

  const percentage = Math.round(score * 100)

  if (percentage >= 90) return `${percentage}% · Excellent Match`
  if (percentage >= 75) return `${percentage}% · Great Match`
  if (percentage >= 60) return `${percentage}% · Good Match`
  if (percentage >= 40) return `${percentage}% · Fair Match`
  return `${percentage}%`
}

/**
 * Group evidence by type
 */
export function useGroupedEvidence(evidence: Evidence[] | undefined) {
  if (!evidence || evidence.length === 0) return {}

  return evidence.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = []
    }
    acc[item.type].push(item)
    return acc
  }, {} as Record<string, Evidence[]>)
}
