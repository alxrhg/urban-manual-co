/**
 * React Hooks for Onboarding Flow
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import useSWR from 'swr'

// ============================================
// Types
// ============================================

export interface OnboardingQuestion {
  id: string
  question_key: string
  question_text: string
  question_type: 'multi_select' | 'single_select' | 'scale' | 'ranking'
  category: string
  options: any
  required: boolean
  order_index: number
}

export interface OnboardingResponses {
  user_id: string
  preferred_cuisines: string[]
  avoided_cuisines?: string[]
  typical_budget: number
  splurge_willingness?: number
  preferred_ambiance: string[]
  formality_preference?: number
  primary_dining_context: string
  group_size_preference?: number
  novelty_seeking: number
  tourist_vs_local: number
  dietary_restrictions?: string[]
  interests?: string[]
  travel_frequency?: string
  preferred_travel_style?: string
  favorite_moods?: string[]
  time_spent_seconds?: number
}

// ============================================
// Hooks
// ============================================

/**
 * Get onboarding questions and progress
 */
export function useOnboarding() {
  const { user } = useAuth()

  const { data, error, isLoading, mutate } = useSWR(
    user?.id ? `/api/onboarding?user_id=${user.id}` : '/api/onboarding',
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch onboarding data')
      return res.json()
    }
  )

  const submitOnboarding = async (responses: Partial<OnboardingResponses>) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...responses,
        user_id: user.id,
      }),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.message || 'Failed to submit onboarding')
    }

    // Refresh data
    mutate()

    return res.json()
  }

  return {
    questions: data?.questions || [],
    progress: data?.progress,
    existingResponses: data?.responses,
    isLoading,
    error,
    submitOnboarding,
    hasCompletedOnboarding: data?.progress?.completed || false,
  }
}

/**
 * Onboarding wizard state management
 */
export function useOnboardingWizard(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0)
  const [responses, setResponses] = useState<Partial<OnboardingResponses>>({})
  const [startTime] = useState(Date.now())

  const goToNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step)
    }
  }

  const updateResponse = (key: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const getTimeSpent = () => {
    return Math.floor((Date.now() - startTime) / 1000)
  }

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1
  const progress = ((currentStep + 1) / totalSteps) * 100

  return {
    currentStep,
    responses,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    updateResponse,
    getTimeSpent,
    isFirstStep,
    isLastStep,
    progress,
  }
}

/**
 * Check if onboarding is required
 */
export function useOnboardingRequired() {
  const { user } = useAuth()
  const [isRequired, setIsRequired] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setIsRequired(false)
      setIsChecking(false)
      return
    }

    const checkOnboarding = async () => {
      try {
        const res = await fetch(`/api/onboarding?user_id=${user.id}`)
        const data = await res.json()

        setIsRequired(!data.progress?.completed)
      } catch (error) {
        console.error('Failed to check onboarding status:', error)
        setIsRequired(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkOnboarding()
  }, [user?.id])

  return { isRequired, isChecking }
}
