import { Suspense } from 'react';
import { Metadata } from 'next';
import { prefetchHomepageData } from '@/lib/data/fetch-destinations';

// New modular architecture imports
import { HomePage as HomePageComponent } from './(home)/HomePage';

/**
 * Homepage - Rebuilt Architecture v2
 *
 * Features:
 * - Modular component architecture
 * - Zustand state management (unified drawer & homepage stores)
 * - Enhanced drawer system with stack navigation
 * - Grid/Map/Split view modes
 * - Advanced filtering with URL sync
 * - Keyboard navigation support
 *
 * Performance:
 * - Server-side data prefetching (ISR)
 * - Partial Prerendering (PPR)
 * - Streaming with Suspense
 * - Lazy-loaded heavy components
 */

// ISR: Revalidate in background every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Urban Manual - Curated Travel Destinations Worldwide',
  description:
    'Discover 897+ curated destinations worldwide. AI-powered recommendations, interactive maps, and editorial content for the modern traveler.',
  openGraph: {
    title: 'Urban Manual - Curated Travel Destinations Worldwide',
    description:
      'Discover 897+ curated destinations worldwide. AI-powered recommendations, interactive maps, and editorial content for the modern traveler.',
    url: 'https://www.urbanmanual.co',
    siteName: 'Urban Manual',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Urban Manual - Curated Travel Destinations Worldwide',
    description:
      'Discover 897+ curated destinations worldwide. AI-powered recommendations, interactive maps, and editorial content for the modern traveler.',
  },
};

/**
 * Inline skeleton for instant feedback - renders as static shell
 */
function HomepageSkeleton() {
  return (
    <main className="w-full min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero skeleton */}
        <div className="mb-12">
          <div className="h-3 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-12" />
          <div className="h-3 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>

        {/* Filter bar skeleton */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-8 w-28 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
          <div className="flex-1" />
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col animate-pulse">
              <div className="aspect-video rounded-2xl bg-gray-200 dark:bg-gray-800 mb-3" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

/**
 * Async data fetching - streams after static shell
 */
async function HomepageContent() {
  const { destinations, cities, categories, trending } =
    await prefetchHomepageData();

  return (
    <HomePageComponent
      initialDestinations={destinations}
      initialCities={cities}
      initialCategories={categories}
      initialTrending={trending}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomepageSkeleton />}>
      <HomepageContent />
    </Suspense>
  );
}
