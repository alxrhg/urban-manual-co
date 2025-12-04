/**
 * Legacy Empty States
 *
 * This file provides backwards compatibility with the emoji-based empty states.
 * For new code, prefer using the unified system in @/components/ui/empty-state.tsx
 *
 * @deprecated Import from '@/components/ui/empty-state' instead
 */

'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// Re-export unified components for convenience
export {
  EmptyState as UnifiedEmptyState,
  NoSearchResults,
  NoDestinations,
  NoSavedPlaces,
  NoVisitedPlaces,
  NoCollections,
  NoTrips,
  NoItineraryItems,
  NoActivity,
  ErrorState,
  NetworkError,
  AuthRequiredState,
  LoadFailedState,
  SuccessState,
} from '@/components/ui/empty-state';

interface EmptyStateProps {
  icon?: string; // Emoji
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

/**
 * @deprecated Use EmptyState from '@/components/ui/empty-state' instead
 */
export function EmptyState({
  icon = '🏞️',
  title,
  description,
  actionLabel,
  actionHref,
  onAction
}: EmptyStateProps) {
  const router = useRouter();

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionHref) {
      router.push(actionHref);
    }
  };

  return (
    <div className="text-center py-20">
      <div className="text-4xl mb-4">{icon}</div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{description}</p>
      )}
      {actionLabel && (
        <button
          onClick={handleAction}
          className="mt-6 px-6 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Pre-built empty states for common scenarios (updated copy)

/**
 * @deprecated Use NoSearchResults from '@/components/ui/empty-state' instead
 */
export function NoResultsEmptyState({ searchTerm }: { searchTerm?: string }) {
  return (
    <EmptyState
      icon="🔍"
      title="Nothing matches your search"
      description={searchTerm ? `We couldn't find anything for "${searchTerm}". Try different keywords.` : "Try adjusting your filters or search terms."}
    />
  );
}

/**
 * @deprecated Use NoSavedPlaces from '@/components/ui/empty-state' instead
 */
export function NoSavedPlacesEmptyState() {
  return (
    <EmptyState
      icon="💝"
      title="Build your wishlist"
      description="Tap the bookmark icon on any place to save it here"
      actionLabel="Discover Places"
      actionHref="/"
    />
  );
}

/**
 * @deprecated Use NoVisitedPlaces from '@/components/ui/empty-state' instead
 */
export function NoVisitedPlacesEmptyState() {
  return (
    <EmptyState
      icon="✈️"
      title="Start your travel log"
      description="Mark places as visited to track your journey"
      actionLabel="Find Places"
      actionHref="/"
    />
  );
}

/**
 * @deprecated Use NoCollections from '@/components/ui/empty-state' instead
 */
export function NoCollectionsEmptyState({ onCreateCollection }: { onCreateCollection: () => void }) {
  return (
    <EmptyState
      icon="📚"
      title="Organize your discoveries"
      description="Create collections to group places by theme or mood"
      actionLabel="Create Collection"
      onAction={onCreateCollection}
    />
  );
}

/**
 * @deprecated Use unified empty state system instead
 */
export function NoAchievementsEmptyState() {
  return (
    <EmptyState
      icon="🏆"
      title="Achievements await"
      description="Visit places to unlock achievements and badges"
    />
  );
}

/**
 * @deprecated Use ErrorState from '@/components/ui/empty-state' instead
 */
export function ErrorEmptyState({ message = "Something went wrong" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="w-full max-w-md">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * @deprecated Use AuthRequiredState from '@/components/ui/empty-state' instead
 */
export function SignInEmptyState({ action = "to continue" }: { action?: string }) {
  return (
    <EmptyState
      icon="🔐"
      title={`Sign in ${action}`}
      description="Create a free account to save places, plan trips, and more"
      actionLabel="Sign In"
      actionHref="/auth/login"
    />
  );
}
