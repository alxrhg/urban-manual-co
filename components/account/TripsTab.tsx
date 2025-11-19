'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Trip } from '@/types/common';
import { MapPin, Plus, Calendar, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TripPlanner } from '@/components/TripPlanner';

interface TripsTabProps {
  trips: Trip[];
  onTripsUpdated: () => Promise<void>;
}

export default function TripsTab({ trips, onTripsUpdated }: TripsTabProps) {
  const router = useRouter();
  const [showTripDialog, setShowTripDialog] = useState(false);
  const [editingTripId, setEditingTripId] = useState<number | null>(null);

  return (
    <div className="fade-in">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setEditingTripId(null);
            setShowTripDialog(true);
          }}
          className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity flex items-center gap-2"
        >
          <Plus className="h-3 w-3" />
          New Trip
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
          <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No trips yet</p>
          <button
            onClick={() => {
              setEditingTripId(null);
              setShowTripDialog(true);
            }}
            className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity"
          >
            Create your first trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="flex flex-col border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <button
                onClick={() => router.push(`/trips/${trip.id}`)}
                className="text-left p-4 flex-1"
              >
                <h3 className="font-medium text-sm mb-2 line-clamp-2">{trip.title}</h3>
                {trip.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{trip.description}</p>
                )}
                <div className="space-y-1 text-xs text-gray-400">
                  {trip.destination && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{trip.destination}</span>
                    </div>
                  )}
                  {(trip.start_date || trip.end_date) && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </span>
                    </div>
                  )}
                  {trip.status && (
                    <div>
                      <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                        {trip.status}
                      </span>
                    </div>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-2 p-4 pt-0 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/trips/${trip.id}`);
                  }}
                  className="flex-1 text-xs font-medium py-2 px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTripId(trip.id);
                    setShowTripDialog(true);
                  }}
                  className="p-2 rounded-xl text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label={`Edit ${trip.title}`}
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete "${trip.title}"?`)) {
                      try {
                        const { error } = await supabase
                          .from('trips')
                          .delete()
                          .eq('id', trip.id);
                        if (error) throw error;
                        await onTripsUpdated();
                      } catch (error) {
                        console.error('Error deleting trip:', error);
                        alert('Failed to delete trip');
                      }
                    }
                  }}
                  className="p-2 rounded-xl text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label={`Delete ${trip.title}`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TripPlanner
        isOpen={showTripDialog}
        tripId={editingTripId !== null ? String(editingTripId) : undefined}
        onClose={async () => {
          setShowTripDialog(false);
          setEditingTripId(null);
          await onTripsUpdated();
        }}
      />
    </div>
  );
}

