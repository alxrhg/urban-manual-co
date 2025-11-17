'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import {
  Calendar,
  MapPin,
  Edit2,
  Trash2,
  Loader2,
  ArrowLeft,
  Share2,
  Link2,
  Globe,
  PlaneTakeoff,
  PlaneLanding,
  UserPlus,
  Send,
  Users,
  Plus,
  StickyNote,
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
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

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

  const maxDayFromItems = itineraryItems.reduce((max, item) => Math.max(max, item.day), 0);
  const dayCountFromDates = (() => {
    if (!trip?.start_date || !trip?.end_date) return 0;
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diff = Math.max(0, end.getTime() - start.getTime());
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
  })();
  const computedDayCount = Math.max(maxDayFromItems, dayCountFromDates, 1);
  const dayNumbers = Array.from({ length: computedDayCount }, (_, index) => index + 1);
  const totalDays = dayNumbers.length;
  const totalStops = itineraryItems.length;
  const coverImageUrl = trip?.cover_image || '/placeholder-image.jpg';
  const shareCode = trip ? trip.id.slice(0, 5).toUpperCase() : '-----';
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/trips/${tripId}` : '';
  const uniqueCities = new Set<string>();
  itineraryItems.forEach((item) => {
    const destinationData = item.destination_slug ? destinations.get(item.destination_slug) : null;
    if (destinationData?.city) {
      uniqueCities.add(destinationData.city);
    }
  });
  if (trip?.destination) {
    trip.destination
      .split(',')
      .map((city) => city.trim())
      .filter(Boolean)
      .forEach((city) => uniqueCities.add(city));
  }
  const visitingCities = Array.from(uniqueCities).slice(0, 3).join(', ');
  const dateRangeLabel = trip?.start_date && trip?.end_date ? `${formatDate(trip.start_date)} – ${formatDate(trip.end_date)}` : null;
  const tripStatusLabel = trip?.status ? trip.status.replace(/_/g, ' ') : 'Planning';
  const memoPlaceholder = 'Leave yourself a quick note for this trip – packing reminders, mood boards, or restaurant lists.';
  const overviewStats = [
    { label: 'Days', value: totalDays > 0 ? `${totalDays}` : 'Add dates' },
    { label: 'Stops', value: totalStops > 0 ? `${totalStops}` : '0 planned' },
    { label: 'Status', value: tripStatusLabel },
  ];
  const parseNotesData = (notes?: string | null): ItineraryItemNotes => {
    if (!notes) return {};
    try {
      return JSON.parse(notes) as ItineraryItemNotes;
    } catch {
      return { raw: notes };
    }
  };

  const getFlightCity = (place?: any) => {
    if (!place) return '';
    if (typeof place === 'string') return place;
    return place.city || place.name || place.code || '';
  };

  const flightItems = itineraryItems
    .map((item) => {
      const notesData = parseNotesData(item.notes);
      const description = item.description?.toLowerCase() ?? '';
      const looksLikeFlight =
        description.includes('flight') ||
        description.includes('airport') ||
        Boolean(notesData.flightNumber || notesData.from || notesData.to);
      if (!looksLikeFlight) return null;
      return { item, notesData };
    })
    .filter(Boolean) as { item: ItineraryItem; notesData: ItineraryItemNotes }[];

  const departureFlight = flightItems[0];
  const returnFlight = flightItems.length > 1 ? flightItems[flightItems.length - 1] : flightItems[0];

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
      const notesData = parseNotesData(item.notes);

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
    setShowDayPicker(false);
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

  const handleVisibilityToggle = async (nextValue: boolean) => {
    if (!trip || !user) return;

    try {
      setUpdatingVisibility(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('trips')
        .update({ is_public: nextValue })
        .eq('id', trip.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTrip((prev) => (prev ? { ...prev, is_public: nextValue } : prev));
      setShareMessage(nextValue ? 'Trip is now public' : 'Trip kept private');
      setTimeout(() => setShareMessage(null), 2500);
    } catch (error) {
      console.error('Error updating trip visibility:', error);
      alert('Unable to update trip visibility. Please try again.');
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        throw new Error('Clipboard not available');
      }
      setShareMessage('Share link copied');
      setTimeout(() => setShareMessage(null), 2500);
    } catch (error) {
      console.error('Error copying link:', error);
      alert('Unable to copy link. Please try again or copy it manually.');
    }
  };

  const handleShareAction = (message: string) => {
    setShareMessage(message);
    setTimeout(() => setShareMessage(null), 2000);
  };

  const handleDayPickerSelect = (dayNumber: number) => {
    handleAddLocation(dayNumber);
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

  const renderFlightTicket = (
    label: string,
    flight?: { item: ItineraryItem; notesData: ItineraryItemNotes },
    icon?: React.ReactNode,
  ) => {
    const defaultDate = flight ? getDateForDay(flight.item.day) : null;
    const formattedDate = defaultDate ? formatDate(defaultDate) : null;
    const fromCity = flight ? getFlightCity(flight.notesData.from) : '';
    const toCity = flight ? getFlightCity(flight.notesData.to) : '';
    const route = fromCity && toCity
      ? `${fromCity} → ${toCity}`
      : visitingCities || trip?.destination || 'Add route';
    const flightNumber = flight?.notesData.flightNumber || flight?.item.title || 'Add flight number';
    const airline = flight?.notesData.airline || flight?.notesData.raw || 'Airline TBD';
    const time = flight?.notesData.departureTime || flight?.notesData.arrivalTime || flight?.item.time;

    return (
      <div className="rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-white dark:bg-gray-950/80 p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-blue-600 dark:text-blue-300">
          <div className="flex items-center gap-2">
            {icon}
            <span>{label}</span>
          </div>
          <span>{formattedDate || 'Set date'}</span>
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">{route}</p>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{flightNumber}</span>
            <span>{time || 'Add time'}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{airline}</p>
        </div>
      </div>
    );
  };

  // Build header with actions
  const headerContent = trip ? (
    <div className="flex items-center gap-3 w-full">
      <button
        onClick={onClose}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
        aria-label="Close trip drawer"
      >
        <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
      <div className="flex-1 text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500">information</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{trip.title}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleCopyShareLink}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
          aria-label="Copy share link"
        >
          <Share2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
        {trip.user_id === user?.id && (
          <div className="flex items-center gap-1">
            {isEditMode ? (
              <>
                <button
                  onClick={handleSaveChanges}
                  disabled={savingChanges || !editedTitle.trim()}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900 transition-colors disabled:opacity-50"
                >
                  {savingChanges ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={savingChanges}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                  aria-label="Edit trip"
                >
                  <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  aria-label="Delete trip"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
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
        <div className="space-y-6 pb-12">
          {isEditMode && (
            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-xs text-blue-700 dark:text-blue-200">
              <strong className="font-semibold">Edit mode:</strong> Update trip info, logistics, and itinerary items. Don’t forget to save when you’re done.
            </div>
          )}

          <section className="rounded-3xl border border-amber-100 dark:border-gray-800 bg-[#f9f5ef] dark:bg-gray-950/60 p-5 space-y-5">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.35em] text-amber-700/70">Trip title</p>
              {isEditMode ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-2 text-lg border border-amber-200 rounded-2xl bg-white/80 focus:outline-none focus:border-amber-500"
                  placeholder="Name this adventure"
                />
              ) : (
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white leading-snug">{trip.title}</h2>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-amber-900/70">
                {dateRangeLabel ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80">
                    <Calendar className="w-3.5 h-3.5" />
                    {dateRangeLabel}
                  </span>
                ) : (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 text-amber-800"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Add timeframe
                  </button>
                )}
                {visitingCities && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80">
                    <MapPin className="w-3.5 h-3.5" />
                    {visitingCities}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-amber-700/70">Departure</p>
                {isEditMode ? (
                  <input
                    type="date"
                    value={formatDateForInput(editedStartDate)}
                    onChange={(e) => setEditedStartDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-2xl border border-amber-200 bg-white/90 focus:outline-none focus:border-amber-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(editedStartDate) || 'Add date'}</p>
                )}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-amber-700/70">Return</p>
                {isEditMode ? (
                  <input
                    type="date"
                    value={formatDateForInput(editedEndDate)}
                    onChange={(e) => setEditedEndDate(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-2xl border border-amber-200 bg-white/90 focus:outline-none focus:border-amber-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(editedEndDate) || 'Add date'}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <p className="text-[11px] uppercase tracking-[0.3em] text-amber-700/70">Cities</p>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editedDestination}
                    onChange={(e) => setEditedDestination(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-2xl border border-amber-200 bg-white/90 focus:outline-none focus:border-amber-500"
                    placeholder="Seoul, Busan, Tokyo"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{trip.destination || 'Add cities'}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {overviewStats.map((stat) => (
                <div
                  key={stat.label}
                  className="px-4 py-2 rounded-full bg-white/80 text-xs tracking-[0.2em] uppercase text-amber-800/80"
                >
                  <span className="block text-[10px] text-amber-400">{stat.label}</span>
                  <span className="text-base font-semibold tracking-normal">{stat.value}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">Members</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{shareCode}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Share this code to co-plan with friends.</p>
                </div>
                <div className="flex -space-x-2">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-[11px] text-gray-600 dark:text-gray-300">
                    You
                  </div>
                  <div className="w-10 h-10 rounded-full border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-lg text-gray-400">
                    +
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleShareAction('Invite flow coming soon')}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-700 dark:text-gray-200"
              >
                Invite followers
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </section>

            <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">Cover</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Set the vibe for this trip.</p>
                </div>
                <button
                  onClick={() => handleShareAction('Cover uploads coming soon')}
                  className="text-xs uppercase tracking-[0.3em] text-gray-500 hover:text-gray-900 dark:hover:text-white"
                >
                  Edit
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden border border-dashed border-gray-300 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40">
                <img src={coverImageUrl} alt={`${trip.title} cover art`} className="w-full h-48 object-cover" />
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-blue-200 dark:border-blue-900/40 bg-gradient-to-br from-blue-50 via-white to-white dark:from-blue-950/40 dark:via-gray-950 dark:to-gray-950 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-blue-500">Flight</p>
                <p className="text-xs text-blue-800/70 dark:text-blue-200">Track departure & return tickets here.</p>
              </div>
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <div className="space-y-3">
              {renderFlightTicket('Departure', departureFlight, <PlaneTakeoff className="w-4 h-4" />)}
              {renderFlightTicket('Return', returnFlight, <PlaneLanding className="w-4 h-4" />)}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">Memo</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Quick notes, reminders, or inspiration.</p>
              </div>
              {!isEditMode && trip.user_id === user?.id && (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900"
                >
                  <StickyNote className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
            {isEditMode ? (
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-900/50 focus:outline-none focus:border-gray-500 text-sm"
                placeholder={memoPlaceholder}
              />
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {trip.description?.trim() || memoPlaceholder}
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">Share Trip Itinerary with friends</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Sharing lets friends view this plan. Invite collaborators or send a read-only link.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleShareAction('Invite followers coming soon')}
                className="flex items-center justify-between px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl text-left"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Invite followers</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">Send the itinerary link to your circle.</p>
                </div>
                <Users className="w-5 h-5 text-gray-400" />
              </button>
              <button
                onClick={() => handleShareAction('Send to friends coming soon')}
                className="flex items-center justify-between px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl text-left"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Send to friends</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">Drop it in chat, SMS, or email.</p>
                </div>
                <Send className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-full text-xs uppercase tracking-[0.3em] text-gray-600 dark:text-gray-300"
              >
                <Link2 className="w-4 h-4" /> Copy share link
              </button>
              {shareMessage && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{shareMessage}</span>
              )}
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">Publish this Trip Itinerary</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  When enabled, friends can view this trip over its full timeline.
                </p>
                <a
                  className="text-[11px] text-gray-600 dark:text-gray-300 underline"
                  href="/trips"
                  target="_blank"
                  rel="noreferrer"
                >
                  See public Trip Itineraries for ideas.
                </a>
              </div>
              <button
                role="switch"
                aria-checked={trip.is_public}
                onClick={() => handleVisibilityToggle(!trip.is_public)}
                disabled={updatingVisibility}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  trip.is_public ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                } ${updatingVisibility ? 'opacity-60' : ''}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    trip.is_public ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setShowDayPicker((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-sm text-gray-700 dark:text-gray-200"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add item to Trip Itinerary
                </span>
                <span className="text-[11px] uppercase tracking-[0.3em] text-gray-400">{showDayPicker ? 'Close' : 'Choose day'}</span>
              </button>
              {showDayPicker && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {dayNumbers.map((dayNumber) => (
                    <button
                      key={dayNumber}
                      onClick={() => handleDayPickerSelect(dayNumber)}
                      className="px-3 py-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 text-xs text-gray-600 dark:text-gray-300"
                    >
                      Day {dayNumber}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">Daily itinerary</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Plan each day with places, flights, and notes.</p>
              </div>
            </div>
            {totalStops === 0 && !isEditMode ? (
              <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-6 py-10 text-center space-y-3">
                <MapPin className="w-6 h-6 mx-auto text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-300">No itinerary items yet.</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Switch to edit mode to start adding your favorite spots.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {dayNumbers.map((dayNumber) => {
                  const items = itemsByDay[dayNumber] || [];
                  const dayDate = getDateForDay(dayNumber);
                  const locations = transformItemsToLocations(items);

                  return (
                    <div key={dayNumber} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
                      <TripDay
                        dayNumber={dayNumber}
                        date={dayDate}
                        locations={locations}
                        onAddLocation={isEditMode ? () => handleAddLocation(dayNumber) : undefined}
                        onRemoveLocation={isEditMode ? handleRemoveLocation : undefined}
                        onReorderLocations={isEditMode ? async (reorderedLocations) => {
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

                              const notesData = originalItem?.notes ? parseNotesData(originalItem.notes) : {};

                              const updatedNotes = JSON.stringify({
                                raw: loc.notes || notesData.raw || '',
                                duration: loc.duration || notesData.duration,
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
                        } : undefined}
                        onDuplicateDay={isEditMode ? async () => {
                          alert('Duplicate day feature coming soon');
                        } : undefined}
                        onOptimizeRoute={isEditMode ? async () => {
                          alert('Route optimization feature coming soon');
                        } : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
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

