'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Destination } from '@/types/destination';
import { Spinner } from '@/components/ui/spinner';
import { getMapboxConfig } from '@/lib/mapbox/config';

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
  const [useFallback, setUseFallback] = useState(false);

  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const fallbackDestination = destinations.find(
    (dest) => dest.latitude !== null && dest.latitude !== undefined && dest.longitude !== null && dest.longitude !== undefined
  );

  const fallbackCenter = fallbackDestination
    ? { lat: fallbackDestination.latitude!, lng: fallbackDestination.longitude! }
    : center;

  const renderFallbackMap = () => {
    if (!googleMapsKey) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
          <div className="text-center p-6 space-y-2">
            <p className="text-sm font-medium">Unable to load map</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Mapbox is unavailable and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is not configured.
            </p>
          </div>
        </div>
      );
    }

    const markerParams = destinations
      .filter((dest) => dest.latitude && dest.longitude)
      .slice(0, 50)
      .map((dest) => `${dest.latitude},${dest.longitude}`)
      .join('|');

    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?key=${googleMapsKey}&size=1280x720&scale=2&maptype=roadmap${
      markerParams ? `&markers=color:red|${markerParams}` : ''
    }&center=${fallbackCenter.lat},${fallbackCenter.lng}&zoom=${Math.max(0, Math.min(zoom + 2, 16))}`;

    const embedUrl = `https://www.google.com/maps/embed/v1/view?key=${googleMapsKey}&center=${fallbackCenter.lat},${fallbackCenter.lng}&zoom=${zoom}&maptype=roadmap`;

    return (
      <div className="relative w-full h-full bg-gray-100 dark:bg-gray-900 rounded-3xl overflow-hidden">
        <iframe
          title="Google Maps fallback"
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
        <img
          src={staticMapUrl}
          alt="Static map fallback"
          className="w-full h-full object-cover"
          loading="lazy"
          style={{ opacity: 0, pointerEvents: 'none' }}
        />
      </div>
    );
  };

  // Initialize Mapbox map
  useEffect(() => {
    if (useFallback) return;
    const { accessToken, styles } = getMapboxConfig();
    if (!accessToken) {
      console.error('Mapbox access token is not configured. Falling back to Google Maps.');
      setUseFallback(true);
      setError(null);
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
      style: isDark ? styles.dark : styles.light,
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
      setUseFallback(true);
      setError(null);
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, [center.lat, center.lng, zoom, isDark, useFallback]);

  // Update markers when destinations change
  useEffect(() => {
    if (useFallback) return;
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

  if (useFallback) {
    return renderFallbackMap();
  }

  if (!loaded && !error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        <div className="text-center p-6">
          <p className="text-sm mb-2">{error}</p>
        </div>
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
