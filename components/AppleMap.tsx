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
    __mapkitLoading?: Promise<void>;
    __mapkitInitialized?: boolean;
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

  // Note: Client-side can't check server-side env vars, so we'll try to load
  // and let the token API handle credential validation
  // The error will come from the token API if credentials are missing
  useEffect(() => {

    // Check if MapKit is already loaded and initialized
    if (window.mapkit && window.mapkit.loaded && window.__mapkitInitialized) {
      setLoaded(true);
      return;
    }

    // If script is already loading, wait for it
    if (window.__mapkitLoading) {
      window.__mapkitLoading
        .then(() => {
          if (window.mapkit && window.mapkit.loaded) {
            setLoaded(true);
          }
        })
        .catch((err) => {
          setError(`Failed to load MapKit: ${err.message}`);
        });
      return;
    }

    // Check if script already exists in DOM
    const existingScript = document.querySelector('script[src*="mapkit.js"]');
    if (existingScript) {
      // Script exists, wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.mapkit && window.mapkit.loaded && window.__mapkitInitialized) {
          clearInterval(checkLoaded);
          setLoaded(true);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.mapkit?.loaded) {
          setError('MapKit script exists but failed to initialize');
        }
      }, 5000);

      return () => clearInterval(checkLoaded);
    }

    // Create loading promise
    const loadingPromise = new Promise<void>((resolve, reject) => {
      // Load MapKit JS
      const script = document.createElement('script');
      script.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';
      script.async = true;
      
      script.addEventListener('load', () => {
        if (!window.mapkit) {
          const err = 'MapKit JS failed to load';
          setError(err);
          reject(new Error(err));
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
                    const errorData = await res.json().catch(() => ({}));
                    const errorMsg = errorData.error || `Token request failed: ${res.status}`;
                    
                    // Use the detailed error message from the API
                    throw new Error(errorMsg);
                  }

                  const data = await res.json();

                  if (data.token) {
                    done(data.token);
                  } else {
                    throw new Error(data.error || 'No token in response');
                  }
                } catch (err: any) {
                  console.error(`MapKit token fetch error (attempt ${attempt + 1}):`, err);

                  // Retry up to 3 times with exponential backoff
                  if (attempt < 2) {
                    const delay = Math.pow(2, attempt) * 1000; // 1s, 2s
                    setTimeout(() => fetchToken(attempt + 1), delay);
                    setRetryCount(attempt + 1);
                  } else {
                    const errorMsg = err.message || `Map authentication failed after ${attempt + 1} attempts`;
                    setError(errorMsg);
                    reject(new Error(errorMsg));
                    done(''); // Try without token as last resort
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
            window.__mapkitInitialized = true;
            resolve();
          } else {
            // MapKit might take a moment to initialize
            const checkLoaded = setInterval(() => {
              if (window.mapkit && window.mapkit.loaded) {
                clearInterval(checkLoaded);
                window.__mapkitInitialized = true;
                resolve();
              }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
              clearInterval(checkLoaded);
              if (!window.mapkit?.loaded) {
                const err = 'MapKit initialization timeout';
                setError(err);
                reject(new Error(err));
              }
            }, 10000);
          }
        } catch (err: any) {
          console.error('MapKit initialization error:', err);
          const errorMsg = `Failed to initialize MapKit: ${err.message}`;
          setError(errorMsg);
          reject(err);
        }
      });

      script.addEventListener('error', () => {
        const err = 'Failed to load MapKit JS. Please check your network connection.';
        setError(err);
        reject(new Error(err));
      });

      document.head.appendChild(script);
    });

    window.__mapkitLoading = loadingPromise;

    loadingPromise
      .then(() => {
        setLoaded(true);
      })
      .catch((err) => {
        console.error('MapKit loading failed:', err);
        setError(err.message || 'Failed to load MapKit');
      });

    // No cleanup - we want to keep the script loaded for other instances
  }, []);

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
    return (
      <div
        className={`w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 ${className}`}
        style={{ height: getHeightStyle() }}
      >
        <div className="text-center max-w-md">
          <p className="text-sm text-red-600 dark:text-red-400 mb-2 font-medium">Map unavailable</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{error}</p>
          {retryCount > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
              Retry attempt {retryCount}/3
            </p>
          )}
          {(error.includes('credentials not configured') || error.includes('Missing:') || error.includes('Vercel')) && (
            <div className="mt-2 space-y-1">
              <a
                href="https://developer.apple.com/maps/web/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline block"
              >
                Learn how to set up MapKit →
              </a>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                After adding env vars in Vercel, redeploy your application for changes to take effect.
              </p>
            </div>
          )}
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
