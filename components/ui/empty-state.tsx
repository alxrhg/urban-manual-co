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
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
      className={className}
    />
  );
}
