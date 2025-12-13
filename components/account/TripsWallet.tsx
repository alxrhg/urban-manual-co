'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Plane } from 'lucide-react';
import { BoardingPass } from './BoardingPass';
import type { Trip } from '@/types/trip';

interface TripsWalletProps {
  trips: Trip[];
  onNewTrip?: () => void;
}

export function TripsWallet({ trips, onNewTrip }: TripsWalletProps) {
  const router = useRouter();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="passport-data text-[10px] text-gray-400 mb-1">Travel Wallet</p>
          <p className="text-xs text-gray-500">
            {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
          </p>
        </div>
        <button
          onClick={onNewTrip}
          className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-full hover:opacity-80 transition-opacity flex items-center gap-2"
        >
          <Plus className="h-3 w-3" />
          New Trip
        </button>
      </div>

      {/* Empty State */}
      {trips.length === 0 ? (
        <div className="passport-paper passport-guilloche rounded-2xl p-8 md:p-12 border border-dashed border-gray-300 dark:border-gray-700 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Plane className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="passport-data text-sm font-medium mb-2">No Boarding Passes Yet</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            Start planning your next adventure. Your travel passes will appear here.
          </p>
          <button
            onClick={onNewTrip}
            className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-full hover:opacity-80 transition-opacity inline-flex items-center gap-2"
          >
            <Plus className="h-3 w-3" />
            Create First Trip
          </button>
        </div>
      ) : (
        /* Trips List */
        <div className="space-y-4">
          {/* Group by status */}
          {['ongoing', 'upcoming', 'planning', 'completed'].map(status => {
            const statusTrips = trips.filter(t => t.status === status);
            if (statusTrips.length === 0) return null;

            return (
              <div key={status} className="space-y-3">
                {/* Status divider (only show if multiple statuses) */}
                {trips.some(t => t.status !== status) && (
                  <div className="flex items-center gap-3 py-2">
                    <span className="passport-data text-[10px] text-gray-400 uppercase">
                      {status === 'ongoing' ? 'Active' : status}
                    </span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                  </div>
                )}

                {/* Boarding passes */}
                {statusTrips.map(trip => (
                  <BoardingPass
                    key={trip.id}
                    trip={trip}
                    onClick={() => router.push(`/trips/${trip.id}`)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer hint */}
      {trips.length > 0 && (
        <p className="text-center text-[10px] text-gray-400 passport-data">
          Tap a pass to view trip details
        </p>
      )}
    </div>
  );
}
