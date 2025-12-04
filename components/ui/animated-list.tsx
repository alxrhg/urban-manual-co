'use client';

import * as React from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { MOTION_TRANSITION } from '@/lib/animation';

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 8,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: MOTION_TRANSITION.fast,
  },
};

const listVariants: Variants = {
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

// =============================================================================
// ANIMATED LIST
// =============================================================================

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  /** Element type for the list container */
  as?: 'div' | 'ul' | 'ol';
}

/**
 * AnimatedList - Container that staggers children animations
 *
 * Usage:
 * ```tsx
 * <AnimatedList>
 *   {items.map(item => (
 *     <AnimatedListItem key={item.id}>
 *       <YourItemComponent />
 *     </AnimatedListItem>
 *   ))}
 * </AnimatedList>
 * ```
 */
export function AnimatedList({
  children,
  className,
  as = 'div',
}: AnimatedListProps) {
  const MotionComponent = motion[as];

  return (
    <MotionComponent
      className={className}
      variants={listVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">{children}</AnimatePresence>
    </MotionComponent>
  );
}

// =============================================================================
// ANIMATED LIST ITEM
// =============================================================================

interface AnimatedListItemProps {
  children: React.ReactNode;
  className?: string;
  /** Unique key for AnimatePresence tracking */
  layoutId?: string;
  /** Element type for the item */
  as?: 'div' | 'li';
}

/**
 * AnimatedListItem - Individual item with enter/exit animations
 *
 * Must be used inside AnimatedList for stagger effect,
 * but can also be used standalone for single-item animations.
 */
export function AnimatedListItem({
  children,
  className,
  layoutId,
  as = 'div',
}: AnimatedListItemProps) {
  const MotionComponent = motion[as];

  return (
    <MotionComponent
      className={className}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      layoutId={layoutId}
      transition={MOTION_TRANSITION.medium}
    >
      {children}
    </MotionComponent>
  );
}

// =============================================================================
// FADE IN WRAPPER
// =============================================================================

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  /** Delay before animation starts (in seconds) */
  delay?: number;
  /** Animation duration */
  duration?: 'fast' | 'medium' | 'slow';
  /** Direction to fade from */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

/**
 * FadeIn - Simple fade-in wrapper for any content
 *
 * Usage:
 * ```tsx
 * <FadeIn delay={0.2} direction="up">
 *   <YourContent />
 * </FadeIn>
 * ```
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 'medium',
  direction = 'up',
}: FadeInProps) {
  const directionOffset = {
    up: { y: 12, x: 0 },
    down: { y: -12, x: 0 },
    left: { x: 12, y: 0 },
    right: { x: -12, y: 0 },
    none: { x: 0, y: 0 },
  };

  const offset = directionOffset[direction];

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        ...MOTION_TRANSITION[duration],
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}

// =============================================================================
// PRESENCE WRAPPER
// =============================================================================

interface PresenceProps {
  children: React.ReactNode;
  /** Whether the content should be visible */
  show: boolean;
  /** Exit animation mode */
  mode?: 'wait' | 'popLayout' | 'sync';
}

/**
 * Presence - Wrapper for conditional rendering with exit animations
 *
 * Usage:
 * ```tsx
 * <Presence show={isVisible}>
 *   <Modal />
 * </Presence>
 * ```
 */
export function Presence({ children, show, mode = 'wait' }: PresenceProps) {
  return (
    <AnimatePresence mode={mode}>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={MOTION_TRANSITION.fast}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
