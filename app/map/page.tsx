'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import MapView from '@/components/MapView';
import GoogleMap from '@/components/GoogleMap';
import AppleMap from '@/components/AppleMap';
import { Search, X, ChevronRight, Map, Globe, Compass, Flame, Radar } from 'lucide-react';
import Image from 'next/image';
import { Destination } from '@/types/destination';
import { useMapData } from '@/hooks/useMapData';

// Lazy load components
const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then((mod) => ({ default: mod.DestinationDrawer })),
  { ssr: false, loading: () => null }
);

const ratingOptions = [4.5, 4.0, 3.5, 3.0];

export default function MapPage() {
  const {
    loading,
    filteredDestinations,
    destinations,
    filters,
    setSearchQuery,
    toggleCategory,
    toggleOpenNow,
    toggleMichelin,
    updateMinRating,
    geoJson,
    highlightRoutes,
    popularSpots,
    contextSummary,
  } = useMapData();
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mapProvider, setMapProvider] = useState<'mapbox' | 'google' | 'apple'>(() => {
    if (typeof window === 'undefined') {
      return 'mapbox';
    }
    const stored = window.sessionStorage.getItem('map-provider');
    if (stored === 'google' || stored === 'apple' || stored === 'mapbox') {
      return stored;
    }
    return 'mapbox';
  });
  const [showHeatmap, setShowHeatmap] = useState(true);

  const providerOptions = useMemo(
    () => [
      { id: 'mapbox' as const, label: 'Mapbox', icon: Map },
      { id: 'google' as const, label: 'Google', icon: Globe },
      { id: 'apple' as const, label: 'Apple', icon: Compass },
    ],
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('map-provider', mapProvider);
  }, [mapProvider]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    destinations.forEach((destination) => {
      if (destination.category) {
        unique.add(destination.category);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [destinations]);

  const mapCenter = useMemo(() => {
    const coords = filteredDestinations.filter((destination) => destination.latitude && destination.longitude);
    if (!coords.length) {
      return { lat: 23.5, lng: 121.0 };
    }
    const avgLat = coords.reduce((sum, destination) => sum + (destination.latitude || 0), 0) / coords.length;
    const avgLng = coords.reduce((sum, destination) => sum + (destination.longitude || 0), 0) / coords.length;
    return { lat: avgLat, lng: avgLng };
  }, [filteredDestinations]);

  const distanceFromCenter = useCallback(
    (destination: Destination) => {
      if (!destination.latitude || !destination.longitude) return Number.POSITIVE_INFINITY;
      const latDiff = destination.latitude - mapCenter.lat;
      const lngDiff = destination.longitude - mapCenter.lng;
      return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    },
    [mapCenter]
  );

  const sortedDestinations = useMemo(() => {
    return [...filteredDestinations].sort((a, b) => distanceFromCenter(a) - distanceFromCenter(b));
  }, [filteredDestinations, distanceFromCenter]);

  const focusedDestination = useMemo(() => {
    if (selectedDestination?.latitude && selectedDestination?.longitude) {
      return selectedDestination;
    }
    return sortedDestinations.find((destination) => destination.latitude && destination.longitude) ?? null;
  }, [selectedDestination, sortedDestinations]);

  const focusLat = focusedDestination?.latitude ?? mapCenter.lat;
  const focusLng = focusedDestination?.longitude ?? mapCenter.lng;
  const focusLabel = focusedDestination?.name ?? 'Urban Manual';

  const infoWindowContent = useMemo(() => {
    if (!focusedDestination) return undefined;
    const addressParts = [focusedDestination.neighborhood, focusedDestination.city].filter(Boolean);
    return {
      title: focusedDestination.name,
      address: addressParts.join(' · ') || undefined,
      category: focusedDestination.category || undefined,
      rating: focusedDestination.rating || undefined,
    };
  }, [focusedDestination]);

  const handleMarkerClick = useCallback((destination: Destination) => {
    setSelectedDestination(destination);
    setIsDrawerOpen(true);
  }, []);

  const handleListItemClick = useCallback((destination: Destination) => {
    setSelectedDestination(destination);
    setIsDrawerOpen(true);
  }, []);

  const isCategoryActive = useCallback(
    (category: string) => filters.categories.some((value) => value.toLowerCase() === category.toLowerCase()),
    [filters.categories]
  );

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
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search cities, places, vibes…"
              className="w-full pl-10 pr-10 py-2.5 md:py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-base md:text-sm text-gray-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:border-gray-300 dark:focus:border-gray-600"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Map Provider</span>
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

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHeatmap((previous) => !previous)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    showHeatmap
                      ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-gray-900 dark:border-gray-100'
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Radar className="h-3.5 w-3.5" />
                  Heatmap
                </button>
                <button
                  onClick={toggleOpenNow}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    filters.openNow
                      ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-gray-900 dark:border-gray-100'
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Flame className="h-3.5 w-3.5" />
                  Open now
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-3 py-2 md:py-1.5 rounded-xl text-sm md:text-xs border transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px] md:min-h-0 ${
                    isCategoryActive(category)
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700'
                  }`}
                >
                  {category}
                </button>
              ))}
              <button
                onClick={toggleMichelin}
                className={`px-3 py-2 md:py-1.5 rounded-xl text-sm md:text-xs border transition-colors flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 min-h-[44px] md:min-h-0 ${
                  filters.michelin
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                  alt="Michelin"
                  className="h-3 w-3"
                />
                Michelin
              </button>
              <div className="flex items-center gap-2 px-3 py-2 md:py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm md:text-xs text-gray-700 dark:text-gray-300">
                <span className="font-medium">Rating</span>
                <div className="flex items-center gap-1">
                  {ratingOptions.map((rating) => {
                    const isActive = filters.minRating === rating;
                    return (
                      <button
                        key={rating}
                        onClick={() => updateMinRating(isActive ? undefined : rating)}
                        className={`px-2 py-1 rounded-lg border text-xs transition-colors ${
                          isActive
                            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-gray-900 dark:border-gray-100'
                            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                        }`}
                      >
                        {rating}+
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),320px]">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800/70 dark:text-gray-300">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Live context</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{filteredDestinations.length} results</span>
              </div>
              <p className="mt-2 leading-relaxed text-gray-700 dark:text-gray-200">{contextSummary}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              <div className="font-semibold text-gray-800 dark:text-gray-100">Trip highlight preview</div>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                We trace an intuitive loop through your standout picks. Follow the highlighted line on the map to see how they connect.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-6 md:px-10 lg:px-12 py-8">
        <div className="grid gap-6 md:grid-cols-[360px,minmax(0,1fr)] items-start">
          <div className="space-y-3">
            <div className="space-y-2">
              {sortedDestinations.map((destination) => (
                <button
                  key={destination.slug}
                  onClick={() => handleListItemClick(destination)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                    selectedDestination?.slug === destination.slug
                      ? 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                      : 'bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent'
                  }`}
                >
                  {destination.image && (
                    <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
                      <Image
                        src={destination.image}
                        alt={destination.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{destination.name}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-2">
                      {destination.category && <span>{destination.category}</span>}
                      {destination.city && <span className="text-[10px]">• {destination.city}</span>}
                      {destination.rating && (
                        <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-300">
                          {destination.rating.toFixed(1)}
                        </span>
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
                  zoom={12}
                  geoJson={geoJson}
                  highlightRoutes={highlightRoutes}
                  popularSpots={popularSpots}
                  showHeatmap={showHeatmap}
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
                  zoom={12}
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
