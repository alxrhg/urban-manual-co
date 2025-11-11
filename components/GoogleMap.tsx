'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Spinner } from '@/components/ui/spinner';
import { ExternalLink } from 'lucide-react';

interface GoogleMapProps {
  query?: string;
  latitude?: number;
  longitude?: number;
  height?: number | string;
  className?: string;
  interactive?: boolean;
  showInfoWindow?: boolean;
  infoWindowContent?: {
    title?: string;
    address?: string;
    category?: string;
    rating?: number;
    website?: string;
  };
  autoOpenInfoWindow?: boolean;
  staticMode?: boolean;
}

export default function GoogleMap({
  query,
  latitude,
  longitude,
  height = 256,
  className = '',
  interactive = true,
  showInfoWindow = false,
  infoWindowContent,
  autoOpenInfoWindow = false,
  staticMode = false
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapboxUrl, setMapboxUrl] = useState<string>('');

  // Get height style
  const getHeightStyle = () => {
    if (typeof height === 'number') {
      return `${height}px`;
    }
    return height;
  };

  // Get Mapbox access token
  const getAccessToken = () => process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

  // Initialize Mapbox map
  useEffect(() => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setError('Mapbox access token is not configured. Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your environment variables.');
      console.error('Mapbox access token is not configured');
      return;
    }

    if (!mapRef.current) return;

    mapboxgl.accessToken = accessToken;

    const initializeMap = async () => {
      try {
        let center: [number, number];

        // If we have explicit coordinates, use them
        if (latitude !== undefined && longitude !== undefined) {
          center = [longitude, latitude];
        } else if (query) {
          // Geocode using Mapbox Geocoding API
          const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${accessToken}&limit=1`;
          const response = await fetch(geocodeUrl);
          const data = await response.json();

          if (data.features && data.features.length > 0) {
            center = data.features[0].center;
          } else {
            throw new Error('No results found for query');
          }
        } else {
          // Default to Tokyo
          center = [139.6503, 35.6762];
        }

        // Generate Mapbox URL for click-to-open
        const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+1C1C1C(${center[0]},${center[1]})/${center[0]},${center[1]},15/400x300@2x?access_token=${accessToken}`;
        setMapboxUrl(`https://www.mapbox.com/maps?lon=${center[0]}&lat=${center[1]}&zoom=15`);

        // Create map
        if (!mapInstanceRef.current) {
          const isStatic = staticMode || !interactive;
          mapInstanceRef.current = new mapboxgl.Map({
            container: mapRef.current!,
            style: 'mapbox://styles/mapbox/light-v11',
            center: center,
            zoom: 15,
            interactive: !isStatic && interactive,
            attributionControl: false,
          });

          // Add navigation controls if interactive
          if (!isStatic && interactive) {
            mapInstanceRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
          }
        } else {
          mapInstanceRef.current.setCenter(center);
        }

        // Add or update marker
        if (markerRef.current) {
          markerRef.current.setLngLat(center);
        } else {
          // Create marker element
          const el = document.createElement('div');
          el.className = 'marker';
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#1C1C1C';
          el.style.border = '2px solid #FFFFFF';
          el.style.cursor = 'pointer';

          markerRef.current = new mapboxgl.Marker({
            element: el,
            anchor: 'center',
          })
            .setLngLat(center)
            .addTo(mapInstanceRef.current);
        }

        // Create popup if needed
        if (showInfoWindow && infoWindowContent) {
          const content = `
            <div style="padding: 12px; min-width: 200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${infoWindowContent.title ? `
                <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
                  ${infoWindowContent.title}
                </h3>
              ` : ''}
              ${infoWindowContent.category ? `
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #666;">
                  ${infoWindowContent.category}
                </p>
              ` : ''}
              ${infoWindowContent.address ? `
                <p style="margin: 4px 0; font-size: 12px; color: #888; line-height: 1.4;">
                  ${infoWindowContent.address}
                </p>
              ` : ''}
              ${infoWindowContent.rating ? `
                <div style="margin: 6px 0 0 0; font-size: 12px; color: #666;">
                  ⭐ ${infoWindowContent.rating.toFixed(1)}
                </div>
              ` : ''}
              ${infoWindowContent.website ? `
                <a 
                  href="${infoWindowContent.website}" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style="display: inline-block; margin-top: 8px; font-size: 12px; color: #0066cc; text-decoration: none;"
                >
                  Visit Website →
                </a>
              ` : ''}
            </div>
          `;

          if (!popupRef.current) {
            popupRef.current = new mapboxgl.Popup({
              offset: 25,
              closeButton: true,
            }).setHTML(content);
          } else {
            popupRef.current.setHTML(content);
          }

          // Add click handler to marker
          if (markerRef.current && markerRef.current.getElement()) {
            const markerEl = markerRef.current.getElement();
            markerEl.addEventListener('click', () => {
              if (popupRef.current && markerRef.current) {
                popupRef.current.setLngLat(center).addTo(mapInstanceRef.current!);
              }
            });
          }

          // Auto-open popup if requested
          if (autoOpenInfoWindow && popupRef.current && markerRef.current) {
            setTimeout(() => {
              if (popupRef.current && markerRef.current && mapInstanceRef.current) {
                popupRef.current.setLngLat(center).addTo(mapInstanceRef.current);
              }
            }, 100);
          }
        }

        mapInstanceRef.current.on('load', () => {
          setLoaded(true);
        });

        mapInstanceRef.current.on('error', (e) => {
          console.error('Mapbox error:', e);
          setError('Failed to initialize map');
        });
      } catch (err: any) {
        console.error('Error initializing Mapbox map:', err);
        setError(err.message || 'Failed to initialize map');
      }
    };

    initializeMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [query, latitude, longitude, interactive, showInfoWindow, infoWindowContent, autoOpenInfoWindow, staticMode]);

  if (error) {
    return (
      <div
        className={`w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 ${className}`}
        style={{ height: getHeightStyle() }}
      >
        <div className="text-center max-w-md">
          <p className="text-sm text-red-600 dark:text-red-400 mb-2 font-medium">Map unavailable</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div
        className={`w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl ${className}`}
        style={{ height: getHeightStyle() }}
      >
        <div className="text-center">
          <Spinner className="size-8 mx-auto mb-2" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading map...</span>
        </div>
      </div>
    );
  }

  const isStatic = staticMode || !interactive;

  return (
    <div
      className={`w-full rounded-2xl overflow-hidden relative ${className}`}
      style={{ height: getHeightStyle() }}
    >
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ 
          height: getHeightStyle(),
          pointerEvents: isStatic ? 'none' : 'auto',
          cursor: isStatic ? 'pointer' : 'default'
        }}
      />
      
      {/* Static mode: Info overlay in top left and click-to-open link */}
      {isStatic && mapboxUrl && (
        <>
          {/* Info overlay in top left */}
          {infoWindowContent && (
            <div className="absolute top-3 left-3 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-3 max-w-[280px] z-10 pointer-events-none">
              {infoWindowContent.title && (
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  {infoWindowContent.title}
                </h4>
              )}
              {infoWindowContent.category && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {infoWindowContent.category}
                </p>
              )}
              {infoWindowContent.address && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-1 line-clamp-2">
                  {infoWindowContent.address}
                </p>
              )}
              {infoWindowContent.rating && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  ⭐ {infoWindowContent.rating.toFixed(1)}
                </div>
              )}
            </div>
          )}
          
          {/* Click-to-open overlay */}
          <a
            href={mapboxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-900 rounded-lg px-4 py-2 shadow-lg flex items-center gap-2 transition-opacity pointer-events-none">
              <ExternalLink className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Open in Mapbox
              </span>
            </div>
          </a>
        </>
      )}
    </div>
  );
}
