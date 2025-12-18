import { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import DetailSkeleton from '@/src/features/detail/DetailSkeleton';

// Revalidate destination pages every hour for ISR
export const revalidate = 3600;
import {
  generateDestinationMetadata,
  generateDestinationSchema,
  generateDestinationBreadcrumb,
  generateDestinationFAQ
} from '@/lib/metadata';
import { Destination } from '@/types/destination';
import {
  getDestinationBySlug,
  getNestedDestinations,
  getParentDestination,
} from '@/lib/destinations';
import DestinationPageClient from './page-client';

// Validate and sanitize slug - more permissive to handle various slug formats
function validateSlug(slug: string): boolean {
  // Allow lowercase letters, numbers, hyphens, and underscores
  // Also handle URL-encoded slugs
  const decodedSlug = decodeURIComponent(slug);
  return /^[a-z0-9_-]+$/i.test(decodedSlug) && decodedSlug.length > 0;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Decode URL-encoded slug
  try {
    const decodedSlug = decodeURIComponent(slug);
    return generateDestinationMetadata(decodedSlug);
  } catch (error) {
    // If decoding fails, try with original slug
    return generateDestinationMetadata(slug);
  }
}

// Server component wrapper
export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Decode URL-encoded slug (handle both encoded and non-encoded slugs)
  let decodedSlug: string;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch (error) {
    // If decoding fails, use original slug (might not be URL-encoded)
    decodedSlug = slug;
  }

  // Validate slug format - more permissive
  if (!decodedSlug || decodedSlug.length === 0) {
    console.error('[Destination Page] Invalid slug:', slug);
    notFound();
  }

  // Fetch destination data using Sanity-first service with Supabase fallback
  const destination = await getDestinationBySlug(decodedSlug);

  // If destination not found, show 404
  if (!destination) {
    console.error('[Destination Page] Destination not found for slug:', decodedSlug);
    notFound();
  }

  // Load parent destination if this is a nested destination
  let parentDestination: Destination | null = null;
  if (destination.parent_destination_id) {
    parentDestination = await getParentDestination(destination.parent_destination_id);
  }

  // Load nested destinations if this is a parent
  let nestedDestinations: Destination[] = [];
  if (destination.slug) {
    nestedDestinations = await getNestedDestinations(destination.slug, destination.id);
  }

  // Generate structured data schemas
  const schema = generateDestinationSchema(destination as Destination);
  const breadcrumb = generateDestinationBreadcrumb(destination as Destination);
  const faq = generateDestinationFAQ(destination as Destination);

  return (
    <>
      {/* Add structured data (Schema.org JSON-LD) */}
      {/* JSON.stringify() already escapes all special characters - safe for script tags */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema),
        }}
      />

      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumb),
        }}
      />

      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faq),
        }}
      />

      {/* Render client component with server-fetched data */}
      <Suspense fallback={<DetailSkeleton />}>
        <DestinationPageClient 
          initialDestination={{
            ...(destination as Destination),
            nested_destinations: nestedDestinations,
          }}
          parentDestination={parentDestination}
        />
      </Suspense>
    </>
  );
}
