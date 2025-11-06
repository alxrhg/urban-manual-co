/**
 * Explainable Recommendation Card
 * Displays destination recommendation with AI-generated reasons
 */

'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { RecommendationWithReason } from '@/hooks/useExplainableRecommendations'
import { useMatchScoreLabel, useConfidenceLevel } from '@/hooks/useExplainableRecommendations'

interface ExplainableRecommendationCardProps {
  recommendation: RecommendationWithReason
  index?: number
}

export function ExplainableRecommendationCard({
  recommendation,
  index = 0,
}: ExplainableRecommendationCardProps) {
  const { destination, match_score, confidence, reasons, evidence } = recommendation
  const matchLabel = useMatchScoreLabel(match_score)
  const confidenceLevel = useConfidenceLevel(confidence)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
    >
      {/* Header */}
      <Link href={`/destinations/${destination.slug}`}>
        <div className="p-6 cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {destination.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{destination.city}</span>
                <span>•</span>
                <span>{destination.category}</span>
                {destination.cuisine_type && (
                  <>
                    <span>•</span>
                    <span>{destination.cuisine_type}</span>
                  </>
                )}
              </div>
            </div>

            {/* Match Score Badge */}
            <div className="flex flex-col items-end gap-1">
              <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {matchLabel}
              </div>
              <div
                className={`text-xs text-${confidenceLevel.color}-600`}
                title={`Confidence: ${Math.round(confidence * 100)}%`}
              >
                {confidenceLevel.label} confidence
              </div>
            </div>
          </div>

          {/* Price & Rating */}
          {(destination.price_level || destination.rating) && (
            <div className="flex items-center gap-3 mt-3 text-sm text-gray-600">
              {destination.price_level && (
                <span className="font-medium">
                  {'$'.repeat(destination.price_level)}
                </span>
              )}
              {destination.rating && (
                <span className="flex items-center gap-1">
                  ⭐ {destination.rating.toFixed(1)}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Reasons */}
      {reasons.length > 0 && (
        <div className="px-6 pb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Why we recommend this
          </h4>
          <div className="space-y-2">
            {reasons.map((reason, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (index * 0.1) + (idx * 0.05) }}
                className="flex items-start gap-3 text-sm"
              >
                <span className="text-2xl flex-shrink-0" role="img" aria-label={reason.factor_name}>
                  {reason.icon}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-0.5">
                    {reason.factor_name}
                  </div>
                  <div className="text-gray-600">
                    {reason.explanation}
                  </div>
                </div>
                {/* Contribution bar */}
                <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden flex-shrink-0 mt-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${reason.contribution_score * 100}%` }}
                    transition={{ delay: (index * 0.1) + (idx * 0.05) + 0.2, duration: 0.5 }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence */}
      {evidence.length > 0 && (
        <div className="px-6 pb-6">
          <details className="group">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900 transition-colors">
              Supporting Evidence ({evidence.length})
            </summary>
            <div className="mt-3 space-y-2">
              {evidence.map((item, idx) => (
                <div
                  key={idx}
                  className="text-sm text-gray-600 pl-4 border-l-2 border-gray-200"
                >
                  {item.description}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Tags */}
      {destination.tags && destination.tags.length > 0 && (
        <div className="px-6 pb-6">
          <div className="flex flex-wrap gap-2">
            {destination.tags.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
