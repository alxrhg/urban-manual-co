import { Suspense } from 'react';
import SearchGridSkeleton from '@/src/features/search/SearchGridSkeleton';
import { Metadata } from 'next';
import { generateCityMetadata, generateCityBreadcrumb } from '@/lib/metadata';
import CityPageClient from './page-client';
import { fetchCityDestinations } from '@/lib/data/fetch-destinations';

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
 * City Page - Server Component Wrapper
 *
 * Fetches city destinations on the server for faster initial load.
 * Data is cached for 5 minutes using Next.js unstable_cache.
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

