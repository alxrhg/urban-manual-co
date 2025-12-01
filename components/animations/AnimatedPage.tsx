'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { pageVariants, pageSlideVariants, DURATION, EASE } from '@/lib/animations';

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
  variant?: 'fade' | 'slide' | 'slideUp';
}

/**
 * AnimatedPage - Page-level animation wrapper
 *
 * Use this to wrap page content for smooth entrance/exit animations
 *
 * @example
 * // In a page component
 * export default function AboutPage() {
 *   return (
 *     <AnimatedPage>
 *       <h1>About Us</h1>
 *       ...
 *     </AnimatedPage>
 *   );
 * }
 */
export function AnimatedPage({
  children,
  className = '',
  variant = 'fade',
}: AnimatedPageProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const variants = variant === 'slide' ? pageSlideVariants : pageVariants;

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

interface PageTransitionWrapperProps {
  children: ReactNode;
  pathname: string;
}

/**
 * PageTransitionWrapper - Wrap around page content with AnimatePresence
 *
 * @example
 * // In layout.tsx
 * <PageTransitionWrapper pathname={pathname}>
 *   {children}
 * </PageTransitionWrapper>
 */
export function PageTransitionWrapper({
  children,
  pathname,
}: PageTransitionWrapperProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{
          duration: DURATION.medium,
          ease: EASE.easeOut,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

interface FadeInPageProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * FadeInPage - Simple fade in for page content
 */
export function FadeInPage({
  children,
  className = '',
  delay = 0,
}: FadeInPageProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: DURATION.slow,
        delay,
        ease: EASE.out,
      }}
    >
      {children}
    </motion.div>
  );
}

export default AnimatedPage;
