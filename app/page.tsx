import { HomeClient } from '@/src/features/home/HomeClient';
import { getHomepageData } from '@/src/features/home/home-data';

/**
 * Homepage - Server Component
 *
 * Performance optimizations:
 * 1. Server-side data fetching (eliminates client waterfall)
 * 2. Data fetched in parallel before render
 * 3. Client component receives pre-fetched data via props
 *
 * Note: No Suspense wrapper needed here since we await getHomepageData()
 * before rendering. The data is already available when HomeClient renders.
 */

// Dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  // Fetch all homepage data server-side in parallel
  // This eliminates the client-side waterfall of sequential API calls
  const { destinations, cities, categories } = await getHomepageData();

  return (
    <HomeClient
      initialDestinations={destinations}
      initialCities={cities}
      initialCategories={categories}
    />
  );
}
