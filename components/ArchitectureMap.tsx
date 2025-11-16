/**
 * Architecture Map
 * Map view with architecture-focused features
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Building2, MapPin } from 'lucide-react';
import type { ArchitectureDestination } from '@/types/architecture';
import dynamic from 'next/dynamic';

// Lazy load map component
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

interface ArchitectureMapProps {
  destinations?: ArchitectureDestination[];
  architectId?: string;
  movementId?: string;
  city?: string;
}

export function ArchitectureMap({ destinations: initialDestinations, architectId, movementId, city }: ArchitectureMapProps) {
  const [destinations, setDestinations] = useState<ArchitectureDestination[]>(initialDestinations || []);
  const [loading, setLoading] = useState(!initialDestinations);

  useEffect(() => {
    if (initialDestinations) {
      setDestinations(initialDestinations);
      return;
    }

    fetchDestinations();
  }, [architectId, movementId, city]);

  const fetchDestinations = async () => {
    try {
      setLoading(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      let query = supabaseClient
        .from('destinations')
        .select(`
          id,
          name,
          slug,
          city,
          country,
          category,
          image,
          latitude,
          longitude,
          architect_id,
          movement_id,
          architect:architects(id, name, slug),
          movement:design_movements(id, name, slug)
        `)
        .not('architect_id', 'is', null)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(100);

      if (architectId) {
        query = query.eq('architect_id', architectId);
      }

      if (movementId) {
        query = query.eq('movement_id', movementId);
      }

      if (city) {
        query = query.eq('city', city.toLowerCase().replace(/\s+/g, '-'));
      }

      const { data, error } = await query;

      if (error) throw error;
      setDestinations((data || []) as ArchitectureDestination[]);
    } catch (error) {
      console.error('Error fetching destinations for map:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading map...</div>
      </div>
    );
  }

  if (destinations.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No destinations found</p>
        </div>
      </div>
    );
  }

  // Convert to format expected by MapView
  const mapDestinations = destinations.map(dest => ({
    id: dest.id,
    name: dest.name,
    slug: dest.slug,
    city: dest.city,
    category: dest.category,
    image: dest.image,
    lat: dest.latitude || 0,
    lng: dest.longitude || 0,
    architect: dest.architect,
    movement: dest.movement,
  }));

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <MapView destinations={mapDestinations} />
    </div>
  );
}

