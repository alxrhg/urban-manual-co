'use client';

import { useEffect, useRef, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { ExternalLink } from 'lucide-react';

interface GoogleMapProps {
  query?: string;
  latitude?: number;
  longitude?: number;
  height?: number | string; // Accepts both number (pixels) and string (%, vh, etc)
  className?: string;
  interactive?: boolean; // Whether the map should be interactive (default: true)
  // Info window props
  showInfoWindow?: boolean; // Whether to show info window (default: false)
  infoWindowContent?: {
    title?: string;
    address?: string;
    category?: string;
    rating?: number;
    website?: string;
  };
  autoOpenInfoWindow?: boolean; // Whether to auto-open info window (default: false)
  // Static map props
  staticMode?: boolean; // If true, shows static map with info overlay and click-to-open link
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
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>('');

  // Get height style
  const getHeightStyle = () => {
    if (typeof height === 'number') {
      return `${height}px`;
    }
    return height;
  };

  // Use only the canonical env var
  const getApiKey = () => process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';

  // Load Google Maps script
  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setError('Google Maps API key is not configured. Please add NEXT_PUBLIC_GOOGLE_API_KEY to your environment variables.');
      console.error('Google Maps API key is not configured');
      return;
    }

    // Check if script is already loaded
    if (window.google && window.google.maps) {
      setLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => setLoaded(true));
    script.addEventListener('error', () => {
      setError('Failed to load Google Maps. Please check your API key and network connection.');
    });
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize map and geocode
  useEffect(() => {
    if (!loaded || !mapRef.current) return;

    const initializeMap = async () => {
      try {
        let center: google.maps.LatLngLiteral;

        // If we have explicit coordinates, use them
        if (latitude !== undefined && longitude !== undefined) {
          center = { lat: latitude, lng: longitude };
        } else if (query) {
          // Geocode the query string
          const geocoder = new google.maps.Geocoder();
          const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
            geocoder.geocode({ address: query }, (results, status) => {
              if (status === 'OK' && results) {
                resolve(results);
              } else {
                reject(new Error(`Geocoding failed: ${status}`));
              }
            });
          });

          if (result.length > 0) {
            center = {
              lat: result[0].geometry.location.lat(),
              lng: result[0].geometry.location.lng(),
            };
          } else {
            throw new Error('No results found for query');
          }
        } else {
          // Default to Tokyo
          center = { lat: 35.6762, lng: 139.6503 };
        }

        // Generate Google Maps URL for click-to-open
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          infoWindowContent?.address || query || `${center.lat},${center.lng}`
        )}`;
        setGoogleMapsUrl(mapsUrl);

        // Create map
        if (!mapInstanceRef.current) {
          const isStatic = staticMode || !interactive;
          mapInstanceRef.current = new google.maps.Map(mapRef.current!, {
            center,
            zoom: 15,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
            ],
            // Disable all interactions for static mode
            disableDefaultUI: isStatic,
            zoomControl: !isStatic && interactive,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: !isStatic && interactive,
            gestureHandling: isStatic ? 'none' : (interactive ? 'auto' : 'none'),
            draggable: !isStatic && interactive,
            scrollwheel: !isStatic && interactive,
            disableDoubleClickZoom: isStatic || !interactive,
            keyboardShortcuts: !isStatic && interactive,
          });
        } else {
          mapInstanceRef.current.setCenter(center);
          // Update interaction settings if they changed
          const isStatic = staticMode || !interactive;
          mapInstanceRef.current.setOptions({
            gestureHandling: isStatic ? 'none' : (interactive ? 'auto' : 'none'),
            draggable: !isStatic && interactive,
            scrollwheel: !isStatic && interactive,
            disableDoubleClickZoom: isStatic || !interactive,
            keyboardShortcuts: !isStatic && interactive,
          });
        }

        // Add or update marker
        if (markerRef.current) {
          markerRef.current.setPosition(center);
          markerRef.current.setTitle(infoWindowContent?.title || query || 'Location');
        } else {
          markerRef.current = new google.maps.Marker({
            position: center,
            map: mapInstanceRef.current,
            title: infoWindowContent?.title || query || 'Location',
          });
        }

        // Create info window if needed
        if (showInfoWindow && infoWindowContent) {
          // Create info window content
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
                  onmouseover="this.style.textDecoration='underline'"
                  onmouseout="this.style.textDecoration='none'"
                >
                  View on Google Maps →
                </a>
              ` : ''}
            </div>
          `;

          // Create or update info window
          if (!infoWindowRef.current) {
            infoWindowRef.current = new google.maps.InfoWindow({
              content,
            });
          } else {
            infoWindowRef.current.setContent(content);
          }

          // Remove existing click listeners before adding new one (prevent duplicates)
          if (markerRef.current) {
            google.maps.event.clearListeners(markerRef.current, 'click');
            markerRef.current.addListener('click', () => {
              if (infoWindowRef.current && markerRef.current) {
                infoWindowRef.current.open(mapInstanceRef.current, markerRef.current);
              }
            });
          }

          // Auto-open info window if requested
          if (autoOpenInfoWindow && infoWindowRef.current && markerRef.current) {
            // Use setTimeout to ensure map is fully rendered
            setTimeout(() => {
              if (infoWindowRef.current && markerRef.current && mapInstanceRef.current) {
                infoWindowRef.current.open(mapInstanceRef.current, markerRef.current);
              }
            }, 100);
          }
        }
      } catch (err: any) {
        console.error('Error initializing Google Map:', err);
        setError(err.message || 'Failed to initialize map');
      }
    };

    initializeMap();
  }, [loaded, query, latitude, longitude, interactive, showInfoWindow, infoWindowContent, autoOpenInfoWindow, staticMode]);

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
      {isStatic && googleMapsUrl && (
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
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
            onClick={(e) => {
              // Track click if needed
              e.stopPropagation();
            }}
          >
            <div className="opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-900 rounded-lg px-4 py-2 shadow-lg flex items-center gap-2 transition-opacity pointer-events-none">
              <ExternalLink className="h-4 w-4 text-gray-700 dark:text-gray-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Open in Google Maps
              </span>
            </div>
          </a>
        </>
      )}
    </div>
  );
}

