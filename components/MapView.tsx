'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { FeatureCollection, LineString, Point } from 'geojson';
import { Destination } from '@/types/destination';
import { Spinner } from '@/components/ui/spinner';
import { getMapboxConfig } from '@/lib/mapbox/config';

type ClusterSource = mapboxgl.GeoJSONSource & {
  getClusterExpansionZoom?: (clusterId: number, callback: (error: Error | null, zoomLevel: number) => void) => void;
};

interface MapViewProps {
  destinations: Destination[];
  onMarkerClick?: (destination: Destination) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  isDark?: boolean;
  geoJson?: FeatureCollection<Point>;
  highlightRoutes?: FeatureCollection<LineString>;
  popularSpots?: FeatureCollection<Point>;
  showHeatmap?: boolean;
}

export default function MapView({
  destinations,
  onMarkerClick,
  center = { lat: 23.5, lng: 121.0 }, // Default to Taiwan center
  zoom = 8,
  isDark = true,
  geoJson,
  highlightRoutes,
  popularSpots,
  showHeatmap = true,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapboxConfig = useMemo(() => getMapboxConfig(), []);
  const [useFallback, setUseFallback] = useState(!mapboxConfig.accessToken);
  const { accessToken, styles } = mapboxConfig;

  const googleMapsKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
    '';

  const fallbackDestination = destinations.find(
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

    const markerParams = destinations
      .filter((dest) => dest.latitude && dest.longitude)
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
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

  const fallbackGeoJson = useMemo<FeatureCollection<Point>>(() => {
    return {
      type: 'FeatureCollection',
      features: destinations
        .filter((destination) => destination.latitude && destination.longitude)
        .map((destination) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [destination.longitude!, destination.latitude!],
          },
          properties: {
            slug: destination.slug,
            name: destination.name,
            category: destination.category,
            rating: destination.rating,
            michelin: destination.michelin_stars,
          },
        })),
    };
  }, [destinations]);

  const destinationLookup = useMemo(() => {
    const entries: Array<[string, Destination]> = destinations
      .filter((destination): destination is Destination & { slug: string } =>
        typeof destination.slug === 'string' && destination.slug.length > 0
      )
      .map((destination) => [destination.slug, destination]);
    return new Map(entries);
  }, [destinations]);

  const geoJsonData = geoJson ?? fallbackGeoJson;
  const geoJsonRef = useRef(geoJsonData);
  const popularRef = useRef(popularSpots ?? geoJsonData);
  const highlightRef = useRef<FeatureCollection<LineString> | undefined>(highlightRoutes);

  useEffect(() => {
    geoJsonRef.current = geoJsonData;
  }, [geoJsonData]);

  useEffect(() => {
    popularRef.current = popularSpots ?? geoJsonData;
  }, [popularSpots, geoJsonData]);

  useEffect(() => {
    highlightRef.current = highlightRoutes;
  }, [highlightRoutes]);

  // Initialize Mapbox map
  useEffect(() => {
    if (useFallback) return;
    if (!accessToken) return;

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
      try {
        addOrUpdateSources(map, geoJsonRef.current, popularRef.current, highlightRef.current);
        addLayers(map, isDark, showHeatmap);
        setLoaded(true);
      } catch (layerError) {
        console.error('Failed to initialise map layers', layerError);
        setUseFallback(true);
        setError(null);
      }
    });

    map.on('error', (e) => {
      console.error('Mapbox error:', e);
      setUseFallback(true);
      setError(null);
    });

    mapRef.current = map;

    const mapForCleanup = map;

    return () => {
      popupRef.current?.remove();
      mapForCleanup.remove();
    };
  }, [accessToken, center.lat, center.lng, isDark, showHeatmap, styles.dark, styles.light, useFallback, zoom]);

  useEffect(() => {
    if (useFallback) return;
    if (!mapRef.current || !loaded) return;

    const map = mapRef.current;
    try {
      addOrUpdateSources(map, geoJsonData, popularSpots ?? geoJsonData, highlightRoutes);
      updateLayerVisibility(map, showHeatmap);
    } catch (updateError) {
      console.warn('Failed to update map sources', updateError);
    }
  }, [geoJsonData, highlightRoutes, popularSpots, showHeatmap, loaded, useFallback]);

  useEffect(() => {
    if (useFallback) return;
    if (!mapRef.current || !loaded) return;

    const map = mapRef.current;
    const features = geoJsonData.features;
    if (features.length === 0) {
      map.setCenter([center.lng, center.lat]);
      map.setZoom(zoom);
      return;
    }

    const firstPoint = features[0].geometry as Point;
    const bounds = features.reduce((acc, feature) => {
      const geometry = feature.geometry as Point;
      const [lng, lat] = geometry.coordinates;
      return acc.extend([lng, lat]);
    }, new mapboxgl.LngLatBounds(firstPoint.coordinates as [number, number], firstPoint.coordinates as [number, number]));

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
    }
  }, [geoJsonData, center.lat, center.lng, zoom, loaded, useFallback]);

  useEffect(() => {
    if (useFallback) return;
    const map = mapRef.current;
    if (!map) return;

    const handleClusterClick = (event: mapboxgl.MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ['map-clusters'] });
      const clusterFeature = features[0];
      const props = (clusterFeature?.properties ?? {}) as Record<string, unknown>;
      const clusterId = typeof props.cluster_id === 'number' ? props.cluster_id : undefined;
      if (clusterId === undefined) return;

      const source = map.getSource('destinations') as ClusterSource | undefined;

      if (!source?.getClusterExpansionZoom) return;

      source.getClusterExpansionZoom(clusterId, (error, zoomLevel) => {
        if (error || typeof zoomLevel !== 'number') return;
        if (clusterFeature?.geometry?.type === 'Point') {
          const coordinates = clusterFeature.geometry.coordinates as [number, number];
          map.easeTo({ center: coordinates, zoom: zoomLevel });
        }
      });
    };

    const handlePointClick = (event: mapboxgl.MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ['map-destinations'] });
      const feature = features[0];
      const props = (feature?.properties ?? {}) as Record<string, unknown>;
      const slug = typeof props.slug === 'string' ? props.slug : undefined;
      if (!slug) return;
      const destination = destinationLookup.get(slug);
      if (destination && onMarkerClick) {
        onMarkerClick(destination);
      }
    };

    const handleMouseEnter = (event: mapboxgl.MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ['map-destinations', 'popular-spots'] });
      if (!features.length) return;
      map.getCanvas().style.cursor = 'pointer';

      const feature = features[0];
      const properties = (feature.properties ?? {}) as Record<string, unknown>;
      const slug = typeof properties.slug === 'string' ? properties.slug : undefined;
      const destination = slug ? destinationLookup.get(slug) : undefined;
      const title = destination?.name || (typeof properties.name === 'string' ? properties.name : 'Spot');
      const category = destination?.category || (typeof properties.category === 'string' ? properties.category : undefined);
      const propertyRating = typeof properties.rating === 'number' ? properties.rating : undefined;
      const rating = destination?.rating ?? propertyRating;

      if (!popupRef.current) {
        popupRef.current = new mapboxgl.Popup({ closeButton: false, offset: 18, closeOnClick: false });
      }

      const ratingMarkup = typeof rating === 'number' ? `<div style="font-size:12px;color:#111827;margin-top:4px;">Rating ${rating.toFixed(1)}</div>` : '';
      const html = `
        <div style="min-width: 160px;">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${title}</div>
          ${category ? `<div style="font-size:12px;color:#6b7280;">${category}</div>` : ''}
          ${ratingMarkup}
        </div>
      `;

      popupRef.current
        .setLngLat(event.lngLat)
        .setHTML(html)
        .addTo(map);
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      popupRef.current?.remove();
    };

    map.on('click', 'map-clusters', handleClusterClick);
    map.on('click', 'map-destinations', handlePointClick);
    map.on('mouseenter', 'map-destinations', handleMouseEnter);
    map.on('mouseleave', 'map-destinations', handleMouseLeave);
    map.on('mouseenter', 'popular-spots', handleMouseEnter);
    map.on('mouseleave', 'popular-spots', handleMouseLeave);

    return () => {
      map.off('click', 'map-clusters', handleClusterClick);
      map.off('click', 'map-destinations', handlePointClick);
      map.off('mouseenter', 'map-destinations', handleMouseEnter);
      map.off('mouseleave', 'map-destinations', handleMouseLeave);
      map.off('mouseenter', 'popular-spots', handleMouseEnter);
      map.off('mouseleave', 'popular-spots', handleMouseLeave);
    };
  }, [useFallback, loaded, onMarkerClick, destinationLookup]);

  if (useFallback) {
    return renderFallbackMap();
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
    <div
      ref={mapContainerRef}
      className="w-full h-full overflow-hidden"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        borderRadius: 0
      }}
    />
  );
}

function addOrUpdateSources(
  map: mapboxgl.Map,
  destinations: FeatureCollection<Point>,
  popularSpots: FeatureCollection<Point>,
  highlightRoutes?: FeatureCollection<LineString>
) {
  const destinationsSource = map.getSource('destinations') as mapboxgl.GeoJSONSource | undefined;
  if (destinationsSource) {
    destinationsSource.setData(destinations);
  } else {
    map.addSource('destinations', {
      type: 'geojson',
      data: destinations,
      cluster: true,
      clusterRadius: 60,
      clusterMaxZoom: 16,
      clusterProperties: {
        rating_sum: ['+', ['coalesce', ['get', 'rating'], 0]],
      },
    });
  }

  const popularSource = map.getSource('popular-spots') as mapboxgl.GeoJSONSource | undefined;
  if (popularSource) {
    popularSource.setData(popularSpots);
  } else {
    map.addSource('popular-spots', {
      type: 'geojson',
      data: popularSpots,
    });
  }

  const highlightSource = map.getSource('trip-highlights') as mapboxgl.GeoJSONSource | undefined;
  if (highlightRoutes && highlightRoutes.features.length) {
    if (highlightSource) {
      highlightSource.setData(highlightRoutes);
    } else {
      map.addSource('trip-highlights', {
        type: 'geojson',
        data: highlightRoutes,
      });
    }
  } else if (highlightSource) {
    highlightSource.setData({ type: 'FeatureCollection', features: [] });
  }
}

function addLayers(map: mapboxgl.Map, isDark: boolean, showHeatmap = true) {
  const textColor = isDark ? '#0f172a' : '#f9fafb';

  if (!map.getLayer('destinations-heat')) {
    const beforeLayer = map.getLayer('waterway-label') ? 'waterway-label' : undefined;
    map.addLayer(
      {
        id: 'destinations-heat',
        type: 'heatmap',
        source: 'destinations',
        maxzoom: 15,
        paint: {
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'rating'], 3.5],
            0,
            0,
            5,
            1,
          ],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(59,130,246,0)',
            0.2,
            'rgba(59,130,246,0.4)',
            0.4,
            'rgba(56,189,248,0.7)',
            0.6,
            'rgba(34,197,94,0.8)',
            1,
            'rgba(244,114,182,0.85)',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 18, 13, 32],
          'heatmap-opacity': showHeatmap ? ['interpolate', ['linear'], ['zoom'], 10, 0.6, 15, 0] : 0,
        },
      },
      beforeLayer
    );
  }

  if (!map.getLayer('map-clusters')) {
    map.addLayer({
      id: 'map-clusters',
      type: 'circle',
      source: 'destinations',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          'rgba(59,130,246,0.25)',
          10,
          'rgba(59,130,246,0.45)',
          30,
          'rgba(59,130,246,0.6)',
          60,
          'rgba(34,197,94,0.7)',
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          14,
          10,
          20,
          30,
          26,
          60,
          32,
        ],
        'circle-stroke-width': 1.2,
        'circle-stroke-color': isDark ? '#1f2937' : '#ffffff',
      },
    });
  }

  if (!map.getLayer('map-cluster-count')) {
    map.addLayer({
      id: 'map-cluster-count',
      type: 'symbol',
      source: 'destinations',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': textColor,
      },
    });
  }

  if (!map.getLayer('map-destinations')) {
    map.addLayer({
      id: 'map-destinations',
      type: 'circle',
      source: 'destinations',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10,
          6,
          14,
          9,
        ],
        'circle-color': isDark ? '#f9fafb' : '#0f172a',
        'circle-stroke-width': 2,
        'circle-stroke-color': isDark ? '#0f172a' : '#ffffff',
        'circle-opacity': 0.9,
      },
    });
  }

  if (!map.getLayer('popular-spots-glow')) {
    map.addLayer({
      id: 'popular-spots-glow',
      type: 'circle',
      source: 'popular-spots',
      paint: {
        'circle-radius': 14,
        'circle-color': 'rgba(251,191,36,0.25)',
        'circle-blur': 0.85,
      },
    });
  }

  if (!map.getLayer('popular-spots')) {
    map.addLayer({
      id: 'popular-spots',
      type: 'circle',
      source: 'popular-spots',
      paint: {
        'circle-radius': 6,
        'circle-color': '#f97316',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': isDark ? '#fcd34d' : '#ffffff',
      },
    });
  }

  if (!map.getLayer('trip-highlights') && map.getSource('trip-highlights')) {
    map.addLayer({
      id: 'trip-highlights',
      type: 'line',
      source: 'trip-highlights',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#f97316',
        'line-width': 3,
        'line-opacity': 0.8,
        'line-dasharray': [1.5, 1.5],
      },
    });
  }
}

function updateLayerVisibility(map: mapboxgl.Map, showHeatmap?: boolean) {
  if (map.getLayer('destinations-heat')) {
    map.setLayoutProperty('destinations-heat', 'visibility', showHeatmap === false ? 'none' : 'visible');
  }
}
