import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { EnrichedItineraryItem, TripDay } from './useTripEditor';
import { getAirportCoordinates } from '@/lib/utils/airports';

export interface MapViewport {
  center: { lat: number; lng: number };
  zoom: number;
  markers: MapMarkerData[];
}

export interface MapMarkerData {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: 'place' | 'hotel' | 'flight-departure' | 'flight-arrival';
  dayNumber: number;
  index: number;
  item: EnrichedItineraryItem;
}

interface UseMapViewportSyncOptions {
  days: TripDay[];
  selectedDayNumber: number;
  containerRef: React.RefObject<HTMLElement | null>;
  itemRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  enabled?: boolean;
}

interface UseMapViewportSyncReturn {
  activeItemId: string | null;
  focusedMarker: MapMarkerData | null;
  viewport: MapViewport | null;
  allMarkers: MapMarkerData[];
  dayMarkers: MapMarkerData[];

  // Map → Itinerary sync
  handleMarkerClick: (itemId: string) => void;

  // Itinerary → Map sync
  handleItemIntersect: (itemId: string, isIntersecting: boolean) => void;
  scrollToItem: (itemId: string) => void;

  // Manual focus
  setActiveItem: (itemId: string | null) => void;

  // Camera control
  flyToItem: (itemId: string) => void;
  flyToBounds: (markers: MapMarkerData[]) => void;
  resetToDay: (dayNumber: number) => void;
}

/**
 * useMapViewportSync - Bi-directional sync between map and itinerary
 *
 * Handles:
 * - Scroll position → Map viewport (which item is in view)
 * - Marker click → Itinerary scroll (focus item in list)
 * - Day changes → Map reset to day bounds
 * - Smooth camera transitions
 */
export function useMapViewportSync({
  days,
  selectedDayNumber,
  containerRef,
  itemRefs,
  enabled = true,
}: UseMapViewportSyncOptions): UseMapViewportSyncReturn {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [focusedMarker, setFocusedMarker] = useState<MapMarkerData | null>(null);
  const [viewport, setViewport] = useState<MapViewport | null>(null);

  // Track visible items in viewport
  const visibleItemsRef = useRef<Set<string>>(new Set());

  // Prevent scroll-triggered updates while programmatically scrolling
  const isProgrammaticScrollRef = useRef(false);

  // Extract all markers from days
  const allMarkers = useMemo(() => {
    const markers: MapMarkerData[] = [];
    let stopIndex = 0;

    days.forEach((day) => {
      day.items.forEach((item) => {
        const itemType = item.parsedNotes?.type;
        const isHotel = itemType === 'hotel';
        const isFlight = itemType === 'flight';

        if (isFlight) {
          // Flight: create departure and arrival markers
          const fromAirport = item.parsedNotes?.from;
          const toAirport = item.parsedNotes?.to;

          const departureCoords = getAirportCoordinates(fromAirport);
          if (departureCoords) {
            markers.push({
              id: `${item.id}-departure`,
              lat: departureCoords.latitude,
              lng: departureCoords.longitude,
              label: `${fromAirport} (Departure)`,
              type: 'flight-departure',
              dayNumber: day.dayNumber,
              index: 0,
              item,
            });
          }

          const arrivalCoords = getAirportCoordinates(toAirport);
          if (arrivalCoords) {
            markers.push({
              id: `${item.id}-arrival`,
              lat: arrivalCoords.latitude,
              lng: arrivalCoords.longitude,
              label: `${toAirport} (Arrival)`,
              type: 'flight-arrival',
              dayNumber: day.dayNumber,
              index: 0,
              item,
            });
          }
        } else {
          // Hotel or regular place
          const lat = item.parsedNotes?.latitude ?? item.destination?.latitude;
          const lng = item.parsedNotes?.longitude ?? item.destination?.longitude;

          if (lat && lng) {
            if (!isHotel) {
              stopIndex++;
            }

            markers.push({
              id: item.id,
              lat,
              lng,
              label: item.title || `Stop ${stopIndex}`,
              type: isHotel ? 'hotel' : 'place',
              dayNumber: day.dayNumber,
              index: isHotel ? 0 : stopIndex,
              item,
            });
          }
        }
      });
    });

    return markers;
  }, [days]);

  // Filter markers for selected day
  const dayMarkers = useMemo(() => {
    return allMarkers.filter((m) => m.dayNumber === selectedDayNumber);
  }, [allMarkers, selectedDayNumber]);

  // Calculate bounds for a set of markers
  const calculateBounds = useCallback((markers: MapMarkerData[]) => {
    if (markers.length === 0) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    markers.forEach((m) => {
      minLat = Math.min(minLat, m.lat);
      maxLat = Math.max(maxLat, m.lat);
      minLng = Math.min(minLng, m.lng);
      maxLng = Math.max(maxLng, m.lng);
    });

    const center = {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    };

    // Calculate appropriate zoom based on bounds span
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const maxSpan = Math.max(latSpan, lngSpan);

    let zoom = 14;
    if (maxSpan > 0.5) zoom = 10;
    else if (maxSpan > 0.1) zoom = 12;
    else if (maxSpan > 0.02) zoom = 14;
    else zoom = 15;

    return { center, zoom, markers };
  }, []);

  // Get marker for an item ID
  const getMarkerForItem = useCallback((itemId: string): MapMarkerData | null => {
    // Check direct match
    let marker = allMarkers.find((m) => m.id === itemId);
    if (marker) return marker;

    // Check flight markers (item id without -departure/-arrival suffix)
    const baseId = itemId.replace(/-departure$|-arrival$/, '');
    marker = allMarkers.find((m) => m.item.id === baseId);
    return marker || null;
  }, [allMarkers]);

  // Handle marker click → scroll to item
  const handleMarkerClick = useCallback((itemId: string) => {
    const marker = getMarkerForItem(itemId);
    if (!marker) return;

    const actualItemId = marker.item.id;
    setActiveItemId(actualItemId);
    setFocusedMarker(marker);

    // Update viewport to focus on this marker
    setViewport({
      center: { lat: marker.lat, lng: marker.lng },
      zoom: 15,
      markers: [marker],
    });

    // Scroll to item in list
    scrollToItem(actualItemId);
  }, [getMarkerForItem]);

  // Scroll to item in itinerary
  const scrollToItem = useCallback((itemId: string) => {
    const element = itemRefs.current.get(itemId);
    if (!element || !containerRef.current) return;

    isProgrammaticScrollRef.current = true;

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    // Reset flag after scroll completes
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 500);
  }, [containerRef, itemRefs]);

  // Handle item entering/leaving viewport (from IntersectionObserver)
  const handleItemIntersect = useCallback((itemId: string, isIntersecting: boolean) => {
    if (!enabled || isProgrammaticScrollRef.current) return;

    if (isIntersecting) {
      visibleItemsRef.current.add(itemId);
    } else {
      visibleItemsRef.current.delete(itemId);
    }

    // Use the topmost visible item as the active one
    const visibleItems = Array.from(visibleItemsRef.current);
    if (visibleItems.length === 0) return;

    // Find the first visible item in document order
    const selectedDay = days.find((d) => d.dayNumber === selectedDayNumber);
    if (!selectedDay) return;

    const firstVisibleItem = selectedDay.items.find((item) =>
      visibleItems.includes(item.id)
    );

    if (firstVisibleItem && firstVisibleItem.id !== activeItemId) {
      const marker = getMarkerForItem(firstVisibleItem.id);
      setActiveItemId(firstVisibleItem.id);
      setFocusedMarker(marker);

      if (marker) {
        setViewport({
          center: { lat: marker.lat, lng: marker.lng },
          zoom: 15,
          markers: [marker],
        });
      }
    }
  }, [enabled, days, selectedDayNumber, activeItemId, getMarkerForItem]);

  // Manual focus on item
  const setActiveItem = useCallback((itemId: string | null) => {
    setActiveItemId(itemId);

    if (itemId) {
      const marker = getMarkerForItem(itemId);
      setFocusedMarker(marker);

      if (marker) {
        setViewport({
          center: { lat: marker.lat, lng: marker.lng },
          zoom: 15,
          markers: [marker],
        });
      }
    } else {
      setFocusedMarker(null);
    }
  }, [getMarkerForItem]);

  // Fly to specific item
  const flyToItem = useCallback((itemId: string) => {
    const marker = getMarkerForItem(itemId);
    if (!marker) return;

    setActiveItemId(marker.item.id);
    setFocusedMarker(marker);
    setViewport({
      center: { lat: marker.lat, lng: marker.lng },
      zoom: 16,
      markers: [marker],
    });
  }, [getMarkerForItem]);

  // Fly to bounds of multiple markers
  const flyToBounds = useCallback((markers: MapMarkerData[]) => {
    const bounds = calculateBounds(markers);
    if (bounds) {
      setViewport(bounds);
    }
  }, [calculateBounds]);

  // Reset to day overview
  const resetToDay = useCallback((dayNumber: number) => {
    const markers = allMarkers.filter((m) => m.dayNumber === dayNumber);
    const bounds = calculateBounds(markers);

    if (bounds) {
      setViewport(bounds);
      setActiveItemId(null);
      setFocusedMarker(null);
    }
  }, [allMarkers, calculateBounds]);

  // Reset viewport when day changes
  useEffect(() => {
    if (enabled) {
      resetToDay(selectedDayNumber);
      visibleItemsRef.current.clear();
    }
  }, [selectedDayNumber, enabled, resetToDay]);

  return {
    activeItemId,
    focusedMarker,
    viewport,
    allMarkers,
    dayMarkers,
    handleMarkerClick,
    handleItemIntersect,
    scrollToItem,
    setActiveItem,
    flyToItem,
    flyToBounds,
    resetToDay,
  };
}
