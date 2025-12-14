/**
 * Content State Component
 *
 * A unified component for handling loading, error, and empty states.
 * Part of the "Zero Jank" policy - ensures consistent, polished UI states
 * instead of raw error messages or jarring loading indicators.
 *
 * @example
 * // Loading state
 * <ContentState state="loading" title="Loading destinations..." />
 *
 * @example
 * // Error state with retry
 * <ContentState
 *   state="error"
 *   title="Couldn't load destinations"
 *   onRetry={() => refetch()}
 * />
 *
 * @example
 * // Empty state with action
 * <ContentState
 *   state="empty"
 *   title="No saved places"
 *   description="Save places to create your wishlist"
 *   action={{ label: "Explore", onClick: () => router.push('/') }}
 * />
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  Loader2,
  AlertCircle,
  Search,
  MapPin,
  Heart,
  Bookmark,
  FolderOpen,
  Plane,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowLeft,
  LucideIcon,
} from 'lucide-react';
import { ErrorCode } from '@/lib/errors/types';
import { getUserFriendlyMessage } from '@/lib/errors/sanitize';

type ContentStateType = 'loading' | 'error' | 'empty' | 'offline';

interface ContentStateProps {
  /** Current state to display */
  state: ContentStateType;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Custom icon (defaults based on state) */
  icon?: LucideIcon;
  /** Error code for automatic message mapping */
  errorCode?: ErrorCode;
  /** Primary action */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Retry handler for error states */
  onRetry?: () => void;
  /** Go back handler */
  onGoBack?: () => void;
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
  /** Display variant */
  variant?: 'default' | 'inline' | 'fullpage' | 'card';
  /** Additional class names */
  className?: string;
  /** Children to render when loading (skeleton) */
  skeleton?: React.ReactNode;
}

/**
 * Default icons for each state type
 */
const DEFAULT_ICONS: Record<ContentStateType, LucideIcon> = {
  loading: Loader2,
  error: AlertCircle,
  empty: Search,
  offline: WifiOff,
};

/**
 * Default titles for each state type
 */
const DEFAULT_TITLES: Record<ContentStateType, string> = {
  loading: 'Loading...',
  error: 'Something went wrong',
  empty: 'Nothing here yet',
  offline: 'You\'re offline',
};

/**
 * Default descriptions for each state type
 */
const DEFAULT_DESCRIPTIONS: Record<ContentStateType, string> = {
  loading: 'Please wait while we load your content.',
  error: 'An error occurred. Please try again.',
  empty: 'There\'s nothing to show here.',
  offline: 'Check your internet connection and try again.',
};

/**
 * Size classes for different size variants
 */
const SIZE_CLASSES = {
  sm: {
    container: 'py-8 px-4',
    icon: 'w-10 h-10',
    title: 'text-base',
    description: 'text-sm',
    iconBg: 'p-3',
  },
  default: {
    container: 'py-12 px-6',
    icon: 'w-12 h-12',
    title: 'text-lg',
    description: 'text-sm',
    iconBg: 'p-4',
  },
  lg: {
    container: 'py-16 px-8',
    icon: 'w-16 h-16',
    title: 'text-xl',
    description: 'text-base',
    iconBg: 'p-6',
  },
};

export function ContentState({
  state,
  title,
  description,
  icon,
  errorCode,
  action,
  secondaryAction,
  onRetry,
  onGoBack,
  size = 'default',
  variant = 'default',
  className,
  skeleton,
}: ContentStateProps) {
  // If loading with skeleton, show skeleton
  if (state === 'loading' && skeleton) {
    return <>{skeleton}</>;
  }

  const Icon = icon || DEFAULT_ICONS[state];
  const classes = SIZE_CLASSES[size];

  // Get title and description
  const displayTitle = title || (errorCode ? 'Something went wrong' : DEFAULT_TITLES[state]);
  const displayDescription =
    description ||
    (errorCode ? getUserFriendlyMessage(errorCode) : DEFAULT_DESCRIPTIONS[state]);

  // Determine icon colors based on state
  const iconColorClass = {
    loading: 'text-gray-400 dark:text-gray-500',
    error: 'text-red-500',
    empty: 'text-gray-400 dark:text-gray-500',
    offline: 'text-amber-500',
  }[state];

  const iconBgClass = {
    loading: 'bg-gray-100 dark:bg-gray-800',
    error: 'bg-red-100 dark:bg-red-950/30',
    empty: 'bg-gray-100 dark:bg-gray-800',
    offline: 'bg-amber-100 dark:bg-amber-950/30',
  }[state];

  // Build primary action
  const primaryAction = action || (onRetry && state === 'error' ? {
    label: 'Try again',
    onClick: onRetry,
    icon: RefreshCw,
  } : undefined);

  // Build secondary action
  const secondary = secondaryAction || (onGoBack ? {
    label: 'Go back',
    onClick: onGoBack,
  } : undefined);

  // Inline variant
  if (variant === 'inline') {
    const borderColor = {
      loading: 'border-gray-200 dark:border-gray-700',
      error: 'border-red-200 dark:border-red-900',
      empty: 'border-gray-200 dark:border-gray-700',
      offline: 'border-amber-200 dark:border-amber-900',
    }[state];

    const bgColor = {
      loading: 'bg-gray-50 dark:bg-gray-900/50',
      error: 'bg-red-50 dark:bg-red-950/20',
      empty: 'bg-gray-50 dark:bg-gray-900/50',
      offline: 'bg-amber-50 dark:bg-amber-950/20',
    }[state];

    const textColor = {
      loading: 'text-gray-800 dark:text-gray-200',
      error: 'text-red-800 dark:text-red-200',
      empty: 'text-gray-800 dark:text-gray-200',
      offline: 'text-amber-800 dark:text-amber-200',
    }[state];

    const subTextColor = {
      loading: 'text-gray-600 dark:text-gray-400',
      error: 'text-red-600 dark:text-red-400',
      empty: 'text-gray-600 dark:text-gray-400',
      offline: 'text-amber-600 dark:text-amber-400',
    }[state];

    return (
      <div
        className={cn(
          'flex items-center gap-3 p-4 rounded-lg border',
          borderColor,
          bgColor,
          className
        )}
      >
        <Icon
          className={cn(
            'w-5 h-5 flex-shrink-0',
            iconColorClass,
            state === 'loading' && 'animate-spin'
          )}
        />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', textColor)}>{displayTitle}</p>
          {displayDescription && (
            <p className={cn('text-xs mt-0.5', subTextColor)}>{displayDescription}</p>
          )}
        </div>
        {primaryAction && state !== 'loading' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={primaryAction.onClick}
            className={cn(
              state === 'error' && 'text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30',
              state === 'offline' && 'text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30'
            )}
          >
            {primaryAction.icon && <primaryAction.icon className="w-4 h-4 mr-1" />}
            {primaryAction.label}
          </Button>
        )}
      </div>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <div
        className={cn(
          'rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
          classes.container,
          className
        )}
      >
        <div className="flex flex-col items-center text-center">
          <div className={cn('rounded-full mb-4', iconBgClass, classes.iconBg)}>
            <Icon
              className={cn(
                iconColorClass,
                classes.icon,
                state === 'loading' && 'animate-spin'
              )}
            />
          </div>
          <h3
            className={cn(
              'font-semibold text-gray-900 dark:text-gray-100',
              classes.title
            )}
          >
            {displayTitle}
          </h3>
          {displayDescription && (
            <p
              className={cn(
                'mt-2 text-gray-500 dark:text-gray-400 max-w-sm',
                classes.description
              )}
            >
              {displayDescription}
            </p>
          )}
          {(primaryAction || secondary) && state !== 'loading' && (
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {primaryAction && (
                <Button onClick={primaryAction.onClick} size={size === 'sm' ? 'sm' : 'default'}>
                  {primaryAction.icon && <primaryAction.icon className="w-4 h-4 mr-2" />}
                  {primaryAction.label}
                </Button>
              )}
              {secondary && (
                <Button
                  variant="outline"
                  onClick={secondary.onClick}
                  size={size === 'sm' ? 'sm' : 'default'}
                >
                  {secondary.label}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full-page variant
  if (variant === 'fullpage') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center min-h-[60vh] text-center px-6',
          className
        )}
      >
        <div className={cn('mb-6 rounded-full', iconBgClass, 'p-6')}>
          <Icon
            className={cn(
              'w-16 h-16',
              iconColorClass,
              state === 'loading' && 'animate-spin'
            )}
          />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {displayTitle}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
          {displayDescription}
        </p>
        {(primaryAction || secondary) && state !== 'loading' && (
          <div className="flex gap-3">
            {primaryAction && (
              <Button onClick={primaryAction.onClick}>
                {primaryAction.icon && <primaryAction.icon className="w-4 h-4 mr-2" />}
                {primaryAction.label}
              </Button>
            )}
            {secondary && (
              <Button variant="outline" onClick={secondary.onClick}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {secondary.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        classes.container,
        className
      )}
    >
      <div className={cn('mb-4 rounded-full', iconBgClass, classes.iconBg)}>
        <Icon
          className={cn(
            iconColorClass,
            classes.icon,
            state === 'loading' && 'animate-spin'
          )}
        />
      </div>
      <h3
        className={cn(
          'font-semibold text-gray-900 dark:text-gray-100',
          classes.title
        )}
      >
        {displayTitle}
      </h3>
      {displayDescription && (
        <p
          className={cn(
            'mt-2 text-gray-500 dark:text-gray-400 max-w-sm',
            classes.description
          )}
        >
          {displayDescription}
        </p>
      )}
      {(primaryAction || secondary) && state !== 'loading' && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {primaryAction && (
            <Button onClick={primaryAction.onClick} size={size === 'sm' ? 'sm' : 'default'}>
              {primaryAction.icon && <primaryAction.icon className="w-4 h-4 mr-2" />}
              {primaryAction.label}
            </Button>
          )}
          {secondary && (
            <Button
              variant="outline"
              onClick={secondary.onClick}
              size={size === 'sm' ? 'sm' : 'default'}
            >
              {secondary.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pre-configured content states for common scenarios
 */

export function ContentLoadingState({
  title = 'Loading...',
  description,
  className,
  skeleton,
}: {
  title?: string;
  description?: string;
  className?: string;
  skeleton?: React.ReactNode;
}) {
  return (
    <ContentState
      state="loading"
      title={title}
      description={description}
      className={className}
      skeleton={skeleton}
    />
  );
}

export function OfflineState({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <ContentState
      state="offline"
      title="You're offline"
      description="Check your internet connection and try again."
      onRetry={onRetry}
      icon={WifiOff}
      className={className}
    />
  );
}

export function DataErrorState({
  onRetry,
  onGoBack,
  title = 'Unable to load data',
  description = 'Something went wrong. Please try again.',
  className,
  variant = 'default',
}: {
  onRetry?: () => void;
  onGoBack?: () => void;
  title?: string;
  description?: string;
  className?: string;
  variant?: 'default' | 'inline' | 'fullpage' | 'card';
}) {
  return (
    <ContentState
      state="error"
      title={title}
      description={description}
      onRetry={onRetry}
      onGoBack={onGoBack}
      variant={variant}
      className={className}
    />
  );
}

export function NoDataState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}) {
  return (
    <ContentState
      state="empty"
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

/**
 * Domain-specific empty states
 */

export function NoSearchResultsState({
  searchQuery,
  onClear,
  className,
}: {
  searchQuery?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <ContentState
      state="empty"
      icon={Search}
      title="No results found"
      description={
        searchQuery
          ? `No results for "${searchQuery}". Try a different search term.`
          : 'No results match your search criteria.'
      }
      action={onClear ? { label: 'Clear search', onClick: onClear } : undefined}
      className={className}
    />
  );
}

export function NoDestinationsState({
  onExplore,
  className,
}: {
  onExplore?: () => void;
  className?: string;
}) {
  return (
    <ContentState
      state="empty"
      icon={MapPin}
      title="No destinations yet"
      description="Discover amazing places around the world to add to your journey."
      action={onExplore ? { label: 'Explore destinations', onClick: onExplore } : undefined}
      className={className}
    />
  );
}

export function NoSavedPlacesState({
  onExplore,
  className,
}: {
  onExplore?: () => void;
  className?: string;
}) {
  return (
    <ContentState
      state="empty"
      icon={Bookmark}
      title="No saved places"
      description="Save places you want to visit later by tapping the bookmark icon."
      action={onExplore ? { label: 'Explore destinations', onClick: onExplore } : undefined}
      className={className}
    />
  );
}

export function NoVisitedPlacesState({
  onExplore,
  className,
}: {
  onExplore?: () => void;
  className?: string;
}) {
  return (
    <ContentState
      state="empty"
      icon={Heart}
      title="No visited places"
      description="Mark places as visited to build your travel history."
      action={onExplore ? { label: 'Explore destinations', onClick: onExplore } : undefined}
      className={className}
    />
  );
}

export function NoCollectionsState({
  onCreate,
  className,
}: {
  onCreate?: () => void;
  className?: string;
}) {
  return (
    <ContentState
      state="empty"
      icon={FolderOpen}
      title="No collections"
      description="Create collections to organize your favorite places."
      action={onCreate ? { label: 'Create collection', onClick: onCreate } : undefined}
      className={className}
    />
  );
}

export function NoTripsState({
  onCreate,
  className,
}: {
  onCreate?: () => void;
  className?: string;
}) {
  return (
    <ContentState
      state="empty"
      icon={Plane}
      title="No trips planned"
      description="Start planning your next adventure by creating a trip."
      action={onCreate ? { label: 'Create trip', onClick: onCreate } : undefined}
      className={className}
    />
  );
}
