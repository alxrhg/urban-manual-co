'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Tag, Building2, Star } from 'lucide-react';

import { Destination } from '@/types/destination';
import { trackEvent } from '@/lib/analytics/track';
import { useAuth } from '@/contexts/AuthContext';
import { useSequenceTracker } from '@/hooks/useSequenceTracker';
import { PRICE_LEVEL, MICHELIN } from '@/lib/constants';

// New redesigned components
import { HeroImageGallery } from '@/components/destination/HeroImageGallery';
import { WhyWeLoveIt } from '@/components/destination/WhyWeLoveIt';
import { ReviewsSummary } from '@/components/destination/ReviewsSummary';
import { SimilarPlacesCarousel } from '@/components/destination/SimilarPlacesCarousel';
import { StickyActionBar } from '@/components/destination/StickyActionBar';
import { StructuredInfo } from '@/components/destination/StructuredInfo';

// Existing components
import { LocatedInBadge, NestedDestinations } from '@/components/NestedDestinations';
import { ArchitectDesignInfo } from '@/components/ArchitectDesignInfo';
import { HorizontalDestinationCard } from '@/components/HorizontalDestinationCard';

import type { SimilarDestination } from './page';

interface DestinationPageClientProps {
  initialDestination: Destination;
  parentDestination?: Destination | null;
  initialSimilarDestinations?: SimilarDestination[];
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatLabel(value: string): string {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function DestinationPageClient({
  initialDestination,
  parentDestination,
  initialSimilarDestinations = [],
}: DestinationPageClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { trackAction } = useSequenceTracker();

  const [destination] = useState<Destination>(initialDestination);
  const [similarDestinations] = useState<SimilarDestination[]>(initialSimilarDestinations);

  // Parse enriched JSON fields from initial destination
  const enrichedData = useState(() => {
    const enriched: any = { ...initialDestination };

    if (initialDestination.opening_hours_json) {
      try {
        enriched.opening_hours =
          typeof initialDestination.opening_hours_json === 'string'
            ? JSON.parse(initialDestination.opening_hours_json)
            : initialDestination.opening_hours_json;
      } catch {
        // Ignore parse errors
      }
    }

    if (initialDestination.reviews_json) {
      try {
        enriched.reviews =
          typeof initialDestination.reviews_json === 'string'
            ? JSON.parse(initialDestination.reviews_json)
            : initialDestination.reviews_json;
      } catch {
        // Ignore parse errors
      }
    }

    if (initialDestination.photos_json) {
      try {
        enriched.photos =
          typeof initialDestination.photos_json === 'string'
            ? JSON.parse(initialDestination.photos_json)
            : initialDestination.photos_json;
      } catch {
        // Ignore parse errors
      }
    }

    return enriched;
  })[0];

  // Track destination view
  useEffect(() => {
    if (destination?.id && user?.id) {
      // Track view event to Discovery Engine for personalization
      fetch('/api/discovery/track-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          eventType: 'view',
          documentId: destination.slug,
        }),
      }).catch(() => {});
    }

    if (destination?.id) {
      trackEvent({
        event_type: 'view',
        destination_id: destination.id,
        destination_slug: destination.slug,
        metadata: {
          category: destination.category,
          city: destination.city,
        },
      });

      // Track for sequence prediction
      trackAction({
        type: 'view',
        destination_id: destination.id,
        destination_slug: destination.slug,
      });
    }
  }, [destination, trackAction, user?.id]);

  // Guard clause - ensure destination exists
  if (!destination) {
    return (
      <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
        <div className="text-center py-20">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading destination...</p>
        </div>
      </main>
    );
  }

  const cityName = capitalizeCity(destination.city || '');

  return (
    <>
      <main className="w-full min-h-screen pb-24">
        {/* Max width container */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <div className="py-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          {/* Hero Image Gallery */}
          <section className="mb-8">
            <HeroImageGallery
              mainImage={destination.image}
              photos={enrichedData.photos}
              destinationName={destination.name}
              category={destination.category}
              city={cityName}
            />
          </section>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Main Content - 2 columns */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header Section */}
              <header>
                {/* Location breadcrumb */}
                <a
                  href={`/city/${destination.city}`}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3"
                >
                  <MapPin className="w-4 h-4" />
                  {destination.neighborhood && <span>{destination.neighborhood} · </span>}
                  {destination.country ? `${cityName}, ${destination.country}` : cityName}
                </a>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  {destination.name}
                </h1>

                {/* Meta badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Parent destination badge */}
                  {parentDestination && (
                    <LocatedInBadge
                      parent={parentDestination}
                      onClick={() => router.push(`/destination/${parentDestination.slug}`)}
                    />
                  )}

                  {/* Category */}
                  {destination.category && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <Tag className="w-3 h-3" />
                      {formatLabel(destination.category)}
                    </span>
                  )}

                  {/* Brand */}
                  {destination.brand && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <Building2 className="w-3 h-3" />
                      {destination.brand}
                    </span>
                  )}

                  {/* Michelin stars */}
                  {destination.michelin_stars && destination.michelin_stars > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-full">
                      <Image
                        src={MICHELIN.ICON_URL}
                        alt="Michelin star"
                        width={14}
                        height={14}
                        className="w-3.5 h-3.5"
                        onError={(e) => {
                          e.currentTarget.src = MICHELIN.ICON_URL_FALLBACK;
                        }}
                      />
                      {destination.michelin_stars} Michelin{' '}
                      {destination.michelin_stars === 1 ? 'Star' : 'Stars'}
                    </span>
                  )}

                  {/* Crown */}
                  {destination.crown && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-full">
                      Crown
                    </span>
                  )}

                  {/* Rating */}
                  {(enrichedData?.rating || destination.rating) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {(enrichedData?.rating || destination.rating)?.toFixed(1)}
                      {enrichedData?.user_ratings_total && (
                        <span className="text-gray-400">
                          ({enrichedData.user_ratings_total.toLocaleString()})
                        </span>
                      )}
                    </span>
                  )}

                  {/* Price level */}
                  {(enrichedData?.price_level || destination.price_level) && (
                    <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full">
                      {
                        PRICE_LEVEL.LABELS[
                          (enrichedData?.price_level ||
                            destination.price_level) as keyof typeof PRICE_LEVEL.LABELS
                        ]
                      }
                    </span>
                  )}
                </div>

                {/* Parent destination card */}
                {parentDestination && (
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                      Located inside
                    </p>
                    <HorizontalDestinationCard
                      destination={parentDestination}
                      onClick={() => router.push(`/destination/${parentDestination.slug}`)}
                      showBadges={true}
                    />
                  </div>
                )}
              </header>

              {/* Why We Love It - Editorial Section */}
              <WhyWeLoveIt
                content={destination.content}
                microDescription={destination.micro_description}
                editorialSummary={destination.editorial_summary}
                designStory={destination.design_story}
                architecturalSignificance={destination.architectural_significance}
              />

              {/* Architecture & Design Info */}
              <ArchitectDesignInfo destination={destination} />

              {/* Nested Destinations */}
              {destination.nested_destinations && destination.nested_destinations.length > 0 && (
                <section>
                  <NestedDestinations
                    destinations={destination.nested_destinations}
                    parentName={destination.name}
                    onDestinationClick={(nested) => router.push(`/destination/${nested.slug}`)}
                  />
                </section>
              )}

              {/* Reviews Summary with Sentiment */}
              <ReviewsSummary
                reviews={enrichedData?.reviews}
                rating={enrichedData?.rating || destination.rating}
                userRatingsTotal={enrichedData?.user_ratings_total}
                destinationId={destination.id}
              />
            </div>

            {/* Sidebar - 1 column */}
            <aside className="space-y-6">
              {/* Structured Info Card */}
              <StructuredInfo
                address={enrichedData?.formatted_address || destination.formatted_address}
                vicinity={enrichedData?.vicinity}
                phone={enrichedData?.international_phone_number || destination.phone_number}
                website={enrichedData?.website || destination.website}
                instagramUrl={destination.instagram_url}
                priceLevel={enrichedData?.price_level || destination.price_level}
                openingHours={enrichedData?.opening_hours}
                latitude={destination.latitude}
                longitude={destination.longitude}
                bookingUrl={destination.booking_url}
                resyUrl={destination.resy_url}
                opentableUrl={destination.opentable_url}
              />

              {/* Map preview */}
              {destination.latitude && destination.longitude && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative aspect-[4/3] bg-gray-100 dark:bg-gray-800"
                  >
                    <Image
                      src={`https://maps.googleapis.com/maps/api/staticmap?center=${destination.latitude},${destination.longitude}&zoom=15&size=400x300&markers=color:red%7C${destination.latitude},${destination.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                      alt={`Map showing ${destination.name}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 400px"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors">
                      <span className="sr-only">View on Google Maps</span>
                    </div>
                  </a>
                </div>
              )}
            </aside>
          </div>

          {/* Similar Places Carousel - Full width */}
          {similarDestinations.length > 0 && (
            <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
              <SimilarPlacesCarousel
                places={similarDestinations}
                title="Similar Places You Might Like"
                sourceSlug={destination.slug}
              />
            </section>
          )}
        </div>
      </main>

      {/* Sticky Action Bar */}
      <StickyActionBar
        destinationId={destination.id}
        destinationSlug={destination.slug}
        destinationName={destination.name}
        destinationCity={cityName}
        latitude={destination.latitude}
        longitude={destination.longitude}
      />
    </>
  );
}
