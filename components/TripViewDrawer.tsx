'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import {
  Calendar,
  MapPin,
  Edit2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { TripDay } from '@/components/TripDay';
import { AddLocationToTrip } from '@/components/AddLocationToTrip';
import type { Trip, ItineraryItem, ItineraryItemNotes } from '@/types/trip';

interface TripViewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TripViewDrawer({ isOpen, onClose, tripId, onEdit, onDelete }: TripViewDrawerProps) {
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [destinations, setDestinations] = useState<Map<string, Destination>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedDestination, setEditedDestination] = useState('');
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');
  const [savingChanges, setSavingChanges] = useState(false);

  useEffect(() => {
    if (isOpen && tripId) {
      fetchTripDetails();
    }
  }, [isOpen, tripId]);

  useEffect(() => {
    // Reset edit mode when drawer closes
    if (!isOpen) {
      setIsEditMode(false);
    }
  }, [isOpen]);

  const fetchTripDetails = async () => {
    if (!tripId) return;
    setLoading(true);

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Fetch trip details
      const { data: tripData, error: tripError } = await supabaseClient
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError || !tripData) {
        console.error('Error fetching trip:', tripError);
        return;
      }

      const trip = tripData as Trip;
      setTrip(trip);
      setEditedTitle(trip.title || '');
      setEditedDescription(trip.description || '');
      setEditedDestination(trip.destination || '');
      setEditedStartDate(trip.start_date || '');
      setEditedEndDate(trip.end_date || '');

      // Fetch itinerary items
      const { data: itemsData, error: itemsError } = await supabaseClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })
        .order('order_index', { ascending: true });

      if (itemsError) {
        console.error('Error fetching itinerary items:', itemsError);
      } else {
        setItineraryItems(itemsData || []);

        // Fetch destinations for items with destination_slug
        const slugs = (itemsData || [])
          .map((item: any) => item.destination_slug)
          .filter((slug: string | null) => slug !== null) as string[];

        if (slugs.length > 0) {
          const { data: destData, error: destError } = await supabaseClient
            .from('destinations')
            .select('*')
            .in('slug', slugs);

          if (!destError && destData) {
            const destMap = new Map<string, Destination>();
            destData.forEach((dest: any) => {
              destMap.set(dest.slug, dest);
            });
            setDestinations(destMap);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching trip details:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteItineraryItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item from the trip?')) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('itinerary_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItineraryItems(prev => prev.filter(item => item.id !== itemId));
      await fetchTripDetails();
    } catch (error) {
      console.error('Error deleting itinerary item:', error);
      alert('Failed to remove item. Please try again.');
    }
  };

  const handleDeleteTrip = async () => {
    if (!trip) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('trips')
        .delete()
        .eq('id', trip.id);

      if (error) throw error;

      onDelete?.();
      onClose();
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip. Please try again.');
    }
  };

  const handleSaveChanges = async () => {
    if (!trip || !user) return;

    try {
      setSavingChanges(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('trips')
        .update({
          title: editedTitle,
          description: editedDescription || null,
          destination: editedDestination || null,
          start_date: editedStartDate || null,
          end_date: editedEndDate || null,
        })
        .eq('id', trip.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setTrip({
        ...trip,
        title: editedTitle,
        description: editedDescription || null,
        destination: editedDestination || null,
        start_date: editedStartDate || null,
        end_date: editedEndDate || null,
      });

      setIsEditMode(false);
      onEdit?.();
    } catch (error) {
      console.error('Error updating trip:', error);
      alert('Failed to update trip. Please try again.');
    } finally {
      setSavingChanges(false);
    }
  };

  const handleCancelEdit = () => {
    if (!trip) return;
    setEditedTitle(trip.title || '');
    setEditedDescription(trip.description || '');
    setEditedDestination(trip.destination || '');
    setEditedStartDate(trip.start_date || '');
    setEditedEndDate(trip.end_date || '');
    setIsEditMode(false);
  };

  // Group items by day
  const itemsByDay = itineraryItems.reduce((acc, item) => {
    if (!acc[item.day]) {
      acc[item.day] = [];
    }
    acc[item.day].push(item);
    return acc;
  }, {} as Record<number, ItineraryItem[]>);

  // Calculate date for a specific day based on trip start_date
  const getDateForDay = (dayNumber: number): string => {
    if (!trip?.start_date) {
      const date = new Date();
      date.setDate(date.getDate() + dayNumber - 1);
      return date.toISOString().split('T')[0];
    }
    const startDate = new Date(trip.start_date);
    startDate.setDate(startDate.getDate() + dayNumber - 1);
    return startDate.toISOString().split('T')[0];
  };

  // Transform itinerary items to TripLocation format
  const transformItemsToLocations = (items: ItineraryItem[]) => {
    return items.map((item) => {
      const destination = item.destination_slug
        ? destinations.get(item.destination_slug)
        : null;

      // Parse notes for additional data
      let notesData: ItineraryItemNotes = {};
      if (item.notes) {
        try {
          notesData = JSON.parse(item.notes) as ItineraryItemNotes;
        } catch {
          notesData = { raw: item.notes };
        }
      }

      // Generate location ID from item ID for display, but store original item ID
      const locationId = parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now();

      return {
        id: locationId,
        _itemId: item.id, // Store original item ID for deletion
        name: destination?.name || item.title,
        city: destination?.city || notesData.city || '',
        category: destination?.category || item.description || '',
        image: destination?.image || notesData.image || '/placeholder-image.jpg',
        time: item.time || undefined,
        notes: notesData.raw || undefined,
        duration: notesData.duration || undefined,
      };
    });
  };

  const handleAddLocation = (dayNumber: number) => {
    setSelectedDay(dayNumber);
    setShowAddLocationModal(true);
  };

  const handleLocationAdded = async (location: {
    id: number;
    name: string;
    city: string;
    category: string;
    image: string;
    time?: string;
    notes?: string;
    duration?: number;
  }) => {
    if (!trip || selectedDay === null) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient || !user) return;

      // Get the next order_index for this day
      const { data: existingItems } = await supabaseClient
        .from('itinerary_items')
        .select('order_index')
        .eq('trip_id', trip.id)
        .eq('day', selectedDay)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = existingItems ? (existingItems.order_index || 0) + 1 : 0;

      // Store additional data in notes as JSON
      const notesData = {
        raw: location.notes || '',
        duration: location.duration,
        image: location.image,
        city: location.city,
        category: location.category,
      };

      // Add destination to itinerary
      const { error } = await supabaseClient
        .from('itinerary_items')
        .insert({
          trip_id: trip.id,
          destination_slug: location.name.toLowerCase().replace(/\s+/g, '-'),
          day: selectedDay,
          order_index: nextOrder,
          time: location.time || null,
          title: location.name,
          description: location.category,
          notes: JSON.stringify(notesData),
        });

      if (error) throw error;

      // Reload trip data
      await fetchTripDetails();
      setShowAddLocationModal(false);
      setSelectedDay(null);
    } catch (error) {
      console.error('Error adding location:', error);
      alert('Failed to add location. Please try again.');
    }
  };

  const handleRemoveLocation = async (locationId: number) => {
    // Find the item by matching the location ID transformation
    const item = itineraryItems.find(item => {
      const transformedId = parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now();
      return transformedId === locationId;
    });

    if (item) {
      await deleteItineraryItem(item.id);
    } else {
      console.error('Could not find item ID for location:', locationId);
      alert('Failed to find location to delete');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateForInput = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Build header with actions - Compact quickview design
  const headerContent = trip ? (
    <div className="flex items-center justify-between w-full">
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{trip.title}</h2>
      </div>
      {trip.user_id === user?.id && (
        <div className="flex items-center gap-1.5 ml-4">
          <button
            onClick={() => {
              onEdit?.();
            }}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Edit trip"
          >
            <Edit2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      )}
    </div>
  ) : undefined;

  const content = (
    <div className="px-5 py-5">
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400 mb-3" />
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading trip...</p>
        </div>
      ) : !trip ? (
        <div className="text-center py-12">
          <p className="text-xs text-gray-500 dark:text-gray-400">Trip not found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Trip Metadata - Compact View */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {trip.destination && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                <span>{trip.destination}</span>
              </div>
            )}
            {(trip.start_date || trip.end_date) && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDate(trip.start_date)}
                  {trip.end_date && ` – ${formatDate(trip.end_date)}`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                trip.status === 'planning' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
                trip.status === 'upcoming' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                trip.status === 'ongoing' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}>
                {trip.status}
              </span>
            </div>
          </div>

          {/* Itinerary by Day - Compact Quickview */}
          {Object.keys(itemsByDay).length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-8 text-center space-y-3">
              <MapPin className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-700" />
              <h3 className="text-xs font-medium text-gray-900 dark:text-white">No items yet</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No locations added to this trip yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(itemsByDay)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([day, items]) => {
                  const dayNumber = Number(day);
                  const dayDate = getDateForDay(dayNumber);
                  const locations = transformItemsToLocations(items);

                  return (
                    <div key={day} className="space-y-2">
                      {/* Day Header */}
                      <div className="flex items-center gap-2 pb-1 border-b border-gray-200 dark:border-gray-800">
                        <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
                          Day {dayNumber}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(dayDate)}
                        </span>
                      </div>
                      
                      {/* Locations List - Compact */}
                      <div className="space-y-1.5 pl-2">
                        {locations.map((location, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 py-1.5 text-xs"
                          >
                            <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600 mt-1.5" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {location.name}
                              </div>
                              {location.time && (
                                <div className="text-gray-500 dark:text-gray-400 text-[10px]">
                                  {location.time}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
        headerContent={headerContent}
        desktopWidth="480px"
        position="right"
        style="solid"
        zIndex={60}
        backdropOpacity="20"
      >
        {content}
      </Drawer>

      {/* Add Location Modal */}
      <AddLocationToTrip
        isOpen={trip !== null && selectedDay !== null}
        onAdd={handleLocationAdded}
        onClose={() => {
          setShowAddLocationModal(false);
          setSelectedDay(null);
        }}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Delete Trip</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{trip?.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  handleDeleteTrip();
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

