'use client';

import { useMemo } from 'react';
import { MapPin, Clock } from 'lucide-react';

interface DestinationItem {
  id: string;
  title: string;
  destination?: {
    neighborhood?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}

interface NeighborhoodBreakdownProps {
  items: DestinationItem[];
  className?: string;
}

interface NeighborhoodGroup {
  name: string;
  items: DestinationItem[];
  centroid?: { lat: number; lng: number };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function estimateTransitMinutes(distanceKm: number): number {
  // Rough estimate: 15 min per km for city transit
  return Math.ceil(distanceKm * 15);
}

/**
 * NeighborhoodBreakdown - Shows items grouped by neighborhood with travel times
 */
export default function NeighborhoodBreakdown({
  items,
  className = '',
}: NeighborhoodBreakdownProps) {
  const { neighborhoods, transitTimes } = useMemo(() => {
    // Group items by neighborhood
    const grouped: Record<string, NeighborhoodGroup> = {};

    items.forEach(item => {
      const neighborhood = item.destination?.neighborhood || 'Other';
      if (!grouped[neighborhood]) {
        grouped[neighborhood] = { name: neighborhood, items: [], centroid: undefined };
      }
      grouped[neighborhood].items.push(item);

      // Calculate centroid
      if (item.destination?.latitude && item.destination?.longitude) {
        if (!grouped[neighborhood].centroid) {
          grouped[neighborhood].centroid = {
            lat: item.destination.latitude,
            lng: item.destination.longitude,
          };
        } else {
          const n = grouped[neighborhood].items.length;
          grouped[neighborhood].centroid = {
            lat: (grouped[neighborhood].centroid!.lat * (n - 1) + item.destination.latitude) / n,
            lng: (grouped[neighborhood].centroid!.lng * (n - 1) + item.destination.longitude) / n,
          };
        }
      }
    });

    const neighborhoodList = Object.values(grouped).filter(n => n.items.length > 0);

    // Calculate transit times between neighborhoods
    const transits: { from: string; to: string; minutes: number }[] = [];
    for (let i = 0; i < neighborhoodList.length - 1; i++) {
      const from = neighborhoodList[i];
      const to = neighborhoodList[i + 1];
      if (from.centroid && to.centroid) {
        const distance = calculateDistance(
          from.centroid.lat, from.centroid.lng,
          to.centroid.lat, to.centroid.lng
        );
        transits.push({
          from: from.name,
          to: to.name,
          minutes: estimateTransitMinutes(distance),
        });
      }
    }

    return { neighborhoods: neighborhoodList, transitTimes: transits };
  }, [items]);

  if (neighborhoods.length <= 1) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-xs font-medium text-stone-500 dark:text-gray-400 uppercase tracking-wide">
        Neighborhoods
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {neighborhoods.map((neighborhood, index) => (
          <div key={neighborhood.name} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 dark:bg-gray-800 rounded-full">
              <MapPin className="w-3 h-3 text-stone-400" />
              <span className="text-xs font-medium text-stone-700 dark:text-gray-300">
                {neighborhood.name}
              </span>
              <span className="text-[10px] text-stone-400 dark:text-gray-500">
                ({neighborhood.items.length})
              </span>
            </div>

            {/* Transit time arrow */}
            {index < neighborhoods.length - 1 && transitTimes[index] && (
              <div className="flex items-center gap-1 text-[10px] text-stone-400">
                <span>→</span>
                <Clock className="w-2.5 h-2.5" />
                <span>{transitTimes[index].minutes}m</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact version for day header
 */
export function NeighborhoodTags({ items }: { items: DestinationItem[] }) {
  const neighborhoods = useMemo(() => {
    const unique = new Set<string>();
    items.forEach(item => {
      if (item.destination?.neighborhood) {
        unique.add(item.destination.neighborhood);
      }
    });
    return Array.from(unique).slice(0, 3);
  }, [items]);

  if (neighborhoods.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {neighborhoods.map(n => (
        <span
          key={n}
          className="px-1.5 py-0.5 text-[9px] text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 rounded"
        >
          {n}
        </span>
      ))}
    </div>
  );
}
