import { Suspense } from 'react';
import { Metadata } from 'next';
import CitiesPageClient from './page-client';
import { fetchCityStats } from '@/lib/data/fetch-destinations';
import SearchGridSkeleton from '@/src/features/search/SearchGridSkeleton';
import { ErrorState } from '@/components/ui/empty-state';
import {
  generateCitiesListBreadcrumb,
  generateCitiesCollectionSchema
} from '@/lib/metadata';

/**
 * Cities Page - Highest Performance Architecture
 *
 * - Static generation at build time
 * - ISR every 10 minutes for fresh data
 * - Streaming with Suspense for instant shell
 */

// ISR: Revalidate every 10 minutes
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
 * Inline skeleton - renders as static shell
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
          {[1, 2, 3, 4].map((i) => (
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

/**
 * Async data fetching - streams after static shell
 */
async function CitiesContent() {
  try {
    const cityStats = await fetchCityStats();
    const countries = Array.from(
      new Set(cityStats.map(s => s.country).filter(Boolean))
    ).sort();

    // Generate schema for SEO
    const collectionSchema = generateCitiesCollectionSchema(cityStats);

    return (
      <>
        {/* CollectionPage Schema with ItemList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(collectionSchema),
          }}
        />
        <CitiesPageClient
          initialCityStats={cityStats}
          initialCountries={countries}
        />
      </>
    );
  } catch (error) {
    console.error('Failed to fetch city stats:', error);
    return (
      <main className="w-full px-6 md:px-10 py-20 min-h-screen">
        <ErrorState
          variant="fullpage"
          title="Unable to load cities"
          description="We couldn't load the cities data. Please try refreshing the page."
        />
      </main>
    );
  }
}

export default function CitiesPage() {
  // Generate breadcrumb schema
  const breadcrumb = generateCitiesListBreadcrumb();

  return (
    <>
      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumb),
        }}
      />
      <Suspense fallback={<CitiesSkeleton />}>
        <CitiesContent />
      </Suspense>
    </>
  );
}
