/**
 * Animation Utilities for Urban Manual
 *
 * Centralized animation constants and utilities for consistent microinteractions.
 * These values align with the CSS custom properties in styles/layout.css.
 */

// =============================================================================
// TIMING TOKENS
// =============================================================================

export const DURATION = {
  /** Instant feedback (hover states, focus rings) */
  instant: 0,
  /** Fast interactions (button press, toggle) - 140ms */
  fast: 140,
  /** Standard transitions (most UI changes) - 200ms */
  medium: 200,
  /** Deliberate movements (modals, drawers, page transitions) - 320ms */
  slow: 320,
  /** Extended animations (complex reveals, onboarding) - 500ms */
  slower: 500,
} as const;

// =============================================================================
// EASING FUNCTIONS
// =============================================================================

export const EASING = {
  /** Soft, natural deceleration - good for most UI */
  soft: 'cubic-bezier(0.22, 0.11, 0.1, 1)',
  /** Standard ease-out for exits */
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Subtle bounce for playful interactions */
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  /** Spring-like for drawer/panel animations */
  spring: 'cubic-bezier(0.32, 0.72, 0, 1)',
  /** Linear for progress indicators */
  linear: 'linear',
} as const;

// =============================================================================
// TAILWIND CLASS UTILITIES
// =============================================================================

/**
 * Common transition class combinations for Tailwind
 */
export const TRANSITION = {
  /** Standard transition for colors and opacity */
  colors: 'transition-colors duration-200 ease-out',
  /** Transform transitions (scale, translate) */
  transform: 'transition-transform duration-200 ease-out',
  /** All properties (use sparingly) */
  all: 'transition-all duration-200 ease-out',
  /** Fast color changes */
  colorsFast: 'transition-colors duration-[140ms] ease-out',
  /** Slow transform for emphasis */
  transformSlow: 'transition-transform duration-300 ease-out',
  /** Opacity only */
  opacity: 'transition-opacity duration-200 ease-out',
  /** Shadow changes */
  shadow: 'transition-shadow duration-200 ease-out',
} as const;

// =============================================================================
// INTERACTION STATES
// =============================================================================

/**
 * Standard hover state classes
 */
export const HOVER = {
  /** Subtle lift effect for cards */
  lift: 'hover:-translate-y-0.5 hover:shadow-lg',
  /** Scale up slightly */
  grow: 'hover:scale-[1.02]',
  /** Opacity reduction */
  dim: 'hover:opacity-80',
  /** Background highlight */
  highlight: 'hover:bg-gray-50 dark:hover:bg-gray-800',
  /** Border emphasis */
  ring: 'hover:ring-1 hover:ring-gray-200 dark:hover:ring-gray-700',
} as const;

/**
 * Standard active/press state classes
 */
export const ACTIVE = {
  /** Scale down on press */
  press: 'active:scale-[0.98]',
  /** Slight press effect */
  pressSubtle: 'active:scale-[0.99]',
  /** Opacity on press */
  dim: 'active:opacity-90',
} as const;

/**
 * Focus state classes (accessibility)
 */
export const FOCUS = {
  /** Standard focus ring */
  ring: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2',
  /** Subtle focus ring */
  ringSubtle: 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 dark:focus-visible:ring-gray-500',
} as const;

// =============================================================================
// ANIMATION VARIANTS (for Framer Motion)
// =============================================================================

/**
 * Standard fade + slide animations for Framer Motion
 */
export const MOTION_VARIANTS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
  fadeInDown: {
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  slideInRight: {
    initial: { opacity: 0, x: 12 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -12 },
  },
  slideInLeft: {
    initial: { opacity: 0, x: -12 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 12 },
  },
} as const;

/**
 * Standard transition configs for Framer Motion
 */
export const MOTION_TRANSITION = {
  fast: { duration: 0.14, ease: [0.22, 0.11, 0.1, 1] },
  medium: { duration: 0.2, ease: [0.22, 0.11, 0.1, 1] },
  slow: { duration: 0.32, ease: [0.22, 0.11, 0.1, 1] },
  spring: { type: 'spring', stiffness: 400, damping: 30 },
  springGentle: { type: 'spring', stiffness: 300, damping: 25 },
} as const;

// =============================================================================
// STAGGER UTILITIES
// =============================================================================

/**
 * Create staggered animation delay for lists
 * @param index - Item index in the list
 * @param baseDelay - Base delay in ms (default: 50)
 * @param maxDelay - Maximum delay cap in ms (default: 300)
 */
export function getStaggerDelay(
  index: number,
  baseDelay = 50,
  maxDelay = 300
): number {
  return Math.min(index * baseDelay, maxDelay);
}

/**
 * Create stagger configuration for Framer Motion
 * @param staggerChildren - Delay between children in seconds
 */
export function createStaggerContainer(staggerChildren = 0.05) {
  return {
    animate: {
      transition: {
        staggerChildren,
      },
    },
  };
}

// =============================================================================
// CSS KEYFRAME UTILITIES
// =============================================================================

/**
 * Inline style object for CSS animations
 */
export function createAnimationStyle(
  name: string,
  duration: number = DURATION.medium,
  easing: string = EASING.soft,
  fillMode: 'forwards' | 'backwards' | 'both' | 'none' = 'forwards'
): React.CSSProperties {
  return {
    animation: `${name} ${duration}ms ${easing} ${fillMode}`,
  };
}

// =============================================================================
// REDUCED MOTION UTILITIES
// =============================================================================

/**
 * Check if user prefers reduced motion
 * Use in components that need runtime motion preference checks
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get duration respecting reduced motion preference
 */
export function getAccessibleDuration(duration: number): number {
  return prefersReducedMotion() ? 0 : duration;
}
