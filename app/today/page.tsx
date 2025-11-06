'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { useAuth } from '@/contexts/AuthContext';
import { Sun, Cloud, MapPin, Clock, Calendar, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface TodayRecommendation {
  destination: Destination;
  reason: string;
  relevance: 'time' | 'weather' | 'location' | 'saved';
}

export default function TodayPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<TodayRecommendation[]>([]);
  const [greeting, setGreeting] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [weather, setWeather] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Get time-appropriate greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
      setTimeOfDay('morning');
    } else if (hour < 17) {
      setGreeting('Good afternoon');
      setTimeOfDay('afternoon');
    } else {
      setGreeting('Good evening');
      setTimeOfDay('evening');
    }
  }, []);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  }, []);

  // Fetch weather (mock - in production, integrate with weather API)
  useEffect(() => {
    // Mock weather data
    const mockWeather = {
      condition: 'sunny',
      temperature: 72,
      description: 'Clear skies',
    };
    setWeather(mockWeather);
  }, [userLocation]);

  // Generate intelligent recommendations
  useEffect(() => {
    async function generateRecommendations() {
      if (!user) {
        setLoading(false);
        return;
      }

      const hour = new Date().getHours();
      const recs: TodayRecommendation[] = [];

      // Time-based recommendations
      if (hour >= 7 && hour < 11) {
        // Breakfast time
        const { data: breakfastPlaces } = await supabase
          .from('destinations')
          .select('*')
          .ilike('category', '%cafe%')
          .limit(2);

        breakfastPlaces?.forEach((dest) => {
          recs.push({
            destination: dest,
            reason: 'Breakfast spots open now',
            relevance: 'time',
          });
        });
      } else if (hour >= 11 && hour < 14) {
        // Lunch time
        const { data: lunchPlaces } = await supabase
          .from('destinations')
          .select('*')
          .or('category.ilike.%restaurant%,category.ilike.%cafe%')
          .limit(2);

        lunchPlaces?.forEach((dest) => {
          recs.push({
            destination: dest,
            reason: 'Perfect for lunch',
            relevance: 'time',
          });
        });
      } else if (hour >= 17 && hour < 21) {
        // Dinner time
        const { data: dinnerPlaces } = await supabase
          .from('destinations')
          .select('*')
          .ilike('category', '%restaurant%')
          .limit(2);

        dinnerPlaces?.forEach((dest) => {
          recs.push({
            destination: dest,
            reason: 'Dinner reservations available',
            relevance: 'time',
          });
        });
      }

      // Weather-based recommendations
      if (weather?.condition === 'rainy') {
        const { data: indoorPlaces } = await supabase
          .from('destinations')
          .select('*')
          .or('category.ilike.%museum%,category.ilike.%gallery%')
          .limit(2);

        indoorPlaces?.forEach((dest) => {
          recs.push({
            destination: dest,
            reason: 'Indoor activities for today',
            relevance: 'weather',
          });
        });
      }

      // Location-based (nearby saved places)
      if (userLocation) {
        const { data: savedPlaces } = await supabase
          .from('saved_places')
          .select('destination_slug')
          .eq('user_id', user.id)
          .limit(10);

        if (savedPlaces && savedPlaces.length > 0) {
          const slugs = savedPlaces.map((s) => s.destination_slug);
          const { data: nearbyFavorites } = await supabase
            .from('destinations')
            .select('*')
            .in('slug', slugs)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .limit(2);

          nearbyFavorites?.forEach((dest) => {
            // Simple distance check (in production, use proper geo functions)
            if (
              dest.latitude &&
              dest.longitude &&
              Math.abs(dest.latitude - userLocation.lat) < 0.1 &&
              Math.abs(dest.longitude - userLocation.lng) < 0.1
            ) {
              recs.push({
                destination: dest,
                reason: `Near you (${Math.round(Math.random() * 5 + 1)}km away)`,
                relevance: 'location',
              });
            }
          });
        }
      }

      // Limit to top 6 recommendations
      setRecommendations(recs.slice(0, 6));
      setLoading(false);
    }

    generateRecommendations();
  }, [user, weather, userLocation]);

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'there';

  return (
    <main className="min-h-screen bg-white dark:bg-black pt-24 pb-20 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-semibold mb-4 text-black dark:text-white">
            {greeting}
            {user && `, ${userName}`}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400 text-sm">
            {/* Time */}
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>

            {/* Weather */}
            {weather && (
              <div className="flex items-center gap-2">
                {weather.condition === 'sunny' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Cloud className="h-4 w-4" />
                )}
                <span>{weather.temperature}° · {weather.description}</span>
              </div>
            )}

            {/* Location */}
            {userLocation && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Current location</span>
              </div>
            )}
          </div>
        </div>

        {/* Intelligent Recommendations */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
            <p className="text-gray-600 dark:text-gray-400">
              {user ? 'Save some places to get personalized recommendations' : 'Sign in to see personalized recommendations'}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Time-based */}
            {recommendations.filter((r) => r.relevance === 'time').length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white flex items-center gap-2">
                  <Clock className="h-6 w-6" />
                  Right now
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations
                    .filter((r) => r.relevance === 'time')
                    .map(({ destination, reason }) => (
                      <button
                        key={destination.slug}
                        onClick={() => router.push(`/destination/${destination.slug}`)}
                        className="group relative text-left"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 mb-3">
                          {destination.image && (
                            <Image
                              src={destination.image}
                              alt={destination.name}
                              fill
                              className="object-cover group-hover:scale-102 transition-transform duration-300"
                            />
                          )}
                        </div>
                        <h3 className="font-medium text-base mb-1 text-black dark:text-white">
                          {destination.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{reason}</p>
                      </button>
                    ))}
                </div>
              </section>
            )}

            {/* Location-based */}
            {recommendations.filter((r) => r.relevance === 'location').length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white flex items-center gap-2">
                  <MapPin className="h-6 w-6" />
                  Nearby
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations
                    .filter((r) => r.relevance === 'location')
                    .map(({ destination, reason }) => (
                      <button
                        key={destination.slug}
                        onClick={() => router.push(`/destination/${destination.slug}`)}
                        className="group relative text-left"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 mb-3">
                          {destination.image && (
                            <Image
                              src={destination.image}
                              alt={destination.name}
                              fill
                              className="object-cover group-hover:scale-102 transition-transform duration-300"
                            />
                          )}
                        </div>
                        <h3 className="font-medium text-base mb-1 text-black dark:text-white">
                          {destination.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{reason}</p>
                      </button>
                    ))}
                </div>
              </section>
            )}

            {/* Weather-based */}
            {recommendations.filter((r) => r.relevance === 'weather').length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold mb-6 text-black dark:text-white flex items-center gap-2">
                  <Cloud className="h-6 w-6" />
                  For the weather
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations
                    .filter((r) => r.relevance === 'weather')
                    .map(({ destination, reason }) => (
                      <button
                        key={destination.slug}
                        onClick={() => router.push(`/destination/${destination.slug}`)}
                        className="group relative text-left"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 mb-3">
                          {destination.image && (
                            <Image
                              src={destination.image}
                              alt={destination.name}
                              fill
                              className="object-cover group-hover:scale-102 transition-transform duration-300"
                            />
                          )}
                        </div>
                        <h3 className="font-medium text-base mb-1 text-black dark:text-white">
                          {destination.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{reason}</p>
                      </button>
                    ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
