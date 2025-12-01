/**
 * Framer Motion Animation Variants
 * Reusable animation variants for consistent motion design
 */

import type { Variants, Transition } from 'framer-motion';
import { DURATION, EASE, SPRING, STAGGER } from './constants';

// ============================================
// FADE VARIANTS
// ============================================

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASE.out },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.fast, ease: EASE.in },
  },
};

export const fadeScaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.normal, ease: EASE.easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: DURATION.fast, ease: EASE.in },
  },
};

// ============================================
// SLIDE VARIANTS
// ============================================

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.medium, ease: EASE.easeOut },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: DURATION.normal, ease: EASE.in },
  },
};

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.medium, ease: EASE.easeOut },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: DURATION.normal, ease: EASE.in },
  },
};

export const slideLeftVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.medium, ease: EASE.easeOut },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: DURATION.normal, ease: EASE.in },
  },
};

export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.medium, ease: EASE.easeOut },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: DURATION.normal, ease: EASE.in },
  },
};

// ============================================
// SCALE VARIANTS
// ============================================

export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRING.snappy,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: DURATION.fast, ease: EASE.in },
  },
};

export const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRING.bouncy,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: { duration: DURATION.fast, ease: EASE.in },
  },
};

// ============================================
// MODAL / DRAWER VARIANTS
// ============================================

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.medium, ease: EASE.easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: DURATION.normal, ease: EASE.in },
  },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASE.out },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.normal, ease: EASE.out },
  },
};

export const drawerRightVariants: Variants = {
  hidden: { x: '100%', opacity: 0.8 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: DURATION.slow, ease: EASE.easeOut },
  },
  exit: {
    x: '100%',
    opacity: 0.8,
    transition: { duration: DURATION.medium, ease: EASE.in },
  },
};

export const drawerLeftVariants: Variants = {
  hidden: { x: '-100%', opacity: 0.8 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: DURATION.slow, ease: EASE.easeOut },
  },
  exit: {
    x: '-100%',
    opacity: 0.8,
    transition: { duration: DURATION.medium, ease: EASE.in },
  },
};

export const drawerBottomVariants: Variants = {
  hidden: { y: '100%', opacity: 0.8 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: DURATION.slow, ease: EASE.easeOut },
  },
  exit: {
    y: '100%',
    opacity: 0.8,
    transition: { duration: DURATION.medium, ease: EASE.in },
  },
};

// ============================================
// LIST / STAGGER VARIANTS
// ============================================

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.normal,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: STAGGER.fast,
      staggerDirection: -1,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.medium, ease: EASE.easeOut },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: DURATION.fast, ease: EASE.in },
  },
};

export const staggerScaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRING.snappy,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: DURATION.fast },
  },
};

// ============================================
// PAGE TRANSITION VARIANTS
// ============================================

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE.easeOut },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: DURATION.normal, ease: EASE.in },
  },
};

export const pageSlideVariants: Variants = {
  initial: { opacity: 0, x: 20 },
  enter: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.slow, ease: EASE.easeOut },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: DURATION.normal, ease: EASE.in },
  },
};

// ============================================
// MICRO-INTERACTION VARIANTS
// ============================================

export const tapVariants = {
  tap: { scale: 0.98 },
  hover: { scale: 1.02 },
};

export const buttonVariants: Variants = {
  idle: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
};

export const heartVariants: Variants = {
  idle: { scale: 1 },
  liked: {
    scale: [1, 1.3, 1],
    transition: {
      duration: 0.4,
      times: [0, 0.3, 1],
      ease: EASE.easeOut,
    },
  },
};

export const checkmarkVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: DURATION.medium, ease: EASE.out },
  },
};

// ============================================
// TOOLTIP / POPOVER VARIANTS
// ============================================

export const tooltipVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -5 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.fast, ease: EASE.out },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -5,
    transition: { duration: DURATION.instant, ease: EASE.in },
  },
};

export const dropdownVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASE.easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: { duration: DURATION.fast, ease: EASE.in },
  },
};

// ============================================
// NOTIFICATION / TOAST VARIANTS
// ============================================

export const toastVariants: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: SPRING.snappy,
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: { duration: DURATION.normal, ease: EASE.in },
  },
};

export const notificationVariants: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: SPRING.snappy,
  },
  exit: {
    opacity: 0,
    x: 50,
    transition: { duration: DURATION.normal, ease: EASE.in },
  },
};

// ============================================
// SKELETON / LOADING VARIANTS
// ============================================

export const skeletonVariants: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const shimmerVariants: Variants = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ============================================
// CELEBRATION VARIANTS
// ============================================

export const confettiVariants: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: SPRING.bouncy,
  },
  exit: {
    opacity: 0,
    scale: 0,
    transition: { duration: DURATION.normal },
  },
};

export const celebrationVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: SPRING.wobbly,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: -20,
    transition: { duration: DURATION.normal },
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create stagger container with custom timing
 */
export function createStaggerContainer(
  staggerDelay = STAGGER.normal,
  delayChildren = 0.1
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };
}

/**
 * Create slide variant with custom direction and distance
 */
export function createSlideVariant(
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  distance = 20,
  transition?: Transition
): Variants {
  const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
  const value = direction === 'up' || direction === 'left' ? distance : -distance;

  return {
    hidden: { opacity: 0, [axis]: value },
    visible: {
      opacity: 1,
      [axis]: 0,
      transition: transition ?? { duration: DURATION.medium, ease: EASE.easeOut },
    },
    exit: {
      opacity: 0,
      [axis]: direction === 'up' || direction === 'left' ? -value / 2 : value / 2,
      transition: { duration: DURATION.fast, ease: EASE.in },
    },
  };
}
