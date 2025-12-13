'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2, Minimize2, Navigation, AlertTriangle } from 'lucide-react';

// Import mapbox-gl dynamically to avoid SSR issues
let mapboxgl: typeof import('mapbox-gl') | null = null;

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  dayNumber: number;
  index: number;
}

interface MapboxTripMapProps {
  markers: MapMarker[];
  activeItemId?: string | null;
  onMarkerClick?: (itemId: string) => void;
  className?: string;
  aspectRatio?: 'wide' | 'square';
  showControls?: boolean;
  interactive?: boolean;
}

/**
 * MapboxTripMap - Interactive Mapbox map for trip planning
 * Features: Custom markers, route lines, zoom/pan controls
 */
export default function MapboxTripMap({
  markers,
  activeItemId,
  onMarkerClick,
  className = '',
  aspectRatio = 'wide',
  showControls = true,
  interactive = true,
}: MapboxTripMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('mapbox-gl').Map | null>(null);
  const markersRef = useRef<import('mapbox-gl').Marker[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);

  // Load mapbox-gl dynamically on client side
  useEffect(() => {
    if (typeof window === 'undefined') return;

    import('mapbox-gl').then((mb) => {
      mapboxgl = mb;
      // Import CSS
      import('mapbox-gl/dist/mapbox-gl.css');
      setMapboxLoaded(true);
    }).catch((err) => {
      console.error('Failed to load mapbox-gl:', err);
      setMapError('Failed to load map library');
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !mapboxLoaded || !mapboxgl) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      setMapError('Map not configured');
      return;
    }

    // Validate token type - Mapbox GL requires public tokens (pk.*)
    if (token.startsWith('sk.')) {
      console.error('Mapbox GL requires a public access token (pk.*), not a secret token (sk.*)');
      setMapError('Invalid map token type');
      return;
    }

    mapboxgl.accessToken = token;

    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [0, 20],
        zoom: 1.5,
        interactive,
        attributionControl: false,
      });

      map.on('load', () => {
        setMapLoaded(true);

        // Add route line source
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [],
            },
          },
        });

        // Add dashed route line layer
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
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
      });

      map.on('error', () => {
        setMapError('Failed to load map');
      });

      // Add zoom controls if interactive
      if (interactive && showControls) {
        map.addControl(
          new mapboxgl.NavigationControl({ showCompass: false }),
          'bottom-right'
        );
      }

      mapRef.current = map;
    } catch (error) {
      console.error('Error initializing Mapbox:', error);
      setMapError('Map failed to initialize');
    }

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [interactive, showControls, mapboxLoaded]);

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (markers.length === 0) return;

    // Add new markers
    markers.forEach((marker) => {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'mapbox-trip-marker';
      const isActive = marker.id === activeItemId;
      el.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        ${isActive
          ? 'background: #111827; color: white;'
          : 'background: white; color: #111827; border: 1px solid #e5e7eb;'}
        font-weight: 600;
        font-size: 12px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        cursor: pointer;
        transition: transform 0.15s ease;
      `;
      el.textContent = String(marker.index);

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.15)';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onMarkerClick?.(marker.id);
      });

      const mapboxMarker = new mapboxgl.Marker({ element: el })
        .setLngLat([marker.lng, marker.lat])
        .addTo(mapRef.current!);

      markersRef.current.push(mapboxMarker);
    });

    // Update route line
    const routeSource = mapRef.current.getSource('route') as mapboxgl.GeoJSONSource;
    if (routeSource && markers.length > 1) {
      routeSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: markers.map((m) => [m.lng, m.lat]),
        },
      });
    }

    // Fit bounds to markers
    if (markers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));

      mapRef.current.fitBounds(bounds, {
        padding: { top: 40, bottom: 40, left: 40, right: 40 },
        maxZoom: 14,
        duration: 500,
      });
    }
  }, [markers, mapLoaded, activeItemId, onMarkerClick]);

  // Focus on active item
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !activeItemId) return;

    const activeMarker = markers.find((m) => m.id === activeItemId);
    if (activeMarker) {
      mapRef.current.flyTo({
        center: [activeMarker.lng, activeMarker.lat],
        zoom: 14,
        duration: 500,
      });
    }
  }, [activeItemId, markers, mapLoaded]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const centerOnMarkers = useCallback(() => {
    if (!mapRef.current || markers.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    markers.forEach((m) => bounds.extend([m.lng, m.lat]));
    mapRef.current.fitBounds(bounds, {
      padding: { top: 40, bottom: 40, left: 40, right: 40 },
      maxZoom: 14,
      duration: 500,
    });
  }, [markers]);

  const aspectClass = aspectRatio === 'wide' ? 'aspect-[3/1]' : 'aspect-square';

  return (
    <div
      className={`
        relative bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden
        ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : aspectClass}
        ${className}
      `}
    >
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Map Controls */}
      {mapLoaded && !mapError && showControls && (
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button
            onClick={centerOnMarkers}
            className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Center on markers"
          >
            <Navigation className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      )}

      {/* Loading state */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-900 dark:border-gray-800 dark:border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* No markers fallback */}
      {markers.length === 0 && mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-400 dark:text-gray-500 text-xs bg-white/80 dark:bg-gray-900/80 px-3 py-1.5 rounded-full">
            Add places to see them on map
          </p>
        </div>
      )}

      {/* Error state - fallback to static map if possible */}
      {mapError && (
        <StaticMapFallback markers={markers} />
      )}
    </div>
  );
}

// Fallback static map using Mapbox Static Images API (works with sk.* tokens)
function StaticMapFallback({ markers }: { markers: MapMarker[] }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!token || markers.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <AlertTriangle className="w-6 h-6 text-gray-300 dark:text-gray-700 mb-2" />
        <p className="text-gray-400 dark:text-gray-500 text-xs">Map unavailable</p>
      </div>
    );
  }

  // Calculate center from markers
  const sumLat = markers.reduce((sum, m) => sum + m.lat, 0);
  const sumLng = markers.reduce((sum, m) => sum + m.lng, 0);
  const center = {
    lat: sumLat / markers.length,
    lng: sumLng / markers.length,
  };

  // Create pins for static map
  const pins = markers
    .slice(0, 50) // Static API limit
    .map((m) => `pin-s-${m.index}+111827(${m.lng},${m.lat})`)
    .join(',');

  const staticUrl = `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${pins}/${center.lng},${center.lat},11,0/600x200@2x?access_token=${token}`;

  return (
    <div className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={staticUrl}
        alt="Trip map"
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}
