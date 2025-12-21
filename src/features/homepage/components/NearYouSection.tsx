'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { MapPin, Navigation, Loader2, ArrowRight, X } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useHomepageData } from './HomepageDataProvider';
import { Destination } from '@/types/destination';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

/**
 * Near You Section - Shows destinations near the user's location
 *
 * Features:
 * - Prompts user to enable location
 * - Shows nearby destinations with distance
 * - Calculates straight-line distance (fast, no API calls)
 */

interface NearbyDestination extends Destination {
  distance: number;
}

interface DestinationCardProps {
  destination: NearbyDestination;
  onSelect: (destination: Destination) => void;
}

function DestinationCard({ destination, onSelect }: DestinationCardProps) {
  const imageUrl = destination.image_thumbnail || destination.image;

  return (
    <button
      onClick={() => onSelect(destination)}
      className="group flex-shrink-0 w-[200px] sm:w-[220px] text-left"
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800/50 mb-2.5">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={destination.name}
            fill
            sizes="220px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            quality={85}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
            <MapPin className="h-8 w-8 opacity-30" />
          </div>
        )}

        {/* Distance badge */}
        <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full text-[11px] font-medium
                       bg-white/90 dark:bg-black/70 backdrop-blur-md
                       text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
          <Navigation className="w-3 h-3" />
          {formatDistance(destination.distance)}
        </div>
      </div>

      {/* Info */}
      <h3 className="text-[14px] font-medium text-gray-900 dark:text-white line-clamp-1 mb-0.5">
        {destination.name}
      </h3>
      <p className="text-[12px] text-gray-500 dark:text-gray-400 line-clamp-1">
        {capitalizeCategory(destination.category)}
      </p>
    </button>
  );
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2?: number | null,
  lon2?: number | null
): number {
  if (!lat2 || !lon2) return Infinity;

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function NearYouSection() {
  const { openDestination } = useHomepageData();
  const { latitude, longitude, hasLocation, loading, requestLocation, error, permissionGranted } = useGeolocation();
  const [nearbyDestinations, setNearbyDestinations] = useState<NearbyDestination[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if user has dismissed this section before
  useEffect(() => {
    const dismissedNearby = localStorage.getItem('dismissed_nearby_section');
    if (dismissedNearby === 'true') {
      setDismissed(true);
    }
  }, []);

  // Fetch nearby destinations when we have location
  useEffect(() => {
    if (!hasLocation || !latitude || !longitude) return;

    const fetchNearby = async () => {
      setIsLoadingNearby(true);
      try {
        const supabase = createClient();

        // Calculate bounding box (~10km radius)
        const latDelta = 0.09; // ~10km
        const lonDelta = 0.12; // ~10km

        const { data, error } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image_thumbnail, latitude, longitude, micro_description, michelin_stars, crown')
          .gte('latitude', latitude - latDelta)
          .lte('latitude', latitude + latDelta)
          .gte('longitude', longitude - lonDelta)
          .lte('longitude', longitude + lonDelta)
          .limit(20);

        if (error) throw error;

        // Calculate distances and sort
        const withDistances = (data || [])
          .map(d => ({
            ...d,
            distance: calculateDistance(latitude, longitude, d.latitude, d.longitude),
          }))
          .filter(d => d.distance < 10) // Within 10km
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 8);

        setNearbyDestinations(withDistances as NearbyDestination[]);
      } catch (err) {
        console.error('Error fetching nearby destinations:', err);
      } finally {
        setIsLoadingNearby(false);
      }
    };

    fetchNearby();
  }, [hasLocation, latitude, longitude]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem('dismissed_nearby_section', 'true');
  }, []);

  // Don't show if dismissed
  if (dismissed) {
    return null;
  }

  // Show location prompt if no location and not denied
  if (!hasLocation && permissionGranted !== false) {
    return (
      <section className="mb-10 px-4 sm:px-6 md:px-10">
        <div className="relative max-w-xl mx-auto p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/50">
          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Navigation className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1">
                Discover places nearby
              </h3>
              <p className="text-[13px] text-gray-600 dark:text-gray-400 mb-4">
                Enable location to see restaurants, hotels, and attractions near you.
              </p>
              <button
                onClick={requestLocation}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                         bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-medium
                         transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Getting location...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    Enable Location
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Don't show if we have location but no nearby destinations
  if (hasLocation && !isLoadingNearby && nearbyDestinations.length === 0) {
    return null;
  }

  // Show loading state
  if (isLoadingNearby) {
    return (
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4 px-4 sm:px-6 md:px-10">
          <Navigation className="w-4 h-4 text-blue-500" />
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
            Near You
          </h2>
        </div>
        <div className="flex gap-4 px-4 sm:px-6 md:px-10">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-shrink-0 w-[200px] sm:w-[220px]">
              <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse mb-2.5" />
              <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-1.5" />
              <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Show nearby destinations
  return (
    <section className="mb-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-4 sm:px-6 md:px-10">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-500" />
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
            Near You
          </h2>
          <span className="text-[12px] text-gray-400">
            {nearbyDestinations.length} places
          </span>
        </div>
        <button className="flex items-center gap-1 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <span>View map</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Horizontally scrolling cards */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-6 md:px-10 pb-2 -mb-2">
          {nearbyDestinations.map(destination => (
            <DestinationCard
              key={destination.slug}
              destination={destination}
              onSelect={openDestination}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default NearYouSection;
