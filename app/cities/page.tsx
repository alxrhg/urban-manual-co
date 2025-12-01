import { Suspense } from 'react';
import { Metadata } from 'next';
import CitiesPageClient from './page-client';
import { fetchCityStats } from '@/lib/data/fetch-destinations';
import SearchGridSkeleton from '@/src/features/search/SearchGridSkeleton';

/**
 * Cities Page - Server Component Wrapper
 *
 * Fetches city statistics on the server for faster initial load.
 * Benefits:
 * - Faster Time to First Byte (TTFB)
 * - Content rendered on server for SEO
 * - No loading spinner on initial page load
 */

// Enable Incremental Static Regeneration - revalidate every 10 minutes
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Discover Cities - Urban Manual',
  description:
    'Explore curated travel destinations by city. Find the best restaurants, hotels, bars, and attractions in cities worldwide.',
  openGraph: {
    title: 'Discover Cities - Urban Manual',
    description:
      'Explore curated travel destinations by city. Find the best restaurants, hotels, bars, and attractions in cities worldwide.',
    url: 'https://www.urbanmanual.co/cities',
    siteName: 'Urban Manual',
    type: 'website',
  },
};

/**
 * Skeleton component for loading state
 */
function CitiesSkeleton() {
  return (
    <main className="w-full px-6 md:px-10 py-20 min-h-screen">
      <div className="mb-12">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-32 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
      </div>

      {/* Featured cities skeleton */}
      <div className="mb-12">
        <div className="h-6 w-32 bg-gray-100 dark:bg-gray-900 rounded animate-pulse mb-6" />
        <div className="flex gap-5 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[280px] h-[200px] bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Grid skeleton */}
      <SearchGridSkeleton />
    </main>
  );
}

export default async function CitiesPage() {
  // Fetch city stats on the server
  const cityStats = await fetchCityStats();

  // Extract unique countries from city stats
  const countries = Array.from(
    new Set(cityStats.map(s => s.country).filter(Boolean))
  ).sort();

  return (
    <Suspense fallback={<CitiesSkeleton />}>
      <CitiesPageClient
        initialCityStats={cityStats}
        initialCountries={countries}
      />
    </Suspense>
  );
}
