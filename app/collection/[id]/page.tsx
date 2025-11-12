import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CollectionDetailPageClient from './page-client';
import {
  fetchCollectionSeoData,
  generateCollectionMetadata,
  generateItemListJsonLd,
} from '@/lib/metadata';

interface PageParams {
  id: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { id } = await params;
  return generateCollectionMetadata(id);
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = await params;
  const payload = await fetchCollectionSeoData(id);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://www.urbanmanual.co';

  if (payload.status === 'not_found') {
    notFound();
  }

  const isAccessible = payload.status === 'ok' && payload.collection;
  const orderedSlugs = payload.items
    .map(item => item.destination_slug)
    .filter((slug): slug is string => Boolean(slug));

  const jsonLd =
    isAccessible && orderedSlugs.length
      ? generateItemListJsonLd({
          name: payload.collection!.name,
          description: payload.collection!.description,
          url: `${siteUrl}/collection/${payload.collection!.id}`,
          orderedSlugs,
          destinations: payload.destinations,
        })
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <CollectionDetailPageClient
        initialCollection={isAccessible ? payload.collection : null}
        initialDestinations={isAccessible ? payload.destinations : []}
        initialIsOwner={payload.isOwner}
      />
    </>
  );
}
