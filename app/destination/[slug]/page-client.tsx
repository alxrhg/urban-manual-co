'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { MapPin, Star, ArrowLeft, Tag, Sparkles } from 'lucide-react';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import Image from 'next/image';
import { ProvenanceRibbon } from '@/components/ProvenanceRibbon';
import { DestinationCard } from '@/components/DestinationCard';
import { getCityTheme } from '@/lib/design';

interface Recommendation {
  slug: string;
  name: string;
  city: string;
  category: string;
  image?: string;
  michelin_stars?: number;
  rating?: number;
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

  useEffect(() => {
    if (destination) {
      loadRecommendations();
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
    } catch (error) {
      console.error('Error fetching destination:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    if (!destination) return;

    setLoadingRecommendations(true);
    try {
      // Try personalized recommendations first (for authenticated users)
      let response = await fetch(`/api/recommendations?limit=6`);

      // If 401 (unauthorized), try related destinations API
      if (response.status === 401) {
        response = await fetch(`/api/related-destinations?slug=${destination.slug}&limit=6`);
        
        if (response.ok) {
          const data = await response.json();
          // Transform related destinations to recommendation format
          setRecommendations((data.related || []).map((dest: any) => ({
            slug: dest.slug,
            name: dest.name,
            city: dest.city,
            category: dest.category,
            image: dest.image,
            michelin_stars: dest.michelin_stars,
            crown: dest.crown,
            rating: dest.rating,
          })));
          return;
        }
        
        // Fall back to old recommendations API
        response = await fetch(`/api/recommendations?slug=${destination.slug}&limit=6`);
      }

      // Handle 404 gracefully (recommendations endpoint might not be available)
      if (!response.ok && response.status === 404) {
        // Try related destinations as fallback
        const relatedResponse = await fetch(`/api/related-destinations?slug=${destination.slug}&limit=6`);
        if (relatedResponse.ok) {
          const data = await relatedResponse.json();
          setRecommendations((data.related || []).map((dest: any) => ({
            slug: dest.slug,
            name: dest.name,
            city: dest.city,
            category: dest.category,
            image: dest.image,
            michelin_stars: dest.michelin_stars,
            crown: dest.crown,
            rating: dest.rating,
          })));
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Handle new personalized recommendations format
      if (data.recommendations && Array.isArray(data.recommendations)) {
        // Transform to old format for compatibility
        setRecommendations(
          data.recommendations
            .map((rec: any) => rec.destination)
            .filter(Boolean)
            .slice(0, 6)
        );
      } else if (data.recommendations && Array.isArray(data.recommendations)) {
        // Old format - keep as is
        setRecommendations(data.recommendations);
      } else {
        setRecommendations([]);
      }
    } catch (error) {
      // Silently handle errors - recommendations are optional
      console.log('Recommendations not available:', error);
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-8 md:py-12 max-w-4xl mx-auto dark:text-white min-h-screen">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Destination not found</h1>
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            Return to catalogue
          </button>
        </div>
      </div>
    );
  }

  const { theme: cityTheme } = getCityTheme(destination.city);

  return (
    <div className="px-4 md:px-6 lg:px-10 py-10 max-w-5xl mx-auto dark:text-white space-y-10 min-h-screen">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm tracking-[0.18em] uppercase text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <ProvenanceRibbon variant="compact" />
      </div>

      {destination.image && (
        <div className="relative aspect-[16/9] rounded-[32px] overflow-hidden border border-gray-200 bg-gray-100">
          <Image
            src={destination.image}
            alt={`${destination.name} - ${destination.category} in ${destination.city}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1024px"
            className="object-cover"
            quality={85}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
        </div>
      )}

      <header className="space-y-6" data-city-theme={cityTheme}>
        <div className="space-y-3">
          <span className="text-[0.65rem] tracking-[0.22em] uppercase text-gray-500">
            {destination.city.replace(/-/g, ' ')}
          </span>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-gray-900">
              {destination.name}
            </h1>
            {destination.crown && <span className="text-2xl">👑</span>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push(`/city/${encodeURIComponent(destination.city)}`)}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs tracking-[0.16em] uppercase text-gray-700 hover:-translate-y-0.5 hover:shadow-md transition"
          >
            <MapPin className="h-4 w-4" />
            {destination.city}
          </button>
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs tracking-[0.16em] uppercase text-gray-600">
            <Tag className="h-4 w-4" />
            {destination.category}
          </span>
          {destination.michelin_stars && destination.michelin_stars > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs tracking-[0.16em] uppercase text-gray-700">
              <Image
                src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                alt="Michelin star"
                width={14}
                height={14}
              />
              ⭐ {destination.michelin_stars}
            </span>
          )}
        </div>
      </header>

      {destination.content && (
        <section className="space-y-3">
          <h2 className="text-sm tracking-[0.24em] uppercase text-gray-500">About</h2>
          <p className="text-base leading-relaxed text-gray-700 whitespace-pre-wrap">
            {stripHtmlTags(destination.content)}
          </p>
        </section>
      )}

      {/* AI Recommendations */}
      {(loadingRecommendations || recommendations.length > 0) && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <h2 className="text-lg tracking-[0.18em] uppercase text-gray-600">Similar Destinations</h2>
          </div>

          {loadingRecommendations ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse rounded-[26px] border border-gray-200 bg-white/70 p-4">
                  <div className="aspect-[4/5] rounded-[22px] bg-gray-200 mb-3" />
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {recommendations.map(rec => {
                const stub: Destination = {
                  slug: rec.slug,
                  name: rec.name,
                  city: rec.city,
                  category: rec.category || 'Other',
                  image: rec.image,
                  michelin_stars: rec.michelin_stars ?? undefined,
                  rating: rec.rating ?? null,
                };

                return (
                  <DestinationCard
                    key={rec.slug}
                    destination={stub}
                    index={0}
                    showDescription={false}
                    onClick={() => router.push(`/destination/${rec.slug}`)}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-8 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => router.push('/')}
          className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl hover:shadow-md hover:-translate-y-0.5 transition-all font-medium"
        >
          Back to Catalogue
        </button>
        <button
          onClick={() => router.push(`/city/${encodeURIComponent(destination.city)}`)}
          className="flex-1 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:opacity-80 transition-opacity font-medium"
        >
          Explore {destination.city}
        </button>
      </div>
    </div>
  );
}
