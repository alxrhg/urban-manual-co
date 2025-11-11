'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { X, Plus, Calendar, MapPin, Loader2 } from 'lucide-react';

interface Trip {
  id: string;
  title: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  cover_image: string | null;
  created_at: string;
}

interface AddToTripModalProps {
  destinationSlug: string;
  destinationName: string;
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (tripId: string) => void;
}

export function AddToTripModal({
  destinationSlug,
  destinationName,
  isOpen,
  onClose,
  onAdd,
}: AddToTripModalProps) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTrip, setNewTrip] = useState({
    title: '',
    description: '',
    destination: '',
    start_date: '',
    end_date: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchTrips();
    }
  }, [isOpen, user]);

  async function fetchTrips() {
    try {
      setLoading(true);
      const supabaseClient = createClient();
      if (!supabaseClient || !user) return;

      const { data, error } = await supabaseClient
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToTrip(tripId: string) {
    setAdding(tripId);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient || !user) return;

      // First verify the trip exists and belongs to the user
      const { data: trip, error: tripError } = await supabaseClient
        .from('trips')
        .select('id')
        .eq('id', tripId)
        .eq('user_id', user.id)
        .single();

      if (tripError || !trip) {
        throw new Error('Trip not found or you do not have permission to add items to this trip');
      }

      // Get the next day and order_index for this trip
      // Use a simpler query that avoids RLS recursion
      const { data: existingItems, error: queryError } = await supabaseClient
        .from('itinerary_items')
        .select('day, order_index')
        .eq('trip_id', tripId)
        .order('day', { ascending: false })
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();

      // If query error and it's not a "not found" error, throw it
      if (queryError && queryError.code !== 'PGRST116') {
        console.error('Error querying itinerary items:', queryError);
        // If it's a recursion error, use default values
        if (queryError.message && queryError.message.includes('infinite recursion')) {
          console.warn('RLS recursion detected, using default day/order');
        } else {
          throw queryError;
        }
      }

      const nextDay = existingItems ? (existingItems.day || 1) : 1;
      const nextOrder = existingItems ? (existingItems.order_index || 0) + 1 : 0;

      // Prepare notes data
      const notesData = {
        raw: '',
        cost: undefined,
        duration: undefined,
        mealType: undefined,
        image: undefined,
        city: undefined,
        category: undefined,
      };

      // Add destination to itinerary
      const { error } = await supabaseClient
        .from('itinerary_items')
        .insert({
          trip_id: tripId,
          destination_slug: destinationSlug,
          day: nextDay,
          order_index: nextOrder,
          title: destinationName,
          description: '', // Required field
          notes: JSON.stringify(notesData), // Store as JSON
        });

      if (error) throw error;

      if (onAdd) onAdd(tripId);
      onClose();
    } catch (error: any) {
      console.error('Error adding to trip:', error);
      const errorMessage = error?.message || 'Failed to add destination to trip. Please try again.';
      console.error('Full error details:', error);
      alert(errorMessage);
    } finally {
      setAdding(null);
    }
  }

  async function handleCreateTrip() {
    if (!newTrip.title.trim()) {
      alert('Please enter a trip title');
      return;
    }

    setCreating(true);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient || !user) return;

      const { data, error } = await (supabaseClient
        .from('trips')
        .insert as any)([
          {
            title: newTrip.title,
            description: newTrip.description || null,
            destination: newTrip.destination || null,
            start_date: newTrip.start_date || null,
            end_date: newTrip.end_date || null,
            status: 'planning',
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add destination to the newly created trip
      await handleAddToTrip(data.id);
      
      // Reset form
      setNewTrip({ title: '', description: '', destination: '', start_date: '', end_date: '' });
      setShowCreateForm(false);
      await fetchTrips();
    } catch (error: any) {
      console.error('Error creating trip:', error);
      alert(error?.message || 'Failed to create trip. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add to Trip
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Create New Trip Button */}
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create New Trip</span>
                </button>
              )}

              {/* Create Trip Form */}
              {showCreateForm && (
                <div className="mb-6 p-4 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Trip Title *
                      </label>
                      <input
                        type="text"
                        value={newTrip.title}
                        onChange={(e) => setNewTrip({ ...newTrip, title: e.target.value })}
                        placeholder="e.g., Summer in Paris"
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={newTrip.description}
                        onChange={(e) => setNewTrip({ ...newTrip, description: e.target.value })}
                        placeholder="Optional description"
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowCreateForm(false);
                          setNewTrip({ title: '', description: '', destination: '', start_date: '', end_date: '' });
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateTrip}
                        disabled={creating || !newTrip.title.trim()}
                        className="flex-1 px-3 py-2 text-sm bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                      >
                        {creating ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Creating...
                          </span>
                        ) : (
                          'Create & Add'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Trips List */}
              {trips.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No trips yet. Create your first trip to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trips.map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => handleAddToTrip(trip.id)}
                      disabled={adding === trip.id}
                      className="w-full text-left p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                            {trip.title}
                          </h3>
                          {trip.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                              {trip.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            {trip.destination && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {trip.destination}
                              </span>
                            )}
                            {(trip.start_date || trip.end_date) && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {trip.start_date && trip.end_date
                                  ? `${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}`
                                  : trip.start_date
                                  ? new Date(trip.start_date).toLocaleDateString()
                                  : trip.end_date
                                  ? new Date(trip.end_date).toLocaleDateString()
                                  : null}
                              </span>
                            )}
                          </div>
                        </div>
                        {adding === trip.id && (
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400 ml-2" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

