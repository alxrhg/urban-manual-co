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

  const mapkit1Key = process.env.NEXT_PUBLIC_MAPKIT_JS_KEY || '';
  const teamId = process.env.NEXT_PUBLIC_MAPKIT_TEAM_ID || '';

  useEffect(() => {
    // Check if MapKit is already loaded
    if (window.mapkit && window.mapkit.loaded) {
      setLoaded(true);
      return;
    }

    // Load MapKit JS
    const script = document.createElement('script');
    script.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';
    script.async = true;
    
    script.addEventListener('load', () => {
      if (!window.mapkit) {
        setError('MapKit JS failed to load');
        return;
      }

      try {
        // Initialize MapKit with authorization callback
        window.mapkit.init({
          authorizationCallback: (done: (token: string) => void) => {
            // Fetch token from our API endpoint
            fetch('/api/mapkit-token', { credentials: 'same-origin' })
              .then(res => {
                if (!res.ok) {
                  throw new Error(`Token request failed: ${res.status}`);
                }
                return res.json();
              })
              .then(data => {
                if (data.token) {
                  done(data.token);
                } else {
                  throw new Error('No token in response');
                }
              })
              .catch((err: Error) => {
                console.error('MapKit authorization error:', err);
                setError(`Map authentication failed: ${err.message}`);
                // Still try to initialize without token (may have limitations)
                done('');
              });
          },
        });

        // Basic configuration
        try {
          window.mapkit.language = navigator.language || 'en-US';
          window.mapkit.showsPointsOfInterest = true;
        } catch {}

        // Wait for MapKit to be ready
        if (window.mapkit.loaded) {
          setLoaded(true);
        } else {
          // MapKit might take a moment to initialize
          const checkLoaded = setInterval(() => {
            if (window.mapkit && window.mapkit.loaded) {
              clearInterval(checkLoaded);
              setLoaded(true);
            }
          }, 100);

          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkLoaded);
            if (!window.mapkit?.loaded) {
              setError('MapKit initialization timeout');
            }
          }, 5000);
        }
      } catch (err: any) {
        console.error('MapKit initialization error:', err);
        setError(`Failed to initialize MapKit: ${err.message}`);
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
  }, [mapkit1Key, teamId]);

  // Initialize map once MapKit is loaded
  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstanceRef.current || !window.mapkit) return;

    try {
      // Create map region if we have coordinates
      let region;
      if (latitude && longitude) {
        region = new window.mapkit.CoordinateRegion(
          new window.mapkit.Coordinate(latitude, longitude),
          new window.mapkit.CoordinateSpan(0.01, 0.01)
        );
      }

      // Initialize the map
      const map = new window.mapkit.Map(mapRef.current, {
        region: region,
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
            setError('Failed to find location');
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
          } else {
            setError('Location not found');
          }
        });
      }
    } catch (err: any) {
      console.error('Map initialization error:', err);
      setError(`Failed to initialize map: ${err.message}`);
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
