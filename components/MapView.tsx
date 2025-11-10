'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Destination } from '@/types/destination';
import { Spinner } from '@/components/ui/spinner';

interface MapViewProps {
  destinations: Destination[];
  onMarkerClick?: (destination: Destination) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
}

export default function MapView({
  destinations,
  onMarkerClick,
  center = { lat: 23.5, lng: 121.0 }, // Default to Taiwan center
  zoom = 8,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get Mapbox access token
  const getAccessToken = () => process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

  // Initialize Mapbox map
  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setError('Mapbox access token is not configured. Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your environment variables.');
      console.error('Mapbox access token is not configured');
      return;
    }

    if (!mapContainerRef.current) return;

    // Set Mapbox access token
    mapboxgl.accessToken = accessToken;

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark theme to match site
      center: [center.lng, center.lat],
      zoom: zoom,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      setLoaded(true);
    });

    map.on('error', (e) => {
      console.error('Mapbox error:', e);
      setError('Failed to load map. Please check your access token and network connection.');
    });

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center.lat, center.lng, zoom]);

  // Update markers when destinations change
  useEffect(() => {
    if (!mapRef.current || !loaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Create markers for each destination
    destinations.forEach((dest) => {
      if (!dest.latitude || !dest.longitude) return;

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'map-marker';
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#1C1C1C';
      el.style.border = '1.5px solid #FFFFFF';
      el.style.cursor = 'pointer';
      el.style.transition = 'all 0.2s ease';
      el.style.touchAction = 'manipulation';
      // Larger touch target for mobile
      if (window.innerWidth < 768) {
        el.style.width = '16px';
        el.style.height = '16px';
      }

      // Hover effect (desktop only)
      if (window.innerWidth >= 768) {
        el.addEventListener('mouseenter', () => {
          el.style.width = '16px';
          el.style.height = '16px';
          el.style.backgroundColor = '#FFFFFF';
          el.style.borderColor = '#1C1C1C';
        });

        el.addEventListener('mouseleave', () => {
          el.style.width = '12px';
          el.style.height = '12px';
          el.style.backgroundColor = '#1C1C1C';
          el.style.borderColor = '#FFFFFF';
        });
      }

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([dest.longitude, dest.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<div class="text-sm font-medium">${dest.name}</div>`)
        )
        .addTo(mapRef.current!);

      // Add click handler
      el.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(dest);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (destinations.length > 0 && markersRef.current.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      markersRef.current.forEach(marker => {
        const lngLat = marker.getLngLat();
        bounds.extend([lngLat.lng, lngLat.lat]);
      });
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      });
    }
  }, [destinations, loaded, onMarkerClick]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        <div className="text-center p-6">
          <p className="text-sm mb-2">{error}</p>
          <p className="text-xs text-gray-500">Please configure NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your environment variables.</p>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Spinner />
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full overflow-hidden"
      style={{ width: '100%', height: '100%', borderRadius: 0 }}
    />
  );
}
