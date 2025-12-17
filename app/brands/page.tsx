import { Suspense } from 'react';
import { Metadata } from 'next';
import BrandsPageClient from './page-client';
import { fetchBrandStats } from '@/lib/data/fetch-destinations';
import SearchGridSkeleton from '@/src/features/search/SearchGridSkeleton';
import { ErrorState } from '@/ui/empty-state';
import {
  generateBrandsListBreadcrumb,
  generateBrandsCollectionSchema
} from '@/lib/metadata';

/**
 * Brands Page - Highest Performance Architecture
 *
 * - Static generation at build time
 * - ISR every 10 minutes for fresh data
 * - Streaming with Suspense for instant shell
 */

// ISR: Revalidate every 10 minutes
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'Discover Brands - Urban Manual',
  description:
    'Explore curated travel destinations by brand. Find the best hotels, restaurants, and experiences from world-renowned brands.',
  openGraph: {
    title: 'Discover Brands - Urban Manual',
    description:
      'Explore curated travel destinations by brand. Find the best hotels, restaurants, and experiences from world-renowned brands.',
    url: 'https://www.urbanmanual.co/brands',
    siteName: 'Urban Manual',
    type: 'website',
  },
};

/**
 * Inline skeleton - renders as static shell
 */
function BrandsSkeleton() {
  return (
    <main className="w-full px-6 md:px-10 py-20 min-h-screen">
      <div className="mb-12">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-32 bg-gray-100 dark:bg-gray-900 rounded animate-pulse" />
      </div>

      {/* Featured brands skeleton */}
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
async function BrandsContent() {
  try {
    const brandStats = await fetchBrandStats();
    const categories: string[] = Array.from(
      new Set(brandStats.flatMap((s: { categories: string[] }) => s.categories).filter(Boolean))
    ).sort();

    // Generate schema for SEO
    const collectionSchema = generateBrandsCollectionSchema(brandStats);

    return (
      <>
        {/* CollectionPage Schema with ItemList */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(collectionSchema),
          }}
        />
        <BrandsPageClient
          initialBrandStats={brandStats}
          initialCategories={categories}
        />
      </>
    );
  } catch (error) {
    console.error('Failed to fetch brand stats:', error);
    return (
      <main className="w-full px-6 md:px-10 py-20 min-h-screen">
        <ErrorState
          variant="fullpage"
          title="Unable to load brands"
          description="We couldn't load the brands data. Please try refreshing the page."
        />
      </main>
    );
  }
}

export default function BrandsPage() {
  // Generate breadcrumb schema
  const breadcrumb = generateBrandsListBreadcrumb();

  return (
    <>
      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumb),
        }}
      />
      <Suspense fallback={<BrandsSkeleton />}>
        <BrandsContent />
      </Suspense>
    </>
  );
}
