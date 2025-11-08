'use client';

import { useEffect, useRef, useState } from 'react';

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
  autoOpenInfoWindow = false
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        // Create map
        if (!mapInstanceRef.current) {
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
            // Disable interactions if not interactive
            disableDefaultUI: !interactive,
            zoomControl: interactive,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: interactive,
            gestureHandling: interactive ? 'auto' : 'none',
            draggable: interactive,
            scrollwheel: interactive,
            disableDoubleClickZoom: !interactive,
          });
        } else {
          mapInstanceRef.current.setCenter(center);
          // Update interaction settings if they changed
          mapInstanceRef.current.setOptions({
            gestureHandling: interactive ? 'auto' : 'none',
            draggable: interactive,
            scrollwheel: interactive,
            disableDoubleClickZoom: !interactive,
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
  }, [loaded, query, latitude, longitude, interactive, showInfoWindow, infoWindowContent, autoOpenInfoWindow]);

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`w-full rounded-2xl overflow-hidden ${className}`}
      style={{ height: getHeightStyle() }}
    />
  );
}

