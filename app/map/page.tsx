'use client';

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Destination } from '@/types/destination'
import dynamic from 'next/dynamic'
import GoogleMap from '@/components/GoogleMap'

// Lazy load drawer only (map uses GoogleMap client component)
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
        const { data, error } = await supabase
          .from('destinations')
          .select('*')
          .order('name')
        if (error) throw error
        setDestinations(data || [])
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

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
        {/* Simple list to select a destination */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
          {destinations.map((d) => (
            <button
              key={d.id}
              onClick={() => { setSelectedDestination(d); setIsDrawerOpen(true); }}
              className="text-left border border-gray-200 dark:border-gray-800 rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="font-medium text-sm mb-1">{d.name}</div>
              <div className="text-xs text-gray-500">{d.city} {d.category ? `• ${d.category}` : ''}</div>
            </button>
          ))}
        </div>

        {/* Google Map for selected (or first) destination */}
        <div className="h-[60vh] rounded-2xl overflow-hidden">
          <GoogleMap
            query={(selectedDestination || destinations[0]) ? `${(selectedDestination || destinations[0])!.name}, ${(selectedDestination || destinations[0])!.city}` : 'Tokyo'}
            height="100%"
            className="w-full"
          />
        </div>
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


