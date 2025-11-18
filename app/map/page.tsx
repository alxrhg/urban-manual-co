'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import dynamic from 'next/dynamic';
import MapView from '@/components/MapView';
import { Search, X, List, ChevronRight, SlidersHorizontal, Globe2, LayoutGrid, Map, Plus, Filter } from 'lucide-react';
import Image from 'next/image';
import { DrawerSkeleton } from '@/components/skeletons/DrawerSkeleton';
import { usePrefetchDestinationDrawer } from '@/src/features/detail/usePrefetchDestinationDrawer';

// Lazy load components
const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  { ssr: false, loading: () => <DrawerSkeleton /> }
);

interface FilterState {
  categories: Set<string>;
  michelin: boolean;
  searchQuery: string;
}

export default function MapPage() {
  const router = useRouter();
  const { user } = useAuth();
  usePrefetchDestinationDrawer();
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
  const [showListPanel, setShowListPanel] = useState(true);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 23.5, lng: 121.0 }); // Taiwan center
  const [mapZoom, setMapZoom] = useState(8);
  const [showFilters, setShowFilters] = useState(false);

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
          .select('id, slug, name, city, neighborhood, category, micro_description, description, content, image, image_thumbnail, michelin_stars, crown, tags, latitude, longitude, place_id, parent_destination_id, rating')
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

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900">
        <div className="flex items-center justify-center h-screen">
          <div className="text-sm text-gray-600 dark:text-gray-400">Loading map…</div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Header - Back button left, Filter button right */}
      <div className="relative left-0 right-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 safe-area-top">
        <div className="w-full px-6 md:px-10 lg:px-12 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>Back</span>
          </button>
          <button
            onClick={() => setShowListPanel(!showListPanel)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-700 transition-all"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Top Controls - Pill Bar Design */}
      <div className="relative left-0 right-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="w-full px-6 md:px-10 lg:px-12 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* 1. Discover by Cities - Pill, Soft Variant */}
              <button
                onClick={() => router.push('/cities')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                <Globe2 className="w-4 h-4" />
                <span>Discover by Cities</span>
              </button>

              {/* 2. Filter Button - Pill, Soft Variant */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>

              {/* 3. View Toggle - Segmented Control, Soft Variant */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 flex-shrink-0">
                <button
                  onClick={() => router.push('/')}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span>Grid</span>
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all rounded-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                  aria-label="Map view"
                  disabled
                >
                  <Map className="h-4 w-4" />
                  <span>Map</span>
                </button>
              </div>
            </div>

            {/* 4. Create Trip Button - Primary Pill, Align Right */}
            <button
              onClick={() => {
                if (!user) {
                  router.push('/auth/login');
                } else {
                  router.push('/trips');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-sm font-medium hover:opacity-90 transition-all duration-180 flex-shrink-0"
              aria-label={user ? "Create Trip" : "Sign in to create trip"}
            >
              <Plus className="w-4 h-4" />
              <span>Create Trip</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Container - List Panel and Map */}
      <div className="relative w-full" style={{ height: 'calc(100vh - 112px - 120px)', minHeight: '600px' }}>
        {/* List Panel - Left (Desktop) */}
        {showListPanel && (
          <div className="hidden md:block absolute left-0 top-0 bottom-0 w-[380px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-10 overflow-y-auto">
          <div className="p-6 space-y-3">
            <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">
              {filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'}
            </div>
            {sortedDestinations.map((dest) => (
              <button
                key={dest.slug}
                onClick={() => handleListItemClick(dest)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 ease-out text-left ${
                  selectedDestination?.slug === dest.slug
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:opacity-60'
                }`}
              >
                {dest.image && (
                  <div className="relative w-16 h-16 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-800">
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
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {dest.category && <span>{dest.category}</span>}
                    {dest.city && (
                      <span className="ml-1">• {dest.city}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

        {/* Map - Full width with margin for list panel */}
        <div className={`absolute top-0 bottom-0 right-0 ${showListPanel ? 'md:left-[380px]' : 'left-0'}`}>
          <MapView
            destinations={filteredDestinations}
            onMarkerClick={handleMarkerClick}
            center={mapCenter}
            zoom={mapZoom}
          />
        </div>
      </div>

      {/* List Panel - Mobile (Bottom Sheet) */}
      <div className="md:hidden">
        {/* Backdrop - Only show when expanded */}
        {showListPanel && (
          <div 
            className="fixed inset-0 bg-black/20 z-20"
            onClick={() => setShowListPanel(false)}
          />
        )}
        {/* Panel */}
        <div className="fixed inset-x-0 bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-30 overflow-hidden rounded-t-2xl shadow-2xl safe-area-bottom"
          style={{ 
            height: showListPanel ? '70%' : '80px',
            transition: 'height 0.3s ease-out'
          }}>
            {/* Handle bar with close button */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {filteredDestinations.length} {filteredDestinations.length === 1 ? 'place' : 'places'}
                </span>
              </div>
              <button
                onClick={() => setShowListPanel(false)}
                className="p-2 rounded-2xl hover:opacity-60 transition-opacity"
                aria-label="Close list"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            {/* Scrollable list */}
            <div className="overflow-y-auto h-[calc(100%-65px)]">
              <div className="p-6 space-y-3 pb-6">
                {sortedDestinations.map((dest) => (
                  <button
                    key={dest.slug}
                    onClick={() => {
                      handleListItemClick(dest);
                      setShowListPanel(false);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:opacity-60 transition-all duration-200 ease-out text-left min-h-[72px] touch-manipulation"
                  >
                    {dest.image && (
                      <div className="relative w-16 h-16 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-700 border border-gray-200 dark:border-gray-800">
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
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {dest.category && <span>{dest.category}</span>}
                        {dest.city && (
                          <span className="ml-1">• {dest.city}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

      {/* Destination Drawer */}
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
