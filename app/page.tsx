import { Suspense } from 'react';
import { getHomepageDestinations, getFilterRows } from '@/server/services/homepage-loaders';
import { HomeClient } from '@/components/HomeClient';
import type { Destination } from '@/types/destination';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "The Urban Manual - Curated Guide to World's Best Hotels, Restaurants & Travel Destinations",
  description: "Discover handpicked luxury hotels, Michelin-starred restaurants, and hidden gems across 50+ cities worldwide. Your curated guide to exceptional travel experiences.",
  alternates: {
    canonical: 'https://www.urbanmanual.co',
  },
};

// Revalidate every 5 minutes for fresh content
export const revalidate = 300;

/**
 * Extract unique cities and categories from filter rows
 */
function extractFilterOptions(rows: Array<{ city: string | null; category: string | null }>) {
  const citySet = new Set<string>();
  const categoryLowerSet = new Set<string>();
  const categoryArray: string[] = [];

  rows.forEach(row => {
    const city = (row.city ?? '').toString().trim();
    const category = (row.category ?? '').toString().trim();

    if (city) {
      citySet.add(city);
    }
    if (category) {
      const categoryLower = category.toLowerCase();
      if (!categoryLowerSet.has(categoryLower)) {
        categoryLowerSet.add(categoryLower);
        categoryArray.push(category);
      }
    }
  });

  return {
    cities: Array.from(citySet).sort(),
    categories: categoryArray.sort(),
  };
}

/**
 * Homepage - Server Component that fetches initial data for SSR
 * Client-side interactivity is handled by HomeClient
 */
export default async function HomePage() {
  // Fetch initial data server-side for fast first paint
  let initialDestinations: Destination[] = [];
  let initialCities: string[] = [];
  let initialCategories: string[] = [];

  try {
    // Fetch destinations and filter data in parallel
    const [destinations, filterRows] = await Promise.all([
      getHomepageDestinations(200), // Initial batch for SSR
      getFilterRows(1000),
    ]);

    initialDestinations = destinations;

    // Extract unique cities and categories
    const { cities, categories } = extractFilterOptions(filterRows);
    initialCities = cities;
    initialCategories = categories;
  } catch (error) {
    // Log error but don't fail - page will still render with empty data
    console.error('[HomePage SSR] Error fetching initial data:', error);
  }

  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomeClient
        initialDestinations={initialDestinations}
        initialCities={initialCities}
        initialCategories={initialCategories}
      />
    </Suspense>
  );
}

/**
 * Loading skeleton for the homepage
 */
function HomePageSkeleton() {
  return (
    <div className="relative min-h-screen">
      {/* Hero Section Skeleton */}
      <section className="min-h-[65vh] flex flex-col px-6 md:px-10 py-12 pb-8 md:pb-12">
        <div className="w-full flex md:justify-start flex-1 items-center">
          <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl">
            <div className="h-12 w-3/4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-4" />
            <div className="h-6 w-1/2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
      </section>

      {/* Grid Skeleton */}
      <div className="px-6 md:px-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col">
              <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse mb-3" />
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-2" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
