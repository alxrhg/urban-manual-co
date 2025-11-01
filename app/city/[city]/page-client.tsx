'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { MapPin, ArrowLeft } from 'lucide-react';
import { cityCountryMap } from '@/data/cityCountryMap';
import { useAuth } from '@/contexts/AuthContext';
import { DestinationDrawer } from '@/components/DestinationDrawer';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from '@/components/CardStyles';

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function CityPageClient() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const city = decodeURIComponent(params.city as string);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDestinations();
    if (user) {
      fetchVisitedPlaces();
    }
  }, [city, user]);

  const fetchDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('slug, name, city, category, description, content, image, michelin_stars, crown')
        .eq('city', city)
        .order('name');

      if (error) throw error;
      setDestinations(data || []);
    } catch (error) {
      console.error('Error fetching destinations:', error);
      setDestinations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitedPlaces = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('visited_places')
        .select('destination_slug')
        .eq('user_id', user.id);

      if (error) throw error;

      const slugs = new Set(data?.map(v => v.destination_slug) || []);
      setVisitedSlugs(slugs);
    } catch (error) {
      console.error('Error fetching visited places:', error);
    }
  };

  const country = cityCountryMap[city] || 'Unknown';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <main className="px-4 md:px-6 lg:px-10 py-8 dark:text-white min-h-screen">
        <div className="max-w-[1920px] mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/cities')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Cities</span>
          </button>

          {/* Hero Section */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              {capitalizeCity(city)}
            </h1>
            <div className="flex items-center gap-2 text-base text-gray-600 dark:text-gray-400 mb-2">
              <MapPin className="h-5 w-5" />
              <span>{country}</span>
            </div>
            <span className="text-base text-gray-600 dark:text-gray-400">
              {destinations.length} destination{destinations.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Destinations Grid */}
          {destinations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No destinations found in {city}.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
              {destinations.map((destination, index) => {
                const isVisited = user && visitedSlugs.has(destination.slug);
                return (
                  <button
                    key={destination.slug}
                    onClick={() => {
                      setSelectedDestination(destination);
                      setIsDrawerOpen(true);
                    }}
                    className={`${CARD_WRAPPER} cursor-pointer text-left ${isVisited ? 'opacity-60' : ''}`}
                  >
                    {/* Image Container */}
                    <div className={`${CARD_MEDIA} mb-2`}>
                      {destination.image ? (
                        <img
                          src={destination.image}
                          alt={destination.name}
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isVisited ? 'grayscale' : ''}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                          <MapPin className="h-12 w-12 opacity-20" />
                        </div>
                      )}

                      {/* Michelin Stars */}
                      {destination.michelin_stars && destination.michelin_stars > 0 && (
                        <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1 shadow-lg">
                          <img
                            src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                            alt="Michelin star"
                            className="h-3 w-3"
                          />
                          <span>{destination.michelin_stars}</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="space-y-0.5">
                      <h3 className={`${CARD_TITLE}`}>
                        {destination.name}
                      </h3>

                      <div className={`${CARD_META}`}>
                        <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                          {capitalizeCity(destination.city)}
                        </span>
                        {destination.category && (
                          <>
                            <span className="text-gray-300 dark:text-gray-700">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-500 capitalize line-clamp-1">
                              {destination.category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Destination Drawer */}
      <DestinationDrawer
        destination={selectedDestination}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedDestination(null);
        }}
        onSaveToggle={async (slug: string) => {
          if (user) {
            const { data } = await supabase
              .from('saved_places')
              .select('id')
              .eq('user_id', user.id)
              .eq('destination_slug', slug)
              .single();

            if (data) {
              await supabase
                .from('saved_places')
                .delete()
                .eq('user_id', user.id)
                .eq('destination_slug', slug);
            } else {
              await supabase
                .from('saved_places')
                .insert({ user_id: user.id, destination_slug: slug });
            }
          }
        }}
        onVisitToggle={async (slug: string) => {
          if (user) {
            const { data } = await supabase
              .from('visited_places')
              .select('id')
              .eq('user_id', user.id)
              .eq('destination_slug', slug)
              .single();

            if (data) {
              await supabase
                .from('visited_places')
                .delete()
                .eq('user_id', user.id)
                .eq('destination_slug', slug);
              setVisitedSlugs(prev => {
                const next = new Set(prev);
                next.delete(slug);
                return next;
              });
            } else {
              await supabase
                .from('visited_places')
                .insert({ user_id: user.id, destination_slug: slug });
              setVisitedSlugs(prev => new Set(prev).add(slug));
            }
            // Refresh visited places
            fetchVisitedPlaces();
          }
        }}
      />
    </>
  );
}
