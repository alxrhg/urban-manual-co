/**
 * Animation Constants
 * Centralized timing, easing, and duration values for consistent animations
 */

// Duration tokens (in seconds for Framer Motion)
export const DURATION = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.2,
  medium: 0.3,
  slow: 0.4,
  slower: 0.5,
  slowest: 0.6,
} as const;

// Duration tokens (in milliseconds for CSS)
export const DURATION_MS = {
  instant: 100,
  fast: 150,
  normal: 200,
  medium: 300,
  slow: 400,
  slower: 500,
  slowest: 600,
} as const;

// Easing curves
export const EASE = {
  // Standard easing
  default: [0.4, 0, 0.2, 1] as const,

  // Entrance easing - starts fast, ends slow
  out: [0, 0, 0.2, 1] as const,
  easeOut: [0.16, 1, 0.3, 1] as const,

  // Exit easing - starts slow, ends fast
  in: [0.4, 0, 1, 1] as const,
  easeIn: [0.4, 0, 0.6, 1] as const,

  // Emphasized easing for attention
  emphasized: [0.2, 0, 0, 1] as const,

  // Soft easing for subtle movements
  soft: [0.22, 0.11, 0.1, 1] as const,

  // Bouncy for playful interactions
  bounce: [0.68, -0.55, 0.265, 1.55] as const,

  // Elastic for spring-like motion
  elastic: [0.5, 1.5, 0.5, 1] as const,
} as const;

// Spring configurations for Framer Motion
export const SPRING = {
  // Snappy - quick response, minimal overshoot
  snappy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 30,
    mass: 1,
  },

  // Bouncy - playful with overshoot
  bouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 15,
    mass: 1,
  },

  // Smooth - gentle, no overshoot
  smooth: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 25,
    mass: 1,
  },

  // Gentle - slow and smooth
  gentle: {
    type: 'spring' as const,
    stiffness: 120,
    damping: 20,
    mass: 1,
  },

  // Stiff - quick with subtle overshoot
  stiff: {
    type: 'spring' as const,
    stiffness: 700,
    damping: 30,
    mass: 0.8,
  },

  // Wobbly - fun, lots of overshoot
  wobbly: {
    type: 'spring' as const,
    stiffness: 180,
    damping: 12,
    mass: 1,
  },
} as const;

// Stagger delays for list animations
export const STAGGER = {
  fast: 0.03,
  normal: 0.05,
  slow: 0.08,
  slower: 0.1,
} as const;

// Common transition presets
export const TRANSITION = {
  // Fast fade
  fade: {
    duration: DURATION.fast,
    ease: EASE.out,
  },

  // Smooth scale
  scale: {
    duration: DURATION.normal,
    ease: EASE.easeOut,
  },

  // Slide animations
  slide: {
    duration: DURATION.medium,
    ease: EASE.easeOut,
  },

  // Page transitions
  page: {
    duration: DURATION.slow,
    ease: EASE.easeOut,
  },

  // Modal/drawer
  modal: {
    duration: DURATION.medium,
    ease: EASE.easeOut,
  },

  // Spring-based
  springy: SPRING.bouncy,
  snappy: SPRING.snappy,
  smooth: SPRING.smooth,
} as const;

// Z-index layers for animations
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  modal: 1200,
  popover: 1300,
  tooltip: 1400,
  toast: 1500,
  confetti: 9999,
} as const;
