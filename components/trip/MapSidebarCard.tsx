'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Maximize2, MapPin, Navigation, AlertTriangle } from 'lucide-react';
import type { TripDay } from '@/lib/hooks/useTripEditor';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  dayNumber: number;
  index: number;
}

interface MapSidebarCardProps {
  days: TripDay[];
  selectedDayNumber?: number;
  activeItemId?: string | null;
  tripDestination?: string;
  onExpand?: () => void;
  onMarkerClick?: (itemId: string) => void;
  className?: string;
}

// Day colors for multi-day trips (matching TripInteractiveMap)
const DAY_COLORS = [
  { bg: '#111827', border: '#ffffff', text: '#ffffff' }, // Day 1 - Dark
  { bg: '#3b82f6', border: '#ffffff', text: '#ffffff' }, // Day 2 - Blue
  { bg: '#10b981', border: '#ffffff', text: '#ffffff' }, // Day 3 - Green
  { bg: '#f59e0b', border: '#ffffff', text: '#ffffff' }, // Day 4 - Amber
  { bg: '#8b5cf6', border: '#ffffff', text: '#ffffff' }, // Day 5 - Purple
  { bg: '#ec4899', border: '#ffffff', text: '#ffffff' }, // Day 6 - Pink
  { bg: '#06b6d4', border: '#ffffff', text: '#ffffff' }, // Day 7 - Cyan
];

// Grayscale map style for Google Maps
const GRAYSCALE_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
];

/**
 * MapSidebarCard - Compact map preview for sidebar
 * Shows a mini-map with markers and an expand button for full view
 */
export default function MapSidebarCard({
  days,
  selectedDayNumber,
  activeItemId,
  tripDestination,
  onExpand,
  onMarkerClick,
  className = '',
}: MapSidebarCardProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // Extract markers from days (filtered by selected day)
  const markers: MapMarker[] = useMemo(() => {
    const result: MapMarker[] = [];
    days.forEach((day) => {
      // Filter to selected day if specified
      if (selectedDayNumber && day.dayNumber !== selectedDayNumber) return;

      day.items.forEach((item, index) => {
        // Skip flights
        if (item.parsedNotes?.type === 'flight') return;

        const lat = item.parsedNotes?.latitude ?? item.destination?.latitude;
        const lng = item.parsedNotes?.longitude ?? item.destination?.longitude;

        if (lat && lng) {
          result.push({
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
    return result;
  }, [days, selectedDayNumber]);

  // Get unique days
  const uniqueDays = useMemo(() => {
    const daySet = new Set(markers.map((m) => m.dayNumber));
    return Array.from(daySet).sort((a, b) => a - b);
  }, [markers]);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !googleLoaded || mapRef.current || mapError) return;

    try {
      // Default center - will be overridden by markers or trip destination
      let center = { lat: 20, lng: 0 };
      let zoom = 2;

      mapRef.current = new google.maps.Map(mapContainer.current, {
        center,
        zoom,
        styles: GRAYSCALE_STYLES,
        disableDefaultUI: true,
        gestureHandling: 'cooperative',
        mapId: 'trip-sidebar-map',
      });

      // If we have a trip destination, geocode it
      if (tripDestination && markers.length === 0) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: tripDestination }, (results, status) => {
          if (status === 'OK' && results?.[0]?.geometry?.location && mapRef.current) {
            mapRef.current.setCenter(results[0].geometry.location);
            mapRef.current.setZoom(12);
          }
        });
      }

      setMapLoaded(true);
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      setMapError('Map failed to initialize');
    }

    return () => {
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      mapRef.current = null;
    };
  }, [googleLoaded, mapError, tripDestination, markers.length]);

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !googleLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    // Clear existing polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (markers.length === 0) return;

    // Group markers by day for polylines
    const markersByDay: Record<number, MapMarker[]> = {};
    markers.forEach((marker) => {
      if (!markersByDay[marker.dayNumber]) {
        markersByDay[marker.dayNumber] = [];
      }
      markersByDay[marker.dayNumber].push(marker);
    });

    // Add markers (smaller for sidebar)
    markers.forEach((marker) => {
      const colors = DAY_COLORS[(marker.dayNumber - 1) % DAY_COLORS.length];
      const isActive = marker.id === activeItemId;

      const markerEl = document.createElement('div');
      markerEl.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${isActive ? '28px' : '22px'};
        height: ${isActive ? '28px' : '22px'};
        border-radius: 50%;
        background: ${isActive ? colors.bg : 'white'};
        color: ${isActive ? colors.text : colors.bg};
        border: 2px solid ${isActive ? colors.border : colors.bg};
        font-weight: 600;
        font-size: ${isActive ? '12px' : '10px'};
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      markerEl.textContent = String(marker.index);

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

    // Draw polylines for each day
    Object.entries(markersByDay).forEach(([dayNumber, dayMarkers]) => {
      if (dayMarkers.length < 2) return;

      const colors = DAY_COLORS[(parseInt(dayNumber) - 1) % DAY_COLORS.length];
      const path = dayMarkers.map((m) => ({ lat: m.lat, lng: m.lng }));

      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: colors.bg,
        strokeOpacity: 0,
        strokeWeight: 2,
        map: mapRef.current,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 0.5,
              scale: 2,
            },
            offset: '0',
            repeat: '10px',
          },
        ],
      });

      polylinesRef.current.push(polyline);
    });

    // Fit bounds to markers
    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
    mapRef.current.fitBounds(bounds, { top: 30, bottom: 30, left: 30, right: 30 });

    // Don't zoom too far in
    const listener = google.maps.event.addListener(mapRef.current, 'idle', () => {
      const zoom = mapRef.current?.getZoom();
      if (zoom && zoom > 15) {
        mapRef.current?.setZoom(15);
      }
      google.maps.event.removeListener(listener);
    });
  }, [markers, mapLoaded, activeItemId, onMarkerClick, googleLoaded]);

  // Focus on active item
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !activeItemId) return;

    const activeMarker = markers.find((m) => m.id === activeItemId);
    if (activeMarker) {
      mapRef.current.panTo({ lat: activeMarker.lat, lng: activeMarker.lng });
    }
  }, [activeItemId, markers, mapLoaded]);

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}
    >
      {/* Map Preview Area */}
      <div className="relative h-48">
        {/* Google Map */}
        <div ref={mapContainer} className="w-full h-full" />

        {/* Expand Button */}
        {onExpand && mapLoaded && !mapError && (
          <button
            onClick={onExpand}
            className="absolute top-3 right-3 p-2 bg-white/95 dark:bg-gray-900/95 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-md border border-gray-200 dark:border-gray-700"
            title="Expand map"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}

        {/* Loading state */}
        {!mapLoaded && googleLoaded && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-900 dark:border-gray-800 dark:border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Loading Google Maps */}
        {!googleLoaded && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-900 dark:border-gray-800 dark:border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Error state */}
        {mapError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
            <AlertTriangle className="w-6 h-6 text-gray-300 dark:text-gray-700 mb-2" />
            <p className="text-gray-400 dark:text-gray-600 text-xs">{mapError}</p>
          </div>
        )}

        {/* No markers message overlay */}
        {markers.length === 0 && mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-white/80 dark:bg-gray-900/80 px-4 py-2 rounded-xl">
              <p className="text-gray-400 dark:text-gray-500 text-xs">
                Add stops to see them here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">
              Trip Map
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {markers.length} {markers.length === 1 ? 'stop' : 'stops'}
              </span>
              {selectedDayNumber && (
                <span className="text-xs text-gray-400">· Day {selectedDayNumber}</span>
              )}
            </div>
          </div>

          {/* Day color indicators */}
          {uniqueDays.length > 1 && (
            <div className="flex items-center gap-1">
              {uniqueDays.slice(0, 4).map((day) => {
                const colors = DAY_COLORS[(day - 1) % DAY_COLORS.length];
                return (
                  <div
                    key={day}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold"
                    style={{ background: colors.bg, color: colors.text }}
                    title={`Day ${day}`}
                  >
                    {day}
                  </div>
                );
              })}
              {uniqueDays.length > 4 && (
                <span className="text-[10px] text-gray-400 ml-1">+{uniqueDays.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
