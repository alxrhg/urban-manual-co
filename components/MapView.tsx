'use client';

import { useEffect, useRef, useState } from 'react';
import { Destination } from '@/types/destination';

interface MapViewProps {
  destinations: Destination[];
  onMarkerClick?: (destination: Destination) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
}

export default function MapView({
  destinations,
  onMarkerClick,
  center = { lat: 48.8566, lng: 2.3522 }, // Default to Paris
  zoom = 12,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use only the canonical env var
  const getApiKey = () => process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';

  // Load Google Maps script
  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setError('Google Maps API key is not configured. Please add NEXT_PUBLIC_GOOGLE_API_KEY to your environment variables.');
      console.error('Google Maps API key is not configured');
      return;
    }

    // Check if script is already loaded
    if (window.google && window.google.maps) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => setLoaded(true));
    script.addEventListener('error', () => {
      setError('Failed to load Google Maps. Please check your API key and network connection.');
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
    if (!loaded || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center,
      zoom,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });
  }, [loaded, center, zoom]);

  // Update markers when destinations change
  useEffect(() => {
    if (!mapInstanceRef.current || !loaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Create new markers
    const bounds = new google.maps.LatLngBounds();
    let pendingPlaceIdLookups = 0;
    let completedMarkers = 0;
    const totalDestinations = destinations.filter(d => d.latitude || d.longitude || d.place_id).length;

    const fitBoundsToMarkers = () => {
      if (markersRef.current.length > 0 && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.fitBounds(bounds);
        } catch (e) {
          // Ignore bounds errors (e.g., if all markers are at same location)
        }
      }
    };

    const createMarker = (dest: Destination, position: google.maps.LatLng) => {
      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current!,
        title: dest.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: dest.crown ? '#fbbf24' : '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      // Add click listener
      marker.addListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(dest);
        }
      });

      markersRef.current.push(marker);
      bounds.extend(position);
      completedMarkers++;

      // Fit bounds when all markers are created (synchronous ones)
      if (pendingPlaceIdLookups === 0 && completedMarkers === totalDestinations) {
        setTimeout(fitBoundsToMarkers, 100);
      }
    };

    destinations.forEach(dest => {
      // Priority 1: Use latitude/longitude if available (fastest)
      if (dest.latitude && dest.longitude) {
        const position = new google.maps.LatLng(dest.latitude, dest.longitude);
        createMarker(dest, position);
      }
      // Priority 2: Use place_id to get coordinates from Google Places API
      else if (dest.place_id) {
        pendingPlaceIdLookups++;
        const service = new google.maps.places.PlacesService(mapInstanceRef.current!);
        service.getDetails(
          {
            placeId: dest.place_id,
            fields: ['geometry'],
          },
          (place, status) => {
            pendingPlaceIdLookups--;
            if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
              createMarker(dest, place.geometry.location);
            }
            // Fit bounds when all async lookups complete
            if (pendingPlaceIdLookups === 0) {
              setTimeout(fitBoundsToMarkers, 200);
            }
          }
        );
      }
      // No location data available - skip
    });
  }, [destinations, onMarkerClick, loaded]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl p-8">
        <div className="text-center max-w-md">
          <span className="text-red-600 dark:text-red-400 mb-2 font-medium">Map Loading Failed</span>
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
