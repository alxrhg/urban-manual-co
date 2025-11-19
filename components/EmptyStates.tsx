'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: string; // Emoji
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon = '🏞️',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction
}: EmptyStateProps) {
  const router = useRouter();

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionHref) {
      router.push(actionHref);
    }
  };

  const handleSecondaryAction = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
    } else if (secondaryActionHref) {
      router.push(secondaryActionHref);
    }
  };

  return (
    <div className="text-center py-16 px-6 sm:px-8 bg-gray-50 dark:bg-gray-900/40 rounded-3xl border border-gray-200 dark:border-gray-800">
      <div className="text-4xl mb-3" aria-hidden>
        {icon}
      </div>
      <p className="text-base font-semibold text-gray-900 dark:text-white">{title}</p>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed max-w-xl mx-auto">
          {description}
        </p>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3" role="group" aria-label="Empty state actions">
          {actionLabel && (
            <Button onClick={handleAction} size="sm" className="w-full sm:w-auto">
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && (
            <Button
              onClick={handleSecondaryAction}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-built empty states for common scenarios
export function NoResultsEmptyState({
  searchTerm,
  onTryNearby,
}: {
  searchTerm?: string;
  onTryNearby?: () => void;
}) {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      description={
        searchTerm
          ? `No places match "${searchTerm}". Try different filters or explore nearby.`
          : 'Try adjusting your filters or exploring nearby suggestions.'
      }
      actionLabel="Try nearby filters"
      onAction={onTryNearby}
      secondaryActionLabel="Browse top cities"
      secondaryActionHref="/cities"
    />
  );
}

export function NoSavedPlacesEmptyState({
  onBrowseTopCities,
  onImportTrip,
}: {
  onBrowseTopCities?: () => void;
  onImportTrip?: () => void;
}) {
  return (
    <EmptyState
      icon="💝"
      title="Save places you love"
      description="Build curated lists and sync them to your trips."
      actionLabel="Browse top cities"
      onAction={onBrowseTopCities}
      actionHref="/cities"
      secondaryActionLabel="Import a Google trip"
      onSecondaryAction={onImportTrip}
      secondaryActionHref="/trips"
    />
  );
}

export function NoVisitedPlacesEmptyState({
  onLogVisit,
  onImportTrip,
}: {
  onLogVisit?: () => void;
  onImportTrip?: () => void;
}) {
  return (
    <EmptyState
      icon="✈️"
      title="Nothing marked as visited"
      description="Celebrate your travels by logging recent stops and syncing your itineraries."
      actionLabel="Log a recent visit"
      onAction={onLogVisit}
      actionHref="/search"
      secondaryActionLabel="Import a Google trip"
      onSecondaryAction={onImportTrip}
      secondaryActionHref="/trips"
    />
  );
}

export function TripsEmptyState({ onCreateTrip, onImportTrip }: { onCreateTrip: () => void; onImportTrip: () => void }) {
  return (
    <EmptyState
      icon="🧭"
      title="No trips planned yet"
      description="Start organizing your next adventure or import plans you already have."
      actionLabel="Plan a new trip"
      onAction={onCreateTrip}
      secondaryActionLabel="Import a Google trip"
      onSecondaryAction={onImportTrip}
    />
  );
}

export function NoCollectionsEmptyState({ onCreateCollection }: { onCreateCollection: () => void }) {
  return (
    <EmptyState
      icon="📚"
      title="No collections yet"
      description="Create lists to organize your places"
      actionLabel="Create Collection"
      onAction={onCreateCollection}
    />
  );
}

export function NoAchievementsEmptyState() {
  return (
    <EmptyState
      icon="🏆"
      title="No achievements yet"
      description="Start visiting places to unlock achievements!"
    />
  );
}

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
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SignInEmptyState({ action = "to continue" }: { action?: string }) {
  return (
    <EmptyState
      icon="🔐"
      title={`Sign in ${action}`}
      description="Create an account to save places and track your visits"
      actionLabel="Sign In"
      actionHref="/auth/login"
    />
  );
}
