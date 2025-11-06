/**
 * Why This Matches Component
 * Inline explanation for why a destination matches user's taste
 * Use on destination detail pages
 */

'use client'

import { useDestinationExplanation } from '@/hooks/useExplainableRecommendations'
import { motion, AnimatePresence } from 'framer-motion'

interface WhyThisMatchesProps {
  destinationId: number
  className?: string
}

export function WhyThisMatches({ destinationId, className = '' }: WhyThisMatchesProps) {
  const { recommendation, isGenerating, error } = useDestinationExplanation(destinationId)

  if (error) {
    return null // Silent fail - not critical
  }

  if (isGenerating) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="animate-spin text-2xl">🎯</div>
          <div className="text-sm text-blue-900">
            Analyzing why this matches your taste...
          </div>
        </div>
      </div>
    )
  }

  if (!recommendation || recommendation.reasons.length === 0) {
    return null
  }

  const matchPercentage = Math.round(recommendation.match_score * 100)
  const topReasons = recommendation.reasons.slice(0, 3)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl overflow-hidden ${className}`}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✨</span>
              <h3 className="text-lg font-semibold text-gray-900">
                Why this matches your taste
              </h3>
            </div>
            <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium">
              {matchPercentage}% match
            </div>
          </div>

          {/* Reasons */}
          <div className="space-y-3">
            {topReasons.map((reason, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-3 bg-white/60 rounded-lg p-3"
              >
                <span className="text-xl flex-shrink-0" role="img" aria-label={reason.factor_name}>
                  {reason.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm mb-0.5">
                    {reason.factor_name}
                  </div>
                  <div className="text-gray-700 text-sm">
                    {reason.explanation}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Evidence count */}
          {recommendation.evidence.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 pt-4 border-t border-blue-200"
            >
              <div className="text-xs text-gray-600">
                Based on {recommendation.evidence.length} data points from your activity
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
