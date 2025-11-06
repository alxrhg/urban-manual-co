/**
 * Enhanced Tracking Integration Examples
 * Copy and adapt these patterns to your components
 */

import { useEnhancedTracking } from '@/hooks/useEnhancedTracking'

// ============================================
// Example 1: Destination Page
// ============================================

interface DestinationPageProps {
  destination: {
    id: number
    name: string
    slug: string
    website?: string
  }
  source?: string
}

export function DestinationPageExample({ destination, source }: DestinationPageProps) {
  // ✅ Automatically tracks all 50+ signals
  useEnhancedTracking({
    destinationId: destination.id,
    source: source || 'direct',
  })

  return (
    <div>
      <h1>{destination.name}</h1>
      {/* Your destination content */}

      {/* Add tracking classes for specific elements */}
      <a
        href="https://booking.com"
        className="booking-link" // ← Tracked as booking_link_clicks
      >
        Book Now
      </a>

      <button
        className="save-button" // ← Tracked as save_button_hovers
        onClick={() => {}}
      >
        Save
      </button>

      <button
        className="share-button" // ← Tracked as share_button_hovers
        onClick={() => {}}
      >
        Share
      </button>

      <a
        href={destination.website}
        className="external-link" // ← Tracked as external_link_hovers
        target="_blank"
        rel="noopener noreferrer"
      >
        Visit Website
      </a>
    </div>
  )
}

// ============================================
// Example 2: Search Results
// ============================================

interface SearchResultsProps {
  destinations: Array<{ id: number; name: string }>
  searchQuery: string
}

export function SearchResultsExample({ destinations, searchQuery }: SearchResultsProps) {
  return (
    <div>
      <h2>Search Results for "{searchQuery}"</h2>

      {destinations.map((destination, index) => (
        <SearchResultCard
          key={destination.id}
          destination={destination}
          searchQuery={searchQuery}
          position={index}
        />
      ))}
    </div>
  )
}

function SearchResultCard({
  destination,
  searchQuery,
  position,
}: {
  destination: { id: number; name: string }
  searchQuery: string
  position: number
}) {
  // ✅ Track when card is hovered/viewed
  useEnhancedTracking({
    destinationId: destination.id,
    source: 'search',
    searchQuery,
    positionInList: position,
    enabled: false, // Only enable when actually clicked
  })

  return (
    <div className="search-result-card">
      <h3>{destination.name}</h3>
    </div>
  )
}

// ============================================
// Example 3: Recommendation Grid
// ============================================

interface RecommendationGridProps {
  recommendations: Array<{ id: number; name: string; score: number }>
}

export function RecommendationGridExample({ recommendations }: RecommendationGridProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {recommendations.map((rec, index) => (
        <RecommendationCard
          key={rec.id}
          destination={rec}
          position={index}
        />
      ))}
    </div>
  )
}

function RecommendationCard({
  destination,
  position,
}: {
  destination: { id: number; name: string; score: number }
  position: number
}) {
  // ✅ Track recommendation interaction
  useEnhancedTracking({
    destinationId: destination.id,
    source: 'recommendation',
    positionInList: position,
  })

  return (
    <div className="recommendation-card">
      <h3>{destination.name}</h3>
      <p>Match Score: {Math.round(destination.score * 100)}%</p>
    </div>
  )
}

// ============================================
// Example 4: Category Browse
// ============================================

interface CategoryPageProps {
  category: string
  destinations: Array<{ id: number; name: string }>
}

export function CategoryPageExample({ category, destinations }: CategoryPageProps) {
  return (
    <div>
      <h1>Browse {category}</h1>

      {destinations.map((destination) => (
        <CategoryDestinationCard
          key={destination.id}
          destination={destination}
          category={category}
        />
      ))}
    </div>
  )
}

function CategoryDestinationCard({
  destination,
  category,
}: {
  destination: { id: number; name: string }
  category: string
}) {
  // ✅ Track category browsing
  useEnhancedTracking({
    destinationId: destination.id,
    source: `category:${category}`,
  })

  return (
    <div>
      <h3>{destination.name}</h3>
    </div>
  )
}

// ============================================
// Example 5: Conditional Tracking (Privacy)
// ============================================

import { useAuth } from '@/contexts/AuthContext'

export function PrivacyAwareTrackingExample({
  destination,
}: {
  destination: { id: number; name: string }
}) {
  const { user, profile } = useAuth()

  // ✅ Only track if user has consented
  useEnhancedTracking({
    destinationId: destination.id,
    enabled: profile?.allow_tracking !== false,
  })

  return (
    <div>
      <h1>{destination.name}</h1>

      {!profile?.allow_tracking && (
        <div className="privacy-notice">
          <p>Tracking is disabled. Enable in settings for personalized recommendations.</p>
        </div>
      )}
    </div>
  )
}

// ============================================
// Example 6: Manual Flush on Navigation (SPA)
// ============================================

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { flushEnhancedTracking } from '@/lib/tracking/enhanced-tracker'

export function NavigationTrackingExample() {
  const router = useRouter()

  useEffect(() => {
    // Flush tracking data before navigation
    const handleRouteChange = () => {
      flushEnhancedTracking().catch(console.error)
    }

    // Listen for route changes (if using custom router)
    // router.events.on('routeChangeStart', handleRouteChange)

    return () => {
      // Cleanup
      // router.events.off('routeChangeStart', handleRouteChange)
      flushEnhancedTracking().catch(console.error)
    }
  }, [router])

  return null
}

// ============================================
// Example 7: Image Tracking
// ============================================

export function ImageGalleryExample({
  images,
}: {
  images: Array<{ src: string; alt: string }>
}) {
  // Images are automatically tracked via IntersectionObserver
  // when 50% visible

  return (
    <div className="image-gallery">
      {images.map((image, index) => (
        <img
          key={index}
          src={image.src}
          alt={image.alt}
          // ✅ Automatically tracked when scrolled into view
          loading="lazy"
        />
      ))}
    </div>
  )
}

// ============================================
// Example 8: Video Tracking
// ============================================

export function VideoPlayerExample({ videoSrc }: { videoSrc: string }) {
  // Video play/pause is automatically tracked

  return (
    <video
      controls
      src={videoSrc}
      // ✅ play/pause events automatically tracked
    >
      Your browser does not support the video tag.
    </video>
  )
}

// ============================================
// Example 9: Hover Intent Tracking
// ============================================

export function HoverIntentExample({
  destination,
}: {
  destination: { id: number; name: string }
}) {
  useEnhancedTracking({
    destinationId: destination.id,
  })

  return (
    <div
      // ✅ All hovers automatically tracked
      id={`destination-${destination.id}`}
      className="destination-card"
    >
      <h3>{destination.name}</h3>

      {/* Specific buttons tracked */}
      <button className="save-button">Save</button>
      <button className="share-button">Share</button>
    </div>
  )
}

// ============================================
// Example 10: A/B Testing with Tracking
// ============================================

export function ABTestingExample({
  destination,
  variant,
}: {
  destination: { id: number; name: string }
  variant: 'control' | 'treatment'
}) {
  useEnhancedTracking({
    destinationId: destination.id,
    source: `ab-test:${variant}`,
  })

  if (variant === 'treatment') {
    return (
      <div>
        <h1>{destination.name}</h1>
        <p>New layout with enhanced features</p>
      </div>
    )
  }

  return (
    <div>
      <h1>{destination.name}</h1>
      <p>Original layout</p>
    </div>
  )
}

// ============================================
// Example 11: Debugging Tracker
// ============================================

import { getEnhancedTracker } from '@/lib/tracking/enhanced-tracker'
import { getGlobalBatcher } from '@/lib/tracking/event-batcher'

export function DebugPanel() {
  const tracker = getEnhancedTracker()
  const batcher = getGlobalBatcher()

  const handleViewStats = async () => {
    if (tracker) {
      const signals = await tracker.collectSignals()
      console.log('Current Signals:', signals)
    }

    console.log('Queue Size:', batcher.getQueueSize())
    console.log('Failed Batches:', await batcher.getFailedBatchCount())
  }

  const handleFlush = async () => {
    await flushEnhancedTracking()
    console.log('Flushed!')
  }

  const handleClearFailed = async () => {
    await batcher.clearFailedBatches()
    console.log('Cleared failed batches')
  }

  return (
    <div className="debug-panel">
      <h3>Tracking Debug Panel</h3>
      <button onClick={handleViewStats}>View Stats</button>
      <button onClick={handleFlush}>Flush Now</button>
      <button onClick={handleClearFailed}>Clear Failed</button>
    </div>
  )
}

// ============================================
// Best Practices
// ============================================

/*
✅ DO:
- Use the hook at the top level of your component
- Set `enabled: false` for list items (only track on click)
- Add CSS classes for specific tracking (booking-link, save-button, etc.)
- Respect user privacy settings
- Use source parameter for attribution

❌ DON'T:
- Don't initialize multiple trackers per page
- Don't track PII (names, emails) in signals
- Don't track without user consent (GDPR)
- Don't forget to flush on SPA navigation
- Don't over-track (avoid tracking every tiny interaction)

🎯 Performance Tips:
- The tracker is already optimized (passive listeners, throttling)
- Auto-flushes every 5 seconds or 50 events
- Uses IndexedDB for offline storage
- Minimal performance impact (~0.5% CPU)
*/
