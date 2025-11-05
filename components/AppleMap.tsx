'use client';

import { useEffect, useRef, useState } from 'react';

interface AppleMapProps {
  query?: string;
  latitude?: number;
  longitude?: number;
  height?: number | string; // Accepts both number (pixels) and string (%, vh, etc)
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
  height = 256, // Default to 256px
  className = ''
}: AppleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mapkit1Key = process.env.NEXT_PUBLIC_MAPKIT_JS_KEY || '';
  const teamId = process.env.NEXT_PUBLIC_MAPKIT_TEAM_ID || '';

  useEffect(() => {
    // Set a timeout to show error if map doesn't load within 15 seconds
    loadingTimeoutRef.current = setTimeout(() => {
      if (!loaded && !error) {
        setError('Map loading timeout - please check MapKit configuration');
      }
    }, 15000);

    // Check if MapKit is already loaded
    if (window.mapkit && window.mapkit.loaded) {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      setLoaded(true);
      return;
    }

    // Load MapKit JS
    const script = document.createElement('script');
    script.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';
    script.async = true;
    
    script.addEventListener('load', () => {
      if (!window.mapkit) {
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        setError('MapKit JS failed to load');
        return;
      }

      try {
        // Initialize MapKit with authorization callback
        window.mapkit.init({
          authorizationCallback: (done: (token: string) => void) => {
            // Fetch token with retry logic
            const fetchToken = async (attempt: number = 0): Promise<void> => {
              try {
                const res = await fetch('/api/mapkit-token', {
                  credentials: 'same-origin',
                  headers: { 'Accept': 'application/json' }
                });

                if (!res.ok) {
                  throw new Error(`Token request failed: ${res.status}`);
                }

                const data = await res.json();

                if (data.token) {
                  done(data.token);
                } else {
                  throw new Error('No token in response');
                }
              } catch (err: any) {
                console.error(`MapKit token fetch error (attempt ${attempt + 1}):`, err);

                // Retry up to 3 times with exponential backoff
                if (attempt < 2) {
                  const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
                  setTimeout(() => fetchToken(attempt + 1), delay);
                  setRetryCount(attempt + 1);
                } else {
                  // After all retries fail, show error - don't try with empty token
                  setError('MapKit credentials not configured. Please contact support.');
                  setLoaded(false);
                  // Don't call done() - this prevents MapKit from hanging with invalid auth
                }
              }
            };

            fetchToken();
          },
        });

        // Basic configuration
        try {
          window.mapkit.language = navigator.language || 'en-US';
          window.mapkit.showsPointsOfInterest = true;
        } catch {}

        // Wait for MapKit to be ready
        if (window.mapkit.loaded) {
          if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
          setLoaded(true);
        } else {
          // MapKit might take a moment to initialize
          const checkLoaded = setInterval(() => {
            if (window.mapkit && window.mapkit.loaded) {
              clearInterval(checkLoaded);
              if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
              setLoaded(true);
            }
          }, 100);

          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkLoaded);
            if (!window.mapkit?.loaded) {
              if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
              setError('MapKit initialization timeout');
            }
          }, 5000);
        }
      } catch (err: any) {
        console.error('MapKit initialization error:', err);
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        setError(`Failed to initialize MapKit: ${err.message}`);
      }
    });

    script.addEventListener('error', () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      setError('Failed to load MapKit JS. Please check your network connection.');
    });

    document.head.appendChild(script);

    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
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
      if (latitude !== undefined && longitude !== undefined) {
        region = new window.mapkit.CoordinateRegion(
          new window.mapkit.Coordinate(latitude, longitude),
          new window.mapkit.CoordinateSpan(0.01, 0.01)
        );
      }

      // Initialize the map
      const map = new window.mapkit.Map(mapRef.current, {
        region: region,
        showsMapTypeControl: false,
        showsZoomControl: true,
        showsUserLocationControl: false,
      });

      mapInstanceRef.current = map;

      // Add annotation if we have coordinates
      if (latitude !== undefined && longitude !== undefined) {
        const annotation = new window.mapkit.MarkerAnnotation(
          new window.mapkit.Coordinate(latitude, longitude),
          {
            title: query || 'Location',
            color: '#007AFF',
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
                color: '#007AFF',
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

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch (e) {
          console.error('Error destroying map:', e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [loaded, latitude, longitude, query]);

  // Helper to format height value
  const getHeightStyle = () => {
    if (typeof height === 'number') {
      return `${height}px`;
    }
    return height; // Already a string like "100%", "50vh", etc.
  };

  if (error) {
    // Create a fallback link to Apple Maps
    const mapUrl = latitude && longitude
      ? `https://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(query || 'Location')}`
      : query
      ? `https://maps.apple.com/?q=${encodeURIComponent(query)}`
      : 'https://maps.apple.com/';

    return (
      <div
        className={`w-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl p-6 ${className}`}
        style={{ height: getHeightStyle() }}
      >
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-3">🗺️</div>
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Map preview unavailable</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            MapKit configuration needed
          </p>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <span>📍</span>
            <span>View in Apple Maps</span>
          </a>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div
        className={`w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl ${className}`}
        style={{ height: getHeightStyle() }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white mx-auto mb-2"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Loading map...
            {retryCount > 0 && ` (retry ${retryCount})`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`w-full rounded-2xl overflow-hidden ${className}`}
      style={{ height: getHeightStyle(), minHeight: getHeightStyle() }}
    />
  );
}
