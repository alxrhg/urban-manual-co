'use client';

import GoogleStaticMap from '@/components/maps/GoogleStaticMap';
import GoogleInteractiveMap from '@/components/maps/GoogleInteractiveMap';
import { getDefaultProvider } from '@/lib/maps/provider';

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

  const provider = getDefaultProvider();
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

  // Use interactive map if interactive is true and not in static mode
  if (interactive && !staticMode) {
    return (
      <GoogleInteractiveMap
        destinations={[]}
        center={latitude && longitude ? { lat: latitude, lng: longitude } : undefined}
        zoom={15}
        isDark={false}
      />
    );
  }

  // Otherwise use static map
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
