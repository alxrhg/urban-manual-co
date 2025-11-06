/**
 * Integration Examples for Mood-Based Discovery (Phase 4)
 *
 * This file demonstrates how to use the mood filtering system
 * in various parts of your application.
 */

'use client'

import { MoodSelector } from './MoodSelector'
import { MoodFilteredRecommendations } from './MoodFilteredRecommendations'
import { useMoodSelector, useMoodRecommendations } from '@/hooks/useMoodFilter'
import { useState } from 'react'

// ============================================
// Example 1: Full Mood Discovery Page
// ============================================

export function MoodDiscoveryPage() {
  const { selectedMood, selectMood } = useMoodSelector()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Mood Selector */}
      <MoodSelector
        selectedMood={selectedMood}
        onMoodSelect={selectMood}
        className="mb-8"
      />

      {/* Mood-Filtered Recommendations */}
      <MoodFilteredRecommendations
        moodKey={selectedMood}
        limit={20}
        approach="mood_first"
      />
    </div>
  )
}

// ============================================
// Example 2: Compact Mood Filter
// ============================================

export function CompactMoodFilter() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const { recommendations, isLoading } = useMoodRecommendations(selectedMood, 10)

  const quickMoods = ['romantic', 'energetic', 'relaxed', 'adventurous', 'cozy']

  return (
    <div className="space-y-4">
      {/* Quick Mood Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedMood(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            !selectedMood
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>

        {quickMoods.map(mood => (
          <button
            key={mood}
            onClick={() => setSelectedMood(mood)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedMood === mood
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {mood.charAt(0).toUpperCase() + mood.slice(1)}
          </button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Found {recommendations.length} destinations
          </p>
          {/* Render recommendations */}
        </div>
      )}
    </div>
  )
}

// ============================================
// Example 3: Mood-Based Homepage Section
// ============================================

export function MoodBasedSection() {
  const featuredMoods = [
    { mood: 'romantic', title: 'Date Night', emoji: '💕' },
    { mood: 'energetic', title: 'Let\'s Go!', emoji: '⚡' },
    { mood: 'cozy', title: 'Comfort', emoji: '☕' },
    { mood: 'hidden_gem', title: 'Discover', emoji: '💎' },
  ]

  return (
    <div className="py-12">
      <h2 className="text-3xl font-bold mb-8">Explore by Mood</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {featuredMoods.map(({ mood, title, emoji }) => (
          <MoodCard key={mood} mood={mood} title={title} emoji={emoji} />
        ))}
      </div>
    </div>
  )
}

function MoodCard({ mood, title, emoji }: { mood: string; title: string; emoji: string }) {
  const { recommendations, isLoading } = useMoodRecommendations(mood, 3)

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer">
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">
        {isLoading ? 'Loading...' : `${recommendations.length} places`}
      </p>
      <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
        Explore →
      </button>
    </div>
  )
}

// ============================================
// Example 4: Mood Toggle in Search Results
// ============================================

export function SearchWithMoodToggle() {
  const [moodEnabled, setMoodEnabled] = useState(false)
  const [selectedMood, setSelectedMood] = useState<string | null>('romantic')

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Filter by mood:</span>
        <button
          onClick={() => setMoodEnabled(!moodEnabled)}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${moodEnabled ? 'bg-blue-600' : 'bg-gray-300'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${moodEnabled ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Mood Selector (when enabled) */}
      {moodEnabled && (
        <MoodSelector
          selectedMood={selectedMood}
          onMoodSelect={setSelectedMood}
        />
      )}

      {/* Results */}
      <div>
        {moodEnabled && selectedMood ? (
          <MoodFilteredRecommendations
            moodKey={selectedMood}
            limit={20}
          />
        ) : (
          <div>Regular search results...</div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Example 5: Mood History Timeline
// ============================================

export function MoodHistoryTimeline() {
  const { moodHistory } = useMoodSelector()

  if (moodHistory.length === 0) return null

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Your Recent Moods
      </h3>
      <div className="flex flex-wrap gap-2">
        {moodHistory.map((mood, idx) => (
          <div
            key={idx}
            className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 border border-gray-200"
          >
            {mood}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Example 6: Inline Mood Badge on Destination Card
// ============================================

interface DestinationWithMoodBadgeProps {
  destinationId: number
  moodKey: string
}

export function DestinationWithMoodBadge({
  destinationId,
  moodKey,
}: DestinationWithMoodBadgeProps) {
  // You would fetch mood score for this destination
  const moodScore = 0.85 // Example

  return (
    <div className="relative">
      {/* Destination card content */}
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-xl font-semibold">Destination Name</h3>
        {/* ... other content */}
      </div>

      {/* Mood badge */}
      {moodScore >= 0.7 && (
        <div className="absolute top-4 right-4 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
          Perfect for {moodKey}
        </div>
      )}
    </div>
  )
}

// ============================================
// Example 7: Mood-Based Onboarding
// ============================================

export function MoodOnboarding() {
  const [step, setStep] = useState(1)
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])

  const handleMoodSelect = (mood: string) => {
    if (selectedMoods.includes(mood)) {
      setSelectedMoods(selectedMoods.filter(m => m !== mood))
    } else {
      setSelectedMoods([...selectedMoods, mood])
    }
  }

  const handleComplete = () => {
    // Save user's preferred moods
    console.log('User prefers:', selectedMoods)
  }

  return (
    <div className="max-w-2xl mx-auto py-12">
      <h2 className="text-3xl font-bold mb-4">Welcome! 👋</h2>
      <p className="text-gray-600 mb-8">
        Select a few moods that describe how you like to explore.
        This helps us recommend better destinations for you.
      </p>

      <MoodSelector
        selectedMood={null}
        onMoodSelect={(mood) => mood && handleMoodSelect(mood)}
      />

      <div className="mt-8 flex justify-between">
        <button
          onClick={() => setStep(step - 1)}
          className="px-6 py-2 text-gray-700 hover:text-gray-900"
        >
          Back
        </button>
        <button
          onClick={handleComplete}
          disabled={selectedMoods.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
