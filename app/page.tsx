import { Suspense } from 'react';
import { HomeClient } from '@/src/features/home/HomeClient';
import { HomeSkeleton } from '@/src/features/home/HomeSkeleton';
import { getHomepageData } from '@/src/features/home/home-data';

/**
 * Homepage - Server Component
 *
 * Performance optimizations:
 * 1. Server-side data fetching (eliminates client waterfall)
 * 2. Streaming with Suspense for progressive rendering
 * 3. Data cached via React cache() for request deduplication
 * 4. Static shell renders instantly while data streams in
 *
 * Previous architecture issues:
 * - 3,559-line client component
 * - 6+ sequential API calls on mount (waterfall)
 * - 20+ useState hooks causing re-renders
 * - No server-side rendering, poor SEO
 *
 * New architecture:
 * - Server component fetches data in parallel
 * - Client component receives pre-fetched data via props
 * - Suspense enables streaming for progressive rendering
 * - Skeleton provides immediate visual feedback
 */

// Dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  // Fetch all homepage data server-side in parallel
  // This eliminates the client-side waterfall of sequential API calls
  const { destinations, cities, categories } = await getHomepageData();

  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeClient
        initialDestinations={destinations}
        initialCities={cities}
        initialCategories={categories}
      />
    </Suspense>
  );
}
