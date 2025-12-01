'use client';

import Image from 'next/image';
import { useState, useEffect, memo } from 'react';
import { Plus, MapPin, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { formatDestinationsFromField } from '@/types/trip';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface Trip {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  cover_image: string | null;
}

interface QuickTripSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  destinationSlug: string;
  destinationName: string;
  destinationCity?: string;
}

/**
 * Quick trip selector modal for adding destinations to trips
 * Reduces friction by showing a simple list of trips to choose from
 */
export const QuickTripSelector = memo(function QuickTripSelector({
  isOpen,
  onClose,
  destinationSlug,
  destinationName,
  destinationCity,
}: QuickTripSelectorProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    async function loadTrips() {
      setLoading(true);
      try {
        const supabaseClient = createClient();
        const { data, error } = await supabaseClient
          .from('trips')
          .select('id, name, destination, start_date, cover_image')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setTrips(data || []);
      } catch (error) {
        console.error('Error loading trips:', error);
        setTrips([]);
      } finally {
        setLoading(false);
      }
    }

    loadTrips();
  }, [isOpen, user]);

  const handleAddToTrip = async (tripId: string) => {
    if (!user) return;

    setAdding(tripId);
    try {
      const supabaseClient = createClient();

      // Get the max order_index for day 1 (default day)
      const { data: existingItems } = await supabaseClient
        .from('itinerary_items')
        .select('order_index')
        .eq('trip_id', tripId)
        .eq('day', 1)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrder = existingItems && existingItems.length > 0
        ? existingItems[0].order_index + 1
        : 0;

      // Add to itinerary_items
      const { error } = await supabaseClient
        .from('itinerary_items')
        .insert({
          trip_id: tripId,
          destination_slug: destinationSlug,
          title: destinationName,
          day: 1,
          order_index: nextOrder,
          item_type: 'activity',
        });

      if (error) throw error;

      setSuccess(tripId);
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1000);
    } catch (error) {
      console.error('Error adding to trip:', error);
      alert('Failed to add to trip. Please try again.');
    } finally {
      setAdding(null);
    }
  };

  const handleCreateTrip = async () => {
    if (!user) return;

    setAdding('new');
    try {
      const supabaseClient = createClient();

      // Create a new trip
      const { data: newTrip, error: tripError } = await supabaseClient
        .from('trips')
        .insert({
          user_id: user.id,
          name: destinationCity ? `Trip to ${destinationCity}` : 'New Trip',
          destination: destinationCity || null,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Add the destination as the first item
      const { error: itemError } = await supabaseClient
        .from('itinerary_items')
        .insert({
          trip_id: newTrip.id,
          destination_slug: destinationSlug,
          title: destinationName,
          day: 1,
          order_index: 0,
          item_type: 'activity',
        });

      if (itemError) throw itemError;

      setSuccess('new');
      setTimeout(() => {
        onClose();
        router.push(`/trips/${newTrip.id}`);
      }, 800);
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Failed to create trip. Please try again.');
    } finally {
      setAdding(null);
    }
  };

  if (!isOpen) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Add to Trip"
      mobileVariant="bottom"
      style="glassy"
      mobileHeight="88vh"
      mobileMaxHeight="92vh"
      desktopWidth="440px"
      headerContent={(
        <DrawerHeader
          title="Add to Trip"
          subtitle={destinationName}
          rightAccessory={(
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-9 w-9 rounded-full"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          className="pr-3"
        />
      )}
    >
      <DrawerSection className="space-y-3">
        <Card className="border-dashed border-neutral-200 bg-white/70 dark:border-white/10 dark:bg-white/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-neutral-900 text-white dark:border-white/15 dark:bg-white dark:text-neutral-900',
                  adding === 'new' && 'border-transparent bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200'
                )}
              >
                {adding === 'new' ? (
                  success === 'new' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Spinner className="h-5 w-5" />
                  )
                ) : (
                  <Plus className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Create New Trip</CardTitle>
                <CardDescription>Start planning a new adventure</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={handleCreateTrip}
                disabled={adding !== null}
                className="rounded-full px-4"
              >
                {adding === 'new' ? (success === 'new' ? 'Added' : 'Creating...') : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Your Trips</p>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : trips.length > 0 ? (
            <div className="space-y-2">
              {trips.map((trip) => (
                <TripListItem
                  key={trip.id}
                  trip={trip}
                  destination={formatDestinationsFromField(trip.destination) || 'No destination set'}
                  isLoading={adding === trip.id && success !== trip.id}
                  isSuccess={success === trip.id}
                  disabled={adding !== null}
                  onClick={() => handleAddToTrip(trip.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              size="sm"
              title="No trips yet"
              description="Create a trip to start building your itinerary."
              action={{ label: 'Create trip', onClick: handleCreateTrip, icon: Plus }}
              className="rounded-xl border border-dashed border-neutral-200 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/5"
            />
          )}
        </div>
      </DrawerSection>
    </Drawer>
  );
});

interface TripListItemProps {
  trip: Trip;
  destination: string;
  isLoading: boolean;
  isSuccess: boolean;
  disabled: boolean;
  onClick: () => void;
}

function TripListItem({ trip, destination, isLoading, isSuccess, disabled, onClick }: TripListItemProps) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className="group flex h-auto w-full items-center justify-start gap-3 rounded-xl border border-transparent bg-white/60 px-3 py-3 text-left shadow-sm transition-all hover:border-border hover:bg-muted/60 disabled:opacity-60 dark:bg-white/5"
    >
      <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-500 shadow-xs dark:border-white/10 dark:bg-neutral-900">
        {isLoading ? (
          <Spinner className="h-5 w-5 text-neutral-500" />
        ) : isSuccess ? (
          <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-200">
            <Check className="h-5 w-5" />
          </div>
        ) : trip.cover_image ? (
          <Image
            src={trip.cover_image}
            alt={trip.name}
            fill
            sizes="44px"
            className="object-cover"
          />
        ) : (
          <MapPin className="h-5 w-5 text-neutral-400" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium text-neutral-900 dark:text-white">{trip.name}</span>
        <span className="truncate text-xs text-muted-foreground">{destination}</span>
      </div>
    </Button>
  );
}
