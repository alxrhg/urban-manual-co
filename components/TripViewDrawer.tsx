'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';
import { Calendar, MapPin, Edit2, Trash2, Loader2, Compass } from 'lucide-react';
import { TripDay } from '@/components/TripDay';
import type { Trip, ItineraryItem, ItineraryItemNotes } from '@/types/trip';
import type { Destination } from '@/types/destination';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDestination, setEditedDestination] = useState('');
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');
  const [savingChanges, setSavingChanges] = useState(false);

  useEffect(() => {
    if (isOpen && tripId) fetchTripDetails();
  }, [isOpen, tripId]);

  useEffect(() => {
    if (!isOpen) setIsEditMode(false);
  }, [isOpen]);

  const fetchTripDetails = async () => {
    if (!tripId) return;
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: tripData } = await supabase.from('trips').select('*').eq('id', tripId).single();

      if (tripData) {
        const t = tripData as Trip;
        setTrip(t);
        setEditedTitle(t.title || '');
        setEditedDestination(t.destination || '');
        setEditedStartDate(t.start_date || '');
        setEditedEndDate(t.end_date || '');
      }

      const { data: itemsData } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })
        .order('order_index', { ascending: true });

      if (itemsData) {
        setItineraryItems(itemsData);
        const slugs = itemsData.map((i: any) => i.destination_slug).filter(Boolean) as string[];
        if (slugs.length > 0) {
          const { data: destData } = await supabase.from('destinations').select('*').in('slug', slugs);
          if (destData) {
            const map = new Map<string, Destination>();
            destData.forEach((d: any) => map.set(d.slug, d));
            setDestinations(map);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (!trip) return;
    try {
      const supabase = createClient();
      await supabase.from('trips').delete().eq('id', trip.id);
      onDelete?.();
      onClose();
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  const handleSaveChanges = async () => {
    if (!trip || !user) return;
    setSavingChanges(true);
    try {
      const supabase = createClient();
      await supabase.from('trips').update({
        title: editedTitle,
        destination: editedDestination || null,
        start_date: editedStartDate || null,
        end_date: editedEndDate || null,
      }).eq('id', trip.id).eq('user_id', user.id);

      setTrip({ ...trip, title: editedTitle, destination: editedDestination || null, start_date: editedStartDate || null, end_date: editedEndDate || null });
      setIsEditMode(false);
      onEdit?.();
    } catch (error) {
      console.error('Error updating trip:', error);
    } finally {
      setSavingChanges(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const itemsByDay = itineraryItems.reduce((acc, item) => {
    if (!acc[item.day]) acc[item.day] = [];
    acc[item.day].push(item);
    return acc;
  }, {} as Record<number, ItineraryItem[]>);

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

  const transformItemsToLocations = (items: ItineraryItem[]) => {
    return items.map((item) => {
      const dest = item.destination_slug ? destinations.get(item.destination_slug) : null;
      let notesData: ItineraryItemNotes = {};
      if (item.notes) try { notesData = JSON.parse(item.notes); } catch {}
      return {
        id: parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now(),
        name: dest?.name || item.title,
        city: dest?.city || notesData.city || '',
        category: dest?.category || item.description || '',
        image: dest?.image || notesData.image || '/placeholder-image.jpg',
        time: item.time || undefined,
      };
    });
  };

  const rightAccessory = trip?.user_id === user?.id && !isEditMode ? (
    <div className="flex items-center gap-1">
      <button onClick={() => setIsEditMode(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
        <Edit2 className="w-4 h-4 text-gray-500" />
      </button>
      <button onClick={() => setShowDeleteConfirm(true)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
        <Trash2 className="w-4 h-4 text-red-500" />
      </button>
    </div>
  ) : undefined;

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} desktopWidth="500px">
        <DrawerHeader
          title={trip?.title || 'Trip'}
          subtitle={trip?.destination || undefined}
          leftAccessory={<Compass className="h-5 w-5 text-gray-500" />}
          rightAccessory={rightAccessory}
        />

        <div className="overflow-y-auto max-h-[calc(100vh-8rem)] pb-16">
          {loading ? (
            <DrawerSection>
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Loading trip...</p>
              </div>
            </DrawerSection>
          ) : !trip ? (
            <DrawerSection>
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">Trip not found</p>
              </div>
            </DrawerSection>
          ) : isEditMode ? (
            <DrawerSection>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-2 text-gray-600">Title</label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2 text-gray-600">Destination</label>
                  <input
                    type="text"
                    value={editedDestination}
                    onChange={(e) => setEditedDestination(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
                    placeholder="Paris, London..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-2 text-gray-600">Start Date</label>
                    <input
                      type="date"
                      value={editedStartDate}
                      onChange={(e) => setEditedStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2 text-gray-600">End Date</label>
                    <input
                      type="date"
                      value={editedEndDate}
                      onChange={(e) => setEditedEndDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setIsEditMode(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm">
                    Cancel
                  </button>
                  <button onClick={handleSaveChanges} disabled={savingChanges} className="flex-1 bg-black text-white rounded-full px-4 py-2 text-sm">
                    {savingChanges ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </DrawerSection>
          ) : (
            <>
              {(trip.start_date || trip.destination) && (
                <DrawerSection bordered>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    {trip.destination && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {trip.destination}
                      </span>
                    )}
                    {trip.start_date && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(trip.start_date)}{trip.end_date && ` – ${formatDate(trip.end_date)}`}
                      </span>
                    )}
                  </div>
                </DrawerSection>
              )}

              {Object.keys(itemsByDay).length === 0 ? (
                <DrawerSection>
                  <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                    <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No items in this trip yet</p>
                  </div>
                </DrawerSection>
              ) : (
                <DrawerSection>
                  <div className="space-y-6">
                    {Object.entries(itemsByDay).sort(([a], [b]) => Number(a) - Number(b)).map(([day, items]) => (
                      <TripDay
                        key={day}
                        dayNumber={Number(day)}
                        date={getDateForDay(Number(day))}
                        locations={transformItemsToLocations(items)}
                      />
                    ))}
                  </div>
                </DrawerSection>
              )}
            </>
          )}
        </div>

        {!isEditMode && trip && (
          <DrawerActionBar>
            <button
              onClick={onEdit}
              className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full px-4 py-2.5 text-sm font-medium"
            >
              Open Full Trip
            </button>
          </DrawerActionBar>
        )}
      </Drawer>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-sm font-medium mb-2">Delete Trip?</h3>
            <p className="text-xs text-gray-500 mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 border rounded-full text-sm">
                Cancel
              </button>
              <button onClick={handleDeleteTrip} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-full text-sm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
