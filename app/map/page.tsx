'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import dynamic from 'next/dynamic';
import MapView from '@/components/MapView';
import GoogleMap from '@/components/GoogleMap';
import { Search, X, ChevronRight, Map, Globe, Compass, SlidersHorizontal, Filter, Menu, X as XIcon, ArrowRight } from 'lucide-react';
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
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [showList, setShowList] = useState(false);
  
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

  // Get featured destinations for highlights (top rated, michelin, or recent)
  const featuredDestinations = useMemo(() => {
    return filteredDestinations
      .filter(d => d.latitude && d.longitude)
      .sort((a, b) => {
        // Prioritize michelin stars, then rating, then recent
        if ((a.michelin_stars || 0) > (b.michelin_stars || 0)) return -1;
        if ((a.michelin_stars || 0) < (b.michelin_stars || 0)) return 1;
        if ((a.rating || 0) > (b.rating || 0)) return -1;
        if ((a.rating || 0) < (b.rating || 0)) return 1;
        return 0;
      })
      .slice(0, 6);
  }, [filteredDestinations]);

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
      {/* Hero Section */}
      <section className="px-6 md:px-10 lg:px-12 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-medium leading-tight text-black dark:text-white">
            Explore on Map
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Discover destinations across the globe. Filter by category, search by name, and explore curated places on an interactive map.
          </p>
        </div>
      </section>

      {/* Minimal Header - Search Only */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-100 dark:border-gray-700 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm">
        <div className="px-6 md:px-10 lg:px-12 py-4">
          <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
            {/* Search */}
            <div className="flex-1 max-w-2xl">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="search"
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  placeholder="Search destinations, cities, categories…"
                  className="w-full pl-10 pr-10 py-2.5 bg-transparent border-none text-sm font-normal text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none"
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

            {/* Side Panel Toggle */}
            <button
              onClick={() => setShowSidePanel(!showSidePanel)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 text-xs font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
            >
              <Menu className="h-4 w-4" />
              <span className="hidden sm:inline">Controls</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative">
        {/* Collapsible Side Panel - Floating Sheet */}
        {showSidePanel && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-40 md:bg-transparent"
              onClick={() => setShowSidePanel(false)}
              aria-hidden="true"
            />
            <div className="fixed md:absolute right-0 top-0 md:top-16 h-full md:h-auto z-50 w-80 md:w-72 bg-white dark:bg-gray-950 border-l md:border-l-0 md:border-r border-gray-100 dark:border-gray-700 shadow-xl md:shadow-none">
              <div className="p-6 space-y-6 h-full overflow-y-auto">
                {/* Close Button */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-normal uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Controls
                  </h2>
                  <button
                    onClick={() => setShowSidePanel(false)}
                    className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    aria-label="Close panel"
                  >
                    <XIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                {/* Map Provider Selector */}
                <div>
                  <div className="text-xs font-normal uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                    Map Provider
                  </div>
                  <div className="flex flex-col gap-2">
                    {providerOptions.map(({ id, label, icon: Icon }) => {
                      const isActive = mapProvider === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setMapProvider(id)}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-normal rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 ${
                            isActive
                              ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'
                              : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                          type="button"
                        >
                          <Icon className="h-4 w-4" />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
            </div>

                {/* Filters */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-normal uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Filters
                    </div>
                    {activeFilterCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-normal rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {/* Categories */}
                    <div className="space-y-1.5">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-normal border transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 ${
                    filters.categories.has(category.toLowerCase())
                              ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'
                              : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {category}
                </button>
              ))}
                    </div>
              {/* Michelin Filter */}
              <button
                onClick={() => setFilters(prev => ({ ...prev, michelin: !prev.michelin }))}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-normal border transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 ${
                  filters.michelin
                          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'
                          : 'border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <img
                  src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                  alt="Michelin"
                  className="h-3 w-3"
                />
                      <span>Michelin</span>
                    </button>
                  </div>
                </div>

                {/* List Toggle */}
                <div>
                  <button
                    onClick={() => setShowList(!showList)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700 text-sm font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2"
                  >
                    <span>Show List</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${showList ? 'rotate-90' : ''}`} />
              </button>
                </div>

                {/* Legend */}
                <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-xs font-normal uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                    Legend
                  </div>
                  <div className="space-y-2 text-xs font-normal text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>Destination</span>
                    </div>
                    {destinationsWithCoords.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 pt-2">
                        {destinationsWithCoords.length} {destinationsWithCoords.length === 1 ? 'destination' : 'destinations'} visible
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Map Container */}
        <div className="relative h-[60vh] md:h-[70vh]">
          <div className="absolute inset-0 bg-gray-100 dark:bg-gray-900">
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
                  className="h-full"
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
                  className="h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  No destinations with coordinates to display
                </div>
              )
            )}
          </div>
        </div>

        {/* List Sidebar - Slide in/out */}
        {showList && (
          <aside className="fixed md:absolute right-0 top-0 md:top-16 h-full md:h-auto z-30 w-80 md:w-96 bg-white dark:bg-gray-950 border-l md:border-l-0 md:border-r border-gray-100 dark:border-gray-700 shadow-xl md:shadow-none">
            <div className="p-6 h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-normal uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Destinations
                </h2>
                <button
                  onClick={() => setShowList(false)}
                  className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors md:hidden"
                  aria-label="Close list"
                >
                  <XIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
                <span className="text-xs font-normal text-gray-500 dark:text-gray-500">
                  {filteredDestinations.length}
                </span>
      </div>
              <div className="space-y-2">
                {sortedDestinations.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      No destinations found
                    </p>
            </div>
                ) : (
                  sortedDestinations.map((dest) => (
              <button
                key={dest.slug}
                onClick={() => handleListItemClick(dest)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2 ${
                  selectedDestination?.slug === dest.slug
                          ? 'bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700'
                          : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent hover:border-gray-100 dark:hover:border-gray-700'
                }`}
              >
                      {dest.image ? (
                        <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <Image
                      src={dest.image}
                      alt={dest.name}
                      fill
                      className="object-cover"
                            sizes="48px"
                    />
                  </div>
                      ) : (
                        <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Map className="h-4 w-4 text-gray-400 dark:text-gray-600" />
                        </div>
                )}
                <div className="flex-1 min-w-0">
                        <div className="text-sm font-normal text-gray-900 dark:text-white truncate">
                          {dest.name}
                        </div>
                        <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                    {dest.category && <span>{dest.category}</span>}
                    {dest.city && (
                            <>
                              <span>·</span>
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
        )}
      </div>

      {/* Curated Highlights Section */}
      {featuredDestinations.length > 0 && (
        <section className="px-6 md:px-10 lg:px-12 py-16 md:py-24 border-t border-gray-100 dark:border-gray-700">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="text-xs font-normal uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                Must-see this week
              </div>
              <h2 className="text-2xl md:text-3xl font-medium text-black dark:text-white">
                Featured Destinations
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredDestinations.map((dest) => (
                <button
                  key={dest.slug}
                  onClick={() => {
                    setSelectedDestination(dest);
                    setIsDrawerOpen(true);
                  }}
                  className="text-left group"
                  >
                  {/* Square Image */}
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm group-hover:shadow-md transition-shadow mb-3">
                    {dest.image ? (
                        <Image
                          src={dest.image}
                          alt={dest.name}
                          fill
                          className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Map className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                      </div>
                    )}
                    {/* Badges Overlay */}
                    {(dest.michelin_stars && dest.michelin_stars > 0) && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-100 dark:border-gray-700 flex items-center gap-1">
                        <img
                          src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                          alt="Michelin star"
                          className="h-3 w-3"
                        />
                        <span className="text-xs font-normal text-gray-700 dark:text-gray-300">
                          {dest.michelin_stars}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Metadata */}
                  <div className="space-y-1">
                    <h3 className="font-medium text-base leading-tight text-black dark:text-white line-clamp-1 group-hover:opacity-80 transition-opacity">
                      {dest.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-normal text-gray-500 dark:text-gray-500">
                      {dest.category && <span>{dest.category}</span>}
                      {dest.city && (
                        <>
                          <span>·</span>
                          <span>{dest.city}</span>
                        </>
                      )}
                    </div>
                    {dest.micro_description && (
                      <p className="text-sm font-normal text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed mt-1">
                        {dest.micro_description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

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
