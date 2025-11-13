'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { X, Plus, Loader2 } from 'lucide-react';
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

  if (!isOpen) return null;

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const formatDateForDisplay = (dateString: string | null) => {
    if (!dateString) return 'Dates not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch {
      return 'Dates not set';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 text-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between z-10">
        <h2 className="text-[11px] text-gray-400 tracking-[0.2em] uppercase">NEW TRIP</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-300" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-w-2xl mx-auto">
        {/* Pending Destination Banner */}
        {destinationName && (
          <div className="mb-8 px-4 py-3 bg-gray-900 rounded-xl border border-gray-800">
            <p className="text-sm text-gray-300">
              We'll add <span className="font-medium text-white">{destinationName}</span> once you choose a trip.
            </p>
          </div>
        )}

        {/* Continue Planning Existing Trip Section */}
        {!showCreateForm && (
          <div className="mb-12">
            <h3 className="text-[11px] text-gray-400 tracking-[0.2em] uppercase mb-4">
              CONTINUE PLANNING AN EXISTING TRIP
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : trips.length === 0 ? (
              <p className="text-sm text-gray-500">No existing trips. Create a new trip below.</p>
            ) : (
              <div className="space-y-3">
                {trips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="text-white font-medium mb-1">{trip.title}</h4>
                      <p className="text-xs text-gray-400">
                        {trip.start_date && trip.end_date
                          ? `${formatDateForDisplay(trip.start_date)} - ${formatDateForDisplay(trip.end_date)}`
                          : trip.start_date
                          ? formatDateForDisplay(trip.start_date)
                          : trip.end_date
                          ? formatDateForDisplay(trip.end_date)
                          : 'Dates not set'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddToTrip(trip.id)}
                      disabled={adding === trip.id}
                      className="px-4 py-2 text-sm font-medium text-white hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {adding === trip.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'OPEN'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* New Trip Form */}
        <div>
          <h3 className="text-[11px] text-gray-400 tracking-[0.2em] uppercase mb-6">
            {showCreateForm ? 'NEW TRIP' : 'CREATE NEW TRIP'}
          </h3>

          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full py-4 border-2 border-dashed border-gray-800 rounded-xl text-gray-400 hover:border-gray-700 hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Trip</span>
            </button>
          ) : (
            <div className="space-y-6">
              {/* Trip Name */}
              <div>
                <label className="block text-[11px] text-gray-400 tracking-[0.2em] uppercase mb-2">
                  TRIP NAME
                </label>
                <input
                  type="text"
                  value={newTrip.title}
                  onChange={(e) => setNewTrip({ ...newTrip, title: e.target.value })}
                  placeholder="Summer in Paris"
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                  autoFocus
                />
              </div>

              {/* Destination */}
              <div>
                <label className="block text-[11px] text-gray-400 tracking-[0.2em] uppercase mb-2">
                  DESTINATION
                </label>
                <input
                  type="text"
                  value={newTrip.destination}
                  onChange={(e) => setNewTrip({ ...newTrip, destination: e.target.value })}
                  placeholder="milan"
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                />
              </div>

              {/* Hotel / Base Location */}
              <div>
                <label className="block text-[11px] text-gray-400 tracking-[0.2em] uppercase mb-2">
                  HOTEL / BASE LOCATION (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={newTrip.hotel}
                  onChange={(e) => setNewTrip({ ...newTrip, hotel: e.target.value })}
                  placeholder="Hotel Le Marais"
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-[11px] text-gray-400 tracking-[0.2em] uppercase mb-2">
                  START DATE
                </label>
                <input
                  type="date"
                  value={newTrip.start_date}
                  onChange={(e) => setNewTrip({ ...newTrip, start_date: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-gray-800 text-white focus:outline-none focus:border-gray-600 transition-colors"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[11px] text-gray-400 tracking-[0.2em] uppercase mb-2">
                  END DATE
                </label>
                <input
                  type="date"
                  value={newTrip.end_date}
                  onChange={(e) => setNewTrip({ ...newTrip, end_date: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-gray-800 text-white focus:outline-none focus:border-gray-600 transition-colors"
                />
              </div>

              {/* Total Budget */}
              <div>
                <label className="block text-[11px] text-gray-400 tracking-[0.2em] uppercase mb-2">
                  TOTAL BUDGET (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={newTrip.budget}
                  onChange={(e) => setNewTrip({ ...newTrip, budget: e.target.value })}
                  placeholder="$0"
                  className="w-full px-0 py-2 bg-transparent border-0 border-b border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTrip({ title: '', description: '', destination: '', hotel: '', start_date: '', end_date: '', budget: '' });
                  }}
                  className="flex-1 px-4 py-3 border border-gray-800 rounded-xl text-gray-300 hover:bg-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTrip}
                  disabled={creating || !newTrip.title.trim()}
                  className="flex-1 px-4 py-3 bg-white text-gray-950 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {creating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Trip'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

