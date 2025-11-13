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
import { TripPlanner } from '@/components/TripPlanner';
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && tripId) {
      fetchTripDetails();
    }
  }, [isOpen, tripId]);

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

      return {
        id: parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now(),
        name: destination?.name || item.title,
        city: destination?.city || notesData.city || '',
        category: destination?.category || item.description || '',
        image: destination?.image || notesData.image || '/placeholder-image.jpg',
        time: item.time || undefined,
        notes: notesData.raw || undefined,
        cost: notesData.cost || undefined,
        duration: notesData.duration || undefined,
        mealType: notesData.mealType || undefined,
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
    cost?: number;
    duration?: number;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
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
        cost: location.cost,
        duration: location.duration,
        mealType: location.mealType,
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
    const itemId = itineraryItems.find(item => parseInt(item.id) === locationId)?.id;
    if (itemId) {
      await deleteItineraryItem(itemId);
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

  // Build header with actions
  const headerContent = trip ? (
    <div className="flex items-center justify-between w-full">
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white truncate">{trip.title}</h2>
        {trip.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{trip.description}</p>
        )}
      </div>
      {trip.user_id === user?.id && (
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => {
              setShowEditDialog(true);
              onClose();
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Edit trip"
          >
            <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            aria-label="Delete trip"
          >
            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
          </button>
        </div>
      )}
    </div>
  ) : undefined;

  const content = (
    <div className="px-6 py-6">
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading trip...</p>
        </div>
      ) : !trip ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">Trip not found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Trip Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            {trip.destination && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                <span>{trip.destination}</span>
              </div>
            )}
            {(trip.start_date || trip.end_date) && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {formatDate(trip.start_date)}
                  {trip.end_date && ` – ${formatDate(trip.end_date)}`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                trip.status === 'planning' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
                trip.status === 'upcoming' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                trip.status === 'ongoing' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}>
                {trip.status}
              </span>
            </div>
          </div>

          {/* Itinerary by Day */}
          {Object.keys(itemsByDay).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-6 py-12 text-center space-y-4">
              <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">No items yet</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Add destinations to this trip to start building your itinerary.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(itemsByDay)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([day, items]) => {
                  const dayNumber = Number(day);
                  const dayDate = getDateForDay(dayNumber);
                  const locations = transformItemsToLocations(items);

                  return (
                    <TripDay
                      key={day}
                      dayNumber={dayNumber}
                      date={dayDate}
                      locations={locations}
                      onAddLocation={() => handleAddLocation(dayNumber)}
                      onRemoveLocation={handleRemoveLocation}
                      onReorderLocations={async (reorderedLocations) => {
                        try {
                          const supabaseClient = createClient();
                          if (!supabaseClient || !user) return;

                          await supabaseClient
                            .from('itinerary_items')
                            .delete()
                            .eq('trip_id', tripId)
                            .eq('day', dayNumber);

                          const itemsToInsert = reorderedLocations.map((loc, idx) => {
                            const originalItem = items.find(
                              (item) => item.title === loc.name || item.destination_slug === loc.name.toLowerCase().replace(/\s+/g, '-')
                            );
                            
                            let notesData: ItineraryItemNotes = {};
                            if (originalItem?.notes) {
                              try {
                                notesData = JSON.parse(originalItem.notes) as ItineraryItemNotes;
                              } catch {
                                notesData = { raw: originalItem.notes };
                              }
                            }

                            const updatedNotes = JSON.stringify({
                              raw: loc.notes || notesData.raw || '',
                              cost: loc.cost || notesData.cost,
                              duration: loc.duration || notesData.duration,
                              mealType: loc.mealType || notesData.mealType,
                              image: loc.image || notesData.image,
                              city: loc.city || notesData.city,
                              category: loc.category || notesData.category,
                            });

                            return {
                              trip_id: tripId,
                              destination_slug: originalItem?.destination_slug || loc.name.toLowerCase().replace(/\s+/g, '-'),
                              day: dayNumber,
                              order_index: idx,
                              time: loc.time || originalItem?.time || null,
                              title: loc.name,
                              description: loc.category || originalItem?.description || '',
                              notes: updatedNotes,
                            };
                          });

                          if (itemsToInsert.length > 0) {
                            await supabaseClient
                              .from('itinerary_items')
                              .insert(itemsToInsert);
                          }

                          await fetchTripDetails();
                        } catch (error) {
                          console.error('Error reordering locations:', error);
                          alert('Failed to reorder locations. Please try again.');
                        }
                      }}
                      onDuplicateDay={async () => {
                        alert('Duplicate day feature coming soon');
                      }}
                      onOptimizeRoute={async () => {
                        alert('Route optimization feature coming soon');
                      }}
                    />
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
        desktopWidth="600px"
      >
        {content}
      </Drawer>

      {/* Add Location Modal */}
      {trip && selectedDay !== null && (
        <AddLocationToTrip
          onAdd={handleLocationAdded}
          onClose={() => {
            setShowAddLocationModal(false);
            setSelectedDay(null);
          }}
        />
      )}

      {/* Edit Dialog */}
      {showEditDialog && (
        <TripPlanner
          isOpen={showEditDialog}
          tripId={tripId}
          onClose={() => {
            setShowEditDialog(false);
            fetchTripDetails();
            onEdit?.();
          }}
        />
      )}

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

