/**
 * Empty State Component System
 *
 * A unified system for empty states, error states, and edge cases.
 * All empty states should guide users toward action, not just inform.
 *
 * Design Principles:
 * - Be helpful, not just informative ("Your adventure awaits" vs "No trips")
 * - Always provide a clear next action
 * - Maintain brand voice even in error states
 * - Use consistent visual language
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
  WifiOff,
  RefreshCw,
  Compass,
  Calendar,
  Sparkles,
  Clock,
  Lock,
  CheckCircle2,
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
  /** Visual variant */
  variant?: 'default' | 'minimal' | 'card';
}

export function EmptyState({
  icon: Icon = AlertCircle,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'default',
  variant = 'default',
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

  const variantClasses = {
    default: '',
    minimal: '',
    card: 'bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800',
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        classes.container,
        variantClasses[variant],
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
 *
 * Copy Guidelines:
 * - Titles should be encouraging, not just stating the obvious
 * - Descriptions should explain the benefit of taking action
 * - Action labels should be specific and action-oriented
 */

export function NoSearchResults({
  searchQuery,
  onClear,
  onBrowse,
  className,
}: {
  searchQuery?: string;
  onClear?: () => void;
  onBrowse?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Search}
      title="Nothing matches your search"
      description={
        searchQuery
          ? `We couldn't find anything for "${searchQuery}". Try different keywords or browse our curated picks.`
          : 'Try adjusting your filters or search terms.'
      }
      action={onClear ? { label: 'Clear search', onClick: onClear } : undefined}
      secondaryAction={onBrowse ? { label: 'Browse all', onClick: onBrowse } : undefined}
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
      icon={Compass}
      title="Ready to explore?"
      description="Discover carefully curated places from around the world, handpicked for discerning travelers."
      action={onExplore ? { label: 'Start exploring', onClick: onExplore, icon: Sparkles } : undefined}
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
      title="Build your wishlist"
      description="Tap the bookmark icon on any place to save it here. Perfect for planning future adventures."
      action={onExplore ? { label: 'Discover places', onClick: onExplore } : undefined}
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
      icon={MapPin}
      title="Start your travel log"
      description="Mark places as visited to track your journey and unlock personalized recommendations."
      action={onExplore ? { label: 'Find places to visit', onClick: onExplore } : undefined}
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
      title="Organize your discoveries"
      description="Create collections to group places by theme, city, or mood. Share them with friends or keep them private."
      action={
        onCreate
          ? { label: 'Create your first collection', onClick: onCreate, icon: Plus }
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
      title="Your next adventure awaits"
      description="Plan your trip day-by-day with our curated recommendations. Add places, sync flights, and share with travel companions."
      action={
        onCreate
          ? { label: 'Plan a trip', onClick: onCreate, icon: Plus }
          : undefined
      }
      className={className}
    />
  );
}

export function NoItineraryItems({
  dayNumber,
  onAddPlace,
  className,
}: {
  dayNumber?: number;
  onAddPlace?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Calendar}
      title={dayNumber ? `Plan Day ${dayNumber}` : 'Plan your day'}
      description="Add places to create your perfect itinerary. We'll help you optimize timing and routes."
      action={onAddPlace ? { label: 'Add a place', onClick: onAddPlace, icon: Plus } : undefined}
      size="sm"
      className={className}
    />
  );
}

export function NoActivity({
  onExplore,
  className,
}: {
  onExplore?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Clock}
      title="Your activity will appear here"
      description="Save places, mark visits, and create collections to see your travel history."
      action={onExplore ? { label: 'Start exploring', onClick: onExplore } : undefined}
      size="sm"
      className={className}
    />
  );
}

/**
 * Error States
 */

export function ErrorState({
  title = 'Something went wrong',
  description = "We couldn't load this content. Please try again.",
  onRetry,
  onGoHome,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={onRetry ? { label: 'Try again', onClick: onRetry, icon: RefreshCw } : undefined}
      secondaryAction={onGoHome ? { label: 'Go home', onClick: onGoHome } : undefined}
      className={className}
    />
  );
}

export function NetworkError({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={WifiOff}
      title="You're offline"
      description="Check your internet connection and try again. Your saved content may still be available."
      action={onRetry ? { label: 'Retry', onClick: onRetry, icon: RefreshCw } : undefined}
      className={className}
    />
  );
}

export function AuthRequiredState({
  action = 'continue',
  onSignIn,
  className,
}: {
  action?: string;
  onSignIn?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Lock}
      title={`Sign in to ${action}`}
      description="Create a free account to save places, plan trips, and get personalized recommendations."
      action={onSignIn ? { label: 'Sign in', onClick: onSignIn } : undefined}
      className={className}
    />
  );
}

export function LoadFailedState({
  resourceName = 'content',
  onRetry,
  className,
}: {
  resourceName?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={`Couldn't load ${resourceName}`}
      description="This might be a temporary issue. Please try again in a moment."
      action={onRetry ? { label: 'Try again', onClick: onRetry, icon: RefreshCw } : undefined}
      className={className}
    />
  );
}

export function SuccessState({
  title = 'All done!',
  description,
  onContinue,
  continueLabel = 'Continue',
  className,
}: {
  title?: string;
  description?: string;
  onContinue?: () => void;
  continueLabel?: string;
  className?: string;
}) {
  return (
    <EmptyState
      icon={CheckCircle2}
      title={title}
      description={description}
      action={onContinue ? { label: continueLabel, onClick: onContinue } : undefined}
      className={className}
    />
  );
}
