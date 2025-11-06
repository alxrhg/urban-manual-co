/**
 * React Hook for Enhanced Tracking
 * Easy integration of enhanced tracking into React components
 *
 * Usage:
 * ```tsx
 * function DestinationPage({ destination }) {
 *   useEnhancedTracking({
 *     destinationId: destination.id,
 *     source: 'recommendation',
 *   })
 *
 *   return <div>...</div>
 * }
 * ```
 */

import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getSessionId } from '@/lib/tracking'
import {
  initializeEnhancedTracker,
  getEnhancedTracker,
  flushEnhancedTracking,
  EnhancedTracker,
} from '@/lib/tracking/enhanced-tracker'

// ============================================
// Types
// ============================================

interface UseEnhancedTrackingOptions {
  destinationId?: number
  source?: string
  searchQuery?: string
  positionInList?: number
  enabled?: boolean // Default: true
}

// ============================================
// Hook
// ============================================

export function useEnhancedTracking(options: UseEnhancedTrackingOptions = {}) {
  const { user } = useAuth()
  const trackerRef = useRef<EnhancedTracker | null>(null)
  const {
    destinationId,
    source,
    searchQuery,
    positionInList,
    enabled = true,
  } = options

  useEffect(() => {
    // Skip if disabled or SSR
    if (!enabled || typeof window === 'undefined') return

    // Initialize tracker
    const sessionId = getSessionId()
    const tracker = initializeEnhancedTracker({
      sessionId,
      userId: user?.id,
      destinationId,
    })

    trackerRef.current = tracker

    // Cleanup on unmount
    return () => {
      if (tracker) {
        tracker.flush().catch(console.error)
        tracker.destroy()
      }
    }
  }, [enabled, user?.id, destinationId])

  // Manual flush (useful for SPA navigation)
  const flush = async () => {
    await flushEnhancedTracking()
  }

  return {
    tracker: trackerRef.current,
    flush,
  }
}

// ============================================
// Specialized Hooks
// ============================================

/**
 * Track destination page view
 */
export function useDestinationTracking(destinationId: number, source?: string) {
  return useEnhancedTracking({
    destinationId,
    source,
  })
}

/**
 * Track search result interaction
 */
export function useSearchResultTracking(
  destinationId: number,
  searchQuery: string,
  position: number
) {
  return useEnhancedTracking({
    destinationId,
    source: 'search',
    searchQuery,
    positionInList: position,
  })
}

/**
 * Track recommendation interaction
 */
export function useRecommendationTracking(destinationId: number, position: number) {
  return useEnhancedTracking({
    destinationId,
    source: 'recommendation',
    positionInList: position,
  })
}

/**
 * Track category browsing
 */
export function useCategoryTracking(destinationId: number, category: string) {
  return useEnhancedTracking({
    destinationId,
    source: `category:${category}`,
  })
}
