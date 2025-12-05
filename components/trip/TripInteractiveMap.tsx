'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Maximize2,
  Minimize2,
  Navigation,
  AlertTriangle,
  Search,
  X,
  Layers,
  Plus,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { Destination } from '@/types/destination';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  dayNumber: number;
  index: number;
  item: EnrichedItineraryItem;
}

interface SearchResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
}

interface TripInteractiveMapProps {
  days: TripDay[];
  selectedDayNumber?: number;
  activeItemId?: string | null;
  tripDestination?: string;
  onMarkerClick?: (itemId: string) => void;
  onAddPlace?: (place: Partial<Destination>, dayNumber: number) => void;
  onClose?: () => void;
  className?: string;
  showSearch?: boolean;
  showDayFilter?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  hasHeader?: boolean; // When true, offsets controls for external header
}

// Day colors - monochromatic scheme per design system
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
 * TripInteractiveMap - Full-featured interactive map for trip planning
 * Features: Day color coding, info windows, search, add places, route lines
 */
export default function TripInteractiveMap({
  days,
  selectedDayNumber,
  activeItemId,
  tripDestination,
  onMarkerClick,
  onAddPlace,
  onClose,
  className = '',
  showSearch = true,
  showDayFilter = true,
  isFullscreen = false,
  onToggleFullscreen,
  hasHeader = false,
}: TripInteractiveMapProps) {
  // Offset for controls when there's an external header
  const topOffset = hasHeader ? 'top-20' : 'top-4';
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const searchMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [localFullscreen, setLocalFullscreen] = useState(isFullscreen);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedSearchResult, setSelectedSearchResult] = useState<SearchResult | null>(null);
  const [filterDay, setFilterDay] = useState<number | null>(selectedDayNumber || null);
  const [showLegend, setShowLegend] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

  // Sync filter with selected day
  useEffect(() => {
    if (selectedDayNumber) {
      setFilterDay(selectedDayNumber);
    }
  }, [selectedDayNumber]);

  // Extract markers from days
  const allMarkers: MapMarker[] = useMemo(() => {
    const markers: MapMarker[] = [];
    days.forEach((day) => {
      day.items.forEach((item, index) => {
        // Skip flights
        if (item.parsedNotes?.type === 'flight') return;

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
            item,
          });
        }
      });
    });
    return markers;
  }, [days]);

  // Filter markers by day if filter is active
  const markers = useMemo(() => {
    if (filterDay === null) return allMarkers;
    return allMarkers.filter((m) => m.dayNumber === filterDay);
  }, [allMarkers, filterDay]);

  // Get unique days for the legend
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

    // Check if already loaded
    if (window.google?.maps?.places) {
      setGoogleLoaded(true);
      return;
    }

    // Load Google Maps script with Places library
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker,places&v=weekly`;
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
      mapRef.current = new google.maps.Map(mapContainer.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
        styles: GRAYSCALE_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: google.maps.ControlPosition.RIGHT_BOTTOM,
        },
        mapId: 'trip-interactive-map',
      });

      // Initialize Places service
      placesServiceRef.current = new google.maps.places.PlacesService(mapRef.current);

      // Initialize info window
      infoWindowRef.current = new google.maps.InfoWindow();

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
      infoWindowRef.current?.close();
      searchMarkerRef.current && (searchMarkerRef.current.map = null);
      mapRef.current = null;
    };
  }, [googleLoaded, mapError]);

  // Initialize autocomplete
  useEffect(() => {
    if (!googleLoaded || !mapLoaded || !searchInputRef.current || autocompleteRef.current) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(searchInputRef.current, {
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types'],
    });

    // Bias to trip destination if available
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
      if (place?.geometry?.location) {
        const result: SearchResult = {
          placeId: place.place_id || '',
          name: place.name || '',
          address: place.formatted_address || '',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          types: place.types || [],
        };
        setSelectedSearchResult(result);
        setShowSearchResults(false);

        // Pan to location
        mapRef.current?.panTo({ lat: result.lat, lng: result.lng });
        mapRef.current?.setZoom(15);

        // Show search marker
        showSearchMarker(result);
      }
    });
  }, [googleLoaded, mapLoaded, tripDestination]);

  // Show search result marker
  const showSearchMarker = useCallback((result: SearchResult) => {
    if (!mapRef.current) return;

    // Remove existing search marker
    if (searchMarkerRef.current) {
      searchMarkerRef.current.map = null;
    }

    // Create search marker element - uses black per design system
    const markerEl = document.createElement('div');
    markerEl.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
      ">
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: #111827;
          border: 2px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg style="transform: rotate(45deg); width: 18px; height: 18px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      </div>
    `;

    searchMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: { lat: result.lat, lng: result.lng },
      content: markerEl,
      title: result.name,
    });

    // Show info window for search result
    if (infoWindowRef.current) {
      const content = document.createElement('div');
      content.innerHTML = `
        <div style="padding: 8px; max-width: 280px;">
          <div style="font-weight: 600; font-size: 14px; color: #111827; margin-bottom: 4px;">${result.name}</div>
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">${result.address}</div>
          ${onAddPlace ? `
            <button id="add-place-btn" style="
              width: 100%;
              padding: 8px 16px;
              background: #111827;
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 12px;
              font-weight: 500;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            ">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add to Day ${filterDay || 1}
            </button>
          ` : ''}
        </div>
      `;

      infoWindowRef.current.setContent(content);
      infoWindowRef.current.open({
        anchor: searchMarkerRef.current,
        map: mapRef.current,
      });

      // Add click handler for add button
      setTimeout(() => {
        const addBtn = document.getElementById('add-place-btn');
        if (addBtn && onAddPlace) {
          addBtn.onclick = () => {
            onAddPlace(
              {
                name: result.name,
                city: tripDestination || '',
                latitude: result.lat,
                longitude: result.lng,
                category: mapPlaceTypeToCategory(result.types),
              },
              filterDay || 1
            );
            infoWindowRef.current?.close();
            searchMarkerRef.current && (searchMarkerRef.current.map = null);
            setSelectedSearchResult(null);
            setSearchQuery('');
          };
        }
      }, 100);
    }
  }, [filterDay, onAddPlace, tripDestination]);

  // Map Google place types to our categories
  const mapPlaceTypeToCategory = (types: string[]): string => {
    if (types.includes('restaurant') || types.includes('food')) return 'restaurant';
    if (types.includes('cafe')) return 'cafe';
    if (types.includes('bar')) return 'bar';
    if (types.includes('lodging')) return 'hotel';
    if (types.includes('museum')) return 'museum';
    if (types.includes('art_gallery')) return 'art';
    if (types.includes('park')) return 'park';
    if (types.includes('shopping_mall') || types.includes('store')) return 'shopping';
    if (types.includes('tourist_attraction')) return 'attraction';
    return 'attraction';
  };

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

    // Add markers
    markers.forEach((marker) => {
      const colors = DAY_COLORS[(marker.dayNumber - 1) % DAY_COLORS.length];
      const isActive = marker.id === activeItemId;

      // Create custom marker element
      const markerEl = document.createElement('div');
      markerEl.className = 'trip-marker';
      markerEl.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${isActive ? '40px' : '32px'};
        height: ${isActive ? '40px' : '32px'};
        border-radius: 50%;
        background: ${isActive ? colors.bg : 'white'};
        color: ${isActive ? colors.text : colors.bg};
        border: 2px solid ${isActive ? colors.border : colors.bg};
        font-weight: 600;
        font-size: ${isActive ? '16px' : '14px'};
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: ${isActive ? 1000 : 1};
      `;
      markerEl.textContent = String(marker.index);

      markerEl.addEventListener('mouseenter', () => {
        markerEl.style.transform = 'scale(1.15)';
        markerEl.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
      });

      markerEl.addEventListener('mouseleave', () => {
        markerEl.style.transform = 'scale(1)';
        markerEl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      });

      const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: marker.lat, lng: marker.lng },
        content: markerEl,
        title: marker.label,
        zIndex: isActive ? 1000 : marker.index,
      });

      advancedMarker.addListener('click', () => {
        setSelectedMarker(marker);
        showMarkerInfoWindow(marker, advancedMarker);
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
        strokeWeight: 3,
        map: mapRef.current,
        icons: [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 0.6,
              scale: 3,
            },
            offset: '0',
            repeat: '12px',
          },
        ],
      });

      polylinesRef.current.push(polyline);
    });

    // Fit bounds to markers
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
  }, [markers, mapLoaded, activeItemId, onMarkerClick, googleLoaded]);

  // Show info window for a marker
  const showMarkerInfoWindow = useCallback(
    (marker: MapMarker, advancedMarker: google.maps.marker.AdvancedMarkerElement) => {
      if (!infoWindowRef.current || !mapRef.current) return;

      const item = marker.item;
      const image = item.parsedNotes?.image || item.destination?.image || item.destination?.image_thumbnail;
      const time = item.time;
      const duration = item.parsedNotes?.duration;
      const category = item.destination?.category || item.parsedNotes?.category;

      const content = document.createElement('div');
      content.innerHTML = `
        <div style="min-width: 220px; max-width: 280px;">
          ${image ? `
            <div style="
              width: 100%;
              height: 120px;
              border-radius: 8px;
              overflow: hidden;
              margin-bottom: 10px;
            ">
              <img src="${image}" alt="${marker.label}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          ` : ''}
          <div style="padding: 4px;">
            <div style="
              display: inline-block;
              padding: 2px 8px;
              background: ${DAY_COLORS[(marker.dayNumber - 1) % DAY_COLORS.length].bg};
              color: white;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 500;
              margin-bottom: 6px;
            ">Day ${marker.dayNumber}</div>
            <div style="font-weight: 600; font-size: 15px; color: #111827; margin-bottom: 4px;">${marker.label}</div>
            ${category ? `<div style="font-size: 11px; color: #6b7280; text-transform: capitalize; margin-bottom: 6px;">${category}</div>` : ''}
            <div style="display: flex; align-items: center; gap: 12px; font-size: 12px; color: #6b7280;">
              ${time ? `
                <div style="display: flex; align-items: center; gap: 4px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  ${time}
                </div>
              ` : ''}
              ${duration ? `
                <div style="display: flex; align-items: center; gap: 4px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  ${duration} min
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      infoWindowRef.current.setContent(content);
      infoWindowRef.current.open({
        anchor: advancedMarker,
        map: mapRef.current,
      });
    },
    []
  );

  // Focus on active item
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !activeItemId) return;

    const activeMarker = markers.find((m) => m.id === activeItemId);
    if (activeMarker) {
      mapRef.current.panTo({ lat: activeMarker.lat, lng: activeMarker.lng });
      mapRef.current.setZoom(15);
    }
  }, [activeItemId, markers, mapLoaded]);

  const toggleFullscreen = useCallback(() => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      setLocalFullscreen(!localFullscreen);
    }
  }, [localFullscreen, onToggleFullscreen]);

  const centerOnMarkers = useCallback(() => {
    if (!mapRef.current || markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
    mapRef.current.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
  }, [markers]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Autocomplete handles the search
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setSelectedSearchResult(null);
    if (searchMarkerRef.current) {
      searchMarkerRef.current.map = null;
    }
    infoWindowRef.current?.close();
  }, []);

  const effectiveFullscreen = onToggleFullscreen ? isFullscreen : localFullscreen;

  return (
    <div
      className={`
        relative bg-gray-100 dark:bg-gray-900
        ${effectiveFullscreen ? 'fixed inset-0 z-50' : 'w-full h-full rounded-2xl overflow-hidden'}
        ${className}
      `}
    >
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Search Bar */}
      {showSearch && mapLoaded && !mapError && (
        <div className={`absolute ${topOffset} left-4 right-16 max-w-md z-10`}>
          <form onSubmit={handleSearch} className="relative">
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
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </form>
        </div>
      )}

      {/* Day Filter */}
      {showDayFilter && uniqueDays.length > 1 && mapLoaded && !mapError && (
        <div className={`absolute ${hasHeader ? 'top-32' : 'top-16'} left-4 z-10`}>
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
      {mapLoaded && !mapError && (
        <div className={`absolute ${topOffset} right-4 flex flex-col gap-2 z-10`}>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              title="Close map"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <button
            onClick={centerOnMarkers}
            className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Center on markers"
          >
            <Navigation className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title={effectiveFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {effectiveFullscreen ? (
              <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
          {uniqueDays.length > 1 && (
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Route Colors</div>
          <div className="space-y-1.5">
            {uniqueDays.map((day) => {
              const colors = DAY_COLORS[(day - 1) % DAY_COLORS.length];
              const dayMarkers = allMarkers.filter((m) => m.dayNumber === day);
              return (
                <div key={day} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {day}
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    Day {day} · {dayMarkers.length} stops
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stop Count Badge */}
      {mapLoaded && !mapError && markers.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-700 z-10">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {markers.length} {markers.length === 1 ? 'stop' : 'stops'}
              {filterDay !== null && ` on Day ${filterDay}`}
            </span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {!mapLoaded && googleLoaded && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 dark:border-gray-800 dark:border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* No markers fallback */}
      {markers.length === 0 && mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-white/90 dark:bg-gray-900/90 px-6 py-4 rounded-2xl shadow-lg">
            <MapPin className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {filterDay !== null ? `No stops on Day ${filterDay}` : 'Add stops to see them on the map'}
            </p>
            {showSearch && (
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Search for places above to add them
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {mapError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
          <AlertTriangle className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-gray-400 dark:text-gray-600 text-sm">{mapError}</p>
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
