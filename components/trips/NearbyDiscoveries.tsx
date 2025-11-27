'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Compass, Loader2, MapPin, Plus } from 'lucide-react';
import type { Destination } from '@/types/destination';

interface NearbyDiscoveriesProps {
  currentPlace: {
    name: string;
    latitude?: number;
    longitude?: number;
    city?: string;
  };
  excludeSlugs?: string[];
  onAddPlace?: (destination: Destination) => void;
}

export default function NearbyDiscoveries({
  currentPlace,
  excludeSlugs = [],
  onAddPlace,
}: NearbyDiscoveriesProps) {
  const [nearby, setNearby] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchNearby = async () => {
      if (!currentPlace.latitude || !currentPlace.longitude) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        if (!supabase) return;

        // Calculate bounding box (~1km radius)
        const latDelta = 0.009; // ~1km
        const lonDelta = 0.012; // ~1km (varies by latitude)

        const minLat = currentPlace.latitude - latDelta;
        const maxLat = currentPlace.latitude + latDelta;
        const minLon = currentPlace.longitude - lonDelta;
        const maxLon = currentPlace.longitude + lonDelta;

        let query = supabase
          .from('destinations')
          .select('slug, name, city, category, image_thumbnail, latitude, longitude, micro_description')
          .gte('latitude', minLat)
          .lte('latitude', maxLat)
          .gte('longitude', minLon)
          .lte('longitude', maxLon)
          .limit(10);

        // Filter by city if available
        if (currentPlace.city) {
          query = query.ilike('city', `%${currentPlace.city}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Filter out excluded places and calculate distances
        const filtered = (data || [])
          .filter((d) => !excludeSlugs.includes(d.slug))
          .map((d) => ({
            ...d,
            distance: calculateDistance(
              currentPlace.latitude!,
              currentPlace.longitude!,
              d.latitude,
              d.longitude
            ),
          }))
          .filter((d) => d.distance > 0.05) // At least 50m away
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5);

        setNearby(filtered);
      } catch (err) {
        console.error('Error fetching nearby places:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNearby();
  }, [currentPlace.latitude, currentPlace.longitude, currentPlace.city, excludeSlugs]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-stone-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Finding nearby...</span>
      </div>
    );
  }

  if (nearby.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 border-t border-stone-100 dark:border-stone-800 pt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors w-full"
      >
        <Compass className="w-3 h-3" />
        <span>
          {nearby.length} place{nearby.length !== 1 ? 's' : ''} nearby
        </span>
        <span className="text-stone-400 ml-auto">
          {expanded ? '−' : '+'}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1">
          {nearby.map((place) => (
            <div
              key={place.slug}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 overflow-hidden flex-shrink-0">
                {place.image_thumbnail ? (
                  <Image
                    src={place.image_thumbnail}
                    alt={place.name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-3 h-3 text-stone-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{place.name}</p>
                <p className="text-[10px] text-stone-500 truncate">
                  {place.category} · {formatDistance((place as any).distance)}
                </p>
              </div>
              {onAddPlace && (
                <button
                  onClick={() => onAddPlace(place)}
                  className="p-1 text-stone-400 hover:text-stone-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                  title="Add to itinerary"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m away`;
  }
  return `${km.toFixed(1)}km away`;
}
