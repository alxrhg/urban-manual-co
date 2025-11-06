/**
 * Explainable Recommendations List
 * Displays a list of recommendations with explanations
 */

'use client'

import { useExplainableRecommendations } from '@/hooks/useExplainableRecommendations'
import { ExplainableRecommendationCard } from './ExplainableRecommendationCard'
import { motion } from 'framer-motion'

interface ExplainableRecommendationsListProps {
  limit?: number
  className?: string
}

export function ExplainableRecommendationsList({
  limit = 20,
  className = '',
}: ExplainableRecommendationsListProps) {
  const { recommendations, isLoading, error, refresh } = useExplainableRecommendations(limit)

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
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
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
        <div className="text-4xl mb-3">🎯</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No recommendations yet
        </h3>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          Start exploring destinations and saving places you like. We'll analyze your preferences
          and provide personalized recommendations with detailed explanations.
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-2"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Your Personalized Recommendations
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Curated based on your taste profile • {recommendations.length} matches
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
      <div className="space-y-4">
        {recommendations.map((recommendation, index) => (
          <ExplainableRecommendationCard
            key={recommendation.destination.id}
            recommendation={recommendation}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
