'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Destination } from '@/types/destination';

interface MyGoogleMapProps {
    destinations: Destination[];
    onMarkerClick?: (destination: Destination) => void;
    center?: { lat: number; lng: number };
    zoom?: number;
    isDark?: boolean;
}

export default function MyGoogleMap({
    destinations,
    onMarkerClick,
    center = { lat: 23.5, lng: 121.0 },
    zoom = 8,
    isDark = true,
}: MyGoogleMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('MyGoogleMap mounted', { destinationsCount: destinations.length, center, zoom });
    }, [destinations.length, center, zoom]);

    // Add markers
    const addMarkers = useCallback(() => {
        if (!mapInstanceRef.current || !window.google?.maps) return;

        // Clear existing markers
        markersRef.current.forEach(marker => {
            marker.map = null;
        });
        markersRef.current = [];

        const bounds = new google.maps.LatLngBounds();
        let hasValidMarkers = false;

        destinations.forEach((dest) => {
            if (!dest.latitude || !dest.longitude) return;

            const position = { lat: dest.latitude, lng: dest.longitude };
            bounds.extend(position);
            hasValidMarkers = true;

            // Create standard PinElement
            // We can customize colors here to match our brand
            const pinElement = new google.maps.marker.PinElement({
                background: isDark ? '#FFFFFF' : '#111827', // White in dark mode, Dark Gray in light mode
                borderColor: isDark ? '#111827' : '#FFFFFF',
                glyphColor: isDark ? '#111827' : '#FFFFFF',
                scale: 1,
            });

            // Create AdvancedMarkerElement with the PinElement
            const marker = new google.maps.marker.AdvancedMarkerElement({
                map: mapInstanceRef.current!,
                position: position,
                title: dest.name || '',
                content: pinElement.element,
            });

            // Add click listener
            marker.addListener('click', () => {
                onMarkerClick?.(dest);
            });

            markersRef.current.push(marker);
        });

        // Fit bounds if we have markers
        // Only fit bounds on initial load or if explicitly requested, 
        // otherwise it might be annoying if the user is panning around.
        // For now, we'll skip auto-fitting on every update to allow user control,
        // unless it's the very first load or the map is empty.
        if (hasValidMarkers && markersRef.current.length > 0 && !mapInstanceRef.current.getCenter()) {
            mapInstanceRef.current.fitBounds(bounds);
        }

    }, [destinations, onMarkerClick, isDark]);

    // Initialize map
    const initializeMap = useCallback(() => {
        if (!mapRef.current || !window.google?.maps) return;

        try {
            mapInstanceRef.current = new google.maps.Map(mapRef.current, {
                center: { lat: center.lat, lng: center.lng },
                zoom: zoom,
                mapId: 'URBAN_MANUAL_MAP_PINS', // Use a specific Map ID
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                styles: isDark ? [
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
                ] : undefined,
            });

            addMarkers();
        } catch (err) {
            console.error('Error initializing Google Map:', err);
            setError('Failed to initialize map');
        }
    }, [center.lat, center.lng, zoom, isDark, addMarkers]);

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

        setIsLoading(true);

        import('@/lib/maps/google-loader').then(({ loadGoogleMaps }) => {
            loadGoogleMaps({ libraries: ['marker', 'places'] })
                .then(() => {
                    setIsLoading(false);
                    setError(null);
                    initializeMap();
                })
                .catch((err) => {
                    console.error('Failed to load Google Maps:', err);
                    setError('Failed to load Google Maps API');
                    setIsLoading(false);
                });
        });

        return () => {
            markersRef.current.forEach(marker => marker.map = null);
            markersRef.current = [];
        };
    }, [initializeMap]);

    // Update markers when destinations change
    useEffect(() => {
        if (mapInstanceRef.current && window.google?.maps) {
            addMarkers();
        }
    }, [addMarkers]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
                <div className="text-center p-6">
                    <p className="text-sm font-medium">{error}</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-white rounded-full animate-spin" />
                    <p className="text-sm font-medium">Loading map...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={mapRef}
            className="w-full h-full rounded-xl overflow-hidden shadow-sm"
            style={{ minHeight: '100%' }}
        />
    );
}
