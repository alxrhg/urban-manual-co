import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListDetailPageClient from './page-client';
import {
  fetchListSeoData,
  generateItemListJsonLd,
  generateListMetadata,
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
  return generateListMetadata(id);
}

export default async function ListDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = await params;
  const payload = await fetchListSeoData(id);

  if (payload.status === 'not_found') {
    notFound();
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://www.urbanmanual.co';

  const isAccessible = payload.status === 'ok' && payload.list;
  const orderedSlugs = payload.items
    .map(item => item.destination_slug)
    .filter((slug): slug is string => Boolean(slug));

  const jsonLd =
    isAccessible && orderedSlugs.length
      ? generateItemListJsonLd({
          name: payload.list!.name,
          description: payload.list!.description,
          url: `${siteUrl}/lists/${payload.list!.id}`,
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

      <ListDetailPageClient
        initialList={isAccessible ? payload.list : null}
        initialDestinations={isAccessible ? payload.destinations : []}
      />
    </>
  );
}
