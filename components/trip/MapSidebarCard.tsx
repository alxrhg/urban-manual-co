'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Maximize2, MapPin, Navigation, AlertTriangle } from 'lucide-react';
import type { TripDay } from '@/lib/hooks/useTripEditor';
import { getAirportCoordinates } from '@/lib/utils/airports';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  dayNumber: number;
  index: number;
  itemType?: string;
  isArrivalAirport?: boolean;
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

// Day colors - monochromatic scheme per design system (matching TripInteractiveMap)
const DAY_COLORS = [
  { bg: '#111827', border: '#ffffff', text: '#ffffff' }, // Day 1 - Dark (gray-900)
  { bg: '#374151', border: '#ffffff', text: '#ffffff' }, // Day 2 - Medium (gray-700)
  { bg: '#6b7280', border: '#ffffff', text: '#ffffff' }, // Day 3 - Gray (gray-500)
  { bg: '#1f2937', border: '#ffffff', text: '#ffffff' }, // Day 4 - Charcoal (gray-800)
  { bg: '#4b5563', border: '#ffffff', text: '#ffffff' }, // Day 5 - Slate (gray-600)
  { bg: '#030712', border: '#ffffff', text: '#ffffff' }, // Day 6 - Near black (gray-950)
  { bg: '#9ca3af', border: '#111827', text: '#111827' }, // Day 7 - Light gray (gray-400)
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
    let stopIndex = 0; // Counter for numbered stops (excluding hotels/flights)

    days.forEach((day) => {
      // Filter to selected day if specified
      if (selectedDayNumber && day.dayNumber !== selectedDayNumber) return;

      day.items.forEach((item) => {
        const itemType = item.parsedNotes?.type;
        const isHotel = itemType === 'hotel';
        const isFlight = itemType === 'flight';

        if (isFlight) {
          // For flights, create markers for both departure and arrival airports
          const fromAirport = item.parsedNotes?.from;
          const toAirport = item.parsedNotes?.to;

          // Departure airport marker
          const departureCoords = getAirportCoordinates(fromAirport);
          if (departureCoords) {
            result.push({
              id: `${item.id}-departure`,
              lat: departureCoords.latitude,
              lng: departureCoords.longitude,
              label: `${fromAirport} (Departure)`,
              dayNumber: day.dayNumber,
              index: 0,
              itemType: 'flight',
              isArrivalAirport: false,
            });
          }

          // Arrival airport marker
          const arrivalCoords = getAirportCoordinates(toAirport);
          if (arrivalCoords) {
            result.push({
              id: `${item.id}-arrival`,
              lat: arrivalCoords.latitude,
              lng: arrivalCoords.longitude,
              label: `${toAirport} (Arrival)`,
              dayNumber: day.dayNumber,
              index: 0,
              itemType: 'flight',
              isArrivalAirport: true,
            });
          }
        } else {
          // Hotels and regular places
          const lat = item.parsedNotes?.latitude ?? item.destination?.latitude;
          const lng = item.parsedNotes?.longitude ?? item.destination?.longitude;

          if (lat && lng) {
            if (!isHotel) {
              stopIndex++;
            }

            result.push({
              id: item.id,
              lat,
              lng,
              label: item.title || `Stop ${stopIndex}`,
              dayNumber: day.dayNumber,
              index: isHotel ? 0 : stopIndex,
              itemType,
            });
          }
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
      const isHotel = marker.itemType === 'hotel';
      const isFlight = marker.itemType === 'flight';

      const markerEl = document.createElement('div');

      if (isHotel) {
        // Hotel marker - building icon (smaller for sidebar)
        markerEl.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          width: ${isActive ? '28px' : '22px'};
          height: ${isActive ? '28px' : '22px'};
          border-radius: 6px;
          background: ${isActive ? colors.bg : 'white'};
          border: 2px solid ${colors.bg};
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          transition: all 0.2s ease;
        `;
        markerEl.innerHTML = `
          <svg width="${isActive ? '14' : '12'}" height="${isActive ? '14' : '12'}" viewBox="0 0 24 24" fill="none" stroke="${isActive ? colors.text : colors.bg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
            <path d="M10 6h4"/>
            <path d="M10 10h4"/>
            <path d="M10 14h4"/>
            <path d="M10 18h4"/>
          </svg>
        `;
      } else if (isFlight) {
        // Flight marker - plane icon (smaller for sidebar)
        markerEl.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          width: ${isActive ? '28px' : '22px'};
          height: ${isActive ? '28px' : '22px'};
          border-radius: 6px;
          background: ${isActive ? colors.bg : 'white'};
          border: 2px solid ${colors.bg};
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          transition: all 0.2s ease;
        `;
        markerEl.innerHTML = `
          <svg width="${isActive ? '14' : '12'}" height="${isActive ? '14' : '12'}" viewBox="0 0 24 24" fill="none" stroke="${isActive ? colors.text : colors.bg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
          </svg>
        `;
      } else {
        // Regular numbered marker
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
      }

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

    // Draw polylines for each day (excluding flight markers)
    Object.entries(markersByDay).forEach(([dayNumber, dayMarkers]) => {
      // Filter out flight markers from polylines
      const groundMarkers = dayMarkers.filter((m) => m.itemType !== 'flight');
      if (groundMarkers.length < 2) return;

      const colors = DAY_COLORS[(parseInt(dayNumber) - 1) % DAY_COLORS.length];
      const path = groundMarkers.map((m) => ({ lat: m.lat, lng: m.lng }));

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
