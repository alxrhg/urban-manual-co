'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Sparkles, Star, Tag } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import { PageIntro } from '@/components/PageIntro';
import { PageContainer } from '@/components/PageContainer';
import { CARD_MEDIA, CARD_META, CARD_TITLE, CARD_WRAPPER } from '@/components/CardStyles';
import { RelatedDestinations } from '@/src/features/detail/RelatedDestinations';
import { trackEvent } from '@/lib/analytics/track';

interface Recommendation {
  slug: string;
  name: string;
  city: string;
  category: string;
  image?: string;
  michelin_stars?: number;
  crown?: boolean;
  rating?: number;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatLabel(value: string): string {
  return value
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function DestinationPageClient() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    fetchDestination();
  }, [slug]);

  // Track destination view
  useEffect(() => {
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
    }
  }, [destination]);

  useEffect(() => {
    if (destination) {
      loadRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [destination]);

  const fetchDestination = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      setDestination(data);
    } catch (err) {
      console.error('Error fetching destination:', err);
      setDestination(null);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    if (!destination) return;

    setLoadingRecommendations(true);
    try {
      let response = await fetch(`/api/recommendations?limit=6`);

      if (response.status === 401) {
        response = await fetch(`/api/related-destinations?slug=${destination.slug}&limit=6`);

        if (response.ok) {
          const data = await response.json();
          setRecommendations(
            (data.related || []).map((dest: any) => ({
              slug: dest.slug,
              name: dest.name,
              city: dest.city,
              category: dest.category,
              image: dest.image,
              michelin_stars: dest.michelin_stars,
              crown: dest.crown,
              rating: dest.rating,
            }))
          );
          return;
        }

        response = await fetch(`/api/recommendations?slug=${destination.slug}&limit=6`);
      }

      if (!response.ok && response.status === 404) {
        const relatedResponse = await fetch(`/api/related-destinations?slug=${destination.slug}&limit=6`);
        if (relatedResponse.ok) {
          const data = await relatedResponse.json();
          setRecommendations(
            (data.related || []).map((dest: any) => ({
              slug: dest.slug,
              name: dest.name,
              city: dest.city,
              category: dest.category,
              image: dest.image,
              michelin_stars: dest.michelin_stars,
              crown: dest.crown,
              rating: dest.rating,
            }))
          );
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.recommendations && Array.isArray(data.recommendations)) {
        setRecommendations(
          data.recommendations
            .map((rec: any) => rec.destination)
            .filter(Boolean)
            .slice(0, 6)
        );
      } else if (data.recommendations && Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations);
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      console.log('Recommendations not available:', err);
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="pb-16">
        <PageIntro title="Destination not found" description="We couldn't locate that destination in the manual." />
        <PageContainer className="flex justify-center">
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-black text-white dark:bg-white dark:text-black rounded-full text-sm font-medium transition-opacity hover:opacity-80"
          >
            Return to catalogue
          </button>
        </PageContainer>
      </div>
    );
  }

  const cityName = capitalizeCity(destination.city);
  const eyebrow = destination.country ? `${cityName}, ${destination.country}` : cityName;
  const metaDescription = [
    destination.category ? formatLabel(destination.category) : null,
    destination.michelin_stars
      ? `${destination.michelin_stars} Michelin Star${destination.michelin_stars === 1 ? '' : 's'}`
      : null,
    destination.rating ? `${Number(destination.rating).toFixed(1)} rating` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="pb-16">
      <PageIntro
        eyebrow={eyebrow}
        title={destination.name}
        description={metaDescription || destination.description || undefined}
        actions={
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={() => router.push(`/city/${encodeURIComponent(destination.city)}`)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white dark:bg-white dark:text-black rounded-full transition-opacity hover:opacity-80"
            >
              Explore {cityName}
            </button>
          </div>
        }
      />

      <PageContainer className="space-y-12">
        {destination.image && (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[32px] border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
            <Image
              src={destination.image}
              alt={`${destination.name} - ${destination.category} in ${destination.city}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              className="object-cover"
              quality={85}
              priority
            />
          </div>
        )}

        <section className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push(`/city/${encodeURIComponent(destination.city)}`)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-black transition-colors"
          >
            <MapPin className="h-4 w-4" />
            {cityName}
          </button>

          {destination.category && (
            <span className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
              <Tag className="h-4 w-4" />
              {formatLabel(destination.category)}
            </span>
          )}

          {destination.michelin_stars && destination.michelin_stars > 0 && (
            <span className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
              <Image
                src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                alt="Michelin star"
                width={16}
                height={16}
                className="h-4 w-4"
              />
              {destination.michelin_stars} Michelin {destination.michelin_stars === 1 ? 'Star' : 'Stars'}
            </span>
          )}

          {destination.rating && (
            <span className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
              <Star className="h-4 w-4" />
              {Number(destination.rating).toFixed(1)} rating
            </span>
          )}
        </section>

        {destination.content && (
          <section className="rounded-[32px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/70 px-8 py-8">
            <h2 className="text-xl font-semibold mb-4">About</h2>
            <div className="text-base leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {stripHtmlTags(destination.content)}
            </div>
          </section>
        )}

        {(loadingRecommendations || recommendations.length > 0) && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-semibold">Similar Destinations</h2>
            </div>

            {loadingRecommendations ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="aspect-square rounded-2xl bg-gray-200 dark:bg-gray-800" />
                    <div className="h-3 rounded bg-gray-200 dark:bg-gray-800 w-3/4" />
                    <div className="h-3 rounded bg-gray-200 dark:bg-gray-800 w-1/2" />
                  </div>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-gray-300 dark:border-gray-700 px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                No related destinations to show just yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {recommendations.map(rec => (
                  <button
                    key={rec.slug}
                    onClick={() => {
                      trackEvent({
                        event_type: 'click',
                        destination_slug: rec.slug,
                        metadata: {
                          source: 'destination_detail_recommendations',
                          category: rec.category,
                          city: rec.city,
                        },
                      });
                      router.push(`/destination/${rec.slug}`);
                    }}
                    className={`${CARD_WRAPPER} text-left transition-transform duration-300 hover:-translate-y-1`}
                  >
                    <div className={`${CARD_MEDIA} mb-2`}>
                      {rec.image ? (
                        <Image
                          src={rec.image}
                          alt={`${rec.name} - ${rec.category} in ${rec.city}`}
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          quality={75}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                          <MapPin className="h-10 w-10 opacity-20" />
                        </div>
                      )}

                      {rec.michelin_stars && rec.michelin_stars > 0 && (
                        <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                          <Image
                            src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                            alt="Michelin star"
                            width={12}
                            height={12}
                            className="h-3 w-3"
                          />
                          <span>{rec.michelin_stars}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className={CARD_TITLE} role="heading" aria-level={3}>
                        {rec.name}
                      </div>
                      <div className={CARD_META}>
                        <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                          {capitalizeCity(rec.city)}
                        </span>
                        {rec.category && (
                          <>
                            <span className="text-gray-300 dark:text-gray-700">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-500 line-clamp-1">
                              {formatLabel(rec.category)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Related Destinations (Similar Vibe & Pair With) */}
        {destination?.id && (
          <RelatedDestinations destinationId={String(destination.id)} />
        )}

        <div className="flex flex-wrap gap-3 pt-4">
          <button
            onClick={() => router.push('/')}
            className="flex-1 min-w-[160px] px-6 py-3 text-sm border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            Back to catalogue
          </button>
          <button
            onClick={() => router.push(`/city/${encodeURIComponent(destination.city)}`)}
            className="flex-1 min-w-[160px] px-6 py-3 text-sm bg-black text-white dark:bg-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity font-medium"
          >
            Explore {cityName}
          </button>
        </div>
      </PageContainer>
    </div>
  );
}
