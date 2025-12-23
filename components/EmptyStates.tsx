'use client';

import { useRouter } from 'next/navigation';
import { LucideIcon, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert';
import { Button } from '@/ui/button';

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
          className="mt-6 px-6 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-lg hover:opacity-80 transition-opacity"
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
  const router = useRouter();

  return (
    <div className="max-w-md py-12">
      <div className="text-4xl mb-4">💝</div>
      <h3 className="text-lg font-medium mb-2">Build Your Travel Wishlist</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
        Save places you want to visit later. Organize them into collections and get personalized recommendations based on your interests.
      </p>

      <div className="space-y-3 mb-8">
        <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="text-base">1.</span>
          <span>Browse destinations and tap the heart icon to save</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="text-base">2.</span>
          <span>Organize saved places into themed collections</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="text-base">3.</span>
          <span>Plan trips using your saved destinations</span>
        </div>
      </div>

      <button
        onClick={() => router.push('/')}
        className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-lg hover:opacity-80 transition-opacity"
      >
        Explore Destinations
      </button>
    </div>
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
  const COLLECTION_IDEAS = [
    { emoji: '🍜', name: 'Best Local Eats', description: 'Authentic dining spots' },
    { emoji: '🏨', name: 'Boutique Hotels', description: 'Unique places to stay' },
    { emoji: '☕', name: 'Cozy Cafes', description: 'Perfect coffee spots' },
    { emoji: '🌅', name: 'Sunset Views', description: 'Best viewpoints' },
  ];

  return (
    <div className="max-w-md py-12">
      <div className="text-4xl mb-4">📚</div>
      <h3 className="text-lg font-medium mb-2">Organize Your Discoveries</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
        Collections let you group saved places by theme, trip, or any way you like. Share your curated guides with friends or keep them private.
      </p>

      <div className="space-y-2 mb-8">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Collection Ideas</p>
        {COLLECTION_IDEAS.map((idea) => (
          <div
            key={idea.name}
            className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
          >
            <span className="text-lg">{idea.emoji}</span>
            <div>
              <p className="text-sm font-medium">{idea.name}</p>
              <p className="text-xs text-gray-500">{idea.description}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onCreateCollection}
        className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-lg hover:opacity-80 transition-opacity"
      >
        Create Your First Collection
      </button>
    </div>
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
