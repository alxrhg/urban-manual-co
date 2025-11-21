'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Destination } from '@/types/destination';
import AppleMapView from '@/components/maps/AppleMapView';
import MapboxMultiMap from '@/components/maps/MapboxMultiMap';
import GoogleInteractiveMap from '@/components/maps/GoogleInteractiveMap';
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
  const [providerError, setProviderError] = useState<string | null>(null);
  const provider = providerOptions[providerIndex];

  const hasFallback = providerIndex < providerOptions.length - 1;

  useEffect(() => {
    setProviderError(null);
  }, [providerIndex]);

  const handleProviderError = (message: string) => {
    if (hasFallback) {
      setProviderIndex(prev => Math.min(prev + 1, providerOptions.length - 1));
      return;
    }

    setProviderError(message || 'Unable to load the selected map provider.');
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

  if (providerError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        <div className="text-center p-6 max-w-md">
          <p className="text-sm font-medium">All map providers are unavailable</p>
          <p className="text-xs text-gray-500 mt-1">{providerError}</p>
          <p className="text-xs text-gray-500 mt-2">Please try again later or check your map provider configuration.</p>
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
        onProviderError={handleProviderError}
        suppressErrorUI={hasFallback}
      />
    );
  }

  if (provider === 'google') {
    return (
      <GoogleInteractiveMap
        destinations={destinations}
        onMarkerClick={onMarkerClick}
        center={center}
        zoom={zoom}
        isDark={isDark}
        onProviderError={handleProviderError}
      />
    );
  }

  return null;
}
