'use client';

import { useUserContext } from '@/contexts/UserContext';
import { EnhancedVisitedTab } from '@/components/EnhancedVisitedTab';
import { EnhancedSavedTab } from '@/components/EnhancedSavedTab';
import { NoCollectionsEmptyState } from '@/components/EmptyStates';
import { Button } from '@/components/ui/button';
import { MapPin, Heart, Layers } from 'lucide-react';

export default function AccountHistoryPage() {
  const { user, visitedPlaces, savedPlaces, collections, refreshAll } = useUserContext();

  if (!user) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Sign in required</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Sign in to review your travel history, saved places, and curated collections.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Layers className="h-6 w-6 text-blue-600 dark:text-blue-300" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">History & curation</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Explore everywhere you have saved, tracked, and visited in Urban Manual.
        </p>
      </header>

      <section aria-labelledby="visited-places" className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-300" aria-hidden="true" />
            <div>
              <h2 id="visited-places" className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Visited destinations
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Track where you have been and add notes for future reference.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={refreshAll}>
            Refresh
          </Button>
        </div>
        <EnhancedVisitedTab visitedPlaces={visitedPlaces} onPlaceAdded={refreshAll} />
      </section>

      <section aria-labelledby="saved-places" className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-blue-600 dark:text-blue-300" aria-hidden="true" />
            <div>
              <h2 id="saved-places" className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Saved places
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Organize your wishlist and build itineraries with your favourites.
              </p>
            </div>
          </div>
        </div>
        <EnhancedSavedTab savedPlaces={savedPlaces} />
      </section>

      <section aria-labelledby="collections" className="space-y-6">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-blue-600 dark:text-blue-300" aria-hidden="true" />
          <div>
            <h2 id="collections" className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Collections
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Curate thematic lists to share with friends and collaborators.
            </p>
          </div>
        </div>
        {collections.length === 0 ? (
          <NoCollectionsEmptyState />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {collections.map(collection => (
              <li
                key={collection.id}
                className="rounded-2xl border border-gray-100 bg-white/60 p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-950/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{collection.name}</p>
                    {collection.description && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{collection.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {collection.destination_count ?? 0} places
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{collection.is_public ? 'Public' : 'Private'}</span>
                  <time dateTime={collection.created_at}>
                    Created {new Date(collection.created_at).toLocaleDateString()}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
