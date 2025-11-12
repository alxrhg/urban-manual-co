'use client';

import { useUserContext } from '@/contexts/UserContext';
import { EnhancedVisitedTab } from '@/components/EnhancedVisitedTab';
import { EnhancedSavedTab } from '@/components/EnhancedSavedTab';
import { NoCollectionsEmptyState } from '@/components/EmptyStates';

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
    <div className="space-y-10 text-sm">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">History &amp; curation</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Explore everywhere you have saved, tracked, and visited in Urban Manual.
        </p>
      </header>

      <section aria-labelledby="visited-places" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="visited-places" className="text-base font-medium text-gray-900 dark:text-gray-100">
              Visited destinations
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Track where you have been and add notes for future reference.
            </p>
          </div>
          <button type="button" onClick={refreshAll} className="text-xs underline hover:text-blue-600">
            Refresh
          </button>
        </div>
        <EnhancedVisitedTab visitedPlaces={visitedPlaces} onPlaceAdded={refreshAll} />
      </section>

      <section aria-labelledby="saved-places" className="space-y-3">
        <h2 id="saved-places" className="text-base font-medium text-gray-900 dark:text-gray-100">
          Saved places
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Organize your wishlist and build itineraries with your favourites.
        </p>
        <EnhancedSavedTab savedPlaces={savedPlaces} />
      </section>

      <section aria-labelledby="collections" className="space-y-3">
        <h2 id="collections" className="text-base font-medium text-gray-900 dark:text-gray-100">
          Collections
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Curate thematic lists to share with friends and collaborators.
        </p>
        {collections.length === 0 ? (
          <NoCollectionsEmptyState />
        ) : (
          <ul className="space-y-3">
            {collections.map(collection => (
              <li key={collection.id} className="border-b border-gray-200 pb-3 dark:border-gray-800">
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
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
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
