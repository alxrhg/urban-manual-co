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
import { MapPin, Calendar, ChevronRight, Plus, Loader2, Plane } from 'lucide-react';
import Image from 'next/image';

interface Trip {
  id: string;
  title: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  cover_image?: string;
  status?: string;
}

function getStatusConfig(status?: string) {
  switch (status) {
    case 'planning':
      return { label: 'Planning', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
    case 'upcoming':
      return { label: 'Upcoming', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
    case 'ongoing':
      return { label: 'Ongoing', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
    case 'completed':
      return { label: 'Completed', classes: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
    default:
      return { label: 'Planning', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
  }
}

function TripCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  const formatDate = (date: string | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const dateRange = trip.start_date && trip.end_date
    ? `${formatDate(trip.start_date)} – ${formatDate(trip.end_date)}`
    : trip.start_date
    ? formatDate(trip.start_date)
    : null;

  const statusConfig = getStatusConfig(trip.status);

  return (
    <button
      onClick={onClick}
      className="w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-left transition-all hover:border-gray-300 dark:hover:border-gray-700"
    >
      <div className="relative h-24 w-full bg-gray-100 dark:bg-gray-800">
        {trip.cover_image ? (
          <Image src={trip.cover_image} alt={trip.title} fill className="object-cover" sizes="400px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <MapPin className="h-8 w-8 text-gray-300 dark:text-gray-700" />
          </div>
        )}
        <div className="absolute right-2 top-2">
          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusConfig.classes}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>
      <div className="p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-1">{trip.title}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            {trip.destination && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {trip.destination}
              </span>
            )}
            {dateRange && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {dateRange}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    </button>
  );
}

export function TripsDrawer() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const isOpen = isDrawerOpen('trips');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      return;
    }

    setLoading(true);
    try {
      const supabaseClient = createClient();
      const { data } = await supabaseClient
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchTrips();
    }
  }, [isOpen, fetchTrips]);

  const handleSelectTrip = (trip: Trip) => {
    closeDrawer();
    setTimeout(() => router.push(`/trips/${trip.id}`), 200);
  };

  const handleNewTrip = () => {
    closeDrawer();
    setTimeout(() => router.push('/trips'), 200);
  };

  return (
    <Drawer isOpen={isOpen} onClose={closeDrawer}>
      <DrawerHeader title="Your Trips" subtitle={`${trips.length} trips`} />

      <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-16">
        {loading ? (
          <DrawerSection>
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Loading trips...</p>
            </div>
          </DrawerSection>
        ) : trips.length === 0 ? (
          <DrawerSection>
            <div className="text-center py-12 px-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <Plane className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No trips yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create your first trip to get started</p>
            </div>
          </DrawerSection>
        ) : (
          <DrawerSection>
            <div className="space-y-3">
              {trips.map((trip) => (
                <TripCard key={trip.id} trip={trip} onClick={() => handleSelectTrip(trip)} />
              ))}
            </div>
          </DrawerSection>
        )}
      </div>

      <DrawerActionBar>
        <button
          onClick={handleNewTrip}
          className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Trip
        </button>
      </DrawerActionBar>
    </Drawer>
  );
}
