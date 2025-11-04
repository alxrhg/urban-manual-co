'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import { CARD_MEDIA, CARD_TITLE, CARD_WRAPPER } from '@/components/CardStyles';
import { trackEvent } from '@/lib/analytics/track';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

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
  const { addToRecentlyViewed } = useRecentlyViewed();

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

      // Add to recently viewed
      addToRecentlyViewed({
        slug: destination.slug,
        name: destination.name,
        city: destination.city,
        image: destination.image || '',
        category: destination.category
      });
    }
  }, [destination, addToRecentlyViewed]);

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

      // Handle 401/403 gracefully - user not authenticated
      if (response.status === 401 || response.status === 403) {
        try {
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
          } else {
            setRecommendations([]);
          }
        } catch {
          setRecommendations([]);
        }
        setLoadingRecommendations(false);
        return;
      }

      if (!response.ok) {
        try {
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
          } else {
            setRecommendations([]);
          }
        } catch {
          setRecommendations([]);
        }
        setLoadingRecommendations(false);
        return;
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
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  if (loading) {
    return (
      <main className="px-6 md:px-10 py-20">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </main>
    );
  }

  if (!destination) {
    return (
      <main className="px-6 md:px-10 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-light mb-4">Destination not found</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            We couldn't locate that destination in the manual.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-black text-white dark:bg-white dark:text-black text-xs font-medium rounded-sm hover:opacity-80 transition-opacity"
          >
            Return to catalogue
          </button>
        </div>
      </main>
    );
  }

  const cityName = capitalizeCity(destination.city);

  return (
    <main className="px-6 md:px-10 py-20 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>

          <div className="space-y-3">
            {/* Location */}
            <p className="text-xs text-gray-500">
              {destination.country ? `${cityName}, ${destination.country}` : cityName}
            </p>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-light leading-tight">
              {destination.name}
            </h1>

            {/* Meta badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              {destination.category && (
                <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400">
                  {formatLabel(destination.category)}
                </span>
              )}
              {destination.michelin_stars && destination.michelin_stars > 0 && (
                <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  <span>⭐</span>
                  {destination.michelin_stars} Michelin {destination.michelin_stars === 1 ? 'Star' : 'Stars'}
                </span>
              )}
              {destination.crown && (
                <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                  👑 Crown
                </span>
              )}
              {destination.rating && (
                <span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400">
                  {Number(destination.rating).toFixed(1)} ★
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Image */}
        {destination.image && (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
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

        {/* About */}
        {destination.content && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
            <h2 className="text-sm font-medium mb-4">About</h2>
            <div className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {stripHtmlTags(destination.content)}
            </div>
          </div>
        )}

        {/* Similar Destinations */}
        {(loadingRecommendations || recommendations.length > 0) && (
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
            <h2 className="text-sm font-medium mb-6">Similar Destinations</h2>

            {loadingRecommendations ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    <div className="h-3 rounded bg-gray-100 dark:bg-gray-800 w-3/4 animate-pulse" />
                    <div className="h-2 rounded bg-gray-100 dark:bg-gray-800 w-1/2 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400">
                No similar destinations found
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
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
                    className={`${CARD_WRAPPER} text-left group`}
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
                        <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                          ⭐ {rec.michelin_stars}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className={CARD_TITLE}>
                        {rec.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {capitalizeCity(rec.city)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => router.push('/')}
            className="flex-1 min-w-[160px] px-6 py-2 text-xs font-medium border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            Back to catalogue
          </button>
          <button
            onClick={() => router.push(`/city/${encodeURIComponent(destination.city)}`)}
            className="flex-1 min-w-[160px] px-6 py-2 text-xs font-medium bg-black text-white dark:bg-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity"
          >
            Explore {cityName}
          </button>
        </div>
      </div>
    </main>
  );
}
