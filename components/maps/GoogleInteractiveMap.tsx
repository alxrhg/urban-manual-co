'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Destination } from '@/types/destination';

interface GoogleInteractiveMapProps {
  destinations: Destination[];
  onMarkerClick?: (destination: Destination) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  isDark?: boolean;
  onProviderError?: (message: string) => void;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

export default function GoogleInteractiveMap({
  destinations,
  onMarkerClick,
  center = { lat: 23.5, lng: 121.0 },
  zoom = 8,
  isDark = true,
  onProviderError,
}: GoogleInteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const isInitializedRef = useRef(false);
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastZoomRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error && !isLoading && onProviderError) {
      onProviderError(error);
    }
  }, [error, isLoading, onProviderError]);

  // Add markers
  const addMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.map = null;
    });
    markersRef.current = [];
    infoWindowsRef.current.forEach(iw => iw.close());
    infoWindowsRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasValidMarkers = false;

    destinations.forEach((dest) => {
      if (!dest.latitude || !dest.longitude) return;

      const position = { lat: dest.latitude, lng: dest.longitude };
      bounds.extend(position);
      hasValidMarkers = true;

      // Create a visible pin element
      const pinElement = document.createElement('div');
      pinElement.style.width = '12px';
      pinElement.style.height = '12px';
      pinElement.style.borderRadius = '50%';
      pinElement.style.backgroundColor = '#1C1C1C';
      pinElement.style.border = '1.5px solid #FFFFFF';
      pinElement.style.cursor = 'pointer';
      pinElement.style.transition = 'all 0.2s ease';
      pinElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      // Create marker with visible element
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current!,
        position: position,
        title: dest.name || '',
        content: pinElement,
      });

      // Create info window content
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 200px; font-family: system-ui, -apple-system, sans-serif;">
            <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
              ${dest.name || 'Destination'}
            </h3>
            ${dest.category ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #666;">${dest.category}</p>` : ''}
            ${dest.city ? `<p style="margin: 4px 0; font-size: 12px; color: #888;">${dest.city}</p>` : ''}
            ${dest.rating ? `<div style="margin: 6px 0 0 0; font-size: 12px; color: #666;">⭐ ${dest.rating.toFixed(1)}</div>` : ''}
          </div>
        `,
      });

      // Add click listener
      marker.addListener('click', () => {
        // Close all other info windows
        infoWindowsRef.current.forEach(iw => iw.close());
        
        // Open this info window
        infoWindow.open({
          anchor: marker,
          map: mapInstanceRef.current!,
        });

        // Call onMarkerClick callback
        if (onMarkerClick) {
          onMarkerClick(dest);
        }
      });

      markersRef.current.push(marker);
      infoWindowsRef.current.push(infoWindow);
    });

    // Fit bounds if we have markers
    if (hasValidMarkers && markersRef.current.length > 0) {
      mapInstanceRef.current.fitBounds(bounds);
      // Don't zoom in too much if only one marker
      if (markersRef.current.length === 1) {
        const listener = google.maps.event.addListener(mapInstanceRef.current, 'bounds_changed', () => {
          if (mapInstanceRef.current) {
            if (mapInstanceRef.current.getZoom()! > 15) {
              mapInstanceRef.current.setZoom(15);
            }
            google.maps.event.removeListener(listener);
          }
        });
      }
    }
  }, [destinations, onMarkerClick]);

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapRef.current) {
      console.warn('Map container ref not available');
      return;
    }

    if (!window.google?.maps) {
      console.warn('Google Maps API not loaded yet');
      setError('Google Maps API is still loading. Please wait...');
      return;
    }

    // Prevent double initialization
    if (isInitializedRef.current && mapInstanceRef.current) {
      console.log('Map already initialized, skipping...');
      return;
    }

    try {
      // When using mapId, styles should be configured in Google Cloud Console
      // Only use styles prop if mapId is not provided
      const mapOptions: google.maps.MapOptions = {
        center: { lat: center.lat, lng: center.lng },
        zoom: zoom,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      };

      // Only set mapId if available and valid, otherwise use styles
      // Check for both env var and fallback to hardcoded value for backward compatibility
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'URBAN_MANUAL_MAP';
      
      // Try to use mapId, but fallback to styles if it fails
      if (mapId && mapId !== '') {
        mapOptions.mapId = mapId;
      }
      
      // Always provide styles as fallback (mapId might not be configured in Google Cloud Console)
      if (isDark) {
        // Fallback to inline styles if mapId is not configured or fails
        mapOptions.styles = [
          { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
          },
          {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
          },
          {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#263c3f' }]
          },
          {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b9a76' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#38414e' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#212a37' }]
          },
          {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9ca5b3' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#746855' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#1f2835' }]
          },
          {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f3d19c' }]
          },
          {
            featureType: 'transit',
            elementType: 'geometry',
            stylers: [{ color: '#2f3948' }]
          },
          {
            featureType: 'transit.station',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#17263c' }]
          },
          {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#515c6d' }]
          },
          {
            featureType: 'water',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#17263c' }]
          }
        ];
      }

      // Initialize the map
      mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions);
      
      // Wait for map to be ready before marking as initialized
      google.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
        isInitializedRef.current = true;
        lastCenterRef.current = { lat: center.lat, lng: center.lng };
        lastZoomRef.current = zoom;
        setIsLoading(false);
        setError(null);

        // Markers will be added by the destinations effect when map is ready
      });

      // Handle map errors
      google.maps.event.addListener(mapInstanceRef.current, 'error', (e: any) => {
        console.error('Google Maps error event:', e);
        setError('Map error occurred. Please refresh the page.');
        setIsLoading(false);
      });

    } catch (err: any) {
      console.error('Error initializing Google Map:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to initialize map';
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.toString) {
        errorMessage = err.toString();
      }
      
      // Check for common errors
      if (errorMessage.includes('InvalidKeyMapError') || errorMessage.includes('RefererNotAllowedMapError')) {
        errorMessage = 'Invalid Google Maps API key or domain restrictions. Please check your API key configuration.';
      } else if (errorMessage.includes('mapId')) {
        errorMessage = 'Invalid map ID. The map ID may not be configured in Google Cloud Console. Using default styles.';
        // Retry without mapId
        try {
          const fallbackOptions: google.maps.MapOptions = {
            center: { lat: center.lat, lng: center.lng },
            zoom: zoom,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            styles: isDark ? [
              { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
              { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
              { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
            ] : undefined,
          };
          mapInstanceRef.current = new google.maps.Map(mapRef.current, fallbackOptions);
          // Wait for map to be ready
          google.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
            isInitializedRef.current = true;
            lastCenterRef.current = { lat: center.lat, lng: center.lng };
            lastZoomRef.current = zoom;
            setIsLoading(false);
            setError(null);
            // Markers will be added by the destinations effect
          });
          return;
        } catch (retryErr) {
          console.error('Retry with fallback also failed:', retryErr);
        }
      }
      
      setError(errorMessage);
      isInitializedRef.current = false;
      setIsLoading(false);
    }
  }, [center.lat, center.lng, zoom, isDark, destinations, onMarkerClick]);

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    
    if (!apiKey) {
      setError('Google API key not found. Please configure NEXT_PUBLIC_GOOGLE_API_KEY in your environment variables.');
      setIsLoading(false);
      return;
    }

    // Check if already loaded
    if (window.google?.maps) {
      setIsLoading(false);
      setError(null);
      // Small delay to ensure DOM is ready
      setTimeout(() => initializeMap(), 100);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[data-google-maps]');
    if (existingScript) {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.google?.maps) {
          setIsLoading(false);
          setError(null);
          clearInterval(checkInterval);
          setTimeout(() => initializeMap(), 100);
        } else if (attempts >= maxAttempts) {
          // Script loading timeout
          clearInterval(checkInterval);
          setError('Google Maps API failed to load. Please check your internet connection and API key.');
          setIsLoading(false);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    setIsLoading(true);
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&loading=async`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-maps', 'true');
    
    script.onload = () => {
      // Wait a bit for Google Maps to fully initialize
      setTimeout(() => {
        if (window.google?.maps) {
          setIsLoading(false);
          setError(null);
          initializeMap();
        } else {
          setError('Google Maps API loaded but not available. Please check your API key configuration.');
          setIsLoading(false);
        }
      }, 100);
    };

    script.onerror = (err) => {
      console.error('Google Maps script load error:', err);
      setError('Failed to load Google Maps API. Please check your API key and network connection.');
      setIsLoading(false);
      
      // Remove the failed script to allow retry
      const failedScript = document.querySelector('script[data-google-maps]');
      if (failedScript) {
        failedScript.remove();
      }
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => {
        if (marker) {
          marker.map = null;
        }
      });
      markersRef.current = [];
      infoWindowsRef.current.forEach(iw => {
        if (iw) {
          iw.close();
        }
      });
      infoWindowsRef.current = [];
    };
  }, [initializeMap]);

  // Update map center and zoom when props change (but only if map is already initialized)
  useEffect(() => {
    if (mapInstanceRef.current && isInitializedRef.current && !isLoading) {
      // Only update if center/zoom actually changed (prevent unnecessary updates)
      const centerChanged = 
        !lastCenterRef.current ||
        Math.abs(lastCenterRef.current.lat - center.lat) > 0.001 || 
        Math.abs(lastCenterRef.current.lng - center.lng) > 0.001;
      
      const zoomChanged = lastZoomRef.current === null || lastZoomRef.current !== zoom;
      
      if (centerChanged || zoomChanged) {
        mapInstanceRef.current.setCenter({ lat: center.lat, lng: center.lng });
        mapInstanceRef.current.setZoom(zoom);
        lastCenterRef.current = { lat: center.lat, lng: center.lng };
        lastZoomRef.current = zoom;
      }
    }
  }, [center.lat, center.lng, zoom, isLoading]);

  // Update markers when destinations change (but don't re-initialize map)
  useEffect(() => {
    if (mapInstanceRef.current && window.google?.maps && isInitializedRef.current && !isLoading) {
      addMarkers();
    }
  }, [destinations, addMarkers, isLoading]);

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 z-10">
          <div className="text-center p-6">
            <p className="text-sm font-medium">Loading map...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 z-10">
          <div className="text-center p-6 max-w-md">
            <p className="text-sm font-medium mb-2">{error}</p>
            <p className="text-xs text-gray-500 mb-4">Please check your Google API key configuration (NEXT_PUBLIC_GOOGLE_API_KEY).</p>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                // Remove existing script and retry
                const existingScript = document.querySelector('script[data-google-maps]');
                if (existingScript) {
                  existingScript.remove();
                }
                // Trigger re-initialization
                window.location.reload();
              }}
              className="text-xs px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-80 transition-opacity"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: '600px', visibility: isLoading || error ? 'hidden' : 'visible' }}
      />
    </div>
  );
}

