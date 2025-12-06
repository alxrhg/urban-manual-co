import { Suspense } from 'react';
import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import CategoryPageClient from './page-client';
import {
  generateCategoryMetadata,
  generateCategoryBreadcrumb,
  generateItemListSchema
} from '@/lib/metadata';
import { Destination } from '@/types/destination';
import SearchGridSkeleton from '@/src/features/search/SearchGridSkeleton';

// ISR: Revalidate every 10 minutes
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  return generateCategoryMetadata(category);
}

/**
 * Fetch destinations for a category on the server
 */
async function fetchCategoryDestinations(category: string): Promise<Destination[]> {
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('id, name, slug, city, category, image, content, michelin_stars, rating')
      .ilike('category', category)
      .order('name')
      .limit(50);

    if (error) {
      console.error('Error fetching category destinations:', error);
      return [];
    }
    return (data || []) as Destination[];
  } catch (error) {
    console.error('Error fetching category destinations:', error);
    return [];
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  // Fetch destinations on server for schema generation
  const destinations = await fetchCategoryDestinations(category);

  // Generate schemas
  const breadcrumb = generateCategoryBreadcrumb(category);
  const categoryName = decodeURIComponent(category)
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const itemList = destinations.length > 0
    ? generateItemListSchema(
        destinations.map(d => ({
          name: d.name,
          slug: d.slug,
          image: d.image,
          description: d.content,
        })),
        `Best ${categoryName}s Worldwide`,
        `https://www.urbanmanual.co/category/${encodeURIComponent(category)}`
      )
    : null;

  return (
    <>
      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumb),
        }}
      />

      {/* ItemList Schema for listing pages */}
      {itemList && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(itemList),
          }}
        />
      )}

      <Suspense fallback={<SearchGridSkeleton />}>
        <CategoryPageClient category={category} />
      </Suspense>
    </>
  );
}

