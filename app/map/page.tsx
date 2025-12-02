'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import { useGeolocation } from '@/hooks/useGeolocation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Locate,
  Plus,
  Minus,
  Layers,
  MapPin,
  Star,
  Navigation,
  List,
  ArrowLeft,
  Filter,
  Utensils,
  Hotel,
  Wine,
  Coffee,
  ShoppingBag,
  Landmark,
  Heart,
  Share2,
  ChevronRight,
  Grid3X3,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Lazy load components
const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  { ssr: false, loading: () => null }
);

// Category icons mapping
const categoryIcons: Record<string, React.ReactNode> = {
  restaurant: <Utensils className="w-4 h-4" />,
  hotel: <Hotel className="w-4 h-4" />,
  bar: <Wine className="w-4 h-4" />,
  cafe: <Coffee className="w-4 h-4" />,
  shop: <ShoppingBag className="w-4 h-4" />,
  attraction: <Landmark className="w-4 h-4" />,
};

// Category colors for markers
const categoryColors: Record<string, string> = {
  restaurant: '#EF4444',
  hotel: '#3B82F6',
  bar: '#8B5CF6',
  cafe: '#F59E0B',
  shop: '#10B981',
  attraction: '#EC4899',
  default: '#1C1C1C',
};

interface FilterState {
  categories: Set<string>;
  michelin: boolean;
  searchQuery: string;
}

// Declare Google Maps types
declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

export default function MapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { openDrawer, isDrawerOpen: isDrawerTypeOpen, closeDrawer } = useDrawer();
  const geolocation = useGeolocation();

  // Map state
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const clusterMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const isInitializedRef = useRef(false);
  const lastDestinationsHashRef = useRef<string>('');

  // Data state
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [hoveredDestination, setHoveredDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // UI state
  const [filters, setFilters] = useState<FilterState>({
    categories: new Set(),
    michelin: false,
    searchQuery: '',
  });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<Destination[]>([]);
  const [showListPanel, setShowListPanel] = useState(false);
  const [listPanelHeight, setListPanelHeight] = useState<'collapsed' | 'half' | 'full'>('collapsed');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'terrain'>('roadmap');
  const [showMapTypeMenu, setShowMapTypeMenu] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 40.7128, lng: -74.006 });
  const [mapZoom, setMapZoom] = useState(12);
  const [showPlaceCard, setShowPlaceCard] = useState(false);

  // Fetch destinations
  useEffect(() => {
    async function fetchData() {
      try {
        const supabaseClient = createClient();
        if (!supabaseClient) {
          console.warn('[Map Page] Supabase client not available');
          setLoading(false);
          return;
        }

        const { data: destData, error: destError } = await supabaseClient
          .from('destinations')
          .select('id, slug, name, city, neighborhood, category, micro_description, description, content, image, image_thumbnail, michelin_stars, crown, tags, latitude, longitude, place_id, parent_destination_id, rating, address, phone, website, hours')
          .is('parent_destination_id', null)
          .or('latitude.not.is.null,longitude.not.is.null,place_id.not.is.null')
          .order('name')
          .limit(2000);

        if (destError) {
          console.warn('[Map Page] Error fetching destinations:', destError);
          setDestinations([]);
        } else {
          setDestinations((destData || []) as Destination[]);

          // Extract unique categories
          const categoryLowerSet = new Set<string>();
          const uniqueCategories: string[] = [];
          (destData || []).forEach((d: Destination) => {
            if (d.category) {
              const categoryLower = d.category.toLowerCase();
              if (!categoryLowerSet.has(categoryLower)) {
                categoryLowerSet.add(categoryLower);
                uniqueCategories.push(d.category);
              }
            }
          });
          setCategories(uniqueCategories.sort());
        }
      } catch (error) {
        console.warn('[Map Page] Exception fetching data:', error);
        setDestinations([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter destinations
  const filteredDestinations = useMemo(() => {
    let filtered = [...destinations];

    if (filters.categories.size > 0) {
      filtered = filtered.filter(d =>
        d.category && filters.categories.has(d.category.toLowerCase())
      );
    }

    if (filters.michelin) {
      filtered = filtered.filter(d => d.michelin_stars && d.michelin_stars > 0);
    }

    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.name?.toLowerCase().includes(query) ||
        d.city?.toLowerCase().includes(query) ||
        d.category?.toLowerCase().includes(query) ||
        d.neighborhood?.toLowerCase().includes(query) ||
        d.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [destinations, filters]);

  // Generate search suggestions
  useEffect(() => {
    if (filters.searchQuery.trim().length >= 2) {
      const query = filters.searchQuery.toLowerCase();
      const suggestions = destinations
        .filter(d =>
          d.name?.toLowerCase().includes(query) ||
          d.city?.toLowerCase().includes(query)
        )
        .slice(0, 8);
      setSearchSuggestions(suggestions);
    } else {
      setSearchSuggestions([]);
    }
  }, [filters.searchQuery, destinations]);

  // Cluster destinations by proximity
  const clusteredDestinations = useMemo(() => {
    if (mapZoom >= 14) return { clusters: [], singles: filteredDestinations };

    const gridSize = mapZoom < 8 ? 5 : mapZoom < 11 ? 2 : 1;
    const clusters: Map<string, Destination[]> = new Map();

    filteredDestinations.forEach(dest => {
      if (!dest.latitude || !dest.longitude) return;
      const gridKey = `${Math.floor(dest.latitude / gridSize)}_${Math.floor(dest.longitude / gridSize)}`;
      if (!clusters.has(gridKey)) {
        clusters.set(gridKey, []);
      }
      clusters.get(gridKey)!.push(dest);
    });

    const clusterArray: { center: { lat: number; lng: number }; destinations: Destination[] }[] = [];
    const singles: Destination[] = [];

    clusters.forEach(dests => {
      if (dests.length > 3) {
        const avgLat = dests.reduce((sum, d) => sum + (d.latitude || 0), 0) / dests.length;
        const avgLng = dests.reduce((sum, d) => sum + (d.longitude || 0), 0) / dests.length;
        clusterArray.push({ center: { lat: avgLat, lng: avgLng }, destinations: dests });
      } else {
        singles.push(...dests);
      }
    });

    return { clusters: clusterArray, singles };
  }, [filteredDestinations, mapZoom]);

  // Sort destinations by distance from map center
  const sortedDestinations = useMemo(() => {
    return [...filteredDestinations].sort((a, b) => {
      if (!a.latitude || !a.longitude) return 1;
      if (!b.latitude || !b.longitude) return -1;
      const distA = Math.sqrt(
        Math.pow(a.latitude - mapCenter.lat, 2) + Math.pow(a.longitude - mapCenter.lng, 2)
      );
      const distB = Math.sqrt(
        Math.pow(b.latitude - mapCenter.lat, 2) + Math.pow(b.longitude - mapCenter.lng, 2)
      );
      return distA - distB;
    });
  }, [filteredDestinations, mapCenter]);

  // Initialize Google Maps
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'URBAN_MANUAL_MAP';

      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: mapZoom,
        minZoom: 3,
        maxZoom: 20,
        mapId: mapId,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: 'greedy',
      });

      isInitializedRef.current = true;
      setMapLoading(false);

      // Listen for map events
      mapInstanceRef.current.addListener('zoom_changed', () => {
        if (mapInstanceRef.current) {
          setMapZoom(mapInstanceRef.current.getZoom() || 12);
        }
      });

      mapInstanceRef.current.addListener('center_changed', () => {
        if (mapInstanceRef.current) {
          const center = mapInstanceRef.current.getCenter();
          if (center) {
            setMapCenter({ lat: center.lat(), lng: center.lng() });
          }
        }
      });

      mapInstanceRef.current.addListener('click', () => {
        setSelectedDestination(null);
        setShowPlaceCard(false);
      });

    } catch (err) {
      console.error('Error initializing Google Map:', err);
      setMapError('Failed to initialize map');
      setMapLoading(false);
    }
  }, []);

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    if (!apiKey) {
      setMapError('Google Maps API key not found');
      setMapLoading(false);
      return;
    }

    if (window.google?.maps) {
      setMapLoading(false);
      initializeMap();
      return;
    }

    if (document.querySelector('script[data-google-maps]')) {
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          setMapLoading(false);
          initializeMap();
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker&loading=async`;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-google-maps', 'true');

    script.onload = () => {
      const checkMapConstructor = () => {
        if (window.google?.maps?.Map) {
          setMapLoading(false);
          setMapError(null);
          initializeMap();
        } else {
          setTimeout(checkMapConstructor, 50);
        }
      };
      checkMapConstructor();
    };

    script.onerror = () => {
      setMapError('Failed to load Google Maps API');
      setMapLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      markersRef.current.forEach(marker => marker.map = null);
      markersRef.current = [];
      clusterMarkersRef.current.forEach(marker => marker.map = null);
      clusterMarkersRef.current = [];
    };
  }, [initializeMap]);

  // Add/update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps || !isInitializedRef.current || mapLoading) return;

    const destinationsHash = JSON.stringify(
      filteredDestinations
        .filter(d => d.latitude && d.longitude)
        .map(d => ({ id: String(d.id || ''), lat: d.latitude, lng: d.longitude }))
        .sort((a, b) => a.id.localeCompare(b.id))
    );

    if (destinationsHash === lastDestinationsHashRef.current) return;
    lastDestinationsHashRef.current = destinationsHash;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];
    clusterMarkersRef.current.forEach(marker => marker.map = null);
    clusterMarkersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasValidMarkers = false;

    // Add cluster markers
    clusteredDestinations.clusters.forEach(cluster => {
      const position = cluster.center;
      bounds.extend(position);
      hasValidMarkers = true;

      const clusterElement = document.createElement('div');
      clusterElement.className = 'cluster-marker';
      clusterElement.innerHTML = `
        <div style="
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1C1C1C 0%, #3a3a3a 100%);
          border: 3px solid #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          ${cluster.destinations.length}
        </div>
      `;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current!,
        position: position,
        content: clusterElement,
      });

      marker.addListener('click', () => {
        mapInstanceRef.current?.setCenter(position);
        mapInstanceRef.current?.setZoom((mapInstanceRef.current.getZoom() || 12) + 2);
      });

      clusterMarkersRef.current.push(marker);
    });

    // Add individual markers
    clusteredDestinations.singles.forEach(dest => {
      if (!dest.latitude || !dest.longitude) return;

      const position = { lat: dest.latitude, lng: dest.longitude };
      bounds.extend(position);
      hasValidMarkers = true;

      const categoryLower = dest.category?.toLowerCase() || 'default';
      const markerColor = categoryColors[categoryLower] || categoryColors.default;
      const isSelected = selectedDestination?.id === dest.id;
      const isHovered = hoveredDestination?.id === dest.id;

      const pinElement = document.createElement('div');
      pinElement.innerHTML = `
        <div style="
          width: ${isSelected || isHovered ? '36px' : '28px'};
          height: ${isSelected || isHovered ? '36px' : '28px'};
          border-radius: 50% 50% 50% 0;
          background: ${markerColor};
          border: 3px solid #FFFFFF;
          transform: rotate(-45deg);
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="transform: rotate(45deg); color: white; font-size: 12px;">
            ${dest.michelin_stars ? '⭐' : ''}
          </div>
        </div>
      `;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current!,
        position: position,
        title: dest.name || '',
        content: pinElement,
      });

      marker.addListener('click', () => {
        setSelectedDestination(dest);
        setShowPlaceCard(true);
        mapInstanceRef.current?.panTo(position);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    if (hasValidMarkers && (markersRef.current.length > 0 || clusterMarkersRef.current.length > 0)) {
      if (markersRef.current.length === 1 && clusterMarkersRef.current.length === 0) {
        mapInstanceRef.current.setCenter(bounds.getCenter());
        mapInstanceRef.current.setZoom(15);
      } else {
        mapInstanceRef.current.fitBounds(bounds, { top: 80, right: 50, bottom: 150, left: 50 });
      }
    }
  }, [clusteredDestinations, mapLoading, selectedDestination?.id, hoveredDestination?.id]);

  // Handle category toggle
  const handleCategoryToggle = (category: string) => {
    setFilters(prev => {
      const newCategories = new Set(prev.categories);
      if (newCategories.has(category.toLowerCase())) {
        newCategories.delete(category.toLowerCase());
      } else {
        newCategories.add(category.toLowerCase());
      }
      return { ...prev, categories: newCategories };
    });
  };

  // Handle my location
  const handleMyLocation = () => {
    if (geolocation.hasLocation && geolocation.latitude && geolocation.longitude) {
      mapInstanceRef.current?.setCenter({ lat: geolocation.latitude, lng: geolocation.longitude });
      mapInstanceRef.current?.setZoom(15);
    } else {
      geolocation.requestLocation();
    }
  };

  // Effect to center on user location when it becomes available
  useEffect(() => {
    if (geolocation.hasLocation && geolocation.latitude && geolocation.longitude && mapInstanceRef.current) {
      if (!filters.searchQuery && filters.categories.size === 0) {
        mapInstanceRef.current.setCenter({ lat: geolocation.latitude, lng: geolocation.longitude });
        mapInstanceRef.current.setZoom(13);
      }
    }
  }, [geolocation.hasLocation, geolocation.latitude, geolocation.longitude]);

  // Handle zoom
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 12) + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 12) - 1);
    }
  };

  // Handle map type change
  const handleMapTypeChange = (type: 'roadmap' | 'satellite' | 'terrain') => {
    setMapType(type);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(type);
    }
    setShowMapTypeMenu(false);
  };

  // Handle search suggestion click
  const handleSuggestionClick = (dest: Destination) => {
    setFilters(prev => ({ ...prev, searchQuery: dest.name || '' }));
    setSearchSuggestions([]);
    setIsSearchFocused(false);
    setSelectedDestination(dest);
    setShowPlaceCard(true);
    if (dest.latitude && dest.longitude) {
      mapInstanceRef.current?.setCenter({ lat: dest.latitude, lng: dest.longitude });
      mapInstanceRef.current?.setZoom(16);
    }
  };

  // Handle opening full destination drawer
  const handleOpenFullDetails = (dest: Destination) => {
    setSelectedDestination(dest);
    openDrawer('destination');
  };

  // Handle list panel height toggle
  const toggleListPanelHeight = () => {
    if (listPanelHeight === 'collapsed') {
      setListPanelHeight('half');
    } else if (listPanelHeight === 'half') {
      setListPanelHeight('full');
    } else {
      setListPanelHeight('collapsed');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      categories: new Set(),
      michelin: false,
      searchQuery: '',
    });
  };

  const hasActiveFilters = filters.categories.size > 0 || filters.michelin || filters.searchQuery;

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-200px)] min-h-[500px] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Top Bar - Search & Filters */}
      <div className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="w-full px-6 md:px-10">
          {/* Search Row */}
          <div className="py-4 flex items-center gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className={cn(
                "bg-gray-50 dark:bg-gray-800 rounded-2xl transition-all duration-200",
                isSearchFocused && "ring-2 ring-gray-900 dark:ring-white"
              )}>
                <div className="flex items-center px-4 py-3">
                  <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search destinations, cities, or categories..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    className="flex-1 ml-3 bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400 text-sm"
                  />
                  {filters.searchQuery && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>

                {/* Search Suggestions Dropdown */}
                {isSearchFocused && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden">
                    {searchSuggestions.map((dest) => (
                      <button
                        key={dest.slug}
                        onClick={() => handleSuggestionClick(dest)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {dest.image_thumbnail || dest.image ? (
                            <Image
                              src={dest.image_thumbnail || dest.image || ''}
                              alt={dest.name || ''}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <MapPin className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {dest.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {dest.category} • {dest.city}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                disabled
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>
          </div>

          {/* Filter Chips Row */}
          <div className="pb-4 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {/* Michelin Filter */}
            <button
              onClick={() => setFilters(prev => ({ ...prev, michelin: !prev.michelin }))}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                filters.michelin
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent"
                  : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              )}
            >
              <Star className="w-4 h-4" />
              Michelin
            </button>

            {/* Category Filters */}
            {categories.slice(0, 6).map((category) => {
              const categoryLower = category.toLowerCase();
              const isActive = filters.categories.has(categoryLower);
              const Icon = categoryIcons[categoryLower];

              return (
                <button
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                    isActive
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent"
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {Icon}
                  {category}
                </button>
              );
            })}

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[calc(100vh-280px)] min-h-[400px]">
        {/* Map */}
        <div className="absolute inset-0">
          {mapLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading map...</p>
              </div>
            </div>
          )}
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
              <div className="text-center p-6">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{mapError}</p>
                <p className="text-xs text-gray-500">Please check your Google Maps API configuration.</p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="absolute inset-0 w-full h-full" />
        </div>

        {/* Map Controls - Right Side */}
        <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
          {/* Map Type Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowMapTypeMenu(!showMapTypeMenu)}
              className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Layers className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>

            {showMapTypeMenu && (
              <div className="absolute right-full mr-2 top-0 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 min-w-[120px]">
                {[
                  { type: 'roadmap' as const, label: 'Default' },
                  { type: 'satellite' as const, label: 'Satellite' },
                  { type: 'terrain' as const, label: 'Terrain' },
                ].map(({ type, label }) => (
                  <button
                    key={type}
                    onClick={() => handleMapTypeChange(type)}
                    className={cn(
                      "w-full px-3 py-2 text-sm text-left rounded-lg transition-colors",
                      mapType === type
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-700"
            >
              <Plus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Minus className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>

          {/* My Location */}
          <button
            onClick={handleMyLocation}
            disabled={geolocation.loading}
            className={cn(
              "w-10 h-10 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
              geolocation.loading && "opacity-50"
            )}
          >
            <Locate className={cn(
              "w-5 h-5",
              geolocation.hasLocation ? "text-blue-500" : "text-gray-700 dark:text-gray-300"
            )} />
          </button>
        </div>

        {/* Results Count - Bottom Left */}
        <button
          onClick={() => {
            setShowListPanel(true);
            setListPanelHeight('half');
          }}
          className="absolute bottom-4 left-4 z-20 bg-white dark:bg-gray-900 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <List className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {filteredDestinations.length} places
          </span>
        </button>

        {/* Place Card - Shows when a marker is selected */}
        {showPlaceCard && selectedDestination && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[380px] z-30">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Image */}
              {(selectedDestination.image || selectedDestination.image_thumbnail) && (
                <div className="relative h-36 w-full">
                  <Image
                    src={selectedDestination.image_thumbnail || selectedDestination.image || ''}
                    alt={selectedDestination.name || ''}
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={() => {
                      setShowPlaceCard(false);
                      setSelectedDestination(null);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="p-4">
                <div className="mb-2">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {selectedDestination.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {selectedDestination.rating && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedDestination.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {selectedDestination.category && (
                      <span className="text-sm text-gray-500">• {selectedDestination.category}</span>
                    )}
                    {selectedDestination.michelin_stars && selectedDestination.michelin_stars > 0 && (
                      <span className="text-sm text-gray-500">
                        • {'⭐'.repeat(selectedDestination.michelin_stars)}
                      </span>
                    )}
                  </div>
                </div>

                {selectedDestination.micro_description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                    {selectedDestination.micro_description}
                  </p>
                )}

                {selectedDestination.city && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
                    <MapPin className="w-4 h-4" />
                    {selectedDestination.neighborhood ? `${selectedDestination.neighborhood}, ` : ''}{selectedDestination.city}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleOpenFullDetails(selectedDestination)}
                    className="flex-1"
                    size="sm"
                  >
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => {
                      if (selectedDestination.latitude && selectedDestination.longitude) {
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${selectedDestination.latitude},${selectedDestination.longitude}`,
                          '_blank'
                        );
                      }
                    }}
                  >
                    <Navigation className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon-sm">
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List Panel - Bottom Sheet */}
        {showListPanel && (
          <>
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/20 z-30"
              onClick={() => {
                setShowListPanel(false);
                setListPanelHeight('collapsed');
              }}
            />

            {/* Panel */}
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl z-40 transition-all duration-300 border-t border-gray-200 dark:border-gray-700",
                listPanelHeight === 'collapsed' && "h-[100px]",
                listPanelHeight === 'half' && "h-[50%]",
                listPanelHeight === 'full' && "h-[85%]"
              )}
            >
              {/* Handle */}
              <button
                onClick={toggleListPanelHeight}
                className="w-full pt-3 pb-2 flex items-center justify-center"
              >
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
              </button>

              {/* Header */}
              <div className="px-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {filteredDestinations.length} Places
                  </h3>
                  <p className="text-xs text-gray-500">
                    {hasActiveFilters ? 'Filtered results' : 'All destinations'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowListPanel(false);
                    setListPanelHeight('collapsed');
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* List */}
              <div className="overflow-y-auto h-[calc(100%-70px)] px-4 py-3">
                <div className="space-y-2">
                  {sortedDestinations.map((dest) => (
                    <button
                      key={dest.slug}
                      onClick={() => {
                        setSelectedDestination(dest);
                        setShowPlaceCard(true);
                        setShowListPanel(false);
                        setListPanelHeight('collapsed');
                        if (dest.latitude && dest.longitude) {
                          mapInstanceRef.current?.setCenter({ lat: dest.latitude, lng: dest.longitude });
                          mapInstanceRef.current?.setZoom(16);
                        }
                      }}
                      onMouseEnter={() => setHoveredDestination(dest)}
                      onMouseLeave={() => setHoveredDestination(null)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                        selectedDestination?.id === dest.id
                          ? "bg-gray-100 dark:bg-gray-800"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                    >
                      {/* Image */}
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                        {(dest.image_thumbnail || dest.image) ? (
                          <Image
                            src={dest.image_thumbnail || dest.image || ''}
                            alt={dest.name || ''}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {dest.name}
                          </h4>
                          {dest.michelin_stars && dest.michelin_stars > 0 && (
                            <span className="text-xs">{'⭐'.repeat(dest.michelin_stars)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {dest.rating && (
                            <div className="flex items-center gap-1 text-xs">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              <span className="text-gray-700 dark:text-gray-300">{dest.rating.toFixed(1)}</span>
                            </div>
                          )}
                          {dest.category && (
                            <span className="text-xs text-gray-500">{dest.category}</span>
                          )}
                        </div>
                        {dest.city && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {dest.city}
                          </p>
                        )}
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Destination Drawer */}
      {isDrawerTypeOpen('destination') && selectedDestination && (
        <DestinationDrawer
          destination={selectedDestination}
          isOpen={true}
          onClose={() => {
            closeDrawer();
            setTimeout(() => setSelectedDestination(null), 300);
          }}
          onDestinationClick={async (slug: string) => {
            try {
              const supabaseClient = createClient();
              if (!supabaseClient) return;

              const { data: destination, error } = await supabaseClient
                .from('destinations')
                .select('*')
                .eq('slug', slug)
                .single();

              if (error || !destination) return;

              setSelectedDestination(destination as Destination);
              openDrawer('destination');
            } catch (error) {
              console.error('Error fetching destination:', error);
            }
          }}
        />
      )}
    </div>
  );
}
