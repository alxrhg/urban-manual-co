import { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import DetailSkeleton from '@/src/features/detail/DetailSkeleton';
import DetailErrorState from '@/src/features/detail/DetailErrorState';
import { getDestinationDetail } from '@/src/features/detail/data';
import {
  generateDestinationMetadata,
  generateDestinationSchema,
  generateDestinationBreadcrumb,
  generateDestinationFAQ
} from '@/lib/metadata';
import { Destination } from '@/types/destination';
import DestinationPageClient from './page-client';

// Validate and sanitize slug
function validateSlug(slug: string): boolean {
  // Slug should only contain lowercase letters, numbers, and hyphens
  return /^[a-z0-9-]+$/.test(slug);
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Validate slug format
  if (!validateSlug(slug)) {
    return {};
  }

  return generateDestinationMetadata(slug);
}

// Server component wrapper
export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Validate slug format
  if (!validateSlug(slug)) {
    notFound();
  }

  const detailPayload = await getDestinationDetail(slug);

  if (detailPayload.status === 'not-found') {
    notFound();
  }

  if (detailPayload.status === 'error' || !detailPayload.destination) {
    return <DetailErrorState slug={slug} issues={detailPayload.issues} />;
  }

  // Generate structured data schemas
  const schema = generateDestinationSchema(detailPayload.destination as Destination);
  const breadcrumb = generateDestinationBreadcrumb(detailPayload.destination as Destination);
  const faq = generateDestinationFAQ(detailPayload.destination as Destination);

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
            ...(detailPayload.destination as Destination),
            nested_destinations: detailPayload.nestedDestinations,
          }}
          parentDestination={detailPayload.parentDestination}
        />
      </Suspense>
    </>
  );
}
