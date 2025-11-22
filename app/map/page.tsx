'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import dynamic from 'next/dynamic';
import MyGoogleMap from './MyGoogleMap';
import { ChevronRight, Map as MapIcon, List, ChevronLeft } from 'lucide-react';
import Image from 'next/image';

// Lazy load DestinationDrawer
const DestinationDrawer = dynamic(
  () => import('@/components/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  { ssr: false, loading: () => null }
);

const ITEMS_PER_PAGE = 20;

export default function MapPage() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showListPanel, setShowListPanel] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Default center
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 20.0, lng: 0.0 });
  const [mapZoom, setMapZoom] = useState(2);

  // Fetch ALL places
  useEffect(() => {
    async function fetchDestinations() {
      try {
        const supabaseClient = createClient();
        if (!supabaseClient) return;

        const { data: destData, error: destError } = await supabaseClient
          .from('destinations')
          .select('id, slug, name, city, category, image, latitude, longitude, michelin_stars, crown')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('name', { ascending: true }) // Sort alphabetically for list
          .limit(1000);

        if (destError) throw destError;

        const fetchedDestinations = (destData || []) as Destination[];
        setDestinations(fetchedDestinations);

        if (fetchedDestinations.length > 0 && fetchedDestinations.length < 10) {
          const avgLat = fetchedDestinations.reduce((sum, d) => sum + (d.latitude || 0), 0) / fetchedDestinations.length;
          const avgLng = fetchedDestinations.reduce((sum, d) => sum + (d.longitude || 0), 0) / fetchedDestinations.length;
          setMapCenter({ lat: avgLat, lng: avgLng });
          setMapZoom(4);
        }
      } catch (error) {
        console.error('Error fetching destinations:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDestinations();
  }, []);

  // Pagination Logic
  const totalPages = Math.ceil(destinations.length / ITEMS_PER_PAGE);

  const paginatedDestinations = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return destinations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [destinations, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Scroll list to top
      const listContainer = document.getElementById('destinations-list');
      if (listContainer) listContainer.scrollTop = 0;
    }
  };

  const handleMarkerClick = useCallback((dest: Destination) => {
    setSelectedDestination(dest);
    setIsDrawerOpen(true);
  }, []);

  const handleListItemClick = useCallback((dest: Destination) => {
    setSelectedDestination(dest);
    setIsDrawerOpen(true);
    if (dest.latitude && dest.longitude) {
      setMapCenter({ lat: dest.latitude, lng: dest.longitude });
      setMapZoom(14);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-white rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="relative z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 safe-area-top flex-shrink-0">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>Back</span>
          </button>

          <h1 className="text-sm font-semibold">Explore All Destinations</h1>

          <button
            onClick={() => setShowListPanel(!showListPanel)}
            className={`p-2 rounded-full transition-colors ${showListPanel
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex overflow-hidden">

        {/* List Panel */}
        <div
          className={`
            absolute z-10 top-0 bottom-0 left-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out flex flex-col
            ${showListPanel ? 'translate-x-0 w-full md:w-[380px]' : '-translate-x-full w-0'}
            md:relative md:translate-x-0 md:w-[380px]
            ${!showListPanel && 'md:hidden'} 
          `}
        >
          {/* Mobile Toggle to hide list */}
          <div className="md:hidden absolute top-4 right-4 z-20">
            <button
              onClick={() => setShowListPanel(false)}
              className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700"
            >
              <MapIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable List */}
          <div id="destinations-list" className="flex-1 overflow-y-auto p-4">
            {destinations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No destinations found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-2 flex justify-between items-center">
                  <span>{destinations.length} Destinations</span>
                  <span>Page {currentPage} of {totalPages}</span>
                </div>

                {paginatedDestinations.map((dest) => (
                  <button
                    key={dest.slug}
                    onClick={() => handleListItemClick(dest)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${selectedDestination?.slug === dest.slug
                      ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                  >
                    <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800">
                      {dest.image ? (
                        <Image
                          src={dest.image}
                          alt={dest.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <MapIcon className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{dest.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {dest.city} {dest.category && `• ${dest.category}`}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between z-10">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Map Container */}
        <div className="flex-1 relative bg-gray-100 dark:bg-gray-950">
          <MyGoogleMap
            destinations={destinations}
            onMarkerClick={handleMarkerClick}
            center={mapCenter}
            zoom={mapZoom}
            isDark={true}
          />

          {/* Mobile Toggle to show list */}
          {!showListPanel && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 md:hidden">
              <button
                onClick={() => setShowListPanel(true)}
                className="flex items-center gap-2 px-5 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-lg font-medium"
              >
                <List className="w-4 h-4" />
                <span>View List</span>
              </button>
            </div>
          )}
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
