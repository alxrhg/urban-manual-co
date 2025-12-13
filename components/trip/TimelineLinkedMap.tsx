'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Search,
  X,
  Navigation,
  Layers,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { MapViewport, MapMarkerData } from '@/lib/hooks/useMapViewportSync';
import type { Destination } from '@/types/destination';
import { getAirportCoordinates } from '@/lib/utils/airports';

interface TimelineLinkedMapProps {
  days: TripDay[];
  selectedDayNumber: number;
  activeItemId?: string | null;
  viewport?: MapViewport | null;
  tripDestination?: string;
  onMarkerClick?: (itemId: string) => void;
  onAddPlace?: (place: Partial<Destination>, dayNumber: number) => void;
  showSearch?: boolean;
  showDayFilter?: boolean;
  isFullscreen?: boolean;
  isCompact?: boolean;
  startInteractive?: boolean; // If false, map is static until tapped
  className?: string;
}

// Day colors - monochromatic scheme
const DAY_COLORS = [
  { bg: '#111827', border: '#ffffff', text: '#ffffff' }, // Day 1
  { bg: '#374151', border: '#ffffff', text: '#ffffff' }, // Day 2
  { bg: '#6b7280', border: '#ffffff', text: '#ffffff' }, // Day 3
  { bg: '#1f2937', border: '#ffffff', text: '#ffffff' }, // Day 4
  { bg: '#4b5563', border: '#ffffff', text: '#ffffff' }, // Day 5
  { bg: '#030712', border: '#ffffff', text: '#ffffff' }, // Day 6
  { bg: '#9ca3af', border: '#111827', text: '#111827' }, // Day 7
];

// Clean grayscale map style
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
 * TimelineLinkedMap - Enhanced map with flight path visualization
 *
 * Features:
 * - Curved flight paths with animated plane icons
 * - Route polylines between ground stops
 * - Day color coding
 * - Viewport sync with external state
 * - Active marker highlighting with glow effect
 */
export default function TimelineLinkedMap({
  days,
  selectedDayNumber,
  activeItemId,
  viewport,
  tripDestination,
  onMarkerClick,
  onAddPlace,
  showSearch = true,
  showDayFilter = true,
  isFullscreen = false,
  isCompact = false,
  startInteractive = false,
  className = '',
}: TimelineLinkedMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Interactive mode state - starts static unless specified
  const [isInteractive, setIsInteractive] = useState(startInteractive || isFullscreen);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const markerCleanupRef = useRef<(() => void)[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const flightPathsRef = useRef<{ polyline: google.maps.Polyline; planeMarker: google.maps.marker.AdvancedMarkerElement }[]>([]);
  const searchMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDay, setFilterDay] = useState<number | null>(selectedDayNumber);
  const [showLegend, setShowLegend] = useState(false);

  // Sync filter with selected day
  useEffect(() => {
    setFilterDay(selectedDayNumber);
  }, [selectedDayNumber]);

  // Extract markers from days
  const allMarkers = useMemo(() => {
    const markers: MapMarkerData[] = [];
    let stopIndex = 0;

    days.forEach((day) => {
      day.items.forEach((item) => {
        const itemType = item.parsedNotes?.type;
        const isHotel = itemType === 'hotel';
        const isFlight = itemType === 'flight';

        if (isFlight) {
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
          const lat = item.parsedNotes?.latitude ?? item.destination?.latitude;
          const lng = item.parsedNotes?.longitude ?? item.destination?.longitude;

          if (lat && lng) {
            if (!isHotel) stopIndex++;

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

  // Filter markers by day
  const markers = useMemo(() => {
    if (filterDay === null) return allMarkers;
    return allMarkers.filter((m) => m.dayNumber === filterDay);
  }, [allMarkers, filterDay]);

  // Get unique days for legend
  const uniqueDays = useMemo(() => {
    const daySet = new Set(allMarkers.map((m) => m.dayNumber));
    return Array.from(daySet).sort((a, b) => a - b);
  }, [allMarkers]);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setMapError('Map not configured');
      return;
    }

    if (window.google?.maps?.places) {
      setGoogleLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker,places,geometry&v=weekly`;
    script.async = true;
    script.defer = true;

    script.onload = () => setGoogleLoaded(true);
    script.onerror = () => setMapError('Failed to load Google Maps');

    document.head.appendChild(script);
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
        zoomControl: !isCompact,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_BOTTOM,
        },
        mapId: 'timeline-linked-map',
        gestureHandling: isCompact ? 'none' : (isInteractive ? 'greedy' : 'none'),
      });

      setMapLoaded(true);
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      setMapError('Map failed to initialize');
    }

    return () => {
      markerCleanupRef.current.forEach((cleanup) => cleanup());
      markerCleanupRef.current = [];
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      flightPathsRef.current.forEach(({ polyline, planeMarker }) => {
        polyline.setMap(null);
        planeMarker.map = null;
      });
      flightPathsRef.current = [];
      mapRef.current = null;
    };
  }, [googleLoaded, mapError, isCompact]);

  // Create curved path for flights
  const createFlightArc = useCallback((
    start: { lat: number; lng: number },
    end: { lat: number; lng: number }
  ): google.maps.LatLng[] => {
    const points: google.maps.LatLng[] = [];
    const numPoints = 50;

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;

      // Calculate position along the arc
      const lat = start.lat + (end.lat - start.lat) * t;
      const lng = start.lng + (end.lng - start.lng) * t;

      // Add curvature - higher arc for longer distances
      const distance = Math.sqrt(
        Math.pow(end.lat - start.lat, 2) + Math.pow(end.lng - start.lng, 2)
      );
      const arcHeight = Math.min(distance * 0.15, 5); // Max 5 degrees arc
      const curve = Math.sin(Math.PI * t) * arcHeight;

      points.push(new google.maps.LatLng(lat + curve, lng));
    }

    return points;
  }, []);

  // Update markers and routes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !googleLoaded) return;

    // Clear existing
    markerCleanupRef.current.forEach((cleanup) => cleanup());
    markerCleanupRef.current = [];
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    flightPathsRef.current.forEach(({ polyline, planeMarker }) => {
      polyline.setMap(null);
      planeMarker.map = null;
    });
    flightPathsRef.current = [];

    if (markers.length === 0) return;

    // Group markers by day for polylines
    const markersByDay: Record<number, MapMarkerData[]> = {};
    markers.forEach((marker) => {
      if (!markersByDay[marker.dayNumber]) {
        markersByDay[marker.dayNumber] = [];
      }
      markersByDay[marker.dayNumber].push(marker);
    });

    // Add markers
    markers.forEach((marker) => {
      const colors = DAY_COLORS[(marker.dayNumber - 1) % DAY_COLORS.length];
      const isActive = marker.id === activeItemId || marker.item.id === activeItemId;
      const isHotel = marker.type === 'hotel';
      const isFlight = marker.type === 'flight-departure' || marker.type === 'flight-arrival';

      const markerEl = document.createElement('div');
      markerEl.className = 'timeline-map-marker';

      if (isHotel) {
        // Hotel marker - building icon
        markerEl.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          width: ${isActive ? '44px' : '36px'};
          height: ${isActive ? '44px' : '36px'};
          border-radius: 10px;
          background: ${isActive ? colors.bg : 'white'};
          border: 2px solid ${colors.bg};
          box-shadow: ${isActive ? `0 0 0 4px ${colors.bg}33, 0 4px 12px rgba(0, 0, 0, 0.2)` : '0 4px 12px rgba(0, 0, 0, 0.15)'};
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: ${isActive ? 1000 : 1};
        `;
        markerEl.innerHTML = `
          <svg width="${isActive ? '22' : '18'}" height="${isActive ? '22' : '18'}" viewBox="0 0 24 24" fill="none" stroke="${isActive ? colors.text : colors.bg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
        // Flight marker - plane icon
        const isDeparture = marker.type === 'flight-departure';
        markerEl.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          width: ${isActive ? '44px' : '36px'};
          height: ${isActive ? '44px' : '36px'};
          border-radius: 10px;
          background: ${isActive ? colors.bg : 'white'};
          border: 2px solid ${colors.bg};
          box-shadow: ${isActive ? `0 0 0 4px ${colors.bg}33, 0 4px 12px rgba(0, 0, 0, 0.2)` : '0 4px 12px rgba(0, 0, 0, 0.15)'};
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: ${isActive ? 1000 : 1};
          transform: ${isDeparture ? 'rotate(-45deg)' : 'rotate(45deg)'};
        `;
        markerEl.innerHTML = `
          <svg width="${isActive ? '22' : '18'}" height="${isActive ? '22' : '18'}" viewBox="0 0 24 24" fill="none" stroke="${isActive ? colors.text : colors.bg}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: ${isDeparture ? 'rotate(45deg)' : 'rotate(-45deg)'}">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
          </svg>
        `;
      } else {
        // Regular numbered marker
        markerEl.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: center;
          width: ${isActive ? '44px' : '36px'};
          height: ${isActive ? '44px' : '36px'};
          border-radius: 50%;
          background: ${isActive ? colors.bg : 'white'};
          color: ${isActive ? colors.text : colors.bg};
          border: 2px solid ${isActive ? colors.border : colors.bg};
          font-weight: 600;
          font-size: ${isActive ? '16px' : '14px'};
          box-shadow: ${isActive ? `0 0 0 4px ${colors.bg}33, 0 4px 12px rgba(0, 0, 0, 0.2)` : '0 4px 12px rgba(0, 0, 0, 0.15)'};
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: ${isActive ? 1000 : 1};
        `;
        markerEl.textContent = String(marker.index);
      }

      // Hover effects
      const handleMouseEnter = () => {
        markerEl.style.transform = `scale(1.15)${isFlight ? ` rotate(${marker.type === 'flight-departure' ? '-45deg' : '45deg'})` : ''}`;
      };
      const handleMouseLeave = () => {
        markerEl.style.transform = isFlight ? `rotate(${marker.type === 'flight-departure' ? '-45deg' : '45deg'})` : 'scale(1)';
      };

      markerEl.addEventListener('mouseenter', handleMouseEnter);
      markerEl.addEventListener('mouseleave', handleMouseLeave);

      markerCleanupRef.current.push(() => {
        markerEl.removeEventListener('mouseenter', handleMouseEnter);
        markerEl.removeEventListener('mouseleave', handleMouseLeave);
      });

      const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: marker.lat, lng: marker.lng },
        content: markerEl,
        title: marker.label,
        zIndex: isActive ? 1000 : marker.index || 1,
      });

      advancedMarker.addListener('click', () => {
        onMarkerClick?.(marker.id);
      });

      markersRef.current.push(advancedMarker);
    });

    // Draw ground route polylines for each day
    Object.entries(markersByDay).forEach(([dayNumber, dayMarkers]) => {
      // Filter to ground markers only (exclude flight departure markers)
      const groundMarkers = dayMarkers.filter(
        (m) => m.type !== 'flight-departure'
      );

      if (groundMarkers.length < 2) return;

      const colors = DAY_COLORS[(parseInt(dayNumber) - 1) % DAY_COLORS.length];
      const path = groundMarkers.map((m) => ({ lat: m.lat, lng: m.lng }));

      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: colors.bg,
        strokeOpacity: 0,
        strokeWeight: 3,
        map: mapRef.current,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 0.5,
              scale: 3,
            },
            offset: '0',
            repeat: '12px',
          },
        ],
      });

      polylinesRef.current.push(polyline);
    });

    // Draw flight paths with curved lines and animated plane
    const flightMarkers = markers.filter(
      (m) => m.type === 'flight-departure' || m.type === 'flight-arrival'
    );
    const processedFlights = new Set<string>();

    flightMarkers.forEach((marker) => {
      const flightItemId = marker.item.id;
      if (processedFlights.has(flightItemId)) return;
      processedFlights.add(flightItemId);

      const departure = flightMarkers.find((m) => m.id === `${flightItemId}-departure`);
      const arrival = flightMarkers.find((m) => m.id === `${flightItemId}-arrival`);

      if (departure && arrival) {
        const colors = DAY_COLORS[(marker.dayNumber - 1) % DAY_COLORS.length];
        const isActive = activeItemId === flightItemId;

        // Create curved path
        const arcPath = createFlightArc(
          { lat: departure.lat, lng: departure.lng },
          { lat: arrival.lat, lng: arrival.lng }
        );

        const flightPolyline = new google.maps.Polyline({
          path: arcPath,
          geodesic: false,
          strokeColor: colors.bg,
          strokeOpacity: isActive ? 0.8 : 0.4,
          strokeWeight: isActive ? 3 : 2,
          map: mapRef.current,
        });

        // Create animated plane marker
        const planeEl = document.createElement('div');
        planeEl.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${colors.bg}" stroke="none">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
          </svg>
        `;
        planeEl.style.cssText = `
          transform: rotate(45deg);
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        `;

        // Position plane at midpoint of arc
        const midPoint = arcPath[Math.floor(arcPath.length / 2)];

        const planeMarker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: midPoint,
          content: planeEl,
          zIndex: 500,
        });

        flightPathsRef.current.push({ polyline: flightPolyline, planeMarker });
      }
    });

    // Fit bounds to markers
    if (markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
      mapRef.current.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });

      // Don't zoom too far in
      const listener = google.maps.event.addListener(mapRef.current, 'idle', () => {
        const zoom = mapRef.current?.getZoom();
        if (zoom && zoom > 16) {
          mapRef.current?.setZoom(16);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }, [markers, mapLoaded, activeItemId, onMarkerClick, googleLoaded, createFlightArc]);

  // Respond to viewport changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !viewport) return;

    mapRef.current.panTo(viewport.center);
    mapRef.current.setZoom(viewport.zoom);
  }, [viewport, mapLoaded]);

  // Update gesture handling when interactive mode changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || isCompact) return;
    mapRef.current.setOptions({
      gestureHandling: isInteractive ? 'greedy' : 'none',
    });
  }, [isInteractive, mapLoaded, isCompact]);

  // Enable interactive mode handler
  const enableInteractive = useCallback(() => {
    if (!isInteractive && !isCompact) {
      setIsInteractive(true);
    }
  }, [isInteractive, isCompact]);

  // Initialize autocomplete
  useEffect(() => {
    if (!googleLoaded || !mapLoaded || !searchInputRef.current || autocompleteRef.current) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(searchInputRef.current, {
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types'],
    });

    if (tripDestination && mapRef.current) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: tripDestination }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const location = results[0].geometry.location;
          const bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(location.lat() - 0.5, location.lng() - 0.5),
            new google.maps.LatLng(location.lat() + 0.5, location.lng() + 0.5)
          );
          autocompleteRef.current?.setBounds(bounds);
        }
      });
    }

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location && onAddPlace) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        mapRef.current?.panTo({ lat, lng });
        mapRef.current?.setZoom(15);

        // Show search marker and prompt to add
        showSearchResultMarker({
          name: place.name || '',
          lat,
          lng,
          address: place.formatted_address || '',
          types: place.types || [],
        });
      }
    });
  }, [googleLoaded, mapLoaded, tripDestination, onAddPlace]);

  // Show search result marker
  const showSearchResultMarker = useCallback((result: {
    name: string;
    lat: number;
    lng: number;
    address: string;
    types: string[];
  }) => {
    if (!mapRef.current || !onAddPlace) return;

    if (searchMarkerRef.current) {
      searchMarkerRef.current.map = null;
    }

    const markerEl = document.createElement('div');
    markerEl.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
      ">
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: #111827;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg style="transform: rotate(45deg); width: 20px; height: 20px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <div style="
          margin-top: 8px;
          padding: 8px 12px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          max-width: 200px;
        ">
          <div style="font-weight: 600; font-size: 13px; color: #111827;">${result.name}</div>
          <button
            id="add-to-day-btn"
            style="
              margin-top: 8px;
              width: 100%;
              padding: 6px 12px;
              background: #111827;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 500;
              cursor: pointer;
            "
          >
            Add to Day ${filterDay || selectedDayNumber}
          </button>
        </div>
      </div>
    `;

    searchMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: { lat: result.lat, lng: result.lng },
      content: markerEl,
    });

    setTimeout(() => {
      const addBtn = document.getElementById('add-to-day-btn');
      if (addBtn) {
        addBtn.onclick = () => {
          onAddPlace(
            {
              name: result.name,
              city: tripDestination || '',
              latitude: result.lat,
              longitude: result.lng,
              category: mapPlaceTypeToCategory(result.types),
            },
            filterDay || selectedDayNumber
          );
          searchMarkerRef.current && (searchMarkerRef.current.map = null);
          setSearchQuery('');
        };
      }
    }, 100);
  }, [filterDay, selectedDayNumber, onAddPlace, tripDestination]);

  const mapPlaceTypeToCategory = (types: string[]): string => {
    if (types.includes('restaurant') || types.includes('food')) return 'restaurant';
    if (types.includes('cafe')) return 'cafe';
    if (types.includes('bar')) return 'bar';
    if (types.includes('lodging')) return 'hotel';
    if (types.includes('museum')) return 'museum';
    if (types.includes('art_gallery')) return 'art';
    if (types.includes('park')) return 'park';
    if (types.includes('shopping_mall') || types.includes('store')) return 'shopping';
    return 'attraction';
  };

  const centerOnMarkers = useCallback(() => {
    if (!mapRef.current || markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
    mapRef.current.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
  }, [markers]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    if (searchMarkerRef.current) {
      searchMarkerRef.current.map = null;
    }
  }, []);

  return (
    <div className={`relative w-full h-full bg-gray-100 dark:bg-gray-900 ${isFullscreen ? '' : 'rounded-xl overflow-hidden'} ${className}`}>
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Tap to interact overlay - shown when map is static */}
      {!isInteractive && mapLoaded && !mapError && !isCompact && (
        <button
          onClick={enableInteractive}
          className="absolute inset-0 z-20 flex items-center justify-center bg-transparent cursor-pointer group"
          aria-label="Tap to interact with map"
        >
          <div className="px-4 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-sm text-gray-600 dark:text-gray-300">Tap to explore map</span>
          </div>
        </button>
      )}

      {/* Search Bar - only shown in interactive mode */}
      {showSearch && mapLoaded && !mapError && !isCompact && isInteractive && (
        <div className="absolute top-4 left-4 right-16 max-w-md z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places to add..."
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Day Filter */}
      {showDayFilter && uniqueDays.length > 1 && mapLoaded && !mapError && !isCompact && (
        <div className="absolute top-16 left-4 z-10">
          <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-xl p-1 shadow-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setFilterDay(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterDay === null
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              All
            </button>
            {uniqueDays.map((day) => {
              const colors = DAY_COLORS[(day - 1) % DAY_COLORS.length];
              return (
                <button
                  key={day}
                  onClick={() => setFilterDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterDay === day
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  style={filterDay === day ? { background: colors.bg } : {}}
                >
                  Day {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Map Controls */}
      {mapLoaded && !mapError && !isCompact && (
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <button
            onClick={centerOnMarkers}
            className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Center on markers"
          >
            <Navigation className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          {uniqueDays.length > 1 && (
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              title="Show legend"
            >
              <Layers className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      )}

      {/* Legend */}
      {showLegend && uniqueDays.length > 1 && mapLoaded && !mapError && (
        <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-900 rounded-xl p-3 shadow-lg border border-gray-200 dark:border-gray-700 z-10">
          <div className="text-xs font-medium text-gray-500 mb-2">Days</div>
          <div className="space-y-1.5">
            {uniqueDays.map((day) => {
              const colors = DAY_COLORS[(day - 1) % DAY_COLORS.length];
              const dayCount = allMarkers.filter((m) => m.dayNumber === day).length;
              return (
                <div key={day} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {day}
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    Day {day} · {dayCount} stops
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stop Count Badge */}
      {mapLoaded && !mapError && markers.length > 0 && !isCompact && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-700 z-10">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {markers.length} {markers.length === 1 ? 'stop' : 'stops'}
            </span>
          </div>
        </div>
      )}

      {/* Loading states */}
      {!mapLoaded && googleLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 dark:border-gray-800 dark:border-t-white rounded-full animate-spin" />
        </div>
      )}

      {!googleLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 dark:border-gray-800 dark:border-t-white rounded-full animate-spin" />
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-gray-400 dark:text-gray-600 text-sm">{mapError}</p>
        </div>
      )}
    </div>
  );
}
