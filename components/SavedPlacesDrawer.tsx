'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Bookmark, ChevronLeft, ArrowRight } from 'lucide-react';
import { HorizontalDestinationCard } from '@/components/HorizontalDestinationCard';
import type { Destination } from '@/types/destination';

interface SavedPlace {
  destination_slug: string;
  destination: Destination | null;
}

export function SavedPlacesDrawer() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDrawerOpen, closeDrawer, goBack, canGoBack } = useDrawer();
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
        const slugs = savedResult.map((item: { destination_slug: string }) => item.destination_slug);
        const { data: destData } = await supabaseClient
          .from('destinations')
          .select('*')
          .in('slug', slugs);

        if (destData) {
          const mapped = savedResult.map((item: { destination_slug: string }) => {
            const dest = destData.find((d: Destination) => d.slug === item.destination_slug);
            return {
              destination_slug: item.destination_slug,
              destination: dest as Destination,
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

  const handleClose = canGoBack ? goBack : closeDrawer;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="card-right" className="flex flex-col p-0" hideCloseButton>
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            {canGoBack ? (
              <Button variant="ghost" size="icon" onClick={goBack} className="-ml-2">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : (
              <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                <Bookmark className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Saved
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {savedPlaces.length} {savedPlaces.length === 1 ? 'place' : 'places'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gray-300 dark:text-gray-600" />
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Loading saved places...
              </p>
            </div>
          ) : savedPlaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
                <Bookmark className="w-9 h-9 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No saved places yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[240px]">
                Tap the bookmark icon on any place to save it for later
              </p>
            </div>
          ) : (
            <div className="px-4 space-y-3 pb-4">
              {savedPlaces.map((place) => (
                place.destination && (
                  <HorizontalDestinationCard
                    key={place.destination_slug}
                    destination={place.destination}
                    onClick={() => handleSelectPlace(place.destination_slug)}
                    showBadges={true}
                  />
                )
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {savedPlaces.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              variant="ghost"
              onClick={() => {
                closeDrawer();
                router.push('/account?tab=saved');
              }}
              className="w-full"
            >
              View all saved places
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
