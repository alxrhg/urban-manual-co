/**
 * Mood-Filtered Recommendations Component
 * Shows recommendations filtered by selected mood
 */

'use client'

import { useMoodRecommendations, useMoodLabel, useMoodColor } from '@/hooks/useMoodFilter'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface MoodFilteredRecommendationsProps {
  moodKey: string | null
  limit?: number
  approach?: 'mood_first' | 'taste_first'
  className?: string
}

export function MoodFilteredRecommendations({
  moodKey,
  limit = 20,
  approach = 'mood_first',
  className = '',
}: MoodFilteredRecommendationsProps) {
  const {
    recommendations,
    isLoading,
    error,
    refresh,
    trackInteraction,
  } = useMoodRecommendations(moodKey, limit, approach)

  const moodLabel = useMoodLabel(moodKey)
  const moodColor = useMoodColor(moodKey)

  if (!moodKey) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-4xl mb-3">🎯</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Select a mood to start discovering
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Choose how you're feeling or what you're looking for, and we'll show you
          perfectly matched destinations.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse"
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-8 w-24 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-xl p-6 ${className}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-lg font-semibold text-red-900 mb-1">
              Failed to load recommendations
            </h3>
            <p className="text-red-700 text-sm mb-3">
              {error.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => refresh()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-xl p-8 text-center ${className}`}>
        <div className="text-4xl mb-3">🔍</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No matches for "{moodLabel}"
        </h3>
        <p className="text-gray-600 text-sm max-w-md mx-auto mb-4">
          Try selecting a different mood or explore all destinations.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Browse All Destinations
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
        style={{
          borderBottom: `2px solid ${moodColor.primary}`,
          paddingBottom: '1rem',
        }}
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Perfect for "{moodLabel}"
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {recommendations.length} destinations match your mood
          </p>
        </div>
        <button
          onClick={() => refresh()}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          🔄 Refresh
        </button>
      </motion.div>

      {/* Recommendations */}
      <div className="grid grid-cols-1 gap-4">
        {recommendations.map((rec, index) => (
          <MoodRecommendationCard
            key={rec.destination_id}
            recommendation={rec}
            index={index}
            moodColor={moodColor}
            onView={trackInteraction}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================
// Mood Recommendation Card
// ============================================

interface MoodRecommendationCardProps {
  recommendation: any
  index: number
  moodColor: { primary: string; secondary: string }
  onView: () => void
}

function MoodRecommendationCard({
  recommendation,
  index,
  moodColor,
  onView,
}: MoodRecommendationCardProps) {
  const matchPercentage = Math.round(recommendation.overall_score * 100)
  const moodPercentage = Math.round(recommendation.mood_score * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
      onClick={onView}
    >
      <Link href={`/destinations/${recommendation.destination_id}`}>
        <div className="p-6 cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Destination #{recommendation.destination_id}
              </h3>

              {/* Scores */}
              <div className="flex items-center gap-4 text-sm">
                {/* Overall Match */}
                <div>
                  <span className="text-gray-600">Overall Match:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {matchPercentage}%
                  </span>
                </div>

                {/* Mood Match */}
                <div>
                  <span className="text-gray-600">Mood Fit:</span>
                  <span
                    className="ml-2 font-medium"
                    style={{ color: moodColor.primary }}
                  >
                    {moodPercentage}%
                  </span>
                </div>
              </div>

              {/* Dimension Scores */}
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(recommendation.dimension_scores).map(([dim, score]) => (
                  <div
                    key={dim}
                    className="px-2 py-1 bg-gray-100 rounded text-xs"
                  >
                    <span className="capitalize text-gray-700">{dim}:</span>
                    <span className="ml-1 font-medium text-gray-900">
                      {Math.round((score as number) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Badge */}
            <div
              className="px-4 py-2 rounded-full text-white font-medium text-sm"
              style={{ backgroundColor: moodColor.primary }}
            >
              {matchPercentage}%
            </div>
          </div>

          {/* Mood Score Breakdown */}
          {Object.keys(recommendation.mood_breakdown).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-2">Mood Factors:</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(recommendation.mood_breakdown).map(([mood, score]) => (
                  <div
                    key={mood}
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      backgroundColor: moodColor.primary + '20',
                      color: moodColor.primary,
                    }}
                  >
                    {mood}: {Math.round((score as number) * 100)}%
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
