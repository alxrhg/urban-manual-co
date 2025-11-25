'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { DrawerSystem } from '@/components/ui/DrawerSystem';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';
import { Loader2, MapPin, ChevronRight, ChevronLeft } from 'lucide-react';
import Image from 'next/image';

interface VisitedPlace {
  destination_slug: string;
  visited_at?: string;
  destination: {
    name: string;
    city?: string;
    category?: string;
    image?: string;
  } | null;
}

function PlaceItem({ place, onClick }: { place: VisitedPlace; onClick: () => void }) {
  const formatDate = (date: string | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
    >
      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
        {place.destination?.image ? (
          <Image src={place.destination.image} alt={place.destination?.name || ''} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {place.destination?.name || place.destination_slug}
        </p>
        {place.visited_at && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(place.visited_at)}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </button>
  );
}

export function VisitedPlacesDrawer() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDrawerOpen, closeDrawer, goBack, canGoBack } = useDrawer();
  const isOpen = isDrawerOpen('visited-places');
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVisitedPlaces = useCallback(async () => {
    if (!user) {
      setVisitedPlaces([]);
      return;
    }

    setLoading(true);
    try {
      const supabaseClient = createClient();
      const { data: visitedResult } = await supabaseClient
        .from('visited_places')
        .select('destination_slug, visited_at')
        .eq('user_id', user.id)
        .order('visited_at', { ascending: false });

      if (visitedResult && visitedResult.length > 0) {
        const slugs = visitedResult.map((item: any) => item.destination_slug);
        const { data: destData } = await supabaseClient
          .from('destinations')
          .select('slug, name, city, category, image')
          .in('slug', slugs);

        if (destData) {
          const mapped = visitedResult.map((item: any) => {
            const dest = destData.find((d: any) => d.slug === item.destination_slug);
            return {
              destination_slug: item.destination_slug,
              visited_at: item.visited_at,
              destination: dest ? { name: dest.name, city: dest.city, category: dest.category, image: dest.image } : null,
            };
          });
          setVisitedPlaces(mapped);
        }
      } else {
        setVisitedPlaces([]);
      }
    } catch (error) {
      console.error('Error fetching visited places:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchVisitedPlaces();
    }
  }, [isOpen, fetchVisitedPlaces]);

  const handleSelectPlace = (slug: string) => {
    closeDrawer();
    setTimeout(() => router.push(`/destination/${slug}`), 200);
  };

  const backButton = canGoBack ? (
    <button
      onClick={goBack}
      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
    >
      <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    </button>
  ) : (
    <MapPin className="h-5 w-5 text-gray-500" />
  );

  return (
    <DrawerSystem isOpen={isOpen} onClose={canGoBack ? goBack : closeDrawer} width="420px" position="right" style="glassy">
      <DrawerHeader
        title="Visited Places"
        subtitle={`${visitedPlaces.length} places`}
        leftAccessory={backButton}
      />

      <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-16">
        {loading ? (
          <DrawerSection>
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Loading visited places...</p>
            </div>
          </DrawerSection>
        ) : visitedPlaces.length === 0 ? (
          <DrawerSection>
            <div className="text-center py-12 px-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No visited places yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Mark places as visited to track them</p>
            </div>
          </DrawerSection>
        ) : (
          <DrawerSection>
            <div className="-mx-3 space-y-0.5">
              {visitedPlaces.map((place) => (
                <PlaceItem
                  key={place.destination_slug}
                  place={place}
                  onClick={() => handleSelectPlace(place.destination_slug)}
                />
              ))}
            </div>
          </DrawerSection>
        )}
      </div>

      <DrawerActionBar>
        <button
          onClick={() => {
            closeDrawer();
            router.push('/account?tab=visited');
          }}
          className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full px-4 py-2.5 text-sm font-medium"
        >
          View all visited
        </button>
      </DrawerActionBar>
    </DrawerSystem>
  );
}
