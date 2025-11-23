'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Destination } from '@/types/destination';
import { ChevronRight, List, MapPin, X, ChevronLeft } from 'lucide-react';
import { getDestinationImageUrl } from '@/lib/destination-images';
import { loadGoogleMaps } from '@/lib/maps/google-loader';
import { useMapPins } from '@/hooks/useMapPins';

interface HomeMapSectionProps {
    destinations: Destination[];
    selectedDestination?: Destination | null;
    onMarkerSelect?: (destination: Destination) => void;
    onListItemSelect?: (destination: Destination) => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    totalCount?: number;
}

export default function HomeMapSection({
    destinations,
    selectedDestination,
    onMarkerSelect,
    onListItemSelect,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    totalCount,
}: HomeMapSectionProps) {
    const [isListOpen, setIsListOpen] = useState(true); // Desktop: panel open/closed
    const [isMobileListOpen, setIsMobileListOpen] = useState(false); // Mobile: bottom sheet
    const [mapLoaded, setMapLoaded] = useState(false);
    const [visibleItemCount, setVisibleItemCount] = useState(10); // Default to 10

    // Fetch lightweight map pins separately
    const { pins: mapPins, loading: mapPinsLoading, error: mapPinsError } = useMapPins();

    // Use state for map container to trigger effect when it's available
    const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const listContainerRef = useRef<HTMLDivElement>(null);

    // Filter destinations with coordinates
    const validDestinations = useMemo(() =>
        destinations.filter(d => d.latitude && d.longitude),
        [destinations]
    );

    // Calculate how many items fit in the visible area
    useEffect(() => {
        const calculateVisibleItems = () => {
            if (!listContainerRef.current) return;

            const containerHeight = listContainerRef.current.clientHeight;
            const itemHeight = 72; // Approximate height of each list item (48px image + padding)
            const itemsWithGap = Math.floor(containerHeight / (itemHeight + 8)); // 8px gap
            setVisibleItemCount(Math.max(1, itemsWithGap));
        };

        calculateVisibleItems();
        window.addEventListener('resize', calculateVisibleItems);
        return () => window.removeEventListener('resize', calculateVisibleItems);
    }, [isListOpen]);

    // Only show items that fit in the visible area
    const visibleDestinations = useMemo(() =>
        destinations.slice(0, visibleItemCount),
        [destinations, visibleItemCount]
    );

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // Initialize Map
    useEffect(() => {
        if (!mapContainer || mapLoaded) return;

        // Load 'places' and 'marker' libraries
        loadGoogleMaps({ libraries: ['places', 'marker'] })
            .then(() => {
                try {
                    if (!mapContainer) return;

                    // Safety check: Ensure google.maps.Map is available
                    if (!google.maps.Map) {
                        console.error('Google Maps API loaded but Map constructor is missing');
                        return;
                    }

                    const map = new google.maps.Map(mapContainer, {
                        center: { lat: 20, lng: 0 },
                        zoom: 2,
                        // Map ID is required for AdvancedMarkerElement
                        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID',
                        disableDefaultUI: false,
                        zoomControl: true,
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                        styles: [
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
                        ]
                    });

                    mapInstanceRef.current = map;
                    setMapLoaded(true);
                } catch (e) {
                    console.error('Error initializing map:', e);
                }
            })
            .catch(err => {
                console.error('Failed to load Google Maps:', err);
            });
    }, [mapLoaded, mapContainer]);

    // Stabilize the onMarkerSelect callback
    const onMarkerSelectRef = useRef(onMarkerSelect);
    useEffect(() => {
        onMarkerSelectRef.current = onMarkerSelect;
    }, [onMarkerSelect]);

    // Create a stable key for destinations to prevent unnecessary updates
    const destinationsKey = useMemo(() =>
        mapPins.map(d => d.slug).sort().join(','),
        [mapPins]
    );

    // Helper to get category color
    const getCategoryColor = (category: string) => {
        const cat = category.toLowerCase();
        if (cat.includes('park') || cat.includes('garden') || cat.includes('nature')) return '#10B981'; // emerald-500
        if (cat.includes('food') || cat.includes('restaurant') || cat.includes('cafe')) return '#F59E0B'; // amber-500
        if (cat.includes('shop') || cat.includes('store') || cat.includes('mall')) return '#F97316'; // orange-500
        if (cat.includes('hotel') || cat.includes('stay')) return '#3B82F6'; // blue-500
        if (cat.includes('art') || cat.includes('museum') || cat.includes('culture')) return '#8B5CF6'; // violet-500
        if (cat.includes('bar') || cat.includes('nightlife')) return '#EC4899'; // pink-500
        return '#EF4444'; // red-500 default
    };

    // Helper to get icon name (simplified version of lib/icons logic for vanilla JS)
    const getIconClass = (category: string) => {
        const cat = category.toLowerCase();
        // We'll use a generic icon for now as we can't easily render React components to string without ReactDOMServer
        // In a real app, we'd use ReactDOM.createRoot, but for performance in a loop, simple HTML is better
        return 'fas fa-map-marker-alt';
    };

    // Update Markers
    useEffect(() => {
        if (!mapInstanceRef.current || !mapLoaded) return;

        // Clear existing markers
        markersRef.current.forEach(m => {
            m.setMap(null);
        });
        markersRef.current = [];

        const bounds = new google.maps.LatLngBounds();

        mapPins.forEach(dest => {
            if (!dest.latitude || !dest.longitude) return;

            const position = { lat: dest.latitude, lng: dest.longitude };
            bounds.extend(position);

            // Create custom DOM element for the marker
            const content = document.createElement('div');
            content.className = 'custom-map-marker';
            const color = getCategoryColor(dest.category || '');

            // Pill style
            content.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    background: white;
                    border-radius: 9999px;
                    padding: 4px 8px 4px 4px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    cursor: pointer;
                    transition: transform 0.2s;
                ">
                    <div style="
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        background-color: ${color};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-right: 6px;
                        color: white;
                    ">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </div>
                    <span style="
                        font-size: 12px;
                        font-weight: 600;
                        color: #1F2937;
                        white-space: nowrap;
                        max-width: 120px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    ">${dest.name}</span>
                </div>
            `;

            // Add hover effect
            content.addEventListener('mouseenter', () => {
                content.style.zIndex = '1000';
                content.style.transform = 'scale(1.1)';
            });
            content.addEventListener('mouseleave', () => {
                content.style.zIndex = '';
                content.style.transform = 'scale(1)';
            });

            // Use AdvancedMarkerElement
            // We can assume it's available because we imported it in the map init
            let marker;
            if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
                marker = new google.maps.marker.AdvancedMarkerElement({
                    map: mapInstanceRef.current!,
                    position,
                    title: dest.name,
                    content: content,
                });
            } else {
                // Fallback just in case
                marker = new google.maps.Marker({
                    map: mapInstanceRef.current!,
                    position,
                    title: dest.name,
                });
            }

            marker.addListener('click', () => {
                const fullDest = destinations.find(d => d.slug === dest.slug);
                onMarkerSelectRef.current?.(fullDest || (dest as Destination));
            });

            markersRef.current.push(marker as any);
        });

        // Fit bounds if we have markers and it's the first load
        if (mapPins.length > 0) {
            const center = mapInstanceRef.current.getCenter();
            if (center && (Math.abs(center.lat() - 20) < 0.1 && Math.abs(center.lng() - 0) < 0.1)) {
                mapInstanceRef.current.fitBounds(bounds);
            }
        }
    }, [mapLoaded, destinationsKey, mapPins]);

    // Zoom to selected destination
    useEffect(() => {
        if (!mapInstanceRef.current || !selectedDestination) return;

        if (selectedDestination.latitude && selectedDestination.longitude) {
            mapInstanceRef.current.setCenter({
                lat: selectedDestination.latitude,
                lng: selectedDestination.longitude
            });
            mapInstanceRef.current.setZoom(15);
        }
    }, [selectedDestination]);

    // Render List Item
    const renderListItem = (dest: Destination) => (
        <button
            key={dest.slug}
            onClick={() => {
                onListItemSelect?.(dest);
                if (window.innerWidth < 1024) setIsMobileListOpen(false);
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedDestination?.slug === dest.slug
                ? 'bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
        >
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                {getDestinationImageUrl(dest) ? (
                    <Image
                        src={getDestinationImageUrl(dest)!}
                        alt={dest.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <MapPin className="w-5 h-5" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">{dest.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {[dest.city, dest.category].filter(Boolean).join(' • ')}
                </p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
    );

    return (
        <div className="relative w-full h-full flex overflow-hidden bg-gray-100 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            {/* Desktop List Panel */}
            <div
                className={`hidden lg:flex flex-col w-80 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 absolute z-10 h-full ${isListOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-950 sticky top-0 z-10">
                    {selectedDestination ? (
                        <>
                            <button
                                onClick={() => onMarkerSelect?.(null as any)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                                title="Back to list"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-500" />
                            </button>
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 truncate px-2">
                                {selectedDestination.name}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {destinations.length} Places
                        </span>
                    )}
                    <button
                        onClick={() => setIsListOpen(false)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {selectedDestination ? (
                    /* Details View */
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Image */}
                        {getDestinationImageUrl(selectedDestination) && (
                            <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-200">
                                <Image
                                    src={getDestinationImageUrl(selectedDestination)!}
                                    alt={selectedDestination.name}
                                    fill
                                    className="object-cover"
                                    sizes="320px"
                                />
                            </div>
                        )}

                        {/* Name & Category */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                {selectedDestination.name}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {[selectedDestination.city, selectedDestination.category].filter(Boolean).join(' • ')}
                            </p>
                        </div>

                        {/* Badges */}
                        {(selectedDestination.michelin_stars || selectedDestination.crown) && (
                            <div className="flex gap-2">
                                {selectedDestination.michelin_stars && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded-md">
                                        <Image src="/michelin-star.svg" alt="Michelin" width={12} height={12} />
                                        <span className="text-xs font-medium text-red-700 dark:text-red-400">
                                            {selectedDestination.michelin_stars} Star{selectedDestination.michelin_stars > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                )}
                                {selectedDestination.crown && (
                                    <div className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                            👑 Crown
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Description */}
                        {selectedDestination.description && (
                            <div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {selectedDestination.description}
                                </p>
                            </div>
                        )}

                        {/* Tags */}
                        {selectedDestination.tags && selectedDestination.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedDestination.tags.slice(0, 5).map((tag, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* View Full Details Button */}
                        <button
                            onClick={() => {
                                // This will open the full drawer
                                if (window.location.pathname === '/') {
                                    window.location.href = `/destination/${selectedDestination.slug}`;
                                }
                            }}
                            className="w-full py-2 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                            View Full Details
                        </button>
                    </div>
                ) : (
                    /* List View - No scrolling, only show what fits */
                    <>
                        <div ref={listContainerRef} className="flex-1 p-3 space-y-2 overflow-hidden">
                            {visibleDestinations.map(renderListItem)}
                        </div>

                        {/* Pagination in Sidebar */}
                        {totalPages > 1 && onPageChange && (
                            <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        aria-label="Previous page"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>

                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Page {currentPage} of {totalPages}
                                    </span>

                                    <button
                                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        aria-label="Next page"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Toggle Button for Desktop */}
            {!isListOpen && (
                <button
                    onClick={() => setIsListOpen(true)}
                    className="hidden lg:flex absolute top-4 left-4 z-10 bg-white dark:bg-gray-900 p-2 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 items-center gap-2 text-sm font-medium"
                >
                    <List className="w-4 h-4" />
                    <span>Show List</span>
                </button>
            )}

            {/* Map Container */}
            <div className={`flex-1 relative h-full w-full transition-all duration-300 ${isListOpen ? 'lg:ml-80' : ''}`}>
                <div ref={setMapContainer} className="w-full h-full" />

                {/* Loading State */}
                {!mapLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900 z-20">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
                            <span className="text-sm text-gray-500">Loading Map...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile List Toggle */}
            <button
                onClick={() => setIsMobileListOpen(true)}
                className="lg:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-3 rounded-full shadow-lg flex items-center gap-2 text-sm font-semibold"
            >
                <List className="w-4 h-4" />
                <span>List ({destinations.length})</span>
            </button>

            {/* Mobile List Sheet */}
            {isMobileListOpen && (
                <div className="lg:hidden absolute inset-0 z-30 flex flex-col justify-end bg-black/20 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-950 rounded-t-2xl max-h-[60%] flex flex-col shadow-xl animate-in slide-in-from-bottom duration-200">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {destinations.length} Places
                            </span>
                            <button
                                onClick={() => setIsMobileListOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-3 space-y-2">
                            {destinations.map(renderListItem)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
