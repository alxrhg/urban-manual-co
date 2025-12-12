'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { Building2, ArrowLeft, Loader2 } from 'lucide-react';
import { UniversalGrid } from '@/components/UniversalGrid';
import { DestinationCard } from '@/components/DestinationCard';
import { useDrawer } from '@/contexts/DrawerContext';
import { useItemsPerPage } from '@/hooks/useGridColumns';

export default function BrandPage() {
  const router = useRouter();
  const params = useParams();
  const { openDestination } = useDrawer();
  const brandSlug = params.brand as string;

  const [brandName, setBrandName] = useState<string>('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = useItemsPerPage(4);
  const [displayCount, setDisplayCount] = useState(itemsPerPage);

  useEffect(() => {
    if (brandSlug) {
      fetchBrandDestinations();
    }
  }, [brandSlug]);

  const fetchBrandDestinations = async () => {
    try {
      // Decode the brand slug for the API call
      const decodedBrand = decodeURIComponent(brandSlug);

      const response = await fetch(`/api/brands/${encodeURIComponent(decodedBrand)}`);
      if (!response.ok) throw new Error('Failed to fetch brand destinations');

      const data = await response.json();
      setBrandName(data.brand || decodedBrand);
      setDestinations(data.destinations || []);
    } catch (error) {
      console.error('Error fetching brand destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </main>
    );
  }

  // Get unique cities for the brand
  const uniqueCities = [...new Set(destinations.map(d => d.city))].filter(Boolean);

  return (
    <main className="relative min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="px-6 md:px-10 lg:px-12 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 ease-out mb-8"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back</span>
          </button>

          {/* Hero Content */}
          <div className="space-y-4 mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">Brand</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-black dark:text-white">
              {brandName}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
              Explore all {brandName} locations in our collection.
              {uniqueCities.length > 0 && (
                <> Found in {uniqueCities.length} {uniqueCities.length === 1 ? 'city' : 'cities'} worldwide.</>
              )}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {destinations.length} {destinations.length === 1 ? 'location' : 'locations'}
            </p>
          </div>
        </div>
      </section>

      {/* Grid Section */}
      <div className="pb-12 px-6 md:px-10 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {destinations.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
              <span className="text-sm text-gray-600 dark:text-gray-400">No locations found for this brand</span>
            </div>
          ) : (
            <>
              <UniversalGrid
                items={destinations.slice(0, displayCount)}
                gap="sm"
                renderItem={(destination) => (
                  <DestinationCard
                    key={destination.slug}
                    destination={destination}
                    onClick={() => openDestination(destination.slug)}
                    showBadges={true}
                    showQuickActions={true}
                  />
                )}
              />

              {/* Show More Button */}
              {displayCount < destinations.length && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setDisplayCount(prev => prev + itemsPerPage)}
                    className="px-6 py-3 text-xs font-medium border border-gray-200 dark:border-gray-800 rounded-2xl hover:opacity-60 transition-all duration-200 ease-out text-gray-900 dark:text-white"
                  >
                    Show More ({destinations.length - displayCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
