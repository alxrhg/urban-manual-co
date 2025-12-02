'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { Trip } from '@/types/trip';
import { Plane, Plus } from 'lucide-react';
import TripCard from '@/components/trips/TripCard';
import { Button } from '@/components/ui/button';

interface TripsTabProps {
  trips: Trip[];
  onTripsUpdated: () => Promise<void>;
}

export default function TripsTab({ trips, onTripsUpdated }: TripsTabProps) {
  const router = useRouter();

  const handleNewTrip = () => {
    router.push('/trips');
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
        </p>
        <Button onClick={handleNewTrip} className="rounded-full">
          <Plus className="w-4 h-4" />
          New Trip
        </Button>
      </div>

      {/* Trips Grid */}
      {trips.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-[16px] border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Plane className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No trips yet
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
            Start planning your next adventure by creating your first trip.
          </p>
          <Button onClick={handleNewTrip} className="rounded-full">
            <Plus className="w-4 h-4" />
            Create Trip
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={{
                id: trip.id,
                name: trip.title,
                coverImage: trip.cover_image,
                city: trip.destination || undefined,
                startDate: trip.start_date || undefined,
                endDate: trip.end_date || undefined,
                status: trip.status,
              }}
              onView={() => router.push(`/trips/${trip.id}`)}
              onEdit={() => router.push(`/trips/${trip.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
