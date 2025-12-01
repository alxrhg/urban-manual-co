import { Suspense } from 'react';
import { Metadata } from 'next';
import HomePageClient from './page-client';
import { prefetchHomepageData } from '@/lib/data/fetch-destinations';
import SearchGridSkeleton from '@/src/features/search/SearchGridSkeleton';

/**
 * Homepage - Server Component Wrapper
 *
 * This server component fetches initial data on the server and passes it
 * to the client component. This significantly improves initial page load time
 * by eliminating client-side data fetching waterfall.
 *
 * Benefits:
 * - Faster Time to First Byte (TTFB)
 * - Better SEO as content is rendered on server
 * - Reduced client-side JavaScript execution
 * - Improved Core Web Vitals (LCP, FCP)
 */

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
 * Skeleton component for loading state
 * Shows a minimal loading state while server data is being fetched
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
          {Array.from({ length: 6 }).map((_, i) => (
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

export default async function HomePage() {
  // Fetch all homepage data in parallel on the server
  // This data is cached using Next.js unstable_cache for 5 minutes
  const { destinations, cities, categories, trending } =
    await prefetchHomepageData();

  return (
    <Suspense fallback={<HomepageSkeleton />}>
      <HomePageClient
        initialDestinations={destinations}
        initialCities={cities}
        initialCategories={categories}
        initialTrending={trending}
      />
    </Suspense>
  );
}
