'use client';

import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING, DURATION } from '@/lib/animations';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Skeleton - Enhanced loading skeleton with wave animation
 */
export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'wave',
}: SkeletonProps) {
  const shouldReduceMotion = useReducedMotion();

  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  const baseStyles = 'bg-gray-200 dark:bg-gray-800 relative overflow-hidden';

  if (animation === 'none' || shouldReduceMotion) {
    return (
      <div
        className={cn(baseStyles, variantStyles[variant], className)}
        style={{ width, height }}
      />
    );
  }

  if (animation === 'pulse') {
    return (
      <motion.div
        className={cn(baseStyles, variantStyles[variant], className)}
        style={{ width, height }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    );
  }

  // Wave animation
  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent"
        animate={{ x: ['0%', '200%'] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

interface CardSkeletonProps {
  className?: string;
  hasImage?: boolean;
  lines?: number;
}

/**
 * CardSkeleton - Card loading placeholder
 */
export function CardSkeleton({
  className = '',
  hasImage = true,
  lines = 2,
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden',
        className
      )}
    >
      {hasImage && (
        <Skeleton variant="rectangular" className="aspect-video w-full" />
      )}
      <div className="p-4 space-y-3">
        <Skeleton variant="text" className="w-3/4" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            className={i === lines - 1 ? 'w-1/2' : 'w-full'}
          />
        ))}
      </div>
    </div>
  );
}

interface GridSkeletonProps {
  count?: number;
  columns?: number;
  className?: string;
}

/**
 * GridSkeleton - Grid of card skeletons
 */
export function GridSkeleton({
  count = 8,
  columns = 4,
  className = '',
}: GridSkeletonProps) {
  return (
    <div
      className={cn(
        'grid gap-6',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: string;
}

/**
 * Spinner - Animated loading spinner
 */
export function Spinner({ size = 'md', className = '', color }: SpinnerProps) {
  const shouldReduceMotion = useReducedMotion();

  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  if (shouldReduceMotion) {
    return (
      <div
        className={cn(
          sizeStyles[size],
          'rounded-full border-2 border-current border-t-transparent',
          className
        )}
        style={{ color }}
      />
    );
  }

  return (
    <motion.div
      className={cn(
        sizeStyles[size],
        'rounded-full border-2 border-current border-t-transparent',
        className
      )}
      style={{ color }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  );
}

interface DotsLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * DotsLoader - Bouncing dots loading indicator
 */
export function DotsLoader({ size = 'md', className = '' }: DotsLoaderProps) {
  const shouldReduceMotion = useReducedMotion();

  const sizeStyles = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-3 w-3',
  };

  const gapStyles = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
  };

  if (shouldReduceMotion) {
    return (
      <div className={cn('flex items-center', gapStyles[size], className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-full bg-current opacity-50',
              sizeStyles[size]
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', gapStyles[size], className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn('rounded-full bg-current', sizeStyles[size])}
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

interface ProgressBarProps {
  progress: number;
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

/**
 * ProgressBar - Animated progress indicator
 */
export function ProgressBar({
  progress,
  className = '',
  showLabel = false,
  variant = 'default',
}: ProgressBarProps) {
  const shouldReduceMotion = useReducedMotion();

  const variantStyles = {
    default: 'bg-gray-900 dark:bg-white',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn('relative', className)}>
      <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', variantStyles[variant])}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: DURATION.medium, ease: 'easeOut' }
          }
        />
      </div>
      {showLabel && (
        <span className="absolute right-0 top-3 text-xs text-gray-500">
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  children: ReactNode;
  message?: string;
  className?: string;
}

/**
 * LoadingOverlay - Overlay with spinner for loading states
 */
export function LoadingOverlay({
  isLoading,
  children,
  message,
  className = '',
}: LoadingOverlayProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn('relative', className)}>
      {children}

      {isLoading && (
        <motion.div
          className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-inherit"
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: DURATION.fast }}
        >
          <Spinner size="lg" />
          {message && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {message}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default Skeleton;
