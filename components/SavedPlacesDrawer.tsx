'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';
import { Loader2, Bookmark, ChevronRight, MapPin } from 'lucide-react';
import Image from 'next/image';

interface SavedPlace {
  destination_slug: string;
  destination: {
    name: string;
    city?: string;
    category?: string;
    image?: string;
  } | null;
}

function PlaceItem({ place, onClick }: { place: SavedPlace; onClick: () => void }) {
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
        {place.destination?.city && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{place.destination.city}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </button>
  );
}

export function SavedPlacesDrawer() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const isOpen = isDrawerOpen('saved-places');
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSavedPlaces = useCallback(async () => {
    if (!user) {
      setSavedPlaces([]);
      return;
    }

    setLoading(true);
    try {
      const supabaseClient = createClient();
      const { data: savedResult } = await supabaseClient
        .from('saved_places')
        .select('destination_slug')
        .eq('user_id', user.id);

      if (savedResult && savedResult.length > 0) {
        const slugs = savedResult.map((item: any) => item.destination_slug);
        const { data: destData } = await supabaseClient
          .from('destinations')
          .select('slug, name, city, category, image')
          .in('slug', slugs);

        if (destData) {
          const mapped = savedResult.map((item: any) => {
            const dest = destData.find((d: any) => d.slug === item.destination_slug);
            return {
              destination_slug: item.destination_slug,
              destination: dest ? { name: dest.name, city: dest.city, category: dest.category, image: dest.image } : null,
            };
          });
          setSavedPlaces(mapped);
        }
      } else {
        setSavedPlaces([]);
      }
    } catch (error) {
      console.error('Error fetching saved places:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchSavedPlaces();
    }
  }, [isOpen, fetchSavedPlaces]);

  const handleSelectPlace = (slug: string) => {
    closeDrawer();
    setTimeout(() => router.push(`/destination/${slug}`), 200);
  };

  return (
    <Drawer isOpen={isOpen} onClose={closeDrawer}>
      <DrawerHeader
        title="Saved Places"
        subtitle={`${savedPlaces.length} places`}
        leftAccessory={<Bookmark className="h-5 w-5 text-gray-500" />}
      />

      <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-16">
        {loading ? (
          <DrawerSection>
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Loading saved places...</p>
            </div>
          </DrawerSection>
        ) : savedPlaces.length === 0 ? (
          <DrawerSection>
            <div className="text-center py-12 px-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <Bookmark className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No saved places yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Save places to find them here</p>
            </div>
          </DrawerSection>
        ) : (
          <DrawerSection>
            <div className="-mx-3 space-y-0.5">
              {savedPlaces.map((place) => (
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
            router.push('/account?tab=saved');
          }}
          className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full px-4 py-2.5 text-sm font-medium"
        >
          View all saved
        </button>
      </DrawerActionBar>
    </Drawer>
  );
}
