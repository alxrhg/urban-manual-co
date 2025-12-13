'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Maximize2,
  Minimize2,
  Navigation,
  AlertTriangle,
  Footprints,
  Car,
  Train,
  GripVertical,
  Clock,
} from 'lucide-react';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { useTripRoutes, TravelMode, RouteSegment } from '@/lib/hooks/useTripRoutes';

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
  onReorder?: (dayNumber: number, newItems: EnrichedItineraryItem[]) => void;
  className?: string;
  showRoutes?: boolean;
  enableDragReorder?: boolean;
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

// Route colors by travel mode
const ROUTE_COLORS: Record<TravelMode, string> = {
  walking: '#10b981', // Emerald
  transit: '#3b82f6', // Blue
  driving: '#6366f1', // Indigo
};

/**
 * TripPlannerMap - Enhanced map with route visualization and drag-to-reorder
 * Features:
 * - Actual routes between stops (not straight lines)
 * - Travel time labels on routes
 * - Travel mode selector (walking/transit/driving)
 * - Drag-to-reorder markers
 */
export default function TripPlannerMap({
  days,
  selectedDayNumber,
  activeItemId,
  onMarkerClick,
  onReorder,
  className = '',
  showRoutes = true,
  enableDragReorder = false,
}: TripPlannerMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const labelsRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [draggedMarkerId, setDraggedMarkerId] = useState<string | null>(null);

  // Get the selected day's items for reordering
  const selectedDayItems = useMemo(() => {
    if (!selectedDayNumber) return [];
    const day = days.find((d) => d.dayNumber === selectedDayNumber);
    return day?.items || [];
  }, [days, selectedDayNumber]);

  // Extract markers from days
  const markers: MapMarker[] = useMemo(() => {
    const result: MapMarker[] = [];
    days.forEach((day) => {
      if (selectedDayNumber && day.dayNumber !== selectedDayNumber) return;

      day.items.forEach((item, index) => {
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

  // Use the trip routes hook to fetch actual routes
  const {
    segments,
    loading: routesLoading,
    mode,
    setMode,
    totalDuration,
    totalDistanceMeters,
  } = useTripRoutes({
    markers: markers.map((m) => ({
      id: m.id,
      lat: m.lat,
      lng: m.lng,
      label: m.label,
      index: m.index,
    })),
    enabled: showRoutes && markers.length >= 2,
  });

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
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      labelsRef.current.forEach((l) => (l.map = null));
      labelsRef.current = [];
      mapRef.current = null;
    };
  }, [googleLoaded, mapError]);

  // Handle marker drag end for reordering
  const handleMarkerDragEnd = useCallback(
    (markerId: string, newPosition: { lat: number; lng: number }) => {
      if (!enableDragReorder || !onReorder || !selectedDayNumber) return;

      // Find which marker position was closest to the drop location
      let closestIndex = -1;
      let closestDistance = Infinity;

      markers.forEach((m, idx) => {
        if (m.id === markerId) return; // Skip the dragged marker itself

        const dist = Math.sqrt(
          Math.pow(m.lat - newPosition.lat, 2) + Math.pow(m.lng - newPosition.lng, 2)
        );

        if (dist < closestDistance) {
          closestDistance = dist;
          closestIndex = idx;
        }
      });

      if (closestIndex === -1) return;

      // Determine insertion position based on drag direction
      const draggedMarker = markers.find((m) => m.id === markerId);
      if (!draggedMarker) return;

      const draggedIndex = markers.findIndex((m) => m.id === markerId);

      // Reorder items
      const newItems = [...selectedDayItems];
      const [movedItem] = newItems.splice(draggedIndex, 1);

      // Insert at new position
      const insertIndex = closestIndex > draggedIndex ? closestIndex : closestIndex;
      newItems.splice(insertIndex, 0, movedItem);

      onReorder(selectedDayNumber, newItems);
      setDraggedMarkerId(null);
    },
    [enableDragReorder, onReorder, selectedDayNumber, markers, selectedDayItems]
  );

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !googleLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    // Clear existing polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    // Clear existing labels
    labelsRef.current.forEach((l) => (l.map = null));
    labelsRef.current = [];

    if (markers.length === 0) return;

    // Add new markers
    markers.forEach((marker) => {
      // Create custom marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'trip-marker';

      const isActive = marker.id === activeItemId;
      const isDragging = marker.id === draggedMarkerId;

      markerEl.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        ${
          isActive
            ? 'background: #111827; color: white;'
            : 'background: white; color: #111827; border: 2px solid #e5e7eb;'
        }
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        cursor: ${enableDragReorder ? 'grab' : 'pointer'};
        transition: transform 0.2s, box-shadow 0.2s;
        ${isDragging ? 'transform: scale(1.2); box-shadow: 0 8px 16px rgba(0,0,0,0.2);' : ''}
      `;
      markerEl.textContent = String(marker.index);

      // Add drag indicator if drag is enabled
      if (enableDragReorder) {
        const dragIndicator = document.createElement('div');
        dragIndicator.style.cssText = `
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: 4px;
          padding: 2px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          opacity: 0;
          transition: opacity 0.2s;
        `;
        dragIndicator.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/></svg>`;

        markerEl.appendChild(dragIndicator);

        markerEl.addEventListener('mouseenter', () => {
          dragIndicator.style.opacity = '1';
          markerEl.style.cursor = 'grab';
        });

        markerEl.addEventListener('mouseleave', () => {
          if (!isDragging) {
            dragIndicator.style.opacity = '0';
          }
        });
      }

      markerEl.addEventListener('mouseenter', () => {
        if (!isDragging) {
          markerEl.style.transform = 'scale(1.1)';
          markerEl.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
        }
      });

      markerEl.addEventListener('mouseleave', () => {
        if (!isDragging) {
          markerEl.style.transform = 'scale(1)';
          markerEl.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        }
      });

      const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: marker.lat, lng: marker.lng },
        content: markerEl,
        title: marker.label,
        gmpDraggable: enableDragReorder,
      });

      advancedMarker.addListener('click', () => {
        onMarkerClick?.(marker.id);
      });

      if (enableDragReorder) {
        advancedMarker.addListener('dragstart', () => {
          setDraggedMarkerId(marker.id);
          markerEl.style.cursor = 'grabbing';
        });

        advancedMarker.addListener('dragend', () => {
          const pos = advancedMarker.position;
          if (pos) {
            handleMarkerDragEnd(marker.id, {
              lat: typeof pos.lat === 'function' ? pos.lat() : pos.lat,
              lng: typeof pos.lng === 'function' ? pos.lng() : pos.lng,
            });
          }
        });
      }

      markersRef.current.push(advancedMarker);
    });

    // Fit bounds to markers
    if (markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
      mapRef.current.fitBounds(bounds, { top: 80, bottom: 50, left: 50, right: 50 });

      // Don't zoom too far in
      const listener = google.maps.event.addListener(mapRef.current, 'idle', () => {
        const zoom = mapRef.current?.getZoom();
        if (zoom && zoom > 15) {
          mapRef.current?.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }, [markers, mapLoaded, activeItemId, onMarkerClick, googleLoaded, enableDragReorder, draggedMarkerId, handleMarkerDragEnd]);

  // Draw route lines and labels when segments change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !googleLoaded) return;

    // Clear existing polylines and labels
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    labelsRef.current.forEach((l) => (l.map = null));
    labelsRef.current = [];

    if (!showRoutes || segments.length === 0) return;

    // Draw routes for each segment
    segments.forEach((segment) => {
      // Create polyline from decoded path
      const polyline = new google.maps.Polyline({
        path: segment.polyline.map((p) => ({ lat: p.lat, lng: p.lng })),
        geodesic: true,
        strokeColor: ROUTE_COLORS[segment.mode],
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: mapRef.current,
      });

      polylinesRef.current.push(polyline);

      // Add travel time label at the midpoint of the segment
      if (segment.duration && segment.duration !== 'N/A') {
        const midIndex = Math.floor(segment.polyline.length / 2);
        const midPoint = segment.polyline[midIndex];

        const labelEl = document.createElement('div');
        labelEl.style.cssText = `
          display: flex;
          align-items: center;
          gap: 4px;
          background: white;
          border: 1px solid ${ROUTE_COLORS[segment.mode]};
          border-radius: 12px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 500;
          color: #374151;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          white-space: nowrap;
        `;

        // Add clock icon and duration
        labelEl.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>${segment.duration}</span>
        `;

        const labelMarker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: { lat: midPoint.lat, lng: midPoint.lng },
          content: labelEl,
        });

        labelsRef.current.push(labelMarker);
      }
    });
  }, [segments, showRoutes, mapLoaded, googleLoaded]);

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
    mapRef.current.fitBounds(bounds, { top: 80, bottom: 50, left: 50, right: 50 });
  }, [markers]);

  // Mode button component
  const ModeButton = ({
    modeValue,
    icon: Icon,
    label,
  }: {
    modeValue: TravelMode;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }) => (
    <button
      onClick={() => setMode(modeValue)}
      className={`
        p-2 rounded-lg transition-all
        ${mode === modeValue
          ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
          : 'bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }
      `}
      title={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

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

      {/* Mode Selector */}
      {mapLoaded && !mapError && showRoutes && markers.length >= 2 && (
        <div className="absolute top-4 left-4 flex items-center gap-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-1 shadow-md">
          <ModeButton modeValue="walking" icon={Footprints} label="Walking" />
          <ModeButton modeValue="transit" icon={Train} label="Transit" />
          <ModeButton modeValue="driving" icon={Car} label="Driving" />
        </div>
      )}

      {/* Route Info Panel */}
      {mapLoaded && !mapError && showRoutes && segments.length > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow-md flex items-center gap-4 text-sm">
          {routesLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              Calculating routes...
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{totalDuration}</span>
                <span className="text-gray-400">total</span>
              </div>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />
              <div className="text-gray-500 dark:text-gray-400">
                {(totalDistanceMeters / 1000).toFixed(1)} km
              </div>
            </>
          )}
        </div>
      )}

      {/* Drag hint */}
      {enableDragReorder && mapLoaded && markers.length >= 2 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
          <GripVertical className="w-3 h-3" />
          Drag markers to reorder
        </div>
      )}

      {/* Map Controls */}
      {mapLoaded && !mapError && (
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            onClick={centerOnMarkers}
            className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Center on markers"
          >
            <Navigation className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
          <p className="text-gray-400 dark:text-gray-600 text-sm bg-white/80 dark:bg-gray-900/80 px-4 py-2 rounded-xl">
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
