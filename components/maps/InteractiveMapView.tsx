'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Destination } from '@/types/destination';

// Set Mapbox access token
if (typeof window !== 'undefined') {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
}

interface InteractiveMapViewProps {
    destinations: Destination[];
    selectedDestination?: Destination | null;
    onMarkerClick?: (destination: Destination) => void;
    center?: { lat: number; lng: number };
    zoom?: number;
    className?: string;
    darkMode?: boolean;
}

export function InteractiveMapView({
    destinations,
    selectedDestination,
    onMarkerClick,
    center = { lat: 35.6762, lng: 139.6503 }, // Tokyo default
    zoom = 12,
    className = 'w-full h-full',
    darkMode = false,
}: InteractiveMapViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
    const [mapLoaded, setMapLoaded] = useState(false);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: darkMode
                ? 'mapbox://styles/mapbox/dark-v11'
                : 'mapbox://styles/mapbox/light-v11',
            center: [center.lng, center.lat],
            zoom: zoom,
            attributionControl: false,
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add attribution
        map.current.addControl(
            new mapboxgl.AttributionControl({
                compact: true,
            }),
            'bottom-right'
        );

        map.current.on('load', () => {
            setMapLoaded(true);
        });

        return () => {
            markers.current.forEach(marker => marker.remove());
            markers.current.clear();
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Update map style when dark mode changes
    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        const style = darkMode
            ? 'mapbox://styles/mapbox/dark-v11'
            : 'mapbox://styles/mapbox/light-v11';

        map.current.setStyle(style);
    }, [darkMode, mapLoaded]);

    // Create marker element
    const createMarkerElement = useCallback((destination: Destination, isSelected: boolean) => {
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.width = isSelected ? '40px' : '32px';
        el.style.height = isSelected ? '40px' : '32px';
        el.style.cursor = 'pointer';
        el.style.transition = 'all 0.2s ease';

        // Create marker icon based on category
        const icon = getCategoryIcon(destination.category);
        const bgColor = isSelected ? '#000' : '#fff';
        const textColor = isSelected ? '#fff' : '#000';
        const borderColor = isSelected ? '#fff' : '#e5e7eb';

        el.innerHTML = `
      <div style="
        width: 100%;
        height: 100%;
        background: ${bgColor};
        border: 2px solid ${borderColor};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isSelected ? '20px' : '16px'};
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      ">
        ${icon}
      </div>
    `;

        return el;
    }, []);

    // Get category icon
    const getCategoryIcon = (category?: string): string => {
        const icons: Record<string, string> = {
            restaurant: '🍽️',
            cafe: '☕',
            bar: '🍸',
            hotel: '🏨',
            shop: '🛍️',
            museum: '🏛️',
            park: '🌳',
            attraction: '🎭',
        };
        return icons[category?.toLowerCase() || ''] || '📍';
    };

    // Update markers when destinations change
    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        // Remove old markers
        markers.current.forEach(marker => marker.remove());
        markers.current.clear();

        // Filter destinations with valid coordinates
        const validDestinations = destinations.filter(
            d => d.latitude != null && d.longitude != null
        );

        if (validDestinations.length === 0) return;

        // Add new markers
        validDestinations.forEach(destination => {
            const isSelected = selectedDestination?.slug === destination.slug;
            const el = createMarkerElement(destination, isSelected);

            const marker = new mapboxgl.Marker(el)
                .setLngLat([destination.longitude!, destination.latitude!])
                .addTo(map.current!);

            // Add click handler
            el.addEventListener('click', () => {
                onMarkerClick?.(destination);
            });

            // Add popup on hover
            const popup = new mapboxgl.Popup({
                offset: 25,
                closeButton: false,
                closeOnClick: false,
            }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="font-weight: 600; margin-bottom: 4px; font-size: 14px;">
            ${destination.name}
          </h3>
          <p style="font-size: 12px; color: #666; margin-bottom: 4px;">
            ${destination.city}${destination.category ? ` • ${destination.category}` : ''}
          </p>
          ${destination.michelin_stars ? `
            <p style="font-size: 12px; color: #d97706;">
              ${'⭐'.repeat(destination.michelin_stars)} Michelin
            </p>
          ` : ''}
        </div>
      `);

            el.addEventListener('mouseenter', () => {
                marker.setPopup(popup);
                popup.addTo(map.current!);
            });

            el.addEventListener('mouseleave', () => {
                popup.remove();
            });

            markers.current.set(destination.slug, marker);
        });

        // Fit bounds to show all markers
        if (validDestinations.length > 1) {
            const bounds = new mapboxgl.LngLatBounds();
            validDestinations.forEach(d => {
                bounds.extend([d.longitude!, d.latitude!]);
            });
            map.current.fitBounds(bounds, {
                padding: 50,
                maxZoom: 15,
            });
        } else if (validDestinations.length === 1) {
            map.current.flyTo({
                center: [validDestinations[0].longitude!, validDestinations[0].latitude!],
                zoom: 14,
            });
        }
    }, [destinations, mapLoaded, selectedDestination, onMarkerClick, createMarkerElement]);

    // Update selected marker when selection changes
    useEffect(() => {
        if (!map.current || !mapLoaded || !selectedDestination) return;

        const marker = markers.current.get(selectedDestination.slug);
        if (marker && selectedDestination.latitude && selectedDestination.longitude) {
            // Fly to selected destination
            map.current.flyTo({
                center: [selectedDestination.longitude, selectedDestination.latitude],
                zoom: 15,
                duration: 1000,
            });
        }
    }, [selectedDestination, mapLoaded]);

    return (
        <div className={className}>
            <div ref={mapContainer} className="w-full h-full rounded-2xl overflow-hidden" />
            {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-2xl">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Loading map...</div>
                </div>
            )}
        </div>
    );
}
