'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Destination } from '@/types/destination';

// CSS for marker animations with smooth slide-in
const markerStyles = `
  @keyframes markerSlideIn {
    0% {
      opacity: 0;
      transform: scale(0.5) translateY(8px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes markerFadeIn {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  .map-marker {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: #1C1C1C;
    border: 1.5px solid #FFFFFF;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    animation: markerSlideIn 0.35s cubic-bezier(0.32, 0.72, 0, 1) forwards;
    transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1),
                box-shadow 0.2s ease,
                width 0.2s cubic-bezier(0.32, 0.72, 0, 1),
                height 0.2s cubic-bezier(0.32, 0.72, 0, 1),
                background-color 0.2s ease;
  }

  .map-marker:hover {
    transform: scale(1.25);
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  }

  .map-marker.selected {
    width: 16px;
    height: 16px;
    background-color: #3B82F6;
    border-color: #FFFFFF;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
  }

  .map-marker.crown {
    background-color: #F59E0B;
    border-color: #FFFFFF;
  }

  .map-marker.michelin {
    background-color: #EF4444;
    border-color: #FFFFFF;
  }
`;

interface GoogleInteractiveMapProps {
  destinations: Destination[];
  onMarkerClick?: (destination: Destination) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  isDark?: boolean;
  selectedDestination?: Destination | null;
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
  center = { lat: 20, lng: 0 }, // World view fallback - parent handles smart defaults
  zoom = 2,
  isDark = true,
  selectedDestination,
}: GoogleInteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const markerElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const isInitializedRef = useRef(false);
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastZoomRef = useRef<number | null>(null);
  const lastDestinationsHashRef = useRef<string>('');
  const zoomListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stylesInjectedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inject marker animation styles
  useEffect(() => {
    if (stylesInjectedRef.current) return;

    const styleId = 'map-marker-styles';
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.textContent = markerStyles;
      document.head.appendChild(styleSheet);
    }
    stylesInjectedRef.current = true;
  }, []);

  // Add markers
  const addMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Create hash of destinations to prevent unnecessary updates
    const destinationsHash = JSON.stringify(
      destinations
        .filter(d => d.latitude && d.longitude)
        .map(d => ({ id: String(d.id || ''), lat: d.latitude, lng: d.longitude }))
        .sort((a, b) => a.id.localeCompare(b.id))
    );

    // Skip if destinations haven't changed
    if (destinationsHash === lastDestinationsHashRef.current) {
      return;
    }

    lastDestinationsHashRef.current = destinationsHash;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.map = null;
    });
    markersRef.current = [];
    markerElementsRef.current.clear();
    infoWindowsRef.current.forEach(iw => iw.close());
    infoWindowsRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasValidMarkers = false;

    destinations.forEach((dest) => {
      if (!dest.latitude || !dest.longitude) return;

      const position = { lat: dest.latitude, lng: dest.longitude };
      bounds.extend(position);
      hasValidMarkers = true;

      // Create an animated pin element with micro-interactions
      const pinElement = document.createElement('div');
      pinElement.className = 'map-marker';

      // Add special classes for crown/michelin destinations
      if (dest.crown) {
        pinElement.classList.add('crown');
      } else if (dest.michelin_stars && dest.michelin_stars > 0) {
        pinElement.classList.add('michelin');
      }

      // Stagger animation delay for entrance effect
      const index = destinations.indexOf(dest);
      pinElement.style.animationDelay = `${Math.min(index * 30, 500)}ms`;
      pinElement.style.opacity = '0'; // Start invisible, animation will fade in

      // Store reference to pin element for later updates (e.g., selected state)
      const destKey = dest.slug || String(dest.id);
      markerElementsRef.current.set(destKey, pinElement);

      // Create marker with visible element
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current!,
        position: position,
        title: dest.name || '',
        content: pinElement,
      });

      // Create info window content with image
      const imageUrl = dest.image_thumbnail || dest.image || '';
      const imageHtml = imageUrl 
        ? `<div style="width: 100%; height: 160px; overflow: hidden; border-radius: 8px 8px 0 0; margin: -12px -12px 12px -12px; background: #f5f5f5;">
            <img src="${imageUrl}" alt="${dest.name || 'Destination'}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
          </div>`
        : '';
      
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="min-width: 280px; max-width: 320px; font-family: system-ui, -apple-system, sans-serif; overflow: hidden;">
            ${imageHtml}
            <div style="padding: 0 12px 12px 12px;">
              <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">
                ${dest.name || 'Destination'}
              </h3>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                ${dest.category ? `<span style="font-size: 12px; color: #666; background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-weight: 500;">${dest.category}</span>` : ''}
                ${dest.city ? `<span style="font-size: 12px; color: #888;">${dest.city}</span>` : ''}
              </div>
              ${dest.rating ? `<div style="display: flex; align-items: center; gap: 4px; font-size: 13px; color: #1a1a1a; font-weight: 500;">
                <span style="font-size: 14px;">⭐</span>
                <span>${dest.rating.toFixed(1)}</span>
              </div>` : ''}
            </div>
          </div>
        `,
        maxWidth: 320,
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

    // Fit bounds if we have markers, otherwise center on Taiwan
    if (hasValidMarkers && markersRef.current.length > 0) {
      mapInstanceRef.current.fitBounds(bounds);
      // Don't zoom in too much if only one marker
      if (markersRef.current.length === 1) {
        const listener = google.maps.event.addListener(mapInstanceRef.current, 'bounds_changed', () => {
          if (mapInstanceRef.current) {
            const currentZoom = mapInstanceRef.current.getZoom() || 8;
            if (currentZoom > 15) {
              mapInstanceRef.current.setZoom(15);
            }
            // Ensure minimum zoom to prevent grey areas
            if (currentZoom < 3) {
              mapInstanceRef.current.setZoom(3);
            }
            google.maps.event.removeListener(listener);
          }
        });
      } else {
        // Ensure minimum zoom after fitBounds to prevent grey areas
        const listener = google.maps.event.addListener(mapInstanceRef.current, 'bounds_changed', () => {
          if (mapInstanceRef.current) {
            const currentZoom = mapInstanceRef.current.getZoom() || 8;
            if (currentZoom < 3) {
              mapInstanceRef.current.setZoom(3);
            }
            google.maps.event.removeListener(listener);
          }
        });
      }
    } else {
      // No markers - use the center and zoom props passed from parent
      // The parent component (HomeMapSplitView) handles intelligent fallback
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [destinations, onMarkerClick, center, zoom]);

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;
    
    // Check if Map constructor is available
    if (!window.google.maps.Map) {
      console.warn('Google Maps Map constructor not available yet');
      setError('Google Maps is still loading');
      return;
    }

    try {
      // When using mapId, styles should be configured in Google Cloud Console
      // Only use styles prop if mapId is not provided
      const mapOptions: google.maps.MapOptions = {
        center: { lat: center.lat, lng: center.lng },
        zoom: zoom,
        minZoom: 3, // Prevent zooming out too much to avoid grey areas
        maxZoom: 20,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        restriction: {
          latLngBounds: {
            north: 85,
            south: -85,
            east: 180,
            west: -180,
          },
          strictBounds: false, // Allow slight overflow for better UX
        },
      };

      // Only set mapId if available, otherwise use styles
      // Check for both env var and fallback to hardcoded value for backward compatibility
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'URBAN_MANUAL_MAP';
      if (mapId) {
        mapOptions.mapId = mapId;
      } else if (isDark) {
        // Fallback to inline styles if mapId is not configured
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

      mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions);
      isInitializedRef.current = true;
      lastCenterRef.current = { lat: center.lat, lng: center.lng };
      lastZoomRef.current = zoom;

      // Ensure map is centered on the provided center on first load
      // The parent component handles intelligent fallback for center/zoom
      if (!lastCenterRef.current || (lastCenterRef.current.lat === 0 && lastCenterRef.current.lng === 0)) {
        mapInstanceRef.current.setCenter({ lat: center.lat, lng: center.lng });
        mapInstanceRef.current.setZoom(zoom);
      }

      // Add zoom change listener to prevent zooming out too much
      // Store the listener so we can remove it on cleanup
      zoomListenerRef.current = google.maps.event.addListener(mapInstanceRef.current, 'zoom_changed', () => {
        if (mapInstanceRef.current) {
          const currentZoom = mapInstanceRef.current.getZoom() || 8;
          if (currentZoom < 3) {
            mapInstanceRef.current.setZoom(3);
          }
        }
      });

      // Add markers after map is initialized (with slight delay to ensure map is ready)
      initTimeoutRef.current = setTimeout(() => {
        if (destinations.length > 0) {
          addMarkers();
        }
      }, 100);
    } catch (err) {
      console.error('Error initializing Google Map:', err);
      setError('Failed to initialize map');
      isInitializedRef.current = false;
    }
  }, [center.lat, center.lng, zoom, isDark]); // Removed addMarkers to prevent re-initialization

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    
    if (!apiKey) {
      setError('Google Maps API key not found');
      setIsLoading(false);
      return;
    }

    // Check if already loaded
    if (window.google?.maps) {
      setIsLoading(false);
      initializeMap();
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[data-google-maps]')) {
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          setIsLoading(false);
          initializeMap();
          clearInterval(checkInterval);
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
      // Wait for Map constructor to be available
      const checkMapConstructor = () => {
        if (window.google?.maps?.Map) {
          setIsLoading(false);
          setError(null);
          initializeMap();
        } else {
          // Retry after a short delay
          setTimeout(checkMapConstructor, 50);
        }
      };
      checkMapConstructor();
    };

    script.onerror = () => {
      setError('Failed to load Google Maps API');
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.map = null);
      markersRef.current = [];
      markerElementsRef.current.clear();
      infoWindowsRef.current.forEach(iw => iw.close());
      infoWindowsRef.current = [];
      // Cleanup zoom listener
      if (zoomListenerRef.current) {
        google.maps.event.removeListener(zoomListenerRef.current);
        zoomListenerRef.current = null;
      }
      // Cleanup init timeout
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
    };
  }, [initializeMap]);

  // Update selected marker visual state
  useEffect(() => {
    // Clear all selected states first
    markerElementsRef.current.forEach((element) => {
      element.classList.remove('selected');
    });

    // Add selected state to the current selection
    if (selectedDestination) {
      const destKey = selectedDestination.slug || String(selectedDestination.id);
      const selectedElement = markerElementsRef.current.get(destKey);
      if (selectedElement) {
        selectedElement.classList.add('selected');
      }
    }
  }, [selectedDestination?.id, selectedDestination?.slug]);

  // Zoom to selected destination on desktop
  useEffect(() => {
    if (!mapInstanceRef.current || !isInitializedRef.current || isLoading) return;
    if (!selectedDestination || !selectedDestination.latitude || !selectedDestination.longitude) return;

    // Only zoom on desktop (lg breakpoint and above)
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (!isDesktop) return;

    const position = {
      lat: selectedDestination.latitude,
      lng: selectedDestination.longitude,
    };

    // Zoom to the selected destination with a smooth animation
    mapInstanceRef.current.setCenter(position);
    mapInstanceRef.current.setZoom(15); // Zoom level 15 for a close-up view
  }, [selectedDestination?.id, selectedDestination?.latitude, selectedDestination?.longitude, isLoading]);

  // Update map center and zoom when props change (but only if map is already initialized)
  useEffect(() => {
    if (mapInstanceRef.current && isInitializedRef.current && !isLoading) {
      // Skip if we just zoomed to a selected destination (prevent conflict)
      if (selectedDestination?.latitude && selectedDestination?.longitude) {
        // Check if we're on desktop - if so, let the selectedDestination effect handle it
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
        if (isDesktop) return;
      }

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
  }, [center.lat, center.lng, zoom, isLoading, selectedDestination]);

  // Update markers when destinations change (but don't re-initialize map)
  useEffect(() => {
    if (mapInstanceRef.current && window.google?.maps && isInitializedRef.current && !isLoading) {
      // Use requestAnimationFrame to batch marker updates and prevent flashing
      const frameId = requestAnimationFrame(() => {
        addMarkers();
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [destinations, addMarkers, isLoading]);

  return (
    <div className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 z-10">
          <div className="text-center p-6">
            <p className="text-sm font-medium">Loading map...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 z-10">
          <div className="text-center p-6">
            <p className="text-sm font-medium">{error}</p>
            <p className="text-xs text-gray-500 mt-1">Please check your Google Maps API key configuration.</p>
          </div>
        </div>
      )}
      <div 
        ref={mapRef} 
        className="absolute inset-0 w-full h-full"
        style={{ 
          visibility: isLoading || error ? 'hidden' : 'visible',
          padding: 0,
          margin: 0,
          border: 'none',
          zIndex: 1,
        }}
      />
    </div>
  );
}

