'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Destination } from '@/types/destination';
import { useDrawer } from '@/contexts/DrawerContext';

// Import homepage sections
import {
  Hero,
  CuratedCollections,
  DestinationSpotlight,
  CityGrid,
  PersonalizedSection,
  IntelligenceFeatures,
  Newsletter,
} from '@/components/sections/homepage';

// Lazy load the destination drawer
const DestinationDrawer = dynamic(
  () =>
    import('@/src/features/detail/DestinationDrawer').then((mod) => ({
      default: mod.DestinationDrawer,
    })),
  { ssr: false, loading: () => null }
);

/**
 * Props for the new homepage client
 */
export interface NewHomePageClientProps {
  initialDestinations?: Destination[];
  initialCities?: string[];
  initialCategories?: string[];
  initialTrending?: Destination[];
}

/**
 * New Homepage Client Component
 *
 * A modern, editorial-style homepage with:
 * - AI-powered hero search
 * - Personalized recommendations for logged-in users
 * - Curated collections (Michelin, Hotels, Cafes, etc.)
 * - Destination spotlight
 * - City exploration grid
 * - Platform features showcase
 * - Newsletter subscription
 */
export default function NewHomePageClient({
  initialDestinations = [],
  initialCities = [],
  initialCategories = [],
  initialTrending = [],
}: NewHomePageClientProps) {
  const { openDrawer } = useDrawer();

  // Selected destination for drawer
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Generate city stats from destinations
  const cityStats = useMemo(() => {
    const stats = new Map<string, { city: string; country?: string; count: number; image?: string }>();

    initialDestinations.forEach((dest) => {
      const city = dest.city;
      if (!city) return;

      if (!stats.has(city)) {
        stats.set(city, {
          city,
          country: dest.country,
          count: 0,
          image: dest.image || dest.image_thumbnail,
        });
      }

      const current = stats.get(city)!;
      current.count += 1;

      // Update image if we don't have one
      if (!current.image && (dest.image || dest.image_thumbnail)) {
        current.image = dest.image || dest.image_thumbnail;
      }
    });

    return Array.from(stats.values()).sort((a, b) => b.count - a.count);
  }, [initialDestinations]);

  // Handle destination click - open drawer
  const handleDestinationClick = useCallback((destination: Destination) => {
    if (destination.slug) {
      setSelectedDestination(destination);
      setIsDrawerOpen(true);
    }
  }, []);

  // Close destination drawer
  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
    setSelectedDestination(null);
  }, []);

  // Handle search from hero
  const handleSearch = useCallback((query: string) => {
    // Open chat drawer with the search query
    openDrawer('chat');
  }, [openDrawer]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <Hero onSearch={handleSearch} />

      {/* Personalized Section (logged-in users only) */}
      <PersonalizedSection
        allDestinations={initialDestinations}
        onDestinationClick={handleDestinationClick}
      />

      {/* Curated Collections */}
      <CuratedCollections
        destinations={initialDestinations}
        onDestinationClick={handleDestinationClick}
      />

      {/* Destination Spotlight */}
      <DestinationSpotlight cityStats={cityStats} />

      {/* City Grid */}
      <CityGrid cityStats={cityStats} maxCities={8} />

      {/* Intelligence Features */}
      <IntelligenceFeatures />

      {/* Newsletter */}
      <Newsletter />

      {/* Destination Drawer */}
      {isDrawerOpen && selectedDestination && (
        <DestinationDrawer
          isOpen={isDrawerOpen}
          onClose={handleDrawerClose}
          slug={selectedDestination.slug}
          initialData={selectedDestination}
        />
      )}
    </div>
  );
}
