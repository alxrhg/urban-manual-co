'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import dynamic from 'next/dynamic';
import MapView from '@/components/MapView';
import GoogleMap from '@/components/GoogleMap';
import { Search, X, ChevronRight, Map, Globe, Compass, SlidersHorizontal, Filter } from 'lucide-react';
import AppleMap from '@/components/AppleMap';
import Image from 'next/image';

// Lazy load components
const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  { ssr: false, loading: () => null }
);

interface FilterState {
  categories: Set<string>;
  michelin: boolean;
  searchQuery: string;
}

export default function MapPage() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    categories: new Set(),
    michelin: false,
    searchQuery: '',
  });
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 23.5, lng: 121.0 }); // Taiwan center
  const [mapZoom, setMapZoom] = useState(8);
  const [showFilters, setShowFilters] = useState(false);
  const [showList, setShowList] = useState(true);
  
  const providerOptions = useMemo(
    () => [
      { id: 'mapbox' as const, label: 'Mapbox', icon: Map },
      { id: 'google' as const, label: 'Google', icon: Globe },
      { id: 'apple' as const, label: 'Apple', icon: Compass },
    ],
    []
  );
  const [mapProvider, setMapProvider] = useState<'mapbox' | 'google' | 'apple'>('mapbox');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem('map-provider');
    if (stored === 'google' || stored === 'apple' || stored === 'mapbox') {
      setMapProvider(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('map-provider', mapProvider);
  }, [mapProvider]);

  // Fetch destinations and categories
  useEffect(() => {
    async function fetchData() {
      try {
        const supabaseClient = createClient();
        if (!supabaseClient) {
          console.warn('[Map Page] Supabase client not available');
          setLoading(false);
          return;
        }

        // Fetch destinations with location data
        const { data: destData, error: destError } = await supabaseClient
          .from('destinations')
          .select('id, slug, name, city, neighborhood, category, micro_description, description, content, image, michelin_stars, crown, tags, latitude, longitude, place_id, parent_destination_id, rating')
          .is('parent_destination_id', null)
          .or('latitude.not.is.null,longitude.not.is.null,place_id.not.is.null')
          .order('name')
          .limit(1000);

        if (destError) {
          console.warn('[Map Page] Error fetching destinations:', destError);
          setDestinations([]);
        } else {
          setDestinations((destData || []) as Destination[]);
          
          // Extract unique categories
          const uniqueCategories = Array.from(
            new Set((destData || []).map((d: any) => d.category).filter(Boolean))
          ) as string[];
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

    // Category filter
    if (filters.categories.size > 0) {
      filtered = filtered.filter(d => 
        d.category && filters.categories.has(d.category.toLowerCase())
      );
    }

    // Michelin filter
    if (filters.michelin) {
      filtered = filtered.filter(d => d.michelin_stars && d.michelin_stars > 0);
    }

    // Search filter
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

  // Filter destinations with valid coordinates for map display
  const destinationsWithCoords = useMemo(() => {
    return filteredDestinations.filter(d => 
      d.latitude != null && 
      d.longitude != null && 
      !isNaN(d.latitude) && 
      !isNaN(d.longitude) &&
      d.latitude !== 0 &&
      d.longitude !== 0
    );
  }, [filteredDestinations]);

  // Calculate map center from filtered destinations
  useEffect(() => {
    if (destinationsWithCoords.length > 0) {
      const avgLat = destinationsWithCoords.reduce((sum, d) => sum + (d.latitude || 0), 0) / destinationsWithCoords.length;
      const avgLng = destinationsWithCoords.reduce((sum, d) => sum + (d.longitude || 0), 0) / destinationsWithCoords.length;
      setMapCenter({ lat: avgLat, lng: avgLng });
      // Auto-adjust zoom based on number of destinations
      if (destinationsWithCoords.length === 1) {
        setMapZoom(15);
      } else if (destinationsWithCoords.length < 10) {
        setMapZoom(12);
      } else if (destinationsWithCoords.length < 50) {
        setMapZoom(10);
      } else {
        setMapZoom(8);
      }
    } else if (destinations.length > 0) {
      // Fallback: if no destinations have coordinates, keep default center
      console.warn('[Map Page] No destinations with valid coordinates found');
    }
  }, [destinationsWithCoords, destinations.length]);

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

  const handleMarkerClick = useCallback((dest: Destination) => {
    setSelectedDestination(dest);
    setIsDrawerOpen(true);
  }, []);

  const handleListItemClick = useCallback((dest: Destination) => {
    setSelectedDestination(dest);
    setIsDrawerOpen(true);
  }, []);

  // Calculate distance from map center (simplified)
  const getDistanceFromCenter = (dest: Destination): number => {
    if (!dest.latitude || !dest.longitude) return Infinity;
    // Simple distance calculation (Haversine would be more accurate)
    const latDiff = Math.abs(dest.latitude - mapCenter.lat);
    const lngDiff = Math.abs(dest.longitude - mapCenter.lng);
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
  };

  // Sort destinations by distance from center
  const sortedDestinations = useMemo(() => {
    return [...filteredDestinations].sort((a, b) => {
      const distA = getDistanceFromCenter(a);
      const distB = getDistanceFromCenter(b);
      return distA - distB;
    });
  }, [filteredDestinations, mapCenter]);

  const focusedDestination = useMemo(() => {
    if (
      selectedDestination &&
      selectedDestination.latitude &&
      selectedDestination.longitude
    ) {
      return selectedDestination;
    }
    return (
      sortedDestinations.find(
        (dest) => dest.latitude && dest.longitude
      ) ?? null
    );
  }, [selectedDestination, sortedDestinations]);

  const focusLat = focusedDestination?.latitude ?? mapCenter.lat;
  const focusLng = focusedDestination?.longitude ?? mapCenter.lng;
  const focusLabel = focusedDestination?.name ?? 'Urban Manual';
  const infoWindowContent = useMemo(() => {
    if (!focusedDestination) return undefined;
    const addressParts = [
      focusedDestination.neighborhood,
      focusedDestination.city,
    ].filter(Boolean);
    return {
      title: focusedDestination.name,
      address: addressParts.join(' · ') || undefined,
      category: focusedDestination.category || undefined,
      rating: focusedDestination.rating || undefined,
    };
  }, [focusedDestination]);

  const activeFilterCount = filters.categories.size + (filters.michelin ? 1 : 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
        <div className="flex items-center justify-center h-screen">
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading map…</div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Header - Clean, minimal design */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm">
        <div className="px-6 md:px-10 lg:px-12 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="search"
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  placeholder="Search destinations, cities, categories…"
                  className="w-full pl-10 pr-10 py-2.5 bg-transparent border-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
                />
                {filters.searchQuery && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                  activeFilterCount > 0
                    ? 'border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-black'
                    : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-white/20 dark:bg-black/20">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* List Toggle (Mobile) */}
              <button
                onClick={() => setShowList(!showList)}
                className="md:hidden inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showList ? 'rotate-90' : ''}`} />
                List
              </button>

              {/* Map Provider Selector */}
              <div className="hidden md:flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-1">
                {providerOptions.map(({ id, label, icon: Icon }) => {
                  const isActive = mapProvider === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setMapProvider(id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        isActive
                          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                      }`}
                      type="button"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex flex-wrap items-center gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategoryToggle(category)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      filters.categories.has(category.toLowerCase())
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
                <button
                  onClick={() => setFilters(prev => ({ ...prev, michelin: !prev.michelin }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    filters.michelin
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700'
                  }`}
                >
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin"
                    className="h-3 w-3"
                  />
                  Michelin
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="relative flex h-[calc(100vh-80px)]">
        {/* List Sidebar - Slide in/out on mobile */}
        <aside
          className={`${
            showList ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 absolute md:relative z-30 w-80 md:w-96 h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-out overflow-y-auto`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                Destinations
              </h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {filteredDestinations.length}
              </span>
            </div>
            <div className="space-y-2">
              {sortedDestinations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No destinations found
                  </p>
                </div>
              ) : (
                sortedDestinations.map((dest) => (
                  <button
                    key={dest.slug}
                    onClick={() => handleListItemClick(dest)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group ${
                      selectedDestination?.slug === dest.slug
                        ? 'bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
                        : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-800'
                    }`}
                  >
                    {dest.image ? (
                      <div className="relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800">
                        <Image
                          src={dest.image}
                          alt={dest.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 flex-shrink-0 rounded-xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                        <Map className="h-5 w-5 text-gray-400 dark:text-gray-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {dest.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                        {dest.category && <span>{dest.category}</span>}
                        {dest.city && (
                          <>
                            <span>•</span>
                            <span>{dest.city}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 rounded-none overflow-hidden bg-gray-100 dark:bg-gray-900">
            {mapProvider === 'mapbox' ? (
              <MapView
                destinations={destinationsWithCoords}
                onMarkerClick={handleMarkerClick}
                center={mapCenter}
                zoom={mapZoom}
              />
            ) : mapProvider === 'google' ? (
              destinationsWithCoords.length > 0 ? (
                <GoogleMap
                  latitude={focusLat}
                  longitude={focusLng}
                  height="100%"
                  interactive
                  autoOpenInfoWindow
                  showInfoWindow={!!infoWindowContent}
                  infoWindowContent={infoWindowContent}
                  className="h-full rounded-none"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  No destinations with coordinates to display
                </div>
              )
            ) : (
              destinationsWithCoords.length > 0 ? (
                <AppleMap
                  latitude={focusLat}
                  longitude={focusLng}
                  height="100%"
                  zoom={mapZoom}
                  label={focusLabel}
                  className="h-full rounded-none"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  No destinations with coordinates to display
                </div>
              )
            )}
          </div>
          {/* Show count of destinations with coordinates */}
          {destinationsWithCoords.length > 0 && (
            <div className="absolute bottom-4 left-4 z-10 px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full border border-gray-200 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300">
              {destinationsWithCoords.length} {destinationsWithCoords.length === 1 ? 'destination' : 'destinations'} on map
            </div>
          )}
        </div>
      </div>

      <DestinationDrawer
        destination={selectedDestination}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setTimeout(() => setSelectedDestination(null), 300);
        }}
      />
    </div>
  );
}
