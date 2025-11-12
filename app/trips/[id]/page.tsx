import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TripDetailPageClient from './page-client';
import {
  fetchTripSeoData,
  generateTripJsonLd,
  generateTripMetadata,
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
  return generateTripMetadata(id);
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = await params;
  const payload = await fetchTripSeoData(id);

  if (payload.status === 'not_found') {
    notFound();
  }

  const isAccessible = payload.status === 'ok' && payload.trip;
  const jsonLd =
    isAccessible
      ? generateTripJsonLd({
          trip: payload.trip!,
          itineraryItems: payload.itineraryItems,
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

      <TripDetailPageClient
        initialTrip={isAccessible ? payload.trip : null}
        initialItineraryItems={isAccessible ? payload.itineraryItems : []}
        initialDestinations={isAccessible ? payload.destinations : []}
      />
    </>
  );
}
