import { Suspense } from 'react';
import { Metadata } from 'next';
import HomePageClient from './page-client';
import { prefetchHomepageData } from '@/lib/data/fetch-destinations';
import SearchGridSkeleton from '@/components/search/SearchGridSkeleton';

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
    <main className="w-full min-h-screen px-6 md:px-10 py-20">
      <div className="max-w-[1800px] mx-auto">
        {/* Hero skeleton */}
        <div className="mb-12">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-4" />
          <div className="h-4 w-96 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
        </div>

        {/* Search skeleton */}
        <div className="mb-8">
          <div className="h-12 w-full max-w-2xl bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse" />
        </div>

        {/* Filter chips skeleton */}
        <div className="flex gap-2 mb-8 overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-8 w-20 bg-gray-100 dark:bg-gray-900 rounded-full animate-pulse flex-shrink-0"
            />
          ))}
        </div>

        {/* Grid skeleton */}
        <SearchGridSkeleton />
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
    <HomePageClient
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
