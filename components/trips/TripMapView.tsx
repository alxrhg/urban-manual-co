'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Navigation } from 'lucide-react';

interface MapPlace {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  order: number;
}

interface TripMapViewProps {
  places: MapPlace[];
  className?: string;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function TripMapView({ places, className = '' }: TripMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter places with valid coordinates
  const validPlaces = places.filter(
    (p) => p.latitude && p.longitude && !isNaN(p.latitude) && !isNaN(p.longitude)
  );

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    if (!apiKey) {
      setError('Map not configured');
      setIsLoading(false);
      return;
    }

    if (validPlaces.length === 0) {
      setError('No places with coordinates');
      setIsLoading(false);
      return;
    }

    // Load Google Maps script if not already loaded
    const loadGoogleMaps = () => {
      if (window.google?.maps) {
        initializeMap();
        return;
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', initializeMap);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => {
        setError('Failed to load map');
        setIsLoading(false);
      };
      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current || !window.google?.maps) return;

      try {
        // Calculate bounds
        const bounds = new window.google.maps.LatLngBounds();
        validPlaces.forEach((place) => {
          bounds.extend({ lat: place.latitude!, lng: place.longitude! });
        });

        // Create map
        const map = new window.google.maps.Map(mapRef.current, {
          center: bounds.getCenter(),
          zoom: 14,
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapInstanceRef.current = map;

        // Fit bounds with padding
        if (validPlaces.length > 1) {
          map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
        }

        // Clear existing markers
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        // Add markers with numbers
        validPlaces.forEach((place, index) => {
          const marker = new window.google.maps.Marker({
            position: { lat: place.latitude!, lng: place.longitude! },
            map,
            label: {
              text: String(index + 1),
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
            },
            title: place.name,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: '#000',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            },
          });

          // Info window on click
          const infoWindow = new window.google.maps.InfoWindow({
            content: `<div style="padding: 4px 8px; font-size: 13px;"><strong>${index + 1}. ${place.name}</strong>${place.category ? `<br/><span style="color: #666;">${place.category}</span>` : ''}</div>`,
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          markersRef.current.push(marker);
        });

        // Draw route line
        if (validPlaces.length > 1) {
          if (polylineRef.current) {
            polylineRef.current.setMap(null);
          }

          const path = validPlaces.map((place) => ({
            lat: place.latitude!,
            lng: place.longitude!,
          }));

          polylineRef.current = new window.google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#4285F4',
            strokeOpacity: 0.8,
            strokeWeight: 3,
            icons: [
              {
                icon: {
                  path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 3,
                  strokeColor: '#4285F4',
                },
                offset: '100%',
                repeat: '100px',
              },
            ],
          });

          polylineRef.current.setMap(map);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Map error:', err);
        setError('Failed to initialize map');
        setIsLoading(false);
      }
    };

    loadGoogleMaps();

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [validPlaces]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl ${className}`}>
        <div className="text-center p-6">
          <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full min-h-[300px]" />

      {/* Legend */}
      {validPlaces.length > 0 && !isLoading && (
        <div className="absolute bottom-3 left-3 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Navigation className="w-3 h-3 text-blue-500" />
            <span>{validPlaces.length} stops</span>
          </div>
        </div>
      )}
    </div>
  );
}
