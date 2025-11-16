'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, MapPin, Calendar } from 'lucide-react';
import { Drawer } from './ui/Drawer';
import type { Trip, ItineraryItemNotes } from '@/types/trip';

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
    hotel: '',
    start_date: '',
    end_date: '',
    budget: '',
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
      if (!supabaseClient || !user) {
        throw new Error('Not authenticated');
      }

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
      // Try using the database function first (bypasses RLS recursion), fallback to direct query
      let nextDay = 1;
      let nextOrder = 0;

      try {
        // Try using the helper function first (if it exists)
        const { data: orderData, error: functionError } = await supabaseClient
          .rpc('get_next_itinerary_order', { p_trip_id: tripId });

        if (!functionError && orderData) {
          // Handle both array and single object responses
          const result = Array.isArray(orderData) ? orderData[0] : orderData;
          if (result && typeof result === 'object') {
            nextDay = result.next_day ?? 1;
            nextOrder = result.next_order ?? 0;
          }
        }
        
        // If function didn't work or returned no data, use fallback
        if (functionError || !orderData || (Array.isArray(orderData) && orderData.length === 0)) {
          // Fallback to direct query if function doesn't exist or fails
          const { data: existingItems, error: queryError } = await supabaseClient
            .from('itinerary_items')
            .select('day, order_index')
            .eq('trip_id', tripId)
            .order('day', { ascending: false })
            .order('order_index', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Only use the query result if it succeeded and returned data
          if (!queryError && existingItems) {
            nextDay = existingItems.day ?? 1;
            nextOrder = (existingItems.order_index ?? -1) + 1;
          } else if (queryError && queryError.code !== 'PGRST116') {
            // If it's not a "not found" error, log it but continue with defaults
            console.warn('Error querying itinerary items, using defaults:', queryError);
          }
        }
      } catch (queryErr: any) {
        // Catch any recursion or other errors and use defaults
        console.warn('Error getting next order, using defaults:', queryErr);
        nextDay = 1;
        nextOrder = 0;
      }

      // Prepare notes data with destination information
      const notesData: ItineraryItemNotes = {
        raw: '',
      };

      // Add destination to itinerary
      const insertData = {
        trip_id: tripId,
        destination_slug: destinationSlug || null, // Allow null if slug is not provided
        day: nextDay,
        order_index: nextOrder,
        title: destinationName,
        description: null, // TEXT field, can be null
        notes: JSON.stringify(notesData), // Store as JSON
      };

      console.log('Inserting itinerary item:', { ...insertData, notes: '[redacted]' });

      const { data: insertedItem, error: insertError } = await supabaseClient
        .from('itinerary_items')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('Insert error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
        });
        // Provide more specific error messages
        if (insertError.code === '23503') {
          throw new Error('Invalid trip. Please refresh and try again.');
        } else if (insertError.code === '42501') {
          throw new Error('Permission denied. You may not have access to add items to this trip.');
        } else if (insertError.code === '23514') {
          throw new Error('Invalid data. Please check that all required fields are provided.');
        } else if (insertError.message?.includes('infinite recursion') || insertError.message?.includes('recursion')) {
          throw new Error('Database error. Please try again or contact support if the issue persists.');
        } else {
          throw new Error(insertError.message || `Failed to add destination to trip. Error code: ${insertError.code || 'unknown'}`);
        }
      }

      if (!insertedItem) {
        throw new Error('Failed to add destination to trip. No data returned.');
      }

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
      setNewTrip({ title: '', description: '', destination: '', hotel: '', start_date: '', end_date: '', budget: '' });
      setShowCreateForm(false);
      await fetchTrips();
    } catch (error: any) {
      console.error('Error creating trip:', error);
      alert(error?.message || 'Failed to create trip. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  const formatDateForDisplay = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return null;
    }
  };

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const content = (
    <div className="px-6 py-6">
      {/* Pending Destination Info */}
      {destinationName && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Adding <span className="font-medium text-gray-900 dark:text-white">{destinationName}</span> to your trip
          </p>
        </div>
      )}

      {/* Existing Trips */}
      {!showCreateForm && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Your Trips</h3>
            {trips.length > 0 && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                + New Trip
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No trips yet</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:opacity-80 transition-opacity"
              >
                Create your first trip
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {trips.map((trip) => {
                const startDate = formatDateForDisplay(trip.start_date);
                const endDate = formatDateForDisplay(trip.end_date);
                return (
                  <button
                    key={trip.id}
                    onClick={() => handleAddToTrip(trip.id)}
                    disabled={adding === trip.id}
                    className="w-full text-left p-4 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate">
                          {trip.title}
                        </h4>
                        {(startDate || endDate || trip.destination) && (
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            {trip.destination && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {trip.destination}
                              </span>
                            )}
                            {(startDate || endDate) && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {startDate && endDate
                                  ? `${startDate} - ${endDate}`
                                  : startDate || endDate}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {adding === trip.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400 flex-shrink-0" />
                      ) : (
                        <span className="text-xs font-medium text-gray-900 dark:text-white flex-shrink-0">
                          Add
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create New Trip Form */}
      {showCreateForm && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">New Trip</h3>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewTrip({ title: '', description: '', destination: '', hotel: '', start_date: '', end_date: '', budget: '' });
              }}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-5">
            {/* Trip Name */}
            <div>
              <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                Trip Name
              </label>
              <input
                type="text"
                value={newTrip.title}
                onChange={(e) => setNewTrip({ ...newTrip, title: e.target.value })}
                placeholder="Summer in Paris"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
                autoFocus
              />
            </div>

            {/* Destination */}
            <div>
              <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                Destination
              </label>
              <input
                type="text"
                value={newTrip.destination}
                onChange={(e) => setNewTrip({ ...newTrip, destination: e.target.value })}
                placeholder="Paris, France"
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Start Date
                </label>
                <input
                  type="date"
                  value={newTrip.start_date}
                  onChange={(e) => setNewTrip({ ...newTrip, start_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                  End Date
                </label>
                <input
                  type="date"
                  value={newTrip.end_date}
                  onChange={(e) => setNewTrip({ ...newTrip, end_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:border-black dark:focus:border-white transition-colors text-sm"
                />
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateTrip}
              disabled={creating || !newTrip.title.trim()}
              className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Trip'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Add to Trip"
      desktopWidth="440px"
    >
      {content}
    </Drawer>
  );
}

