'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Progressive Loading System
 *
 * A comprehensive loading state system with:
 * - Skeleton components for various UI patterns
 * - Staggered reveal animations
 * - Optimistic UI helpers
 * - Loading state management
 *
 * Usage:
 * <ProgressiveLoad
 *   isLoading={isLoading}
 *   skeleton={<CardSkeleton />}
 * >
 *   <ActualContent />
 * </ProgressiveLoad>
 */

// =============================================================================
// PROGRESSIVE LOAD WRAPPER
// =============================================================================

export interface ProgressiveLoadProps {
  /** Whether content is loading */
  isLoading: boolean;
  /** Skeleton to show while loading */
  skeleton: React.ReactNode;
  /** Content to show when loaded */
  children: React.ReactNode;
  /** Delay before showing skeleton (prevents flash for fast loads) */
  delay?: number;
  /** Minimum time to show skeleton (prevents flickering) */
  minDisplayTime?: number;
  /** Animate content appearance */
  animate?: boolean;
  /** Animation variant */
  animationType?: 'fade' | 'slide' | 'scale';
  /** Additional class */
  className?: string;
}

export function ProgressiveLoad({
  isLoading,
  skeleton,
  children,
  delay = 100,
  minDisplayTime = 300,
  animate = true,
  animationType = 'fade',
  className,
}: ProgressiveLoadProps) {
  const [showSkeleton, setShowSkeleton] = React.useState(false);
  const [showContent, setShowContent] = React.useState(!isLoading);
  const loadStartTime = React.useRef<number>(0);

  React.useEffect(() => {
    if (isLoading) {
      loadStartTime.current = Date.now();
      const timer = setTimeout(() => {
        setShowSkeleton(true);
        setShowContent(false);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      const elapsed = Date.now() - loadStartTime.current;
      const remaining = Math.max(0, minDisplayTime - elapsed);

      const timer = setTimeout(() => {
        setShowSkeleton(false);
        setShowContent(true);
      }, remaining);
      return () => clearTimeout(timer);
    }
  }, [isLoading, delay, minDisplayTime]);

  const animationClasses = {
    fade: 'animate-fade-in-fast',
    slide: 'animate-slide-up-fast',
    scale: 'animate-scale-in',
  };

  if (showSkeleton) {
    return <div className={className}>{skeleton}</div>;
  }

  if (showContent) {
    return (
      <div className={cn(animate && animationClasses[animationType], className)}>
        {children}
      </div>
    );
  }

  // Initial state - show nothing during delay period
  return null;
}

// =============================================================================
// SKELETON BASE
// =============================================================================

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Animation variant */
  animation?: 'pulse' | 'shimmer' | 'none';
}

export function Skeleton({
  className,
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  const animationClasses = {
    pulse: 'animate-skeleton',
    shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
    none: '',
  };

  return (
    <div
      className={cn(
        'bg-um-gray-200 dark:bg-um-slate-800 rounded-md',
        animationClasses[animation],
        className
      )}
      {...props}
    />
  );
}

// =============================================================================
// SKELETON PRESETS
// =============================================================================

/** Skeleton for text lines */
export interface SkeletonTextProps {
  /** Number of lines */
  lines?: number;
  /** Include short last line */
  lastLineShort?: boolean;
  /** Line height preset */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class */
  className?: string;
}

export function SkeletonText({
  lines = 3,
  lastLineShort = true,
  size = 'md',
  className,
}: SkeletonTextProps) {
  const sizeClasses = {
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-5',
  };

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            sizeClasses[size],
            lastLineShort && i === lines - 1 && 'w-2/3'
          )}
        />
      ))}
    </div>
  );
}

/** Skeleton for avatar/profile image */
export interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function SkeletonAvatar({ size = 'md', className }: SkeletonAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <Skeleton className={cn('rounded-full', sizeClasses[size], className)} />
  );
}

/** Skeleton for image/media */
export interface SkeletonImageProps {
  aspect?: 'video' | 'square' | 'portrait' | 'wide';
  className?: string;
}

export function SkeletonImage({
  aspect = 'video',
  className,
}: SkeletonImageProps) {
  const aspectClasses = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    wide: 'aspect-[2/1]',
  };

  return (
    <Skeleton className={cn('w-full rounded-card', aspectClasses[aspect], className)} />
  );
}

/** Skeleton for button */
export interface SkeletonButtonProps {
  size?: 'sm' | 'md' | 'lg';
  width?: 'auto' | 'full';
  className?: string;
}

export function SkeletonButton({
  size = 'md',
  width = 'auto',
  className,
}: SkeletonButtonProps) {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  };

  return (
    <Skeleton
      className={cn(
        'rounded-button',
        sizeClasses[size],
        width === 'full' && 'w-full',
        className
      )}
    />
  );
}

/** Skeleton for complete card */
export interface SkeletonCardProps {
  showImage?: boolean;
  showMeta?: boolean;
  showActions?: boolean;
  className?: string;
}

export function SkeletonCard({
  showImage = true,
  showMeta = true,
  showActions = false,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-um-slate-900',
        'border border-um-gray-200 dark:border-um-slate-800',
        'rounded-card overflow-hidden',
        className
      )}
    >
      {showImage && <SkeletonImage />}
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        {showMeta && (
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        )}
        <SkeletonText lines={2} size="sm" />
        {showActions && (
          <div className="flex gap-2 pt-2">
            <SkeletonButton size="sm" />
            <SkeletonButton size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}

/** Skeleton for destination card (specific to this app) */
export function SkeletonDestinationCard({ className }: { className?: string }) {
  return (
    <div className={cn('group', className)}>
      <SkeletonImage aspect="video" className="rounded-lg" />
      <div className="mt-2 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for list item */
export interface SkeletonListItemProps {
  showAvatar?: boolean;
  showSecondaryText?: boolean;
  showAction?: boolean;
  className?: string;
}

export function SkeletonListItem({
  showAvatar = true,
  showSecondaryText = true,
  showAction = false,
  className,
}: SkeletonListItemProps) {
  return (
    <div className={cn('flex items-center gap-3 py-3', className)}>
      {showAvatar && <SkeletonAvatar size="md" />}
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-1/2" />
        {showSecondaryText && <Skeleton className="h-3 w-1/3" />}
      </div>
      {showAction && <SkeletonButton size="sm" />}
    </div>
  );
}

// =============================================================================
// STAGGERED LIST
// =============================================================================

export interface StaggeredListProps {
  /** Items to render */
  children: React.ReactNode[];
  /** Base delay between items (ms) */
  staggerDelay?: number;
  /** Animation type */
  animation?: 'fade' | 'slide' | 'scale';
  /** Additional class for container */
  className?: string;
}

export function StaggeredList({
  children,
  staggerDelay = 50,
  animation = 'fade',
  className,
}: StaggeredListProps) {
  const animationClasses = {
    fade: 'animate-fade-in',
    slide: 'animate-slide-up',
    scale: 'animate-scale-in',
  };

  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className={animationClasses[animation]}
          style={{
            animationDelay: `${index * staggerDelay}ms`,
            animationFillMode: 'backwards',
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// LOADING OVERLAY
// =============================================================================

export interface LoadingOverlayProps {
  /** Whether to show the overlay */
  show: boolean;
  /** Full screen or relative to parent */
  fullScreen?: boolean;
  /** Show spinner */
  showSpinner?: boolean;
  /** Custom content */
  children?: React.ReactNode;
  /** Additional class */
  className?: string;
}

export function LoadingOverlay({
  show,
  fullScreen = false,
  showSpinner = true,
  children,
  className,
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        'bg-white/80 dark:bg-um-slate-950/80 backdrop-blur-sm',
        fullScreen ? 'fixed inset-0 z-overlay' : 'absolute inset-0',
        className
      )}
    >
      {children || (
        showSpinner && (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-um-gray-300 dark:border-um-slate-600 border-t-um-gray-900 dark:border-t-white" />
        )
      )}
    </div>
  );
}

// =============================================================================
// SKELETON GRID
// =============================================================================

export interface SkeletonGridProps {
  /** Number of skeleton items */
  count: number;
  /** Skeleton component to repeat */
  skeleton: React.ReactNode;
  /** Grid columns (responsive) */
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
  /** Additional class */
  className?: string;
}

export function SkeletonGrid({
  count,
  skeleton,
  columns = { default: 2, sm: 3, md: 4, lg: 5, xl: 6 },
  gap = 'md',
  className,
}: SkeletonGridProps) {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4 md:gap-6',
    lg: 'gap-6 md:gap-8',
  };

  const gridCols = [
    columns.default && `grid-cols-${columns.default}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cn('grid', gridCols, gapClasses[gap], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{skeleton}</div>
      ))}
    </div>
  );
}
