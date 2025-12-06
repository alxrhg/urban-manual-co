'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MapPin, Sparkles, Map } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import { Section } from '../Section';
import { Carousel, CarouselItem } from '@/components/ui/Carousel';
import { capitalizeCity } from '@/lib/utils';

interface PersonalizedSectionProps {
  allDestinations: Destination[];
  onDestinationClick?: (destination: Destination) => void;
}

/**
 * Simple recommendation card
 */
function RecommendationCard({
  destination,
  onClick,
}: {
  destination: Destination;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="
        group relative flex flex-col text-left
        w-[200px] md:w-[240px]
        transition-transform duration-300
        hover:scale-[1.02] active:scale-[0.98]
        focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 rounded-xl
      "
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3">
        {destination.image_thumbnail || destination.image ? (
          <Image
            src={destination.image_thumbnail || destination.image!}
            alt={destination.name}
            fill
            sizes="(max-width: 640px) 200px, 240px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
            <MapPin className="w-8 h-8" />
          </div>
        )}

        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
          {destination.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {destination.category} in {capitalizeCity(destination.city)}
        </p>
      </div>
    </button>
  );
}

/**
 * Personalized section for logged-in users
 * Shows recommendations based on saved places, visited places, and active trips
 */
export function PersonalizedSection({
  allDestinations,
  onDestinationClick,
}: PersonalizedSectionProps) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Destination[]>([]);
  const [activeTrip, setActiveTrip] = useState<{ id: string; name: string; city?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch personalized data
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchPersonalizedData = async () => {
      try {
        const supabase = createClient();

        // Fetch saved and visited places, plus active trips in parallel
        const [savedRes, visitedRes, tripRes] = await Promise.all([
          supabase
            .from('saved_places')
            .select('destination_id')
            .eq('user_id', user.id)
            .limit(10),
          supabase
            .from('visited_places')
            .select('destination_id')
            .eq('user_id', user.id)
            .limit(10),
          supabase
            .from('trips')
            .select('id, name, destination')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1),
        ]);

        // Get unique cities/categories from user activity
        const savedIds = (savedRes.data || []).map((s) => s.destination_id);
        const visitedIds = (visitedRes.data || []).map((v) => v.destination_id);
        const interactedIds = new Set([...savedIds, ...visitedIds]);

        // Find destinations user has interacted with
        const interactedDestinations = allDestinations.filter((d) =>
          d.id && interactedIds.has(d.id)
        );

        // Get preference signals
        const preferredCities = new Set(interactedDestinations.map((d) => d.city.toLowerCase()));
        const preferredCategories = new Set(interactedDestinations.map((d) => d.category?.toLowerCase()));

        // Build recommendations: similar destinations user hasn't seen
        const recs = allDestinations
          .filter((d) => {
            if (d.id && interactedIds.has(d.id)) return false;
            const matchesCity = preferredCities.has(d.city.toLowerCase());
            const matchesCategory = d.category && preferredCategories.has(d.category.toLowerCase());
            return matchesCity || matchesCategory;
          })
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 12);

        setRecommendations(recs);

        // Set active trip
        if (tripRes.data && tripRes.data.length > 0) {
          const trip = tripRes.data[0];
          setActiveTrip({
            id: trip.id,
            name: trip.name,
            city: trip.destination as string | undefined,
          });
        }
      } catch (error) {
        console.error('Error fetching personalized data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonalizedData();
  }, [user?.id, allDestinations]);

  // Don't show if not logged in or loading
  if (!user || loading) return null;

  // Don't show if no recommendations
  if (recommendations.length === 0 && !activeTrip) return null;

  const userName = user.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <Section className="py-12 md:py-16 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with greeting */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-medium text-gray-900 dark:text-white tracking-tight">
              For You, {userName}
            </h2>
            <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
              Based on your saved places and travel preferences
            </p>
          </div>

          {/* Active Trip Banner */}
          {activeTrip && (
            <Link
              href="/trips"
              className="
                flex items-center gap-3 px-4 py-3
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-xl shadow-sm
                hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600
                transition-all duration-200
              "
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                <Map className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {activeTrip.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Continue planning
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>
          )}
        </div>

        {/* Recommendations Carousel */}
        {recommendations.length > 0 && (
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Recommended for you
              </span>
            </div>

            <Carousel gap={16} scrollCount={2}>
              {recommendations.map((destination) => (
                <CarouselItem key={destination.slug || destination.id}>
                  <RecommendationCard
                    destination={destination}
                    onClick={() => onDestinationClick?.(destination)}
                  />
                </CarouselItem>
              ))}
            </Carousel>
          </div>
        )}
      </div>
    </Section>
  );
}
