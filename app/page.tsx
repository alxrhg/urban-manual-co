import { Suspense } from 'react';
import { Metadata } from 'next';
import NewHomePageClient from './page-client-new';
import { prefetchHomepageData } from '@/lib/data/fetch-destinations';

/**
 * Homepage - Highest Performance Architecture
 *
 * Uses Next.js 16 best practices:
 * - Partial Prerendering (PPR): Static shell renders instantly
 * - ISR: Background revalidation every 5 minutes
 * - Server-side data fetching with caching
 * - Streaming with Suspense boundaries
 *
 * Performance targets:
 * - TTFB: <100ms (static shell)
 * - FCP: <500ms
 * - LCP: <1s
 */

// ISR: Revalidate in background every 5 minutes
export const revalidate = 300;

// Allow dynamic rendering on first request (then cached via ISR)
// This ensures data is fetched when Supabase is available at runtime
// rather than at build time when credentials may not be available

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
 * Inline skeleton for instant feedback - no external dependencies
 * This renders immediately as part of the static shell
 */
function HomepageSkeleton() {
  return (
    <main className="w-full min-h-screen">
      {/* Hero skeleton */}
      <div className="py-16 md:py-24 lg:py-32 bg-gradient-to-b from-gray-50 via-white to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Headline skeleton */}
          <div className="h-10 md:h-14 w-96 max-w-full mx-auto bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-4" />
          <div className="h-5 w-64 mx-auto bg-gray-100 dark:bg-gray-900 rounded animate-pulse mb-10" />

          {/* Search skeleton */}
          <div className="max-w-3xl mx-auto mb-8">
            <div className="h-14 md:h-16 w-full bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse" />
          </div>

          {/* Category pills skeleton */}
          <div className="flex justify-center gap-2 md:gap-3 mb-8 flex-wrap">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 w-24 bg-gray-100 dark:bg-gray-900 rounded-full animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Collections skeleton */}
      <div className="py-12 md:py-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-8" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-shrink-0 w-[240px]">
                <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse mb-3" />
                <div className="h-4 w-32 bg-gray-100 dark:bg-gray-900 rounded animate-pulse mb-2" />
                <div className="h-3 w-20 bg-gray-50 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Async data fetching component - streams after static shell
 */
async function HomepageContent() {
  // Fetch all homepage data in parallel on the server
  // This data is cached using Next.js unstable_cache for 5 minutes
  const { destinations, cities, categories, trending } =
    await prefetchHomepageData();

  return (
    <NewHomePageClient
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
