/**
 * Mood Selector Component
 * Allows users to select their current mood/intent for discovery
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useMoods, useMoodSelector, useMoodColor } from '@/hooks/useMoodFilter'
import { useState } from 'react'

interface MoodSelectorProps {
  onMoodSelect: (moodKey: string | null) => void
  selectedMood?: string | null
  className?: string
}

export function MoodSelector({
  onMoodSelect,
  selectedMood: controlledMood,
  className = '',
}: MoodSelectorProps) {
  const { moodsByCategory, suggestedMoods, isLoading } = useMoods()
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [localSelectedMood, setLocalSelectedMood] = useState<string | null>(null)

  const selectedMood = controlledMood !== undefined ? controlledMood : localSelectedMood

  const handleMoodClick = (moodKey: string) => {
    const newMood = moodKey === selectedMood ? null : moodKey
    setLocalSelectedMood(newMood)
    onMoodSelect(newMood)
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const categories = Object.entries(moodsByCategory)

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              What's your mood?
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Discover destinations that match how you feel
            </p>
          </div>

          {selectedMood && (
            <button
              onClick={() => handleMoodClick(selectedMood)}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Suggested Moods */}
      {suggestedMoods.length > 0 && !selectedMood && (
        <div className="p-6 border-b border-gray-200 bg-blue-50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            ⭐ Based on your history
          </h3>
          <div className="flex flex-wrap gap-2">
            {suggestedMoods.map((moodKey: string) => {
              const mood = categories
                .flatMap(([_, moods]) => moods)
                .find(m => m.mood_key === moodKey)

              if (!mood) return null

              return (
                <motion.button
                  key={mood.mood_key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleMoodClick(mood.mood_key)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: mood.color_scheme.primary + '20',
                    color: mood.color_scheme.primary,
                    border: `2px solid ${mood.color_scheme.primary}40`,
                  }}
                >
                  <span className="mr-2">{mood.icon}</span>
                  {mood.mood_name}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Mood Categories */}
      <div className="p-6">
        <div className="space-y-6">
          {categories.map(([category, moods]) => (
            <div key={category}>
              <button
                onClick={() =>
                  setExpandedCategory(expandedCategory === category ? null : category)
                }
                className="w-full flex items-center justify-between mb-3 group"
              >
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide group-hover:text-gray-900 transition-colors">
                  {category.replace('_', ' ')}
                </h3>
                <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                  {expandedCategory === category ? '−' : '+'}
                </span>
              </button>

              <AnimatePresence>
                {(expandedCategory === category || selectedMood) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {moods.map(mood => (
                        <MoodCard
                          key={mood.mood_key}
                          mood={mood}
                          isSelected={selectedMood === mood.mood_key}
                          onClick={() => handleMoodClick(mood.mood_key)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Mood Card Component
// ============================================

interface MoodCardProps {
  mood: {
    mood_key: string
    mood_name: string
    description: string
    icon: string
    color_scheme: {
      primary: string
      secondary: string
    }
  }
  isSelected: boolean
  onClick: () => void
}

function MoodCard({ mood, isSelected, onClick }: MoodCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative p-4 rounded-xl text-left transition-all
        ${isSelected ? 'shadow-lg ring-2' : 'shadow-sm hover:shadow-md'}
      `}
      style={{
        backgroundColor: isSelected
          ? mood.color_scheme.primary
          : mood.color_scheme.primary + '10',
        borderColor: mood.color_scheme.primary + '40',
        border: `2px solid ${mood.color_scheme.primary}${isSelected ? '' : '40'}`,
        ringColor: mood.color_scheme.primary,
      }}
    >
      {/* Icon */}
      <div className="text-3xl mb-2">{mood.icon}</div>

      {/* Name */}
      <div
        className={`font-semibold text-sm mb-1 ${
          isSelected ? 'text-white' : 'text-gray-900'
        }`}
      >
        {mood.mood_name}
      </div>

      {/* Description */}
      <div
        className={`text-xs line-clamp-2 ${
          isSelected ? 'text-white/90' : 'text-gray-600'
        }`}
      >
        {mood.description}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center"
        >
          <span className="text-sm">✓</span>
        </motion.div>
      )}
    </motion.button>
  )
}
