'use client';

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Destination } from '@/types/destination'
import dynamic from 'next/dynamic'
import MapView from '@/components/MapView'

// Lazy load drawer
const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  { ssr: false, loading: () => null }
)

export default function MapPage() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      try {
        const supabaseClient = createClient();
        if (!supabaseClient) {
          console.warn('[Map Page] Supabase client not available');
          setLoading(false);
          return;
        }

        // Fetch destinations with location data (latitude, longitude, or place_id)
        // Exclude nested destinations from map view (only show top-level)
        const { data, error } = await supabaseClient
          .from('destinations')
          .select('id, slug, name, city, neighborhood, category, description, content, image, michelin_stars, crown, tags, latitude, longitude, place_id, parent_destination_id')
          .is('parent_destination_id', null) // Only top-level destinations
          .or('latitude.not.is.null,longitude.not.is.null,place_id.not.is.null')
          .order('name')
          .limit(1000); // Limit to prevent too many markers

        if (error) {
          console.warn('[Map Page] Error fetching destinations:', error);
          setDestinations([]);
        } else {
          setDestinations((data || []) as Destination[]);
        }
      } catch (error) {
        console.warn('[Map Page] Exception fetching destinations:', error);
        setDestinations([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAll()
  }, [])

  // Calculate center from destinations with coordinates
  const getMapCenter = () => {
    const destinationsWithCoords = destinations.filter(d => d.latitude && d.longitude);
    if (destinationsWithCoords.length === 0) {
      return { lat: 35.6762, lng: 139.6503 }; // Default to Tokyo
    }

    // Calculate average center
    const avgLat = destinationsWithCoords.reduce((sum, d) => sum + (d.latitude || 0), 0) / destinationsWithCoords.length;
    const avgLng = destinationsWithCoords.reduce((sum, d) => sum + (d.longitude || 0), 0) / destinationsWithCoords.length;
    return { lat: avgLat, lng: avgLng };
  };

  if (loading) {
    return (
      <main className="px-4 md:px-6 lg:px-10 py-8 dark:text-white min-h-screen">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center justify-center min-h-[60vh] text-gray-500">Loading map…</div>
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 md:px-6 lg:px-10 py-8 dark:text-white min-h-screen">
      <div className="max-w-[1920px] mx-auto space-y-6">
        {/* Map with all destination pins */}
        <div className="h-[70vh] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
          <MapView
            destinations={destinations}
            onMarkerClick={(dest) => {
              setSelectedDestination(dest);
              setIsDrawerOpen(true);
            }}
            center={getMapCenter()}
            zoom={destinations.length > 0 ? 10 : 12}
          />
        </div>

        {/* Destination count and info */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {destinations.length} {destinations.length === 1 ? 'destination' : 'destinations'} on the map
        </div>

        {/* Simple list to select a destination */}
        {destinations.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
            {destinations.slice(0, 50).map((d) => (
              <button
                key={d.id || d.slug}
                onClick={() => { setSelectedDestination(d); setIsDrawerOpen(true); }}
                className={`text-left border rounded-xl p-3 transition-colors ${
                  selectedDestination?.slug === d.slug
                    ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="font-medium text-sm mb-1">{d.name}</div>
                <div className="text-xs text-gray-500">{d.city} {d.category ? `• ${d.category}` : ''}</div>
              </button>
            ))}
          </div>
        )}

        {destinations.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No destinations with location data found. Destinations need latitude/longitude or place_id to appear on the map.
            </p>
          </div>
        )}
      </div>

      <DestinationDrawer
        destination={selectedDestination}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false)
          setTimeout(() => setSelectedDestination(null), 300)
        }}
      />
    </main>
  )
}


