'use client';

import { ReactNode, Children, isValidElement, cloneElement } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  staggerContainerVariants,
  staggerItemVariants,
  staggerScaleVariants,
  createStaggerContainer,
  STAGGER,
} from '@/lib/animations';

interface StaggeredListProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
  variant?: 'slide' | 'scale' | 'fade';
  as?: 'div' | 'ul' | 'ol' | 'section';
  itemClassName?: string;
}

/**
 * StaggeredList - Animate list items with staggered entrance
 *
 * @example
 * <StaggeredList>
 *   {items.map(item => <Card key={item.id} {...item} />)}
 * </StaggeredList>
 */
export function StaggeredList({
  children,
  className = '',
  staggerDelay = STAGGER.normal,
  initialDelay = 0.1,
  variant = 'slide',
  as = 'div',
  itemClassName = '',
}: StaggeredListProps) {
  const shouldReduceMotion = useReducedMotion();
  const MotionComponent = motion[as];

  const containerVariants = createStaggerContainer(staggerDelay, initialDelay);
  const itemVariant = variant === 'scale' ? staggerScaleVariants : staggerItemVariants;

  // Convert children to array for mapping
  const childArray = Children.toArray(children);

  if (shouldReduceMotion) {
    const StaticComponent = as;
    return (
      <StaticComponent className={className}>
        {childArray.map((child, index) => (
          <div key={index} className={itemClassName}>
            {child}
          </div>
        ))}
      </StaticComponent>
    );
  }

  return (
    <MotionComponent
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {childArray.map((child, index) => (
        <motion.div key={index} variants={itemVariant} className={itemClassName}>
          {child}
        </motion.div>
      ))}
    </MotionComponent>
  );
}

interface StaggeredGridProps {
  children: ReactNode;
  className?: string;
  columns?: number;
  staggerDelay?: number;
}

/**
 * StaggeredGrid - Grid layout with staggered animations
 */
export function StaggeredGrid({
  children,
  className = '',
  columns = 4,
  staggerDelay = STAGGER.fast,
}: StaggeredGridProps) {
  const shouldReduceMotion = useReducedMotion();
  const childArray = Children.toArray(children);
  const containerVariants = createStaggerContainer(staggerDelay, 0.05);

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {childArray.map((child, index) => (
        <motion.div
          key={index}
          variants={staggerScaleVariants}
          style={{ willChange: 'transform, opacity' }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

interface AnimatedListItemProps {
  children: ReactNode;
  index?: number;
  className?: string;
}

/**
 * AnimatedListItem - Individual animated list item
 * Use inside a StaggeredList or standalone with delay
 */
export function AnimatedListItem({
  children,
  index = 0,
  className = '',
}: AnimatedListItemProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

export default StaggeredList;
