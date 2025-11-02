'use client';

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Destination } from '@/types/destination'
import dynamic from 'next/dynamic'

// Lazy load both map and drawer
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })
const DestinationDrawer = dynamic(
  () => import('@/components/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
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
      <div className="max-w-[1920px] mx-auto">
        <div className="h-[70vh] md:h-[75vh] rounded-2xl overflow-hidden">
          <MapView
            destinations={destinations}
            onMarkerClick={(dest) => {
              setSelectedDestination(dest)
              setIsDrawerOpen(true)
            }}
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


