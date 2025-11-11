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
  isDark?: boolean;
}

export default function MapView({
  destinations,
  onMarkerClick,
  center = { lat: 23.5, lng: 121.0 }, // Default to Taiwan center
  zoom = 8,
  isDark = true,
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

    // Ensure container has dimensions
    const container = mapContainerRef.current;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('Map container has no dimensions, waiting for layout...');
      // Wait a bit for layout to settle
      const timeout = setTimeout(() => {
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
          setError('Map container has no dimensions. Please ensure the parent element has a defined height.');
          console.error('Map container dimensions:', {
            width: container.offsetWidth,
            height: container.offsetHeight,
            computed: window.getComputedStyle(container).height
          });
        }
      }, 1000);
      return () => clearTimeout(timeout);
    }

    // Set Mapbox access token
    mapboxgl.accessToken = accessToken;

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [center.lng, center.lat],
      zoom: zoom,
      attributionControl: false,
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      setLoaded(true);
    });

    map.on('error', (e) => {
      console.error('Mapbox error:', e);
      setError('Failed to load map. Please check your access token and network connection.');
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, [center.lat, center.lng, zoom, isDark]);

  // Update markers when destinations change
  useEffect(() => {
    if (!mapRef.current || !loaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Create markers for each destination
    const bounds = new mapboxgl.LngLatBounds();
    let hasValidMarkers = false;

    destinations.forEach((dest) => {
      if (!dest.latitude || !dest.longitude) return;

      const lng = dest.longitude;
      const lat = dest.latitude;
      bounds.extend([lng, lat]);
      hasValidMarkers = true;

      // Create marker element
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#1C1C1C';
      el.style.border = '1.5px solid #FFFFFF';
      el.style.cursor = 'pointer';
      el.style.transition = 'all 0.2s ease';

      // Create marker
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25, closeButton: false })
            .setHTML(`<div style="font-weight: 500; font-size: 14px;">${dest.name}</div>`)
        )
        .addTo(mapRef.current!);

      // Add click handler
      el.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(dest);
        }
      });

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

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (hasValidMarkers && markersRef.current.length > 0) {
      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      });
    } else if (mapRef.current) {
      // If no markers, center on provided center
      mapRef.current.setCenter([center.lng, center.lat]);
      mapRef.current.setZoom(zoom);
    }
  }, [destinations, loaded, onMarkerClick, center.lat, center.lng, zoom]);

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
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '400px',
        borderRadius: 0 
      }}
    />
  );
}
