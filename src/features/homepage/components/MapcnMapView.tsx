'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Destination } from '@/types/destination';
import { useHomepageData } from './HomepageDataProvider';
import { Loader2, List, X, ChevronRight, MapPin } from 'lucide-react';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

/**
 * MapLibre GL Map View - Modern, beautiful maps with mapcn style
 *
 * Features:
 * - Free CARTO basemap tiles (no API key required)
 * - Automatic dark/light theme support
 * - Custom markers with clustering
 * - Split-pane with scrollable list
 * - Click marker → open drawer
 */

export function MapcnMapView() {
  const {
    filteredDestinations,
    openDestination,
    selectedDestination,
    isDrawerOpen,
    setViewMode,
  } = useHomepageData();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [showList, setShowList] = useState(true);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  // Filter destinations with valid coordinates
  const mappableDestinations = filteredDestinations.filter(
    d => typeof d.latitude === 'number' && typeof d.longitude === 'number' &&
         !isNaN(d.latitude) && !isNaN(d.longitude)
  );

  // CARTO dark basemap style (free, no API key needed)
  const CARTO_DARK_STYLE = {
    version: 8,
    sources: {
      carto: {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        ],
        tileSize: 256,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [
      {
        id: 'carto-layer',
        type: 'raster',
        source: 'carto',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };

  // Create the map
  const createMap = useCallback(() => {
    if (!mapContainerRef.current) return;

    try {
      console.log('[MapcnMapView] Creating map...');

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: CARTO_DARK_STYLE as any,
        center: [121.5654, 25.0330], // Taipei as default center
        zoom: 3,
      });

      // Add navigation controls
      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Add scale control
      map.addControl(
        new maplibregl.ScaleControl({
          maxWidth: 100,
          unit: 'metric',
        }),
        'bottom-left'
      );

      map.on('load', () => {
        console.log('[MapcnMapView] Map loaded successfully');
        setIsLoading(false);
      });

      map.on('error', (e) => {
        console.error('[MapcnMapView] Map error:', e);
      });

      mapRef.current = map;

      return () => {
        map.remove();
      };
    } catch (err) {
      console.error('[MapcnMapView] Map creation error:', err);
      setIsLoading(false);
    }
  }, []);

  // Update markers
  const updateMarkers = useCallback(() => {
    if (!mapRef.current) {
      console.log('[MapcnMapView] updateMarkers: map not ready');
      return;
    }

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    console.log('[MapcnMapView] Updating markers, count:', mappableDestinations.length);

    if (mappableDestinations.length === 0) {
      return;
    }

    // Create markers
    const newMarkers: maplibregl.Marker[] = [];
    const bounds = new maplibregl.LngLatBounds();

    mappableDestinations.forEach((dest) => {
      const isSelected = selectedDestination?.slug === dest.slug;
      const isHovered = hoveredSlug === dest.slug;

      // Create marker element
      const el = document.createElement('div');
      el.className = 'map-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';
      el.style.transition = 'all 0.2s';

      if (isSelected) {
        el.style.backgroundColor = '#007AFF';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.5)';
      } else if (isHovered) {
        el.style.backgroundColor = '#5856D6';
        el.style.width = '28px';
        el.style.height = '28px';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 8px rgba(88, 86, 214, 0.5)';
      } else {
        el.style.backgroundColor = '#1C1C1E';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
      }

      // Create popup with destination info
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <div style="font-weight: 600; margin-bottom: 4px; color: #1a1a1a;">${dest.name}</div>
          <div style="font-size: 12px; color: #666;">
            ${capitalizeCategory(dest.category)} • ${capitalizeCity(dest.city)}
          </div>
        </div>
      `);

      // Create marker
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([dest.longitude!, dest.latitude!])
        .setPopup(popup)
        .addTo(map);

      // Add click handler
      el.addEventListener('click', () => {
        openDestination(dest);
      });

      newMarkers.push(marker);
      bounds.extend([dest.longitude!, dest.latitude!]);
    });

    markersRef.current = newMarkers;

    // Fit map to show all markers
    if (mappableDestinations.length > 0) {
      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: showList ? 400 : 50, right: 50 },
        maxZoom: 15,
        duration: 1000,
      });
    }
  }, [mappableDestinations, selectedDestination, hoveredSlug, openDestination, showList]);

  // Initialize map
  useEffect(() => {
    createMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [createMap]);

  // Update markers when data changes
  useEffect(() => {
    if (!isLoading && mapRef.current) {
      updateMarkers();
    }
  }, [isLoading, updateMarkers]);

  // Update marker sizes when selection/hover changes
  useEffect(() => {
    if (!isLoading && mapRef.current) {
      updateMarkers();
    }
  }, [selectedDestination, hoveredSlug]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="w-full h-[70vh] rounded-lg bg-gray-100 dark:bg-[#1c1c1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[70vh] rounded-lg overflow-hidden bg-[#1c1c1e]">
      <div className="flex h-full">
        {/* Map */}
        <div
          ref={mapContainerRef}
          className={`h-full transition-all duration-300 ${
            showList && !isDrawerOpen ? 'w-2/3' : 'w-full'
          }`}
        />

        {/* Side List Panel */}
        {showList && !isDrawerOpen && (
          <div className="w-1/3 h-full bg-white dark:bg-[#1c1c1e] border-l border-gray-200 dark:border-white/10 flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    On this map
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {mappableDestinations.length} destinations
                  </p>
                </div>
                <button
                  onClick={() => setShowList(false)}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/10
                             flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {mappableDestinations.slice(0, 100).map((dest) => (
                <button
                  key={dest.slug}
                  onClick={() => openDestination(dest)}
                  onMouseEnter={() => setHoveredSlug(dest.slug)}
                  onMouseLeave={() => setHoveredSlug(null)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left
                             border-b border-gray-50 dark:border-white/5
                             hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                               selectedDestination?.slug === dest.slug
                                 ? 'bg-blue-50 dark:bg-blue-900/20'
                                 : ''
                             }`}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                    {(dest.image_thumbnail || dest.image) ? (
                      <Image
                        src={dest.image_thumbnail || dest.image || ''}
                        alt={dest.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {dest.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {dest.category && capitalizeCategory(dest.category)}
                      {dest.category && dest.city && ' · '}
                      {dest.city && capitalizeCity(dest.city)}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Toggle List Button */}
      {!showList && (
        <button
          onClick={() => setShowList(true)}
          className="absolute top-4 right-4 px-4 py-2 rounded-full
                     bg-white/90 dark:bg-black/70 backdrop-blur-md shadow-lg
                     flex items-center gap-2
                     hover:bg-white dark:hover:bg-black/90 transition-colors"
        >
          <List className="w-4 h-4 text-gray-700 dark:text-gray-200" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Show list
          </span>
        </button>
      )}

      {/* Location count badge */}
      <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full
                      bg-white/90 dark:bg-black/70 backdrop-blur-md shadow-lg
                      text-sm font-medium text-gray-700 dark:text-gray-200">
        {mappableDestinations.length} locations
      </div>
    </div>
  );
}

export default MapcnMapView;
