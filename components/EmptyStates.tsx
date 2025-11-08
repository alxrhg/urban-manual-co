'use client';

import { useRouter } from 'next/navigation';
import { LucideIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: string; // Emoji
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

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

// Pre-built empty states for common scenarios
export function NoResultsEmptyState({ searchTerm }: { searchTerm?: string }) {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      description={searchTerm ? `No places match "${searchTerm}"` : "Try adjusting your filters"}
    />
  );
}

export function NoSavedPlacesEmptyState() {
  return (
    <EmptyState
      icon="💝"
      title="No saved places yet"
      description="Save places to create your wishlist"
      actionLabel="Browse Destinations"
      actionHref="/"
    />
  );
}

export function NoVisitedPlacesEmptyState() {
  return (
    <EmptyState
      icon="✈️"
      title="No visits yet"
      description="Mark places as visited to track your journey"
      actionLabel="Browse Destinations"
      actionHref="/"
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
