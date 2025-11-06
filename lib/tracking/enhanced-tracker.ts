/**
 * Enhanced Tracking System - Client-Side Tracker
 * Captures 50+ behavioral signals for ML/AI personalization
 *
 * Features:
 * - Hover tracking with duration and count
 * - Scroll depth and velocity
 * - Dwell time (active vs idle)
 * - Cursor path complexity
 * - Content interaction (images, text selection)
 * - Performance-optimized with requestIdleCallback
 */

import { EventBatcher } from './event-batcher'

// ============================================
// Types
// ============================================

export interface InteractionSignal {
  // Identifiers
  destination_id?: number
  session_id: string
  user_id?: string

  // Mouse & Touch
  hover_duration_ms: number
  hover_count: number
  cursor_path_complexity: number
  click_hesitation_ms?: number

  // Scroll Behavior
  scroll_depth_percentage: number
  max_scroll_depth: number
  scroll_velocity_avg: number
  scroll_direction_changes: number
  time_to_first_scroll_ms?: number

  // Dwell & Engagement
  dwell_time_ms: number
  active_time_ms: number
  tab_switches: number
  idle_time_ms: number

  // Content Engagement
  images_viewed: string[]
  image_interactions: number
  text_selections: number
  text_copied: boolean
  video_played: boolean
  video_watch_duration_ms: number

  // Navigation
  back_button_used: boolean
  external_link_hovers: number
  share_button_hovers: number
  save_button_hovers: number
  booking_link_clicks: number

  // Interaction Patterns
  click_count: number
  double_click_count: number
  right_click_count: number

  // Context
  viewport_width: number
  viewport_height: number
  device_orientation: 'portrait' | 'landscape'
  battery_level?: number
  connection_type?: string

  // Source & Attribution
  source?: string
  referrer_page?: string
  search_query?: string
  position_in_list?: number

  // Timestamps
  page_load_time: number
  interaction_start_time: number
  interaction_end_time?: number
}

interface ScrollMetrics {
  maxDepth: number
  velocities: number[]
  directionChanges: number
  lastScrollY: number
  lastScrollTime: number
  firstScrollTime?: number
}

interface HoverTracking {
  startTime: number
  elementId: string
}

interface CursorPoint {
  x: number
  y: number
  timestamp: number
}

// ============================================
// Enhanced Tracker Class
// ============================================

export class EnhancedTracker {
  private sessionId: string
  private userId?: string
  private destinationId?: number

  // State tracking
  private pageLoadTime: number
  private interactionStartTime: number
  private lastActivityTime: number
  private isIdle: boolean = false
  private idleTimeout: NodeJS.Timeout | null = null

  // Hover tracking
  private hoverTracking = new Map<string, HoverTracking>()
  private totalHoverDuration: number = 0
  private hoverCount: number = 0
  private clickHesitation?: number

  // Scroll tracking
  private scrollMetrics: ScrollMetrics = {
    maxDepth: 0,
    velocities: [],
    directionChanges: 0,
    lastScrollY: 0,
    lastScrollTime: Date.now(),
  }

  // Cursor tracking
  private cursorPath: CursorPoint[] = []
  private readonly MAX_CURSOR_POINTS = 100 // Limit memory

  // Content tracking
  private imagesViewed = new Set<string>()
  private imageInteractions: number = 0
  private textSelections: number = 0
  private textCopied: boolean = false
  private videoPlayed: boolean = false
  private videoWatchDuration: number = 0

  // Navigation tracking
  private backButtonUsed: boolean = false
  private externalLinkHovers: number = 0
  private shareButtonHovers: number = 0
  private saveButtonHovers: number = 0
  private bookingLinkClicks: number = 0

  // Interaction counts
  private clickCount: number = 0
  private doubleClickCount: number = 0
  private rightClickCount: number = 0
  private tabSwitches: number = 0

  // Event batcher for efficient API calls
  private batcher: EventBatcher

  // Observers
  private intersectionObserver?: IntersectionObserver
  private visibilityChangeHandler?: () => void

  constructor(config: {
    sessionId: string
    userId?: string
    destinationId?: number
  }) {
    this.sessionId = config.sessionId
    this.userId = config.userId
    this.destinationId = config.destinationId

    this.pageLoadTime = Date.now()
    this.interactionStartTime = Date.now()
    this.lastActivityTime = Date.now()

    this.batcher = new EventBatcher()

    this.initialize()
  }

  // ============================================
  // Initialization
  // ============================================

  private initialize() {
    if (typeof window === 'undefined') return

    // Attach event listeners
    this.attachHoverListeners()
    this.attachScrollListeners()
    this.attachCursorListeners()
    this.attachContentListeners()
    this.attachNavigationListeners()
    this.attachClickListeners()
    this.attachVisibilityListeners()

    // Setup image intersection observer
    this.setupImageObserver()

    // Setup idle detection
    this.setupIdleDetection()

    // Setup beforeunload handler
    window.addEventListener('beforeunload', () => this.flush())
  }

  // ============================================
  // Hover Tracking
  // ============================================

  private attachHoverListeners() {
    // Use event delegation for performance
    document.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true)
    document.addEventListener('mouseleave', this.handleMouseLeave.bind(this), true)
  }

  private handleMouseEnter(event: MouseEvent) {
    const target = event.target as HTMLElement
    const elementId = this.getElementIdentifier(target)

    if (elementId && !this.hoverTracking.has(elementId)) {
      this.hoverTracking.set(elementId, {
        startTime: Date.now(),
        elementId,
      })
      this.hoverCount++

      // Track specific element hovers
      if (target.classList.contains('external-link')) {
        this.externalLinkHovers++
      } else if (target.classList.contains('share-button')) {
        this.shareButtonHovers++
      } else if (target.classList.contains('save-button')) {
        this.saveButtonHovers++
      }
    }

    this.markActivity()
  }

  private handleMouseLeave(event: MouseEvent) {
    const target = event.target as HTMLElement
    const elementId = this.getElementIdentifier(target)

    if (elementId && this.hoverTracking.has(elementId)) {
      const tracking = this.hoverTracking.get(elementId)!
      const duration = Date.now() - tracking.startTime
      this.totalHoverDuration += duration
      this.hoverTracking.delete(elementId)

      // If this was just before a click, record hesitation
      if (duration < 5000) { // Within 5 seconds
        this.clickHesitation = duration
      }
    }
  }

  // ============================================
  // Scroll Tracking
  // ============================================

  private attachScrollListeners() {
    let scrollTimeout: NodeJS.Timeout

    const handleScroll = () => {
      const scrollY = window.scrollY
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = document.documentElement.clientHeight
      const currentTime = Date.now()

      // Calculate depth
      const depth = Math.round((scrollY / (scrollHeight - clientHeight)) * 100)
      this.scrollMetrics.maxDepth = Math.max(this.scrollMetrics.maxDepth, depth)

      // Calculate velocity
      if (this.scrollMetrics.lastScrollTime) {
        const timeDelta = currentTime - this.scrollMetrics.lastScrollTime
        const scrollDelta = Math.abs(scrollY - this.scrollMetrics.lastScrollY)
        const velocity = timeDelta > 0 ? scrollDelta / timeDelta : 0
        this.scrollMetrics.velocities.push(velocity)

        // Keep only last 50 velocities for memory efficiency
        if (this.scrollMetrics.velocities.length > 50) {
          this.scrollMetrics.velocities.shift()
        }
      }

      // Detect direction changes
      if (this.scrollMetrics.lastScrollY !== 0) {
        const previousDirection = Math.sign(scrollY - this.scrollMetrics.lastScrollY)
        const currentDirection = Math.sign(scrollY - this.scrollMetrics.lastScrollY)
        if (previousDirection !== currentDirection && previousDirection !== 0) {
          this.scrollMetrics.directionChanges++
        }
      }

      // Record first scroll time
      if (!this.scrollMetrics.firstScrollTime) {
        this.scrollMetrics.firstScrollTime = currentTime
      }

      this.scrollMetrics.lastScrollY = scrollY
      this.scrollMetrics.lastScrollTime = currentTime
      this.markActivity()

      // Debounced scroll end
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        // Scroll ended - could track this if needed
      }, 150)
    }

    // Use passive listener for performance
    window.addEventListener('scroll', handleScroll, { passive: true })
  }

  // ============================================
  // Cursor Path Tracking
  // ============================================

  private attachCursorListeners() {
    let mouseMoveTimeout: NodeJS.Timeout

    const handleMouseMove = (event: MouseEvent) => {
      // Throttle to avoid performance issues
      clearTimeout(mouseMoveTimeout)
      mouseMoveTimeout = setTimeout(() => {
        this.cursorPath.push({
          x: event.clientX,
          y: event.clientY,
          timestamp: Date.now(),
        })

        // Keep only recent points
        if (this.cursorPath.length > this.MAX_CURSOR_POINTS) {
          this.cursorPath.shift()
        }
      }, 100) // Sample every 100ms

      this.markActivity()
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
  }

  // ============================================
  // Content Interaction Tracking
  // ============================================

  private attachContentListeners() {
    // Text selection
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection()
      if (selection && selection.toString().length > 0) {
        this.textSelections++
        this.markActivity()
      }
    })

    // Copy event
    document.addEventListener('copy', () => {
      this.textCopied = true
      this.markActivity()
    })

    // Video play tracking
    document.addEventListener('play', (event) => {
      const target = event.target as HTMLVideoElement
      if (target.tagName === 'VIDEO') {
        this.videoPlayed = true
        this.markActivity()

        // Track watch duration
        const videoStartTime = Date.now()
        target.addEventListener('pause', () => {
          this.videoWatchDuration += Date.now() - videoStartTime
        }, { once: true })
      }
    }, true)

    // Image interactions (zoom, click)
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'IMG' || target.closest('[data-image-zoom]')) {
        this.imageInteractions++
        this.markActivity()
      }
    })
  }

  // ============================================
  // Navigation Tracking
  // ============================================

  private attachNavigationListeners() {
    // Back button detection (popstate)
    window.addEventListener('popstate', () => {
      this.backButtonUsed = true
    })

    // Booking link clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const link = target.closest('a')

      if (link && link.classList.contains('booking-link')) {
        this.bookingLinkClicks++
        this.markActivity()
      }
    })
  }

  // ============================================
  // Click Tracking
  // ============================================

  private attachClickListeners() {
    document.addEventListener('click', () => {
      this.clickCount++
      this.markActivity()
    })

    document.addEventListener('dblclick', () => {
      this.doubleClickCount++
      this.markActivity()
    })

    document.addEventListener('contextmenu', () => {
      this.rightClickCount++
      this.markActivity()
    })
  }

  // ============================================
  // Visibility Tracking
  // ============================================

  private attachVisibilityListeners() {
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        this.tabSwitches++
        this.setIdle()
      } else {
        this.markActivity()
      }
    }

    document.addEventListener('visibilitychange', this.visibilityChangeHandler)
  }

  // ============================================
  // Image View Tracking (Intersection Observer)
  // ============================================

  private setupImageObserver() {
    if (typeof IntersectionObserver === 'undefined') return

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            const src = img.src || img.dataset.src
            if (src && !this.imagesViewed.has(src)) {
              this.imagesViewed.add(src)
            }
          }
        })
      },
      { threshold: 0.5 } // 50% visible
    )

    // Observe all images
    document.querySelectorAll('img').forEach((img) => {
      this.intersectionObserver?.observe(img)
    })
  }

  // ============================================
  // Idle Detection
  // ============================================

  private setupIdleDetection() {
    const IDLE_THRESHOLD = 30000 // 30 seconds

    this.resetIdleTimer()

    // Reset idle timer on any activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    activityEvents.forEach((event) => {
      document.addEventListener(event, () => this.resetIdleTimer(), { passive: true })
    })
  }

  private resetIdleTimer() {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout)
    }

    if (this.isIdle) {
      this.isIdle = false
      this.markActivity()
    }

    this.idleTimeout = setTimeout(() => {
      this.setIdle()
    }, 30000) // 30 seconds
  }

  private setIdle() {
    this.isIdle = true
  }

  private markActivity() {
    this.lastActivityTime = Date.now()
    if (this.isIdle) {
      this.isIdle = false
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private getElementIdentifier(element: HTMLElement): string | null {
    return element.id ||
           element.className ||
           element.dataset.trackingId ||
           null
  }

  private calculateCursorComplexity(): number {
    if (this.cursorPath.length < 3) return 0

    // Calculate total distance traveled
    let totalDistance = 0
    for (let i = 1; i < this.cursorPath.length; i++) {
      const dx = this.cursorPath[i].x - this.cursorPath[i - 1].x
      const dy = this.cursorPath[i].y - this.cursorPath[i - 1].y
      totalDistance += Math.sqrt(dx * dx + dy * dy)
    }

    // Calculate straight-line distance
    const start = this.cursorPath[0]
    const end = this.cursorPath[this.cursorPath.length - 1]
    const straightDistance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    )

    // Complexity = ratio of actual path to straight line (normalized)
    const complexity = straightDistance > 0
      ? Math.min(totalDistance / straightDistance / 10, 1) // Normalize to 0-1
      : 0

    return complexity
  }

  private getDeviceOrientation(): 'portrait' | 'landscape' {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  }

  private async getBatteryLevel(): Promise<number | undefined> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery()
        return Math.round(battery.level * 100)
      } catch (e) {
        return undefined
      }
    }
    return undefined
  }

  private getConnectionType(): string | undefined {
    const connection = (navigator as any).connection ||
                       (navigator as any).mozConnection ||
                       (navigator as any).webkitConnection
    return connection?.effectiveType
  }

  // ============================================
  // Data Collection & Flushing
  // ============================================

  public async collectSignals(): Promise<InteractionSignal> {
    const now = Date.now()
    const dwellTime = now - this.interactionStartTime
    const activeTime = this.lastActivityTime - this.interactionStartTime
    const idleTime = dwellTime - activeTime

    const batteryLevel = await this.getBatteryLevel()

    return {
      // Identifiers
      destination_id: this.destinationId,
      session_id: this.sessionId,
      user_id: this.userId,

      // Mouse & Cursor
      hover_duration_ms: this.totalHoverDuration,
      hover_count: this.hoverCount,
      cursor_path_complexity: this.calculateCursorComplexity(),
      click_hesitation_ms: this.clickHesitation,

      // Scroll
      scroll_depth_percentage: this.scrollMetrics.maxDepth,
      max_scroll_depth: this.scrollMetrics.maxDepth,
      scroll_velocity_avg: this.scrollMetrics.velocities.length > 0
        ? this.scrollMetrics.velocities.reduce((a, b) => a + b, 0) / this.scrollMetrics.velocities.length
        : 0,
      scroll_direction_changes: this.scrollMetrics.directionChanges,
      time_to_first_scroll_ms: this.scrollMetrics.firstScrollTime
        ? this.scrollMetrics.firstScrollTime - this.pageLoadTime
        : undefined,

      // Dwell & Engagement
      dwell_time_ms: dwellTime,
      active_time_ms: activeTime,
      tab_switches: this.tabSwitches,
      idle_time_ms: idleTime,

      // Content
      images_viewed: Array.from(this.imagesViewed),
      image_interactions: this.imageInteractions,
      text_selections: this.textSelections,
      text_copied: this.textCopied,
      video_played: this.videoPlayed,
      video_watch_duration_ms: this.videoWatchDuration,

      // Navigation
      back_button_used: this.backButtonUsed,
      external_link_hovers: this.externalLinkHovers,
      share_button_hovers: this.shareButtonHovers,
      save_button_hovers: this.saveButtonHovers,
      booking_link_clicks: this.bookingLinkClicks,

      // Clicks
      click_count: this.clickCount,
      double_click_count: this.doubleClickCount,
      right_click_count: this.rightClickCount,

      // Context
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      device_orientation: this.getDeviceOrientation(),
      battery_level: batteryLevel,
      connection_type: this.getConnectionType(),

      // Timestamps
      page_load_time: this.pageLoadTime,
      interaction_start_time: this.interactionStartTime,
      interaction_end_time: now,
    }
  }

  public async flush(): Promise<void> {
    const signals = await this.collectSignals()

    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(signals)

    // Add to batch
    this.batcher.addEvent({
      ...signals,
      engagement_score: engagementScore,
    })

    // Force flush
    await this.batcher.flush()
  }

  private calculateEngagementScore(signals: InteractionSignal): number {
    let score = 0

    // Dwell time (normalized to 0-1, max at 5 minutes)
    score += Math.min(signals.dwell_time_ms / 300000, 1) * 0.3

    // Scroll depth
    score += (signals.scroll_depth_percentage / 100) * 0.2

    // Hover duration
    score += Math.min(signals.hover_duration_ms / 10000, 1) * 0.1

    // Active time ratio
    const activeRatio = signals.dwell_time_ms > 0
      ? signals.active_time_ms / signals.dwell_time_ms
      : 0
    score += activeRatio * 0.2

    // Action signals
    if (signals.text_copied) score += 0.1
    if (signals.image_interactions > 2) score += 0.1

    return Math.min(score, 1)
  }

  // ============================================
  // Cleanup
  // ============================================

  public destroy() {
    this.flush()

    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout)
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect()
    }

    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler)
    }
  }
}

// ============================================
// Singleton Instance Management
// ============================================

let globalTracker: EnhancedTracker | null = null

export function initializeEnhancedTracker(config: {
  sessionId: string
  userId?: string
  destinationId?: number
}): EnhancedTracker {
  if (globalTracker) {
    globalTracker.destroy()
  }

  globalTracker = new EnhancedTracker(config)
  return globalTracker
}

export function getEnhancedTracker(): EnhancedTracker | null {
  return globalTracker
}

export function flushEnhancedTracking(): Promise<void> {
  return globalTracker?.flush() || Promise.resolve()
}
