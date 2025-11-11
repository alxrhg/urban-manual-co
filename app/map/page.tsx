'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import dynamic from 'next/dynamic';
import MapView from '@/components/MapView';
import GoogleMap from '@/components/GoogleMap';
import { Search, X, ChevronRight, Map, Globe, Compass } from 'lucide-react';
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

  // Calculate map center from filtered destinations
  useEffect(() => {
    const destinationsWithCoords = filteredDestinations.filter(d => d.latitude && d.longitude);
    if (destinationsWithCoords.length > 0) {
      const avgLat = destinationsWithCoords.reduce((sum, d) => sum + (d.latitude || 0), 0) / destinationsWithCoords.length;
      const avgLng = destinationsWithCoords.reduce((sum, d) => sum + (d.longitude || 0), 0) / destinationsWithCoords.length;
      setMapCenter({ lat: avgLat, lng: avgLng });
    }
  }, [filteredDestinations]);

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
    // Focus marker on map (would need map ref for this)
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

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <div className="flex items-center justify-center h-screen">
          <div className="text-sm text-neutral-500">Loading map…</div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="w-full px-6 md:px-10 lg:px-12 py-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
            <input
              type="search"
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Search cities, places, vibes…"
              className="w-full pl-10 pr-10 py-2.5 md:py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-base md:text-sm text-gray-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:border-gray-300 dark:focus:border-gray-600"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                Map Provider
              </span>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                {providerOptions.map(({ id, label, icon: Icon }) => {
                  const isActive = mapProvider === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setMapProvider(id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                      }`}
                      type="button"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-x-visible md:pb-0 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => handleCategoryToggle(category)}
                  className={`px-3 py-2 md:py-1.5 rounded-xl text-sm md:text-xs border transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px] md:min-h-0 ${
                    filters.categories.has(category.toLowerCase())
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700'
                  }`}
                >
                  {category}
                </button>
              ))}
              <button
                onClick={() => setFilters(prev => ({ ...prev, michelin: !prev.michelin }))}
                className={`px-3 py-2 md:py-1.5 rounded-xl text-sm md:text-xs border transition-colors flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 min-h-[44px] md:min-h-0 ${
                  filters.michelin
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700'
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
        </div>
      </div>

      <div className="w-full px-6 md:px-10 lg:px-12 py-8">
        <div className="grid gap-6 md:grid-cols-[360px,minmax(0,1fr)] items-start">
          <div className="space-y-3">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'}
            </div>
            <div className="space-y-2">
              {sortedDestinations.map((dest) => (
                <button
                  key={dest.slug}
                  onClick={() => handleListItemClick(dest)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                    selectedDestination?.slug === dest.slug
                      ? 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                      : 'bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                  }`}
                >
                  {dest.image && (
                    <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
                      <Image
                        src={dest.image}
                        alt={dest.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{dest.name}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {dest.category && <span>{dest.category}</span>}
                      {dest.city && (
                        <span className="ml-1">• {dest.city}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="w-full">
            <div className="relative w-full h-[420px] md:h-[calc(100vh-280px)] min-h-[420px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900">
              {mapProvider === 'mapbox' ? (
                <MapView
                  destinations={filteredDestinations}
                  onMarkerClick={handleMarkerClick}
                  center={mapCenter}
                  zoom={mapZoom}
                />
              ) : mapProvider === 'google' ? (
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
                <AppleMap
                  latitude={focusLat}
                  longitude={focusLng}
                  height="100%"
                  zoom={mapZoom}
                  label={focusLabel}
                  className="h-full rounded-none"
                />
              )}
            </div>
          </div>
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
