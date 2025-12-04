/**
 * Empty State Component
 *
 * Displays helpful messages and actions when content is not available.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  Search,
  MapPin,
  Heart,
  Bookmark,
  FolderOpen,
  Plane,
  AlertCircle,
  Plus,
  LucideIcon,
} from 'lucide-react';

interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional class names */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
}

export function EmptyState({
  icon: Icon = AlertCircle,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'default',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8 px-4',
      icon: 'w-10 h-10',
      title: 'text-base',
      description: 'text-sm',
    },
    default: {
      container: 'py-12 px-6',
      icon: 'w-12 h-12',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16 px-8',
      icon: 'w-16 h-16',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        classes.container,
        className
      )}
    >
      {/* Icon container */}
      <div className="mb-4 p-4 rounded-full bg-gray-100 dark:bg-gray-800">
        <Icon
          className={cn(
            'text-gray-400 dark:text-gray-500',
            classes.icon
          )}
        />
      </div>

      {/* Title */}
      <h3
        className={cn(
          'font-semibold text-gray-900 dark:text-gray-100',
          classes.title
        )}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={cn(
            'mt-2 text-gray-500 dark:text-gray-400 max-w-sm',
            classes.description
          )}
        >
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {action && (
            <Button onClick={action.onClick} size={size === 'sm' ? 'sm' : 'default'}>
              {action.icon && <action.icon className="w-4 h-4 mr-2" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              size={size === 'sm' ? 'sm' : 'default'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pre-configured empty states for common use cases
 */

export function NoSearchResults({
  searchQuery,
  onClear,
  className,
}: {
  searchQuery?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
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

export function NoDestinations({
  onExplore,
  className,
}: {
  onExplore?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={MapPin}
      title="No destinations yet"
      description="Discover amazing places around the world to add to your journey."
      action={onExplore ? { label: 'Explore destinations', onClick: onExplore } : undefined}
      className={className}
    />
  );
}

export function NoSavedPlaces({
  onExplore,
  className,
}: {
  onExplore?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Bookmark}
      title="No saved places"
      description="Save places you want to visit later by tapping the bookmark icon."
      action={onExplore ? { label: 'Explore destinations', onClick: onExplore } : undefined}
      className={className}
    />
  );
}

export function NoVisitedPlaces({
  onExplore,
  className,
}: {
  onExplore?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Heart}
      title="No visited places"
      description="Mark places as visited to build your travel history."
      action={onExplore ? { label: 'Explore destinations', onClick: onExplore } : undefined}
      className={className}
    />
  );
}

export function NoCollections({
  onCreate,
  className,
}: {
  onCreate?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No collections"
      description="Create collections to organize your favorite places."
      action={
        onCreate
          ? { label: 'Create collection', onClick: onCreate, icon: Plus }
          : undefined
      }
      className={className}
    />
  );
}

export function NoTrips({
  onCreate,
  className,
}: {
  onCreate?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Plane}
      title="No trips planned"
      description="Start planning your next adventure by creating a trip."
      action={
        onCreate
          ? { label: 'Create trip', onClick: onCreate, icon: Plus }
          : undefined
      }
      className={className}
    />
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred. Please try again.',
  onRetry,
  onGoBack,
  className,
  variant = 'default',
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
  /** Variant changes the visual style */
  variant?: 'default' | 'inline' | 'fullpage';
}) {
  if (variant === 'inline') {
    // Compact inline error for use within cards/sections
    return (
      <div className={cn(
        'flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900',
        className
      )}>
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">{title}</p>
          {description && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{description}</p>
          )}
        </div>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'fullpage') {
    // Full page error with more prominent styling
    return (
      <div className={cn(
        'flex flex-col items-center justify-center min-h-[60vh] text-center px-6',
        className
      )}>
        <div className="mb-6 p-6 rounded-full bg-red-100 dark:bg-red-950/30">
          <AlertCircle className="w-16 h-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
          {description}
        </p>
        <div className="flex gap-3">
          {onRetry && (
            <Button onClick={onRetry}>
              Try again
            </Button>
          )}
          {onGoBack && (
            <Button variant="outline" onClick={onGoBack}>
              Go back
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Default variant - standard empty state style
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
      secondaryAction={onGoBack ? { label: 'Go back', onClick: onGoBack } : undefined}
      className={className}
    />
  );
}

/**
 * Network error state - for fetch/API failures
 */
export function NetworkError({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <ErrorState
      title="Connection error"
      description="Unable to load data. Check your internet connection and try again."
      onRetry={onRetry}
      className={className}
    />
  );
}

/**
 * Not found error state - for 404 scenarios
 */
export function NotFoundError({
  title = 'Not found',
  description = "The page or resource you're looking for doesn't exist.",
  onGoBack,
  className,
}: {
  title?: string;
  description?: string;
  onGoBack?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Search}
      title={title}
      description={description}
      action={onGoBack ? { label: 'Go back', onClick: onGoBack } : undefined}
      className={className}
    />
  );
}
