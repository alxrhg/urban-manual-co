'use client';

import { useEffect, useRef, useState } from 'react';
import { Destination } from '@/types/destination';

interface MapViewProps {
  destinations: Destination[];
  onMarkerClick?: (destination: Destination) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
}

declare global {
  interface Window {
    mapkit?: any;
  }
}

export default function MapView({
  destinations,
  onMarkerClick,
  center = { lat: 48.8566, lng: 2.3522 }, // Default to Paris
  zoom = 12,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load MapKit script
  useEffect(() => {
    // Check if MapKit is already loaded
    if (window.mapkit && window.mapkit.loaded) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';
    script.async = true;
    script.defer = true;

    script.addEventListener('load', () => {
      if (!window.mapkit) {
        setError('MapKit JS failed to load');
        return;
      }

      try {
        window.mapkit.init({
          authorizationCallback: (done: (token: string) => void) => {
            fetch('/api/mapkit-token')
              .then(res => res.json())
              .then(data => done(data.token))
              .catch(err => {
                console.error('MapKit token fetch error:', err);
                setError('Map authentication failed');
              });
          },
        });

        // Wait for MapKit to be ready
        if (window.mapkit.loaded) {
          setLoaded(true);
        } else {
          const checkLoaded = setInterval(() => {
            if (window.mapkit && window.mapkit.loaded) {
              clearInterval(checkLoaded);
              setLoaded(true);
            }
          }, 100);

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
      setError('Failed to load MapKit. Please check your network connection.');
    });

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstanceRef.current || !window.mapkit) return;

    try {
      const region = new window.mapkit.CoordinateRegion(
        new window.mapkit.Coordinate(center.lat, center.lng),
        new window.mapkit.CoordinateSpan(0.05, 0.05) // Zoom level equivalent
      );

      mapInstanceRef.current = new window.mapkit.Map(mapRef.current, {
        region,
        showsMapTypeControl: false,
        showsZoomControl: true,
        showsUserLocationControl: false,
      });
    } catch (err: any) {
      console.error('Map initialization error:', err);
      setError(`Failed to initialize map: ${err.message}`);
    }
  }, [loaded, center]);

  // Update markers when destinations change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.mapkit) return;

    // Clear existing annotations
    const annotations = mapInstanceRef.current.annotations || [];
    mapInstanceRef.current.removeAnnotations(annotations);

    // Create new annotations
    const newAnnotations: any[] = [];

    destinations.forEach(dest => {
      // Use coordinates if available
      if (dest.latitude && dest.longitude) {
        const coordinate = new window.mapkit.Coordinate(dest.latitude, dest.longitude);
        const annotation = new window.mapkit.MarkerAnnotation(coordinate, {
          title: dest.name,
          subtitle: dest.city,
          color: dest.crown ? '#FFB86B' : '#007AFF', // Apple blue or crown color
          glyphText: dest.michelin_stars ? '★' : undefined,
        });

        // Add click listener
        annotation.addEventListener('select', () => {
          if (onMarkerClick) {
            onMarkerClick(dest);
          }
        });

        newAnnotations.push(annotation);
      }
    });

    // Add all annotations to map
    if (newAnnotations.length > 0) {
      mapInstanceRef.current.addAnnotations(newAnnotations);

      // Fit map to show all annotations
      try {
        mapInstanceRef.current.showItems(newAnnotations);
      } catch (e) {
        console.error('Error fitting bounds:', e);
      }
    }
  }, [destinations, onMarkerClick]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl p-8">
        <div className="text-center max-w-md">
          <span className="text-red-600 dark:text-red-400 mb-2 font-medium">Map unavailable</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">{error}</span>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-2xl overflow-hidden"
      style={{ minHeight: '400px' }}
    />
  );
}
