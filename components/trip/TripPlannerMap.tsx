'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2, Minimize2, Navigation } from 'lucide-react';
import type { TripDay } from '@/lib/hooks/useTripEditor';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  dayNumber: number;
  index: number;
}

interface TripPlannerMapProps {
  days: TripDay[];
  selectedDayNumber?: number;
  activeItemId?: string | null;
  onMarkerClick?: (itemId: string) => void;
  className?: string;
}

/**
 * TripPlannerMap - Grayscale map for trip planner
 * Lovably style: desaturated tiles, numbered markers, route lines
 */
export default function TripPlannerMap({
  days,
  selectedDayNumber,
  activeItemId,
  onMarkerClick,
  className = '',
}: TripPlannerMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxgl, setMapboxgl] = useState<any>(null);

  // Extract markers from days
  const markers: MapMarker[] = [];
  days.forEach((day) => {
    if (selectedDayNumber && day.dayNumber !== selectedDayNumber) return;

    day.items.forEach((item, index) => {
      const lat = item.parsedNotes?.latitude ?? item.destination?.latitude;
      const lng = item.parsedNotes?.longitude ?? item.destination?.longitude;

      if (lat && lng) {
        markers.push({
          id: item.id,
          lat,
          lng,
          label: item.title || `Stop ${index + 1}`,
          dayNumber: day.dayNumber,
          index: index + 1,
        });
      }
    });
  });

  // Load mapbox-gl dynamically
  useEffect(() => {
    const loadMapbox = async () => {
      try {
        const mapboxModule = await import('mapbox-gl');
        // @ts-ignore - CSS import works at runtime
        await import('mapbox-gl/dist/mapbox-gl.css');
        setMapboxgl(mapboxModule.default);
      } catch (error) {
        console.warn('Mapbox GL not available:', error);
      }
    };

    loadMapbox();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxgl || mapRef.current) return;

    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!accessToken) {
      console.warn('Mapbox access token not configured');
      return;
    }

    mapboxgl.accessToken = accessToken;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [0, 20],
      zoom: 2,
      attributionControl: false,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    mapRef.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapboxgl]);

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !mapboxgl) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (markers.length === 0) return;

    // Add new markers
    markers.forEach((marker) => {
      const el = document.createElement('div');
      el.className = 'trip-marker';
      el.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          ${marker.id === activeItemId
            ? 'background: #111827; color: white;'
            : 'background: white; color: #111827; border: 1px solid #e5e7eb;'}
          font-weight: 500;
          font-size: 14px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: transform 0.2s;
        ">
          ${marker.index}
        </div>
      `;

      el.addEventListener('click', () => {
        onMarkerClick?.(marker.id);
      });

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.1)';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const mapMarker = new mapboxgl.Marker({ element: el })
        .setLngLat([marker.lng, marker.lat])
        .addTo(mapRef.current);

      markersRef.current.push(mapMarker);
    });

    // Fit bounds to markers
    if (markers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      mapRef.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 14,
      });
    }

    // Draw route line
    if (markers.length > 1) {
      const routeId = 'trip-route';

      // Remove existing route
      if (mapRef.current.getSource(routeId)) {
        mapRef.current.removeLayer(routeId);
        mapRef.current.removeSource(routeId);
      }

      // Add route line
      mapRef.current.addSource(routeId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: markers.map((m) => [m.lng, m.lat]),
          },
        },
      });

      mapRef.current.addLayer({
        id: routeId,
        type: 'line',
        source: routeId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#6b7280',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });
    }
  }, [markers, mapLoaded, activeItemId, onMarkerClick, mapboxgl]);

  // Focus on active item
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !activeItemId) return;

    const activeMarker = markers.find((m) => m.id === activeItemId);
    if (activeMarker) {
      mapRef.current.flyTo({
        center: [activeMarker.lng, activeMarker.lat],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [activeItemId, markers, mapLoaded]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const centerOnMarkers = useCallback(() => {
    if (!mapRef.current || !mapboxgl || markers.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    markers.forEach((m) => bounds.extend([m.lng, m.lat]));
    mapRef.current.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      maxZoom: 14,
    });
  }, [markers, mapboxgl]);

  return (
    <div
      className={`
        relative bg-gray-100 dark:bg-gray-900
        ${isFullscreen ? 'fixed inset-0 z-50' : 'w-full h-full'}
        ${className}
      `}
    >
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={centerOnMarkers}
          className="p-2 bg-white dark:bg-gray-900 rounded-sm shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Center on markers"
        >
          <Navigation className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-2 bg-white dark:bg-gray-900 rounded-sm shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Loading state */}
      {!mapLoaded && mapboxgl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 dark:border-gray-800 dark:border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* No markers fallback */}
      {markers.length === 0 && mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-400 dark:text-gray-600 text-sm bg-white/80 dark:bg-gray-900/80 px-4 py-2 rounded-sm">
            Add stops to see them on the map
          </p>
        </div>
      )}

      {/* No mapbox token fallback */}
      {!mapboxgl && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <p className="text-gray-400 dark:text-gray-600 text-sm">
            Map unavailable
          </p>
        </div>
      )}
    </div>
  );
}
