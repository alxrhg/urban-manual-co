'use client';

import { useMemo, useState } from 'react';
import AppleMap from '@/components/AppleMap';
import MapboxSingleMap from '@/components/maps/MapboxSingleMap';
import GoogleStaticMap from '@/components/maps/GoogleStaticMap';
import { getAvailableProviders } from '@/lib/maps/provider';

interface GoogleMapProps {
  query?: string;
  latitude?: number;
  longitude?: number;
  height?: number | string;
  className?: string;
  interactive?: boolean;
  showInfoWindow?: boolean;
  infoWindowContent?: {
    title?: string;
    address?: string;
    category?: string;
    rating?: number;
    website?: string;
  };
  autoOpenInfoWindow?: boolean;
  staticMode?: boolean;
}

export default function GoogleMap(props: GoogleMapProps) {
  const {
    query,
    latitude,
    longitude,
    height = 256,
    className = '',
    interactive = true,
    showInfoWindow = false,
    infoWindowContent,
    autoOpenInfoWindow = false,
    staticMode = false,
  } = props;

  const providerOptions = useMemo(() => getAvailableProviders(), []);
  const [providerIndex, setProviderIndex] = useState(0);
  const provider = providerOptions[providerIndex];
  const hasFallback = providerIndex < providerOptions.length - 1;

  const handleProviderError = () => {
    if (hasFallback) {
      setProviderIndex(prev => Math.min(prev + 1, providerOptions.length - 1));
    }
  };

  const normalizedHeight = typeof height === 'number' ? `${height}px` : height;

  if (!provider) {
    return (
      <GoogleStaticMap
        query={query}
        center={latitude && longitude ? { lat: latitude, lng: longitude } : undefined}
        height={normalizedHeight}
        className={className}
        infoWindowContent={infoWindowContent}
      />
    );
  }

  if (provider === 'apple') {
    return (
      <AppleMap
        query={query}
        latitude={latitude}
        longitude={longitude}
        height={normalizedHeight}
        className={className}
      />
    );
  }

  if (provider === 'mapbox') {
    return (
      <MapboxSingleMap
        query={query}
        latitude={latitude}
        longitude={longitude}
        height={height}
        className={className}
        interactive={interactive}
        showInfoWindow={showInfoWindow}
        infoWindowContent={infoWindowContent}
        autoOpenInfoWindow={autoOpenInfoWindow}
        staticMode={staticMode}
        onProviderError={hasFallback ? handleProviderError : undefined}
        suppressErrorUI={hasFallback}
      />
    );
  }

  return (
    <GoogleStaticMap
      query={query}
      center={latitude && longitude ? { lat: latitude, lng: longitude } : undefined}
      height={height}
      className={className}
      infoWindowContent={infoWindowContent}
    />
  );
}
