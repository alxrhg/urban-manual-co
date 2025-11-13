'use client';

import { useMemo, useState } from 'react';
import { Destination } from '@/types/destination';
import AppleMapView from '@/components/maps/AppleMapView';
import MapboxMultiMap from '@/components/maps/MapboxMultiMap';
import GoogleStaticMap from '@/components/maps/GoogleStaticMap';
import { getAvailableProviders } from '@/lib/maps/provider';

interface MapViewProps {
  destinations: Destination[];
  onMarkerClick?: (destination: Destination) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  isDark?: boolean;
}

export default function MapView({
  destinations,
  onMarkerClick,
  center = { lat: 23.5, lng: 121.0 },
  zoom = 8,
  isDark = true,
}: MapViewProps) {
  const providerOptions = useMemo(() => getAvailableProviders(), []);
  const [providerIndex, setProviderIndex] = useState(0);
  const provider = providerOptions[providerIndex];

  const hasFallback = providerIndex < providerOptions.length - 1;

  const handleProviderError = () => {
    if (hasFallback) {
      setProviderIndex(prev => Math.min(prev + 1, providerOptions.length - 1));
    }
  };

  if (!provider) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        <div className="text-center p-6">
          <p className="text-sm font-medium">Maps are not configured</p>
          <p className="text-xs text-gray-500 mt-1">Add Apple MapKit, Mapbox, or Google Maps keys to enable the interactive map.</p>
        </div>
      </div>
    );
  }

  if (provider === 'apple') {
    return (
      <AppleMapView
        destinations={destinations}
        onMarkerClick={onMarkerClick}
        center={center}
        zoom={zoom}
        isDark={isDark}
        onProviderError={handleProviderError}
      />
    );
  }

  if (provider === 'mapbox') {
    return (
      <MapboxMultiMap
        destinations={destinations}
        onMarkerClick={onMarkerClick}
        center={center}
        zoom={zoom}
        isDark={isDark}
        onProviderError={hasFallback ? handleProviderError : undefined}
        suppressErrorUI={hasFallback}
      />
    );
  }

  if (provider === 'google') {
    return (
      <GoogleStaticMap
        destinations={destinations}
        center={center}
        zoom={zoom}
        height="100%"
        className="h-full"
      />
    );
  }

  return null;
}
