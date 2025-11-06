/**
 * Onboarding Wizard Component
 * Multi-step onboarding flow for new users
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboarding, useOnboardingWizard } from '@/hooks/useOnboarding'
import { useRouter } from 'next/navigation'

interface OnboardingWizardProps {
  onComplete?: () => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { questions, submitOnboarding, isLoading } = useOnboarding()
  const wizard = useOnboardingWizard(questions.length)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const currentQuestion = questions[wizard.currentStep]

  const handleNext = () => {
    wizard.goToNextStep()
  }

  const handleBack = () => {
    wizard.goToPreviousStep()
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const responses = {
        ...wizard.responses,
        time_spent_seconds: wizard.getTimeSpent(),
      }

      await submitOnboarding(responses)

      if (onComplete) {
        onComplete()
      } else {
        router.push('/discover') // Redirect to discovery page
      }
    } catch (error) {
      console.error('Failed to submit onboarding:', error)
      alert('Failed to complete onboarding. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <OnboardingLoader />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {wizard.currentStep + 1} of {questions.length}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(wizard.progress)}% complete
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${wizard.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <QuestionContent
                question={currentQuestion}
                value={wizard.responses[currentQuestion.question_key]}
                onChange={(value) =>
                  wizard.updateResponse(currentQuestion.question_key, value)
                }
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={wizard.isFirstStep}
            className="px-6 py-3 text-gray-700 font-medium rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          {wizard.isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Completing...' : 'Complete Onboarding'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next →
            </button>
          )}
        </div>

        {/* Skip */}
        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/discover')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Question Content Component
// ============================================

interface QuestionContentProps {
  question: any
  value: any
  onChange: (value: any) => void
}

function QuestionContent({ question, value, onChange }: QuestionContentProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {question.question_text}
      </h2>

      {question.question_type === 'multi_select' && (
        <MultiSelectQuestion
          options={question.options}
          value={value || []}
          onChange={onChange}
        />
      )}

      {question.question_type === 'single_select' && (
        <SingleSelectQuestion
          options={question.options}
          value={value}
          onChange={onChange}
        />
      )}

      {question.question_type === 'scale' && (
        <ScaleQuestion
          options={question.options}
          value={value}
          onChange={onChange}
        />
      )}
    </div>
  )
}

// ============================================
// Question Type Components
// ============================================

function MultiSelectQuestion({ options, value, onChange }: any) {
  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v: string) => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {options.map((option: any) => {
        const optionValue = typeof option === 'string' ? option : option.value
        const optionLabel = typeof option === 'string' ? option : option.label

        return (
          <button
            key={optionValue}
            onClick={() => toggleOption(optionValue)}
            className={`
              p-4 rounded-lg border-2 transition-all text-left
              ${
                value.includes(optionValue)
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }
            `}
          >
            <div className="font-medium capitalize">
              {optionLabel.replace(/_/g, ' ')}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function SingleSelectQuestion({ options, value, onChange }: any) {
  return (
    <div className="space-y-3">
      {options.map((option: any) => {
        const optionValue = typeof option === 'string' ? option : option.value
        const optionLabel = typeof option === 'string' ? option : option.label
        const optionIcon = option.icon
        const optionDescription = option.description

        return (
          <button
            key={optionValue}
            onClick={() => onChange(optionValue)}
            className={`
              w-full p-4 rounded-lg border-2 transition-all text-left
              ${
                value === optionValue
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-3">
              {optionIcon && <span className="text-2xl">{optionIcon}</span>}
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{optionLabel}</div>
                {optionDescription && (
                  <div className="text-sm text-gray-600">{optionDescription}</div>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ScaleQuestion({ options, value, onChange }: any) {
  const min = options.min || 0
  const max = options.max || 10

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-600">{options.min_label}</span>
        <span className="text-sm text-gray-600">{options.max_label}</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value !== undefined ? value : (min + max) / 2}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />

      <div className="mt-4 text-center">
        <span className="text-3xl font-bold text-blue-600">
          {value !== undefined ? value : Math.floor((min + max) / 2)}
        </span>
      </div>
    </div>
  )
}

// ============================================
// Loading State
// ============================================

function OnboardingLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin text-6xl mb-4">🎯</div>
        <p className="text-gray-600">Loading onboarding...</p>
      </div>
    </div>
  )
}
