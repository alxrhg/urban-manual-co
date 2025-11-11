'use client';

import { useMemo } from 'react';
import { Spinner } from '@/components/ui/spinner';

interface AppleMapProps {
  latitude?: number | null;
  longitude?: number | null;
  zoom?: number;
  className?: string;
  height?: number | string;
  label?: string;
}

export default function AppleMap({
  latitude,
  longitude,
  zoom = 12,
  className = '',
  height = 400,
  label,
}: AppleMapProps) {
  const hasCoords =
    typeof latitude === 'number' &&
    !Number.isNaN(latitude) &&
    typeof longitude === 'number' &&
    !Number.isNaN(longitude);

  const mapUrl = useMemo(() => {
    if (!hasCoords) return null;
    const params = new URLSearchParams();
    params.set('ll', `${latitude!.toFixed(6)},${longitude!.toFixed(6)}`);
    params.set('z', String(zoom));
    params.set('t', 'm'); // map mode
    params.set('output', 'embed');
    if (label) {
      params.set('q', label);
    }
    return `https://maps.apple.com/?${params.toString()}`;
  }, [hasCoords, latitude, longitude, zoom, label]);

  const resolvedHeight =
    typeof height === 'number' ? `${height}px` : height || '400px';

  if (!hasCoords) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-300 ${className}`}
        style={{ height: resolvedHeight }}
      >
        Select a destination with coordinates to preview Apple Maps.
      </div>
    );
  }

  if (!mapUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-2xl ${className}`}
        style={{ height: resolvedHeight }}
      >
        <Spinner />
      </div>
    );
  }

  return (
    <iframe
      src={mapUrl}
      className={`w-full rounded-2xl border border-gray-200 dark:border-gray-800 ${className}`}
      style={{ height: resolvedHeight }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      title={label ? `${label} on Apple Maps` : 'Apple Maps'}
    />
  );
}


