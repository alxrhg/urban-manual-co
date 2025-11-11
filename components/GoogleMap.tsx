'use client';

import { useEffect, useRef, useState } from 'react';
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

declare global {
  interface Window {
    __googleMapsScriptLoading?: boolean;
  }
}

async function loadGoogleMapsApi(apiKey: string): Promise<typeof google.maps> {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps API requires a browser environment');
  }

  if (window.google?.maps) {
    return window.google.maps;
  }

  const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-maps-script="true"]');
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', () => {
        if (window.google?.maps) {
          resolve(window.google.maps);
        } else {
          reject(new Error('Google Maps API failed to load'));
        }
      });
      existingScript.addEventListener('error', () => {
        reject(new Error('Google Maps script failed to load'));
      });
    });
  }

  if (window.__googleMapsScriptLoading) {
    return new Promise((resolve, reject) => {
      const checkInterval = window.setInterval(() => {
        if (window.google?.maps) {
          window.clearInterval(checkInterval);
          resolve(window.google.maps);
        }
      }, 200);

      window.setTimeout(() => {
        window.clearInterval(checkInterval);
        if (window.google?.maps) {
          resolve(window.google.maps);
        } else {
          reject(new Error('Google Maps API load timed out'));
        }
      }, 15000);
    });
  }

  window.__googleMapsScriptLoading = true;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsScript = 'true';
    script.addEventListener('load', () => {
      window.__googleMapsScriptLoading = false;
      if (window.google?.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps API failed to initialize'));
      }
    });
    script.addEventListener('error', () => {
      window.__googleMapsScriptLoading = false;
      reject(new Error('Google Maps script failed to load'));
    });
    document.head.appendChild(script);
  });
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
  staticMode = false,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const mapsApiRef = useRef<typeof google.maps | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapUrl, setMapUrl] = useState<string>('');

  const getHeightStyle = () => {
    if (typeof height === 'number') {
      return `${height}px`;
    }
    return height;
  };

  const getApiKey = () =>
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
    '';

  useEffect(() => {
    let isCancelled = false;

    const initialize = async () => {
      if (!mapRef.current) return;

      const apiKey = getApiKey();
      if (!apiKey) {
        setError('Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_API_KEY.');
        return;
      }

      try {
        const maps = await loadGoogleMapsApi(apiKey);
        if (isCancelled || !mapRef.current) return;

        mapsApiRef.current = maps;

        const defaultCenter = new maps.LatLng(latitude ?? 40.7128, longitude ?? -74.0060);
        const map = new maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 13,
          disableDefaultUI: staticMode || !interactive,
          clickableIcons: interactive,
          gestureHandling: staticMode || !interactive ? 'none' : 'auto',
          zoomControl: interactive && !staticMode,
          mapTypeControl: false,
          streetViewControl: interactive && !staticMode,
          fullscreenControl: interactive && !staticMode,
        });

        mapInstanceRef.current = map;
        setLoaded(true);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Google Maps initialization error:', err);
          setError(err?.message || 'Failed to load Google Maps.');
        }
      }
    };

    initialize();

    return () => {
      isCancelled = true;
    };
  }, [latitude, longitude, interactive, staticMode]);

  useEffect(() => {
    const maps = mapsApiRef.current;
    const map = mapInstanceRef.current;
    if (!maps || !map) return;

    const updateInteractionOptions = () => {
      map.setOptions({
        gestureHandling: staticMode || !interactive ? 'none' : 'auto',
        zoomControl: interactive && !staticMode,
        draggable: interactive && !staticMode,
        scrollwheel: interactive && !staticMode,
        disableDoubleClickZoom: staticMode || !interactive,
        clickableIcons: interactive,
      });
    };

    updateInteractionOptions();
  }, [interactive, staticMode]);

  useEffect(() => {
    const maps = mapsApiRef.current;
    const map = mapInstanceRef.current;
    if (!maps || !map) return;

    let cancelled = false;

    const applyPosition = (position: google.maps.LatLngLiteral) => {
      if (cancelled) return;
      map.setCenter(position);

      if (!markerRef.current) {
        markerRef.current = new maps.Marker({
          position,
          map,
          clickable: interactive,
        });
      } else {
        markerRef.current.setPosition(position);
      }

      const url = `https://www.google.com/maps/search/?api=1&query=${position.lat},${position.lng}`;
      setMapUrl(url);

      if (showInfoWindow && infoWindowContent) {
        const content = `
          <div style="padding: 12px; min-width: 200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${infoWindowContent.title ? `<h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${infoWindowContent.title}</h3>` : ''}
            ${infoWindowContent.category ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #666;">${infoWindowContent.category}</p>` : ''}
            ${infoWindowContent.address ? `<p style="margin: 4px 0; font-size: 12px; color: #888; line-height: 1.4;">${infoWindowContent.address}</p>` : ''}
            ${infoWindowContent.rating ? `<div style="margin: 6px 0 0 0; font-size: 12px; color: #666;">⭐ ${infoWindowContent.rating.toFixed(1)}</div>` : ''}
            ${infoWindowContent.website ? `<a href="${infoWindowContent.website}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 8px; font-size: 12px; color: #0066cc; text-decoration: none;">Visit Website →</a>` : ''}
          </div>
        `;

        if (!infoWindowRef.current) {
          infoWindowRef.current = new maps.InfoWindow({ content });
        } else {
          infoWindowRef.current.setContent(content);
        }

        if (autoOpenInfoWindow) {
          infoWindowRef.current.open({ map, anchor: markerRef.current || undefined });
        }

        if (markerRef.current) {
          markerRef.current.addListener('click', () => {
            infoWindowRef.current?.open({ map, anchor: markerRef.current || undefined });
          });
        }
      } else if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    };

    const resolvePosition = () => {
      if (latitude !== undefined && longitude !== undefined) {
        applyPosition({ lat: latitude, lng: longitude });
        return;
      }

      if (query) {
        const geocoder = new maps.Geocoder();
        geocoder.geocode({ address: query }, (results, status) => {
          if (cancelled) return;
          if (status === 'OK' && results && results.length > 0) {
            const location = results[0].geometry.location;
            applyPosition(location.toJSON());
          } else {
            setError('Failed to locate address.');
          }
        });
        return;
      }

      // Default fallback center (NYC)
      applyPosition({ lat: 40.7128, lng: -74.0060 });
    };

    resolvePosition();

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, query, showInfoWindow, infoWindowContent, autoOpenInfoWindow, interactive, staticMode]);

  if (error) {
    return (
      <div
        className={`w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 text-center ${className}`}
        style={{ height: getHeightStyle() }}
      >
        <div className="max-w-md space-y-2">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">Map unavailable</p>
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
      className={`relative w-full rounded-2xl overflow-hidden ${className}`}
      style={{ height: getHeightStyle() }}
    >
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{
          height: getHeightStyle(),
          pointerEvents: isStatic ? 'none' : 'auto',
          cursor: isStatic ? 'pointer' : 'default',
        }}
      />

      {isStatic && mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-900 rounded-lg px-4 py-2 shadow-lg flex items-center gap-2 transition-opacity pointer-events-none">
            <ExternalLink className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Open in Google Maps</span>
          </div>
        </a>
      )}
    </div>
  );
}
