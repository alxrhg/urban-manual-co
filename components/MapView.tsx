'use client';

import { Destination } from '@/types/destination';
import GoogleInteractiveMap from '@/components/maps/GoogleInteractiveMap';
import { getDefaultProvider } from '@/lib/maps/provider';

interface MapViewProps {
  destinations: Destination[];
  onMarkerClick?: (destination: Destination) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  isDark?: boolean;
  selectedDestination?: Destination | null;
}

export default function MapView({
  destinations,
  onMarkerClick,
  center = { lat: 20, lng: 0 }, // World view fallback - parent handles smart defaults
  zoom = 2,
  isDark = true,
  selectedDestination,
}: MapViewProps) {
  const provider = getDefaultProvider();

  if (!provider) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        <div className="text-center p-6">
          <p className="text-sm font-medium">Maps are not configured</p>
          <p className="text-xs text-gray-500 mt-1">Add Google Maps API key to enable the interactive map.</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleInteractiveMap
      destinations={destinations}
      onMarkerClick={onMarkerClick}
      center={center}
      zoom={zoom}
      isDark={isDark}
      selectedDestination={selectedDestination}
    />
  );
}
