/**
 * React Hooks for Mood-Based Filtering
 * Easy integration of mood-based discovery
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import useSWR from 'swr'
import { v4 as uuidv4 } from 'uuid'

// ============================================
// Types
// ============================================

export interface Mood {
  mood_key: string
  mood_name: string
  mood_category: string
  description: string
  icon: string
  color_scheme: {
    primary: string
    secondary: string
  }
  opposite_mood_key?: string
}

export interface MoodFilteredRecommendation {
  destination_id: number
  overall_score: number
  mood_score: number
  mood_breakdown: Record<string, number>
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
 * Get all available moods
 */
export function useMoods() {
  const { user } = useAuth()

  const { data, error, isLoading } = useSWR(
    user?.id ? `/api/mood/list?user_id=${user.id}` : '/api/mood/list',
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch moods')
      return res.json()
    },
    {
      revalidateOnFocus: false,
    }
  )

  return {
    moodsByCategory: data?.moods_by_category || {},
    suggestedMoods: data?.suggested_moods || [],
    isLoading,
    error,
  }
}

/**
 * Mood-based recommendations with session tracking
 */
export function useMoodRecommendations(
  moodKey: string | null,
  limit: number = 20,
  approach: 'mood_first' | 'taste_first' = 'mood_first'
) {
  const { user } = useAuth()
  const [sessionId] = useState(() => uuidv4())
  const [interactionsCount, setInteractionsCount] = useState(0)
  const [savedCount, setSavedCount] = useState(0)

  const { data, error, isLoading, mutate } = useSWR(
    user?.id && moodKey
      ? `/api/mood/filter?user_id=${user.id}&mood=${moodKey}&limit=${limit}&approach=${approach}`
      : null,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch mood recommendations')
      return res.json()
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  // Start mood session when mood is selected
  useEffect(() => {
    if (!user?.id || !moodKey) return

    const startSession = async () => {
      await fetch('/api/mood/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          mood: moodKey,
          session_id: sessionId,
        }),
      })
    }

    startSession()
  }, [user?.id, moodKey, sessionId])

  // Update session periodically
  useEffect(() => {
    if (!moodKey || interactionsCount === 0) return

    const updateSession = async () => {
      await fetch('/api/mood/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          interactions_count: interactionsCount,
          saved_count: savedCount,
        }),
      })
    }

    // Update every 30 seconds
    const interval = setInterval(updateSession, 30000)
    return () => clearInterval(interval)
  }, [sessionId, moodKey, interactionsCount, savedCount])

  const trackInteraction = () => {
    setInteractionsCount(prev => prev + 1)
  }

  const trackSaved = () => {
    setSavedCount(prev => prev + 1)
  }

  return {
    recommendations: data?.recommendations || [],
    mood: data?.mood,
    approach: data?.approach,
    isLoading,
    error,
    refresh: mutate,
    trackInteraction,
    trackSaved,
    sessionId,
  }
}

/**
 * Mood selector state management
 */
export function useMoodSelector() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [moodHistory, setMoodHistory] = useState<string[]>([])

  const selectMood = (moodKey: string) => {
    setSelectedMood(moodKey)
    setMoodHistory(prev => [moodKey, ...prev.filter(m => m !== moodKey)].slice(0, 5))
  }

  const clearMood = () => {
    setSelectedMood(null)
  }

  return {
    selectedMood,
    moodHistory,
    selectMood,
    clearMood,
  }
}

/**
 * Get mood metadata
 */
export function useMoodMetadata(moodKey: string | null) {
  const { moodsByCategory } = useMoods()

  if (!moodKey) return null

  // Find mood in all categories
  for (const category of Object.values(moodsByCategory)) {
    const mood = (category as Mood[]).find(m => m.mood_key === moodKey)
    if (mood) return mood
  }

  return null
}

/**
 * Get mood color for styling
 */
export function useMoodColor(moodKey: string | null): {
  primary: string
  secondary: string
} {
  const mood = useMoodMetadata(moodKey)

  if (!mood) {
    return {
      primary: '#6B7280',
      secondary: '#9CA3AF',
    }
  }

  return mood.color_scheme
}

/**
 * Format mood name for display
 */
export function useMoodLabel(moodKey: string | null): string {
  const mood = useMoodMetadata(moodKey)
  return mood?.mood_name || 'All Destinations'
}

/**
 * Get opposite mood
 */
export function useOppositeMood(moodKey: string | null): Mood | null {
  const mood = useMoodMetadata(moodKey)
  const oppositeMood = useMoodMetadata(mood?.opposite_mood_key || null)
  return oppositeMood
}

/**
 * Get moods in a category
 */
export function useMoodsInCategory(category: string): Mood[] {
  const { moodsByCategory } = useMoods()
  return moodsByCategory[category] || []
}
