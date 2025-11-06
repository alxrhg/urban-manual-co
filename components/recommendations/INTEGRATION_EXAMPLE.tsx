/**
 * Integration Examples for Explainable Recommendations (Phase 3)
 *
 * This file demonstrates how to use the explainable recommendation system
 * in various parts of your application.
 */

'use client'

import { ExplainableRecommendationsList } from './ExplainableRecommendationsList'
import { WhyThisMatches } from './WhyThisMatches'
import { useExplainableRecommendations, useDestinationExplanation } from '@/hooks/useExplainableRecommendations'

// ============================================
// Example 1: Full Recommendations Page
// ============================================

export function RecommendationsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ExplainableRecommendationsList limit={20} />
    </div>
  )
}

// ============================================
// Example 2: Destination Detail Page
// ============================================

interface DestinationPageProps {
  destination: {
    id: number
    name: string
    slug: string
    description: string
    city: string
  }
}

export function DestinationDetailPage({ destination }: DestinationPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{destination.name}</h1>
        <p className="text-gray-600">{destination.city}</p>
      </div>

      {/* Why This Matches (Personalized) */}
      <WhyThisMatches destinationId={destination.id} className="mb-8" />

      {/* Description */}
      <div className="prose max-w-none">
        <p>{destination.description}</p>
      </div>
    </div>
  )
}

// ============================================
// Example 3: Custom Recommendation Widget
// ============================================

export function CustomRecommendationWidget() {
  const { recommendations, isLoading } = useExplainableRecommendations(5)

  if (isLoading) {
    return <div>Loading recommendations...</div>
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Top Picks for You</h2>
      <div className="space-y-4">
        {recommendations.map((rec) => (
          <div key={rec.destination.id} className="border-b border-gray-200 pb-4 last:border-0">
            <h3 className="font-semibold text-lg mb-2">{rec.destination.name}</h3>

            {/* Top Reason */}
            {rec.reasons[0] && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{rec.reasons[0].icon}</span>
                <span>{rec.reasons[0].explanation}</span>
              </div>
            )}

            {/* Match Score */}
            <div className="mt-2 text-sm text-blue-600 font-medium">
              {Math.round(rec.match_score * 100)}% match
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Example 4: Get Single Explanation Programmatically
// ============================================

export function SingleDestinationExplanation({ destinationId }: { destinationId: number }) {
  const { recommendation, isGenerating, error } = useDestinationExplanation(destinationId)

  if (isGenerating) {
    return <div>Analyzing match...</div>
  }

  if (error) {
    return <div>Failed to generate explanation</div>
  }

  if (!recommendation) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="text-2xl font-bold">
        {Math.round(recommendation.match_score * 100)}% Match
      </div>

      <div className="space-y-2">
        {recommendation.reasons.map((reason, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <span className="text-xl">{reason.icon}</span>
            <div>
              <div className="font-medium">{reason.factor_name}</div>
              <div className="text-sm text-gray-600">{reason.explanation}</div>
            </div>
          </div>
        ))}
      </div>

      {recommendation.evidence.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm font-medium mb-2">Supporting Evidence:</div>
          <ul className="text-sm text-gray-600 space-y-1">
            {recommendation.evidence.map((ev, idx) => (
              <li key={idx}>• {ev.description}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============================================
// Example 5: Compact Recommendation Card
// ============================================

export function CompactRecommendationCard({ destinationId }: { destinationId: number }) {
  const { recommendation, isGenerating } = useDestinationExplanation(destinationId)

  if (isGenerating || !recommendation) {
    return null
  }

  const topReason = recommendation.reasons[0]

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{recommendation.destination.name}</h3>
        <span className="text-sm font-medium text-blue-600">
          {Math.round(recommendation.match_score * 100)}%
        </span>
      </div>

      {topReason && (
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span>{topReason.icon}</span>
          <span>{topReason.explanation}</span>
        </div>
      )}
    </div>
  )
}

// ============================================
// Example 6: A/B Testing Hook Usage
// ============================================

export function ABTestRecommendations() {
  const { recommendations } = useExplainableRecommendations(20)

  // You can implement A/B testing by showing different UI variants
  const showVersion = Math.random() < 0.5 ? 'A' : 'B'

  if (showVersion === 'A') {
    // Version A: Show full explanations
    return <ExplainableRecommendationsList limit={20} />
  } else {
    // Version B: Show compact cards
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec) => (
          <CompactRecommendationCard
            key={rec.destination.id}
            destinationId={rec.destination.id}
          />
        ))}
      </div>
    )
  }
}
