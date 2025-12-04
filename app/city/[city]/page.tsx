import { Suspense } from 'react';
import SearchGridSkeleton from '@/src/features/search/SearchGridSkeleton';
import { Metadata } from 'next';
import { generateCityMetadata, generateCityBreadcrumb } from '@/lib/metadata';
import CityPageClient from './page-client';
import { fetchCityDestinations, fetchCityStats } from '@/lib/data/fetch-destinations';
import { Destination } from '@/types/destination';

// Static generation with ISR
export const revalidate = 300; // 5 minutes
export const dynamicParams = true; // Allow dynamic cities not in generateStaticParams

/**
 * Pre-generate pages for top cities at build time
 * This ensures instant loading for popular destinations
 */
export async function generateStaticParams() {
  try {
    const cityStats = await fetchCityStats();
    // Pre-render top 20 cities by destination count
    return cityStats
      .slice(0, 20)
      .map((stat) => ({ city: stat.city }));
  } catch {
    // Fallback to popular cities if fetch fails
    return [
      { city: 'tokyo' },
      { city: 'london' },
      { city: 'new-york' },
      { city: 'paris' },
      { city: 'taipei' },
      { city: 'bangkok' },
      { city: 'singapore' },
      { city: 'hong-kong' },
    ];
  }
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  return generateCityMetadata(city);
}

/**
 * City Page - Highest Performance Architecture
 *
 * - Static generation for top 20 cities at build time
 * - ISR for other cities (generated on-demand, cached)
 * - Streaming with Suspense for dynamic content
 */
export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;

  // Fetch city destinations on the server
  const destinations = await fetchCityDestinations(city);

  // Extract unique categories from destinations with counts
  const categoryMap = new Map<string, number>();
  destinations.forEach(d => {
    if (d.category) {
      const categoryLower = d.category.toLowerCase();
      categoryMap.set(categoryLower, (categoryMap.get(categoryLower) || 0) + 1);
    }
  });

  // Only include categories with at least 2 destinations
  const categories = Array.from(categoryMap.entries())
    .filter(([_, count]) => count >= 2)
    .map(([category]) => category);

  // Extract category counts for breakdown display
  const categoryCounts: Record<string, number> = {};
  categoryMap.forEach((count, category) => {
    if (count >= 2) {
      categoryCounts[category] = count;
    }
  });

  // Extract unique neighborhoods from destinations
  const neighborhoodMap = new Map<string, number>();
  destinations.forEach(d => {
    if (d.neighborhood) {
      const neighborhood = d.neighborhood.trim();
      if (neighborhood) {
        neighborhoodMap.set(neighborhood, (neighborhoodMap.get(neighborhood) || 0) + 1);
      }
    }
  });

  // Only include neighborhoods with at least 2 destinations
  const neighborhoods = Array.from(neighborhoodMap.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([neighborhood]) => neighborhood);

  // Extract top picks - destinations with crown or michelin stars, high rating
  const topPicks: Destination[] = destinations
    .filter(d => d.crown || (d.michelin_stars && d.michelin_stars > 0) || (d.rating && d.rating >= 4.5))
    .sort((a, b) => {
      // Prioritize crown, then michelin stars, then rating
      if (a.crown && !b.crown) return -1;
      if (!a.crown && b.crown) return 1;
      const aStars = a.michelin_stars || 0;
      const bStars = b.michelin_stars || 0;
      if (aStars !== bStars) return bStars - aStars;
      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(0, 6); // Limit to 6 top picks

  // Generate breadcrumb schema
  const breadcrumb = generateCityBreadcrumb(city);

  return (
    <>
      {/* Breadcrumb Schema */}
      {breadcrumb && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumb),
          }}
        />
      )}

      <Suspense fallback={<SearchGridSkeleton />}>
        <CityPageClient
          initialDestinations={destinations}
          initialCategories={categories}
          initialNeighborhoods={neighborhoods}
          initialTopPicks={topPicks}
          initialCategoryCounts={categoryCounts}
        />
      </Suspense>
    </>
  );
}

