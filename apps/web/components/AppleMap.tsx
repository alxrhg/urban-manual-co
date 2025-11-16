'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ensureMapkitLoaded,
  MapkitMapInstance,
  MapkitAnnotation,
  MapkitGeocoderResult,
} from '@/lib/maps/mapkit-loader';

interface AppleMapProps {
  query?: string;
  latitude?: number;
  longitude?: number;
  height?: string;
  className?: string;
}

export default function AppleMap({
  query,
  latitude,
  longitude,
  height = '256px',
  className = ''
}: AppleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapkitMapInstance | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    ensureMapkitLoaded()
      .then(() => {
        if (cancelled) return;
        setLoaded(true);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        console.error('MapKit initialization error:', err);
        setError(`Failed to initialize MapKit: ${err.message}`);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize map once MapKit is loaded
  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstanceRef.current || !window.mapkit) return;
    let cancelled = false;

    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        let region;
        if (latitude && longitude) {
          region = new window.mapkit!.CoordinateRegion(
            new window.mapkit!.Coordinate(latitude, longitude),
            new window.mapkit!.CoordinateSpan(0.01, 0.01)
          );
        }

        const map = new window.mapkit!.Map(mapRef.current!, {
          region,
        });

        mapInstanceRef.current = map;

        if (latitude && longitude) {
          const annotation = new window.mapkit!.MarkerAnnotation(
            new window.mapkit!.Coordinate(latitude, longitude),
            {
              title: query || 'Location',
            }
          ) as MapkitAnnotation;
          map.addAnnotation?.(annotation);
        } else if (query) {
          const geocoder = new window.mapkit!.Geocoder();
          geocoder.lookup(query, (results: MapkitGeocoderResult[], geocodeError?: Error) => {
            if (cancelled) return;
            if (geocodeError) {
              console.error('Geocoding error:', geocodeError);
              setError('Failed to find location');
              return;
            }
            if (results && results.length > 0) {
              const result = results[0];
              const coordinate = result.coordinate;
              map.region = new window.mapkit!.CoordinateRegion(
                coordinate,
                new window.mapkit!.CoordinateSpan(0.01, 0.01)
              );
              const annotation = new window.mapkit!.MarkerAnnotation(
                coordinate,
                {
                  title: result.name || query,
                }
              ) as MapkitAnnotation;
              map.addAnnotation?.(annotation);
            } else {
              setError('Location not found');
            }
          });
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to initialize map';
        console.error('Map initialization error:', err);
        setError(`Failed to initialize map: ${message}`);
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      mapInstanceRef.current?.destroy?.();
      mapInstanceRef.current = null;
    };
  }, [loaded, latitude, longitude, query]);

  if (error) {
    return (
      <div 
        className={`w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4 ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <p className="text-sm text-red-600 dark:text-red-400 mb-1">Map unavailable</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div 
        className={`w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white mx-auto mb-2"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`w-full rounded-lg overflow-hidden ${className}`}
      style={{ height, minHeight: height }}
    />
  );
}
