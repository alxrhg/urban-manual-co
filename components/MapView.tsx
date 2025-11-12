'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Destination } from '@/types/destination';
import { Spinner } from '@/components/ui/spinner';
import { getMapboxConfig } from '@/lib/mapbox/config';

interface MapViewProps {
  destinations: Destination[];
  highlightedDestinations?: Destination[];
  onMarkerClick?: (destination: Destination) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  isDark?: boolean;
  showLegend?: boolean;
}

export default function MapView({
  destinations,
  highlightedDestinations = [],
  onMarkerClick,
  center = { lat: 23.5, lng: 121.0 }, // Default to Taiwan center
  zoom = 8,
  isDark = true,
  showLegend = false,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const controlsInitializedRef = useRef(false);

  const googleMapsKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
    '';

  const destinationsWithCoordinates = useMemo(
    () =>
      destinations.filter(
        dest => dest.latitude !== null && dest.latitude !== undefined && dest.longitude !== null && dest.longitude !== undefined
      ),
    [destinations]
  );

  const highlightedWithCoordinates = useMemo(
    () =>
      highlightedDestinations.filter(
        dest => dest.latitude !== null && dest.latitude !== undefined && dest.longitude !== null && dest.longitude !== undefined
      ),
    [highlightedDestinations]
  );

  const highlightedSlugSet = useMemo(() => {
    return new Set(
      highlightedWithCoordinates
        .map(dest => dest.slug)
        .filter((slug): slug is string => Boolean(slug))
    );
  }, [highlightedWithCoordinates]);

  const [showOnlyHighlighted, setShowOnlyHighlighted] = useState(false);

  useEffect(() => {
    if (highlightedSlugSet.size === 0 && showOnlyHighlighted) {
      setShowOnlyHighlighted(false);
    }
  }, [highlightedSlugSet.size, showOnlyHighlighted]);

  const effectiveDestinations = useMemo(() => {
    if (showOnlyHighlighted && highlightedSlugSet.size > 0) {
      return destinationsWithCoordinates.filter(dest => dest.slug && highlightedSlugSet.has(dest.slug));
    }
    return destinationsWithCoordinates;
  }, [destinationsWithCoordinates, highlightedSlugSet, showOnlyHighlighted]);

  const fallbackDestination = effectiveDestinations.find(
    (dest) => dest.latitude !== null && dest.latitude !== undefined && dest.longitude !== null && dest.longitude !== undefined
  );

  const fallbackCenter = fallbackDestination
    ? { lat: fallbackDestination.latitude!, lng: fallbackDestination.longitude! }
    : center;

  const renderFallbackMap = () => {
    if (!googleMapsKey) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
          <div className="text-center p-6 space-y-2">
            <p className="text-sm font-medium">Unable to load map</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Mapbox is unavailable and a Google API key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_API_KEY) is not configured.
            </p>
          </div>
        </div>
      );
    }

    const markerParams = effectiveDestinations
      .slice(0, 50)
      .map((dest) => `${dest.latitude},${dest.longitude}`)
      .join('|');

    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?key=${googleMapsKey}&size=1280x720&scale=2&maptype=roadmap${
      markerParams ? `&markers=color:red|${markerParams}` : ''
    }&center=${fallbackCenter.lat},${fallbackCenter.lng}&zoom=${Math.max(0, Math.min(zoom + 2, 16))}`;

    const embedUrl = `https://www.google.com/maps/embed/v1/view?key=${googleMapsKey}&center=${fallbackCenter.lat},${fallbackCenter.lng}&zoom=${zoom}&maptype=roadmap`;

    return (
      <div className="relative w-full h-full bg-gray-100 dark:bg-gray-900 rounded-3xl overflow-hidden">
        <iframe
          title="Google Maps fallback"
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
        <img
          src={staticMapUrl}
          alt="Static map fallback"
          className="w-full h-full object-cover"
          loading="lazy"
          style={{ opacity: 0, pointerEvents: 'none' }}
        />
      </div>
    );
  };

  const escapeHtml = useCallback((value: string | null | undefined) => {
    if (!value) return '';
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }, []);

  const handleFitBounds = useCallback(
    (destinationsToFit: Destination[]) => {
      if (!mapRef.current || destinationsToFit.length === 0) return;

      const bounds = new mapboxgl.LngLatBounds();
      let hasBounds = false;

      destinationsToFit.forEach(dest => {
        if (dest.longitude == null || dest.latitude == null) return;
        bounds.extend([dest.longitude, dest.latitude]);
        hasBounds = true;
      });

      if (hasBounds) {
        mapRef.current.fitBounds(bounds, {
          padding: window.innerWidth < 640 ? 48 : 96,
          maxZoom: 14,
        });
      }
    },
    []
  );

  // Initialize Mapbox map
  useEffect(() => {
    if (useFallback) return;
    const { accessToken, styles } = getMapboxConfig();
    if (!accessToken) {
      console.error('Mapbox access token is not configured. Falling back to Google Maps.');
      setUseFallback(true);
      setError(null);
      return;
    }

    if (!mapContainerRef.current) return;

    // Ensure container has dimensions
    const container = mapContainerRef.current;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('Map container has no dimensions, waiting for layout...');
      // Wait a bit for layout to settle
      const timeout = setTimeout(() => {
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
          setError('Map container has no dimensions. Please ensure the parent element has a defined height.');
          console.error('Map container dimensions:', {
            width: container.offsetWidth,
            height: container.offsetHeight,
            computed: window.getComputedStyle(container).height
          });
        }
      }, 1000);
      return () => clearTimeout(timeout);
    }

    // Set Mapbox access token
    mapboxgl.accessToken = accessToken;

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: isDark ? styles.dark : styles.light,
      center: [center.lng, center.lat],
      zoom: zoom,
      attributionControl: false,
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      setLoaded(true);
      if (!controlsInitializedRef.current) {
        try {
          map.addControl(
            new mapboxgl.GeolocateControl({
              positionOptions: { enableHighAccuracy: true },
              trackUserLocation: true,
              fitBoundsOptions: { maxZoom: 13 },
            }),
            'top-right'
          );
          map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
        } catch (controlError) {
          console.warn('Failed to initialize additional map controls:', controlError);
        }
        controlsInitializedRef.current = true;
      }
    });

    map.on('error', (e) => {
      console.error('Mapbox error:', e);
      setUseFallback(true);
      setError(null);
    });

    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, [center.lat, center.lng, zoom, isDark, useFallback]);

  // Update markers when destinations change
  useEffect(() => {
    if (useFallback) return;
    if (!mapRef.current || !loaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Create markers for each destination
    const bounds = new mapboxgl.LngLatBounds();
    let hasValidMarkers = false;

    effectiveDestinations.forEach((dest) => {
      if (!dest.latitude || !dest.longitude) return;

      const lng = dest.longitude;
      const lat = dest.latitude;
      bounds.extend([lng, lat]);
      hasValidMarkers = true;

      const isHighlighted = dest.slug ? highlightedSlugSet.has(dest.slug) : false;

      // Create marker element
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = isHighlighted ? '16px' : '12px';
      el.style.height = isHighlighted ? '16px' : '12px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = isHighlighted ? '#2563EB' : '#1C1C1C';
      el.style.border = '1.5px solid #FFFFFF';
      el.style.boxShadow = isHighlighted ? '0 0 0 4px rgba(37, 99, 235, 0.22)' : '0 0 0 3px rgba(0, 0, 0, 0.08)';
      el.style.cursor = 'pointer';
      el.style.transition = 'all 0.2s ease';

      // Create marker
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25, closeButton: false })
            .setHTML(
              `<div style="font-weight: 600; font-size: 14px; line-height: 1.4;">${escapeHtml(dest.name || '')}</div>` +
              (dest.city || dest.category
                ? `<div style="font-size: 12px; color: #4B5563; margin-top: 4px;">${escapeHtml(dest.category || '')}${
                    dest.city ? ` · ${escapeHtml(dest.city)}` : ''
                  }</div>`
                : '')
            )
        )
        .addTo(mapRef.current!);

      // Add click handler
      el.addEventListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(dest);
        }
      });

      // Hover effect (desktop only)
      if (window.innerWidth >= 768) {
        el.addEventListener('mouseenter', () => {
          el.style.width = isHighlighted ? '20px' : '16px';
          el.style.height = isHighlighted ? '20px' : '16px';
          el.style.backgroundColor = isHighlighted ? '#1D4ED8' : '#FFFFFF';
          el.style.borderColor = isHighlighted ? '#FFFFFF' : '#1C1C1C';
        });

        el.addEventListener('mouseleave', () => {
          el.style.width = isHighlighted ? '16px' : '12px';
          el.style.height = isHighlighted ? '16px' : '12px';
          el.style.backgroundColor = isHighlighted ? '#2563EB' : '#1C1C1C';
          el.style.borderColor = '#FFFFFF';
        });
      }

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (hasValidMarkers && markersRef.current.length > 0) {
      mapRef.current.fitBounds(bounds, {
        padding: window.innerWidth < 640 ? 48 : 96,
        maxZoom: 14,
      });
    } else if (mapRef.current) {
      // If no markers, center on provided center
      mapRef.current.setCenter([center.lng, center.lat]);
      mapRef.current.setZoom(zoom);
    }
  }, [effectiveDestinations, loaded, onMarkerClick, center.lat, center.lng, zoom, highlightedSlugSet, escapeHtml, useFallback]);

  if (useFallback) {
    return (
      <div className="relative w-full h-full">
        {renderFallbackMap()}
        {showLegend && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-end">
            <div className="pointer-events-auto rounded-2xl bg-white/90 px-3 py-2 text-xs font-medium text-gray-700 shadow backdrop-blur dark:bg-gray-900/80 dark:text-gray-200">
              {effectiveDestinations.length} pin{effectiveDestinations.length === 1 ? '' : 's'}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!loaded && !error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
        <div className="text-center p-6">
          <p className="text-sm mb-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={mapContainerRef}
        className="w-full h-full overflow-hidden"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '320px',
          borderRadius: 0,
        }}
      />

      <div className="pointer-events-none absolute left-4 right-4 bottom-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="pointer-events-auto inline-flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleFitBounds(showOnlyHighlighted && highlightedSlugSet.size > 0 ? highlightedWithCoordinates : destinationsWithCoordinates)}
            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-gray-900 shadow backdrop-blur transition hover:bg-white dark:bg-gray-900/80 dark:text-white"
          >
            Recenter map
          </button>
          {highlightedSlugSet.size > 0 && (
            <button
              type="button"
              onClick={() => setShowOnlyHighlighted(prev => !prev)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition shadow backdrop-blur ${
                showOnlyHighlighted
                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                  : 'bg-white/90 text-gray-900 hover:bg-white dark:bg-gray-900/80 dark:text-white'
              }`}
            >
              {showOnlyHighlighted ? 'Show all pins' : 'Focus filtered results'}
            </button>
          )}
        </div>

        {showLegend && (
          <div className="pointer-events-auto inline-flex flex-col rounded-2xl bg-white/90 px-4 py-3 text-xs text-gray-700 shadow backdrop-blur dark:bg-gray-900/80 dark:text-gray-200">
            <div className="flex items-center justify-between gap-6">
              <span className="font-semibold">All places</span>
              <span>{destinationsWithCoordinates.length}</span>
            </div>
            {highlightedSlugSet.size > 0 && (
              <div className="mt-1 flex items-center justify-between gap-6">
                <span className="font-medium text-blue-600 dark:text-blue-400">Filtered</span>
                <span>{highlightedWithCoordinates.length}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
