'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { MapPin, Star, ArrowLeft, Tag, Sparkles } from 'lucide-react';
import { stripHtmlTags } from '@/lib/stripHtmlTags';

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
      const response = await fetch(`/api/recommendations?slug=${destination.slug}&limit=6`);
      
      // Handle 404 gracefully (recommendations endpoint might not be available)
      if (!response.ok && response.status === 404) {
        setRecommendations([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.recommendations && Array.isArray(data.recommendations)) {
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
      <div className="px-4 md:px-6 lg:px-10 py-8 max-w-4xl mx-auto dark:text-white min-h-screen">
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

  return (
    <div className="px-4 md:px-6 lg:px-10 py-8 max-w-4xl mx-auto dark:text-white min-h-screen">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Hero Image */}
      {destination.image && (
        <div className="aspect-[16/9] rounded-2xl overflow-hidden mb-8 bg-gray-100 dark:bg-gray-800">
          <img
            src={destination.image}
            alt={destination.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-3xl md:text-4xl font-bold">
            {destination.name}
          </h1>
          {destination.crown && (
            <span className="text-3xl flex-shrink-0">👑</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => router.push(`/city/${encodeURIComponent(destination.city)}`)}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full hover:shadow-md hover:-translate-y-0.5 transition-all text-sm"
          >
            <MapPin className="h-4 w-4" />
            <span className="font-medium">{destination.city}</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-sm">
            <Tag className="h-4 w-4" />
            <span className="font-medium">{destination.category}</span>
          </div>

          {destination.michelin_stars && destination.michelin_stars > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-sm">
              <img
                src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                alt="Michelin star"
                className="h-4 w-4"
              />
              <span className="font-medium">
                {destination.michelin_stars} Michelin Star{destination.michelin_stars !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {destination.content && (
        <div className="prose dark:prose-invert max-w-none mb-8">
          <div className="text-lg leading-relaxed whitespace-pre-wrap">
            {stripHtmlTags(destination.content)}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {(loadingRecommendations || recommendations.length > 0) && (
        <div className="mb-8 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
              You might also like
            </h3>
          </div>

          {loadingRecommendations ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded mb-1" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {recommendations.map(rec => (
                <button
                  key={rec.slug}
                  onClick={() => router.push(`/destination/${rec.slug}`)}
                  className="text-left group"
                >
                  <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-2">
                    {rec.image ? (
                      <img
                        src={rec.image}
                        alt={rec.name}
                        className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="h-8 w-8 opacity-20" />
                      </div>
                    )}
                    {rec.michelin_stars && rec.michelin_stars > 0 && (
                      <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-0.5">
                        <img
                          src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                          alt="Michelin star"
                          className="h-3 w-3"
                        />
                        <span>{rec.michelin_stars}</span>
                      </div>
                    )}
                  </div>
                  <h4 className="font-medium text-sm mb-1 line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {rec.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                    {rec.city}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
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
