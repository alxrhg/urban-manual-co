'use client';

import { useEffect, useRef, useState } from 'react';

interface AppleMapProps {
  query?: string;
  latitude?: number;
  longitude?: number;
  height?: string;
  className?: string;
}

declare global {
  interface Window {
    mapkit?: any;
  }
}

export default function AppleMap({ 
  query, 
  latitude, 
  longitude, 
  height = '256px',
  className = ''
}: AppleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapkitKey = process.env.NEXT_PUBLIC_MAPKIT_JS_KEY || '';
  const teamId = process.env.NEXT_PUBLIC_MAPKIT_TEAM_ID || '';

  useEffect(() => {
    // Check if MapKit is already loaded
    if (window.mapkit && window.mapkit.loaded) {
      setLoaded(true);
      return;
    }

    // Load MapKit JS (no key required for basic usage)
    const script = document.createElement('script');
    script.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';
    script.async = true;
    script.addEventListener('load', () => {
      if (window.mapkit) {
        // Initialize MapKit
        // Note: MapKit JS can work without authentication for basic maps
        // For production, you should set up proper authentication
        if (mapkitKey && teamId) {
          window.mapkit.init({
            authorizationCallback: (done: (token: string) => void) => {
              fetch('/api/mapkit-token')
                .then(res => res.json())
                .then(data => done(data.token))
                .catch(() => {
                  // Fallback: use key directly
                  done(mapkitKey);
                });
            },
          });
        } else {
          // Initialize without authentication (may have limitations)
          window.mapkit.init();
        }
        setLoaded(true);
      }
    });
    script.addEventListener('error', () => {
      setError('Failed to load MapKit JS. Please check your network connection.');
    });
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [mapkitKey, teamId]);

  // Initialize map
  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstanceRef.current || !window.mapkit) return;

    try {
      const map = new window.mapkit.Map(mapRef.current, {
        region: latitude && longitude
          ? new window.mapkit.CoordinateRegion(
              new window.mapkit.Coordinate(latitude, longitude),
              new window.mapkit.CoordinateSpan(0.01, 0.01)
            )
          : undefined,
      });

      mapInstanceRef.current = map;

      // Add annotation if we have coordinates
      if (latitude && longitude) {
        const annotation = new window.mapkit.MarkerAnnotation(
          new window.mapkit.Coordinate(latitude, longitude),
          {
            title: query || 'Location',
          }
        );
        map.addAnnotation(annotation);
      } else if (query) {
        // Search for the location if we only have a query
        const geocoder = new window.mapkit.Geocoder();
        geocoder.lookup(query, (results: any[], error: any) => {
          if (error) {
            console.error('Geocoding error:', error);
            return;
          }
          if (results && results.length > 0) {
            const result = results[0];
            const coordinate = result.coordinate;
            map.region = new window.mapkit.CoordinateRegion(
              coordinate,
              new window.mapkit.CoordinateSpan(0.01, 0.01)
            );
            const annotation = new window.mapkit.MarkerAnnotation(
              coordinate,
              {
                title: result.name || query,
              }
            );
            map.addAnnotation(annotation);
          }
        });
      }
    } catch (err: any) {
      console.error('Map initialization error:', err);
      setError('Failed to initialize map');
    }
  }, [loaded, latitude, longitude, query]);

  if (error) {
    return (
      <div className={`w-full ${height} flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-red-600 dark:text-red-400 mb-1">Map unavailable</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className={`w-full ${height} flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
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
      className={`w-full ${height} rounded-lg overflow-hidden ${className}`}
      style={{ minHeight: height }}
    />
  );
}

