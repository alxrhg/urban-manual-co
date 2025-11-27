'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2, Minimize2, Navigation, AlertTriangle } from 'lucide-react';
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

// Grayscale map style for Google Maps
const GRAYSCALE_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
  { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

/**
 * TripPlannerMap - Grayscale map for trip planner using Google Maps
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
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);

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

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setMapError('Map not configured');
      return;
    }

    // Check if already loaded
    if (window.google?.maps) {
      setGoogleLoaded(true);
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&v=weekly`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setGoogleLoaded(true);
    };

    script.onerror = () => {
      setMapError('Failed to load Google Maps');
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove script on unmount as it may be used by other components
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !googleLoaded || mapRef.current || mapError) return;

    try {
      mapRef.current = new google.maps.Map(mapContainer.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        styles: GRAYSCALE_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_BOTTOM,
        },
        mapId: 'trip-planner-map', // Required for Advanced Markers
      });

      setMapLoaded(true);
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      setMapError('Map failed to initialize');
    }

    return () => {
      // Cleanup markers
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
      polylineRef.current?.setMap(null);
      mapRef.current = null;
    };
  }, [googleLoaded, mapError]);

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !googleLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    // Clear existing polyline
    polylineRef.current?.setMap(null);
    polylineRef.current = null;

    if (markers.length === 0) return;

    // Add new markers
    markers.forEach((marker) => {
      // Create custom marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'trip-marker';
      markerEl.style.cssText = `
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
      `;
      markerEl.textContent = String(marker.index);

      markerEl.addEventListener('mouseenter', () => {
        markerEl.style.transform = 'scale(1.1)';
      });

      markerEl.addEventListener('mouseleave', () => {
        markerEl.style.transform = 'scale(1)';
      });

      const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: marker.lat, lng: marker.lng },
        content: markerEl,
        title: marker.label,
      });

      advancedMarker.addListener('click', () => {
        onMarkerClick?.(marker.id);
      });

      markersRef.current.push(advancedMarker);
    });

    // Fit bounds to markers
    if (markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
      mapRef.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });

      // Don't zoom too far in
      const listener = google.maps.event.addListener(mapRef.current, 'idle', () => {
        const zoom = mapRef.current?.getZoom();
        if (zoom && zoom > 15) {
          mapRef.current?.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }

    // Draw route line
    if (markers.length > 1) {
      polylineRef.current = new google.maps.Polyline({
        path: markers.map((m) => ({ lat: m.lat, lng: m.lng })),
        geodesic: true,
        strokeColor: '#6b7280',
        strokeOpacity: 1.0,
        strokeWeight: 2,
        map: mapRef.current,
      });

      // Make it dashed using icons
      polylineRef.current.setOptions({
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              scale: 3,
            },
            offset: '0',
            repeat: '10px',
          },
        ],
        strokeOpacity: 0,
      });
    }
  }, [markers, mapLoaded, activeItemId, onMarkerClick, googleLoaded]);

  // Focus on active item
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !activeItemId) return;

    const activeMarker = markers.find((m) => m.id === activeItemId);
    if (activeMarker) {
      mapRef.current.panTo({ lat: activeMarker.lat, lng: activeMarker.lng });
      mapRef.current.setZoom(15);
    }
  }, [activeItemId, markers, mapLoaded]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const centerOnMarkers = useCallback(() => {
    if (!mapRef.current || markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
    mapRef.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
  }, [markers]);

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
      {mapLoaded && !mapError && (
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
      )}

      {/* Loading state */}
      {!mapLoaded && googleLoaded && !mapError && (
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

      {/* Error state */}
      {mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
          <AlertTriangle className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-gray-400 dark:text-gray-600 text-sm">
            {mapError}
          </p>
        </div>
      )}

      {/* Loading Google Maps */}
      {!googleLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 dark:border-gray-800 dark:border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

