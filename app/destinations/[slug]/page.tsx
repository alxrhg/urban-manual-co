import { Suspense } from 'react';
import SearchGridSkeleton from '@/src/features/search/SearchGridSkeleton';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  generateCategoryCityMetadata,
  generateCategoryCityBreadcrumb,
  generateCategoryCitySchema,
} from '@/lib/metadata';
import CategoryCityPageClient from './page-client';
import {
  fetchCategoryCityDestinations,
  fetchCategoryCityPairs,
} from '@/lib/data/fetch-destinations';

// Static generation with ISR
export const revalidate = 300; // 5 minutes
export const dynamicParams = true; // Allow dynamic slugs not in generateStaticParams

/**
 * Parse the slug into category and city components
 * Expected format: "category-city" (e.g., "restaurants-tokyo", "hotels-new-york")
 */
function parseSlug(slug: string): { category: string; city: string } | null {
  const decoded = decodeURIComponent(slug).toLowerCase();

  // Known category prefixes (singular and plural forms)
  const categoryPrefixes = [
    'restaurants',
    'restaurant',
    'hotels',
    'hotel',
    'cafes',
    'cafe',
    'bars',
    'bar',
    'shops',
    'shop',
    'museums',
    'museum',
  ];

  // Find which category prefix the slug starts with
  for (const prefix of categoryPrefixes) {
    if (decoded.startsWith(`${prefix}-`)) {
      const city = decoded.slice(prefix.length + 1);
      if (city.length > 0) {
        // Normalize to singular form for database query
        const normalizedCategory = prefix.endsWith('s') && !prefix.endsWith('es')
          ? prefix.slice(0, -1)
          : prefix.replace(/ies$/, 'y').replace(/es$/, '');
        return { category: normalizedCategory, city };
      }
    }
  }

  return null;
}

/**
 * Pre-generate pages for top category-city combinations at build time
 * This ensures instant loading for popular searches like "restaurants-tokyo"
 */
export async function generateStaticParams() {
  try {
    const pairs = await fetchCategoryCityPairs();
    // Pre-render top 50 combinations by count
    return pairs.slice(0, 50).map((pair) => ({
      slug: `${pair.category}-${pair.city}`,
    }));
  } catch {
    // Fallback to popular combinations if fetch fails
    return [
      { slug: 'restaurants-tokyo' },
      { slug: 'hotels-tokyo' },
      { slug: 'restaurants-london' },
      { slug: 'hotels-london' },
      { slug: 'restaurants-new-york' },
      { slug: 'hotels-new-york' },
      { slug: 'restaurants-paris' },
      { slug: 'hotels-paris' },
      { slug: 'cafes-tokyo' },
      { slug: 'bars-london' },
    ];
  }
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseSlug(slug);

  if (!parsed) {
    return {
      title: 'Destinations | The Urban Manual',
      description: 'Discover curated travel destinations worldwide.',
    };
  }

  // Fetch destinations to get count
  const destinations = await fetchCategoryCityDestinations(parsed.category, parsed.city);

  return generateCategoryCityMetadata(parsed.category, parsed.city, destinations.length);
}

/**
 * Category-City Page - SEO-optimized destination listings
 *
 * Examples:
 * - /destinations/restaurants-tokyo - Best restaurants in Tokyo
 * - /destinations/hotels-london - Best hotels in London
 * - /destinations/cafes-paris - Best cafes in Paris
 *
 * Features:
 * - Static generation for top combinations at build time
 * - ISR for other combinations (generated on-demand, cached)
 * - Rich structured data (JSON-LD) for search engines
 * - Streaming with Suspense for dynamic content
 */
export default async function CategoryCityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parsed = parseSlug(slug);

  // If we can't parse the slug, show 404
  if (!parsed) {
    notFound();
  }

  const { category, city } = parsed;

  // Fetch destinations for this category-city combination
  const destinations = await fetchCategoryCityDestinations(category, city);

  // If no destinations found, show 404
  if (destinations.length === 0) {
    notFound();
  }

  // Generate structured data schemas
  const breadcrumb = generateCategoryCityBreadcrumb(category, city);
  const itemListSchema = generateCategoryCitySchema(category, city, destinations);

  return (
    <>
      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumb),
        }}
      />

      {/* ItemList Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListSchema),
        }}
      />

      <Suspense fallback={<SearchGridSkeleton />}>
        <CategoryCityPageClient
          initialDestinations={destinations}
          category={category}
          city={city}
        />
      </Suspense>
    </>
  );
}
