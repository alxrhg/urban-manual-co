import { Suspense } from 'react';
import SearchGridSkeleton from '@/components/search/SearchGridSkeleton';
import { Metadata } from 'next';
import { generateCityMetadata, generateCityBreadcrumb } from '@/lib/metadata';
import CityPageClient from './page-client';
import { fetchCityDestinations, fetchCityStats } from '@/lib/data/fetch-destinations';

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

  // Extract unique categories from destinations
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
        />
      </Suspense>
    </>
  );
}

