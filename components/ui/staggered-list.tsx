'use client';

import React, { Children, isValidElement } from 'react';
import { motion, type Variants, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Ubiquiti-style staggered animations for lists
 * Creates smooth, polished reveal animations with configurable timing
 */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // 50ms between items - matches Ubiquiti
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1], // ease-smooth
    },
  },
};

const scaleItemVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

interface StaggeredListProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  /** Delay between items in seconds (default: 0.05) */
  staggerDelay?: number;
  /** Initial delay before animations start in seconds (default: 0.1) */
  initialDelay?: number;
  /** Animation variant: 'slide' for translateY, 'scale' for scale effect */
  variant?: 'slide' | 'scale';
  /** Whether to animate (useful for conditional animation) */
  animate?: boolean;
}

export function StaggeredList({
  children,
  staggerDelay = 0.05,
  initialDelay = 0.1,
  variant = 'slide',
  animate = true,
  className,
  ...props
}: StaggeredListProps) {
  const customContainerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
  };

  const selectedItemVariants = variant === 'scale' ? scaleItemVariants : itemVariants;

  if (!animate) {
    return (
      <div className={className} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      variants={customContainerVariants}
      initial="hidden"
      animate="show"
      className={className}
      {...props}
    >
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;

        return (
          <motion.div key={child.key ?? index} variants={selectedItemVariants}>
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/**
 * Individual item wrapper for more control over staggered animations
 */
interface StaggeredItemProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  variant?: 'slide' | 'scale';
}

export function StaggeredItem({
  children,
  variant = 'slide',
  className,
  ...props
}: StaggeredItemProps) {
  const selectedVariants = variant === 'scale' ? scaleItemVariants : itemVariants;

  return (
    <motion.div
      variants={selectedVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * CSS-only staggered animation for when Framer Motion is not needed
 * Uses CSS custom properties for timing
 */
interface CSSStaggeredListProps {
  children: React.ReactNode;
  className?: string;
  /** Base delay in ms between items (default: 50) */
  baseDelay?: number;
}

export function CSSStaggeredList({
  children,
  className,
  baseDelay = 50,
}: CSSStaggeredListProps) {
  return (
    <div
      className={cn('stagger-container', className)}
      style={{ '--stagger-delay': `${baseDelay}ms` } as React.CSSProperties}
    >
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;

        return (
          <div
            key={child.key ?? index}
            className="stagger-item"
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
