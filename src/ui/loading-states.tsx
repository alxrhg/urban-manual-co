/**
 * Loading States Components
 *
 * Consistent loading indicators and skeletons.
 * Supports both legacy LoadingState enum and TanStack Query status.
 */

'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QueryStatus } from '@/hooks/useQueryFetching';

/**
 * @deprecated Use QueryStatus from useQueryFetching instead
 * Kept for backward compatibility with existing code
 */
export enum LoadingState {
  Idle = 'idle',
  Loading = 'loading',
  Success = 'success',
  Error = 'error',
  Refreshing = 'refreshing',
  Revalidating = 'revalidating',
}

/**
 * Convert QueryStatus to LoadingState for backward compatibility
 */
export function queryStatusToLoadingState(status: QueryStatus): LoadingState {
  switch (status) {
    case 'idle':
      return LoadingState.Idle;
    case 'loading':
      return LoadingState.Loading;
    case 'success':
      return LoadingState.Success;
    case 'error':
      return LoadingState.Error;
    case 'refreshing':
      return LoadingState.Refreshing;
    default:
      return LoadingState.Idle;
  }
}

/**
 * Spinner component for inline loading
 */
interface SpinnerProps {
  /** Size of the spinner */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Custom class name */
  className?: string;
  /** Accessible label */
  label?: string;
}

const spinnerSizes = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-gray-400', spinnerSizes[size], className)}
      aria-label={label}
    />
  );
}

/**
 * Skeleton component for content placeholders
 */
interface SkeletonProps {
  /** Width class or value */
  width?: string;
  /** Height class or value */
  height?: string;
  /** Make it circular */
  circle?: boolean;
  /** Custom class name */
  className?: string;
}

export function Skeleton({
  width = 'w-full',
  height = 'h-4',
  circle = false,
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-800',
        circle ? 'rounded-full' : 'rounded',
        width,
        height,
        className
      )}
      aria-hidden="true"
    />
  );
}

/**
 * Card skeleton for destination cards
 */
export function LoadingCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white dark:bg-gray-900 overflow-hidden',
        'border border-gray-200 dark:border-gray-800',
        className
      )}
      aria-hidden="true"
    >
      {/* Image placeholder */}
      <Skeleton height="h-48" className="rounded-none" />
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton width="w-3/4" height="h-5" />
        {/* Subtitle */}
        <Skeleton width="w-1/2" height="h-4" />
        {/* Description */}
        <div className="space-y-2">
          <Skeleton height="h-3" />
          <Skeleton width="w-5/6" height="h-3" />
        </div>
      </div>
    </div>
  );
}

/**
 * Grid of card skeletons
 */
export function CardGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * List item skeleton
 */
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4',
        'border-b border-gray-200 dark:border-gray-800 last:border-b-0',
        className
      )}
      aria-hidden="true"
    >
      <Skeleton circle width="w-12" height="h-12" />
      <div className="flex-1 space-y-2">
        <Skeleton width="w-1/3" height="h-4" />
        <Skeleton width="w-2/3" height="h-3" />
      </div>
    </div>
  );
}

/**
 * Full page loading overlay
 */
interface LoadingOverlayProps {
  /** Whether overlay is visible */
  visible: boolean;
  /** Loading message */
  message?: string;
  /** Custom class name */
  className?: string;
}

export function LoadingOverlay({
  visible,
  message = 'Loading...',
  className,
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm',
        className
      )}
      role="alert"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {message}
        </p>
      </div>
    </div>
  );
}

/**
 * Loading state wrapper (legacy)
 * @deprecated Use QueryStateWrapper for new code
 */
interface LoadingStateWrapperProps {
  /** Current loading state (supports both LoadingState enum and QueryStatus string) */
  state: LoadingState | QueryStatus;
  /** Content to show when loaded */
  children: React.ReactNode;
  /** Skeleton to show while loading */
  skeleton?: React.ReactNode;
  /** Error message or component */
  error?: React.ReactNode | ((error: Error | null) => React.ReactNode);
  /** Actual error object */
  errorObject?: Error | null;
  /** Retry callback for error state */
  onRetry?: () => void;
  /** Empty state when no data */
  empty?: React.ReactNode;
  /** Whether data is empty */
  isEmpty?: boolean;
  /** Custom class name */
  className?: string;
}

export function LoadingStateWrapper({
  state,
  children,
  skeleton,
  error,
  errorObject,
  onRetry,
  empty,
  isEmpty = false,
  className,
}: LoadingStateWrapperProps) {
  // Normalize state to string for comparison (works with both enum and string)
  const stateStr = String(state);

  // Show skeleton for initial loading
  if (stateStr === 'idle' || stateStr === 'loading') {
    return (
      <div className={className} role="status" aria-busy="true">
        {skeleton || (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
      </div>
    );
  }

  // Show error state
  if (stateStr === 'error') {
    const errorContent =
      typeof error === 'function' ? error(errorObject ?? null) : error;
    return (
      <div className={cn('text-center py-12', className)}>
        {errorContent || (
          <div className="space-y-4">
            <p className="text-red-600 dark:text-red-400">
              {errorObject?.message || 'An error occurred'}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Show empty state
  if (isEmpty && empty) {
    return <div className={className}>{empty}</div>;
  }

  // Show content with optional refreshing indicator
  return (
    <div className={cn('relative', className)}>
      {(stateStr === 'refreshing' || stateStr === 'revalidating') && (
        <div className="absolute top-2 right-2 z-10">
          <Spinner size="sm" />
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Query state wrapper - designed for TanStack Query
 * Provides a cleaner API that works directly with query results
 */
interface QueryStateWrapperProps<T> {
  /** Whether query is loading (no data yet) */
  isLoading: boolean;
  /** Whether query is fetching (may have stale data) */
  isFetching?: boolean;
  /** Whether query has an error */
  isError: boolean;
  /** Error object if any */
  error: Error | null;
  /** Data from query */
  data: T | undefined;
  /** Content to render with data */
  children: React.ReactNode | ((data: T) => React.ReactNode);
  /** Skeleton to show while loading */
  skeleton?: React.ReactNode;
  /** Error component or render function */
  errorRender?: React.ReactNode | ((error: Error | null) => React.ReactNode);
  /** Retry callback for error state */
  onRetry?: () => void;
  /** Empty state when data is empty */
  emptyRender?: React.ReactNode;
  /** Function to check if data is empty */
  isEmpty?: (data: T | undefined) => boolean;
  /** Show refreshing indicator */
  showRefreshing?: boolean;
  /** Custom class name */
  className?: string;
}

export function QueryStateWrapper<T>({
  isLoading,
  isFetching = false,
  isError,
  error,
  data,
  children,
  skeleton,
  errorRender,
  onRetry,
  emptyRender,
  isEmpty,
  showRefreshing = true,
  className,
}: QueryStateWrapperProps<T>) {
  // Show skeleton for initial loading
  if (isLoading) {
    return (
      <div className={className} role="status" aria-busy="true">
        {skeleton || (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}
      </div>
    );
  }

  // Show error state
  if (isError) {
    const errorContent =
      typeof errorRender === 'function' ? errorRender(error) : errorRender;
    return (
      <div className={cn('text-center py-12', className)}>
        {errorContent || (
          <div className="space-y-4">
            <p className="text-red-600 dark:text-red-400">
              {error?.message || 'An error occurred'}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Show empty state
  const dataIsEmpty = isEmpty ? isEmpty(data) : data === undefined;
  if (dataIsEmpty && emptyRender) {
    return <div className={className}>{emptyRender}</div>;
  }

  // Render content - handle function children
  const renderContent = (): React.ReactNode => {
    if (typeof children === 'function') {
      if (data !== undefined) {
        return children(data);
      }
      return null;
    }
    return children;
  };

  // Show content with optional refreshing indicator
  return (
    <div className={cn('relative', className)}>
      {showRefreshing && isFetching && data !== undefined && (
        <div className="absolute top-2 right-2 z-10">
          <Spinner size="sm" />
        </div>
      )}
      {renderContent()}
    </div>
  );
}

/**
 * Progress indicator for long operations
 */
interface ProgressIndicatorProps {
  /** Progress value (0-100) */
  value: number;
  /** Max value */
  max?: number;
  /** Label text */
  label?: string;
  /** Show percentage */
  showPercentage?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
}

const progressSizes = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressIndicator({
  value,
  max = 100,
  label,
  showPercentage = false,
  size = 'md',
  className,
}: ProgressIndicatorProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between mb-1 text-sm text-gray-600 dark:text-gray-400">
          {label && <span>{label}</span>}
          {showPercentage && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div
        className={cn(
          'w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden',
          progressSizes[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            'bg-gray-900 dark:bg-white rounded-full transition-all duration-300',
            progressSizes[size]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
