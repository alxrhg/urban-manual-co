'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/components/ui/Drawer';
import { TripPlanner } from '@/components/TripPlanner';
import { Plus, MapPin, Calendar, Edit2, Trash2 } from 'lucide-react';

interface TripsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TripsDrawer({ isOpen, onClose }: TripsDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTripDialog, setShowTripDialog] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchTrips();
    }
  }, [isOpen, fetchTrips]);

  const deleteTrip = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('trips')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchTrips();
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const content = (
    <div className="px-6 py-6">
      {loading ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <button
            onClick={() => {
              setEditingTripId(null);
              setShowTripDialog(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            <span>New Trip</span>
          </button>

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
            <div className="space-y-4">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex flex-col border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden"
                >
                  <div className="relative h-24 bg-gradient-to-r from-blue-500 to-purple-600">
                    {trip.cover_image && (
                      <img src={trip.cover_image} alt={trip.title} className="h-full w-full object-cover" />
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="bg-blue-200 dark:bg-blue-900/30 text-white text-xs px-2 py-0.5 rounded-full font-medium capitalize">
                        {trip.status || 'planning'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-sm mb-2 line-clamp-2 text-black dark:text-white">{trip.title}</h3>
                    {trip.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{trip.description}</p>
                    )}
                    <div className="space-y-1 text-xs text-gray-400 mb-4">
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
                            {formatDate(trip.start_date)}
                            {trip.end_date && ` – ${formatDate(trip.end_date)}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                      <button
                        onClick={() => {
                          onClose();
                          setTimeout(() => router.push(`/trips/${trip.id}`), 300);
                        }}
                        className="flex-1 text-xs font-medium py-2 px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-black dark:text-white"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setEditingTripId(trip.id);
                          setShowTripDialog(true);
                        }}
                        className="p-2 rounded-xl text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label={`Edit ${trip.title}`}
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteTrip(trip.id, trip.title)}
                        className="p-2 rounded-xl text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                        aria-label={`Delete ${trip.title}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Trips"
      >
        {content}
      </Drawer>
      <TripPlanner
        isOpen={showTripDialog}
        tripId={editingTripId || undefined}
        onClose={() => {
          setShowTripDialog(false);
          setEditingTripId(null);
          fetchTrips();
        }}
      />
    </>
  );
}

