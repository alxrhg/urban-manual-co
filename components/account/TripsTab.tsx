'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Trip } from '@/types/trip';
import { Plane, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TripPlanner } from '@/components/TripPlanner';
import TripCard from '@/components/trips/TripCard';
import UMActionPill from '@/components/ui/UMActionPill';
import UMFeaturePill from '@/components/ui/UMFeaturePill';

interface TripsTabProps {
  trips: Trip[];
  onTripsUpdated: () => Promise<void>;
}

// Format date helper
function formatDate(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return undefined;
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return undefined;
  }
}

export default function TripsTab({ trips, onTripsUpdated }: TripsTabProps) {
  const router = useRouter();
  const [showTripDialog, setShowTripDialog] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);

  const handleNewTrip = () => {
    setEditingTripId(null);
    setShowTripDialog(true);
  };

  const handleEditTrip = (tripId: string) => {
    setEditingTripId(tripId);
    setShowTripDialog(true);
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header with New Trip button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
          </p>
        </div>
        <UMActionPill variant="primary" onClick={handleNewTrip}>
          <Plus className="w-4 h-4 mr-1" />
          New Trip
        </UMActionPill>
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
          <UMFeaturePill onClick={handleNewTrip}>
            <Plus className="w-4 h-4 mr-2" />
            Create Trip
          </UMFeaturePill>
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
                startDate: formatDate(trip.start_date),
                endDate: formatDate(trip.end_date),
                status: trip.status,
              }}
              onView={() => router.push(`/trips/${trip.id}`)}
              onEdit={() => handleEditTrip(trip.id)}
            />
          ))}
        </div>
      )}

      {/* Trip Planner - Only render when open */}
      {showTripDialog && (
        <TripPlanner
          isOpen={true}
          tripId={editingTripId ?? undefined}
          onClose={async () => {
            setShowTripDialog(false);
            setEditingTripId(null);
            await onTripsUpdated();
          }}
        />
      )}
    </div>
  );
}
