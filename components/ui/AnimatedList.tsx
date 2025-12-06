'use client';

import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { type ReactNode, type Key } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Animation Variants
// ============================================================================

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// ============================================================================
// AnimatedList Component
// ============================================================================

interface AnimatedListProps<T> {
  items: T[];
  keyExtractor: (item: T, index: number) => Key;
  renderItem: (item: T, index: number) => ReactNode;
  variant?: 'fadeInUp' | 'fadeIn' | 'scaleIn' | 'slideInRight';
  staggerDelay?: number;
  className?: string;
  itemClassName?: string;
}

/**
 * AnimatedList - Renders a list with staggered entrance animations
 *
 * Usage:
 * ```tsx
 * <AnimatedList
 *   items={destinations}
 *   keyExtractor={(item) => item.id}
 *   renderItem={(item) => <DestinationCard destination={item} />}
 *   variant="fadeInUp"
 *   staggerDelay={0.05}
 * />
 * ```
 */
export function AnimatedList<T>({
  items,
  keyExtractor,
  renderItem,
  variant = 'fadeInUp',
  staggerDelay = 0.05,
  className,
  itemClassName,
}: AnimatedListProps<T>) {
  const variants: Record<string, Variants> = {
    fadeInUp,
    fadeIn,
    scaleIn,
    slideInRight,
  };

  const selectedVariant = variants[variant];

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item, index)}
            variants={selectedVariant}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{
              duration: 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            layout
            className={itemClassName}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// AnimatedItem Component (for manual control)
// ============================================================================

interface AnimatedItemProps {
  children: ReactNode;
  index?: number;
  variant?: 'fadeInUp' | 'fadeIn' | 'scaleIn' | 'slideInRight';
  delay?: number;
  className?: string;
}

/**
 * AnimatedItem - Individual animated item for manual list control
 *
 * Usage:
 * ```tsx
 * {items.map((item, index) => (
 *   <AnimatedItem key={item.id} index={index} variant="fadeInUp">
 *     <Card>{item.name}</Card>
 *   </AnimatedItem>
 * ))}
 * ```
 */
export function AnimatedItem({
  children,
  index = 0,
  variant = 'fadeInUp',
  delay,
  className,
}: AnimatedItemProps) {
  const variants: Record<string, Variants> = {
    fadeInUp,
    fadeIn,
    scaleIn,
    slideInRight,
  };

  const selectedVariant = variants[variant];
  const calculatedDelay = delay ?? index * 0.05;

  return (
    <motion.div
      variants={selectedVariant}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{
        duration: 0.2,
        ease: [0.16, 1, 0.3, 1],
        delay: calculatedDelay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// AnimatedPresenceWrapper Component
// ============================================================================

interface AnimatedPresenceWrapperProps {
  children: ReactNode;
  show: boolean;
  variant?: 'fadeInUp' | 'fadeIn' | 'scaleIn' | 'slideInRight';
  className?: string;
}

/**
 * AnimatedPresenceWrapper - Animate content in/out based on condition
 *
 * Usage:
 * ```tsx
 * <AnimatedPresenceWrapper show={isVisible} variant="scaleIn">
 *   <Modal />
 * </AnimatedPresenceWrapper>
 * ```
 */
export function AnimatedPresenceWrapper({
  children,
  show,
  variant = 'fadeIn',
  className,
}: AnimatedPresenceWrapperProps) {
  const variants: Record<string, Variants> = {
    fadeInUp,
    fadeIn,
    scaleIn,
    slideInRight,
  };

  const selectedVariant = variants[variant];

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          variants={selectedVariant}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{
            duration: 0.2,
            ease: [0.16, 1, 0.3, 1],
          }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// MotionButton Component
// ============================================================================

interface MotionButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * MotionButton - Button with press and hover animations
 *
 * Usage:
 * ```tsx
 * <MotionButton onClick={handleClick}>
 *   Click me
 * </MotionButton>
 * ```
 */
export function MotionButton({
  children,
  onClick,
  disabled,
  className,
  type = 'button',
}: MotionButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.1 }}
      className={cn(
        'transition-colors',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {children}
    </motion.button>
  );
}

// ============================================================================
// MotionCard Component
// ============================================================================

interface MotionCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  layoutId?: string;
}

/**
 * MotionCard - Card with hover lift and press effects
 *
 * Usage:
 * ```tsx
 * <MotionCard onClick={handleClick} layoutId={`card-${id}`}>
 *   <CardContent />
 * </MotionCard>
 * ```
 */
export function MotionCard({
  children,
  onClick,
  className,
  layoutId,
}: MotionCardProps) {
  return (
    <motion.div
      layoutId={layoutId}
      whileHover={{
        y: -2,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      }}
      whileTap={{ scale: 0.99 }}
      transition={{
        duration: 0.2,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-2xl',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
