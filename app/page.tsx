import { Suspense } from 'react';
import { HomePageClient } from '@/src/features/homepage/HomePageClient';
import { getHomepageData } from '@/lib/homepage-data';
import type { Metadata } from 'next';

/**
 * Homepage metadata for SEO
 */
export const metadata: Metadata = {
  title: 'The Urban Manual - Curated Guide to World\'s Best Hotels, Restaurants & Travel Destinations',
  description: 'Discover 897+ curated destinations worldwide. The Urban Manual is your AI-powered guide to the world\'s best hotels, restaurants, bars, cafes, and travel experiences.',
  keywords: ['travel guide', 'hotels', 'restaurants', 'travel destinations', 'michelin', 'luxury travel', 'city guide'],
  openGraph: {
    title: 'The Urban Manual - Curated Travel Guide',
    description: 'Discover 897+ curated destinations worldwide. Your AI-powered guide to the world\'s best hotels, restaurants, and travel experiences.',
    type: 'website',
    url: 'https://www.urbanmanual.co',
    siteName: 'The Urban Manual',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'The Urban Manual - Curated Travel Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Urban Manual - Curated Travel Guide',
    description: 'Discover 897+ curated destinations worldwide. Your AI-powered guide to the world\'s best hotels, restaurants, and travel experiences.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://www.urbanmanual.co',
  },
};

/**
 * Loading fallback for the homepage
 */
function HomePageSkeleton() {
  return (
    <main className="relative min-h-screen">
      {/* Hero skeleton */}
      <section className="min-h-[65vh] flex flex-col px-6 md:px-10 py-12 pb-8 md:pb-12">
        <div className="w-full flex md:justify-start flex-1 items-center">
          <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl">
            {/* Greeting skeleton */}
            <div className="space-y-4">
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-64 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
            </div>
            {/* Search skeleton */}
            <div className="mt-8 h-12 w-full bg-gray-100 dark:bg-gray-900 rounded-lg animate-pulse" />
            {/* City/Category filters skeleton */}
            <div className="mt-8 space-y-4">
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-4 w-16 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                ))}
              </div>
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-4 w-20 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Grid skeleton */}
      <div className="w-full px-6 md:px-10 mt-8">
        <div className="max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Homepage Server Component
 *
 * This is the main entry point for the homepage. It:
 * 1. Fetches initial data on the server (destinations, cities, categories)
 * 2. Passes the pre-fetched data to the client component
 * 3. Provides SEO-optimized metadata
 * 4. Uses Suspense for progressive loading
 *
 * Benefits of SSR:
 * - Faster Time to First Contentful Paint (FCP)
 * - Better SEO with server-rendered content
 * - Reduced client-side JavaScript execution on initial load
 * - Data is ready when the page hydrates
 */
export default async function HomePage() {
  // Fetch homepage data on the server
  const { destinations, cities, categories } = await getHomepageData();

  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomePageClient
        initialDestinations={destinations}
        initialCities={cities}
        initialCategories={categories}
      />
    </Suspense>
  );
}
