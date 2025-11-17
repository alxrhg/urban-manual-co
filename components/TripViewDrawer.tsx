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
  const designTokens = {
    surface: {
      base: 'bg-[#f6f1e9] dark:bg-gray-950',
      card: 'bg-white/80 dark:bg-gray-950/60',
      accent: 'bg-gradient-to-br from-[#f9efe1] via-[#f4f0ff] to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-900',
      muted: 'bg-white/60 dark:bg-gray-900/60',
    },
    border: 'border border-[#e7ddcf] dark:border-gray-800',
    label: 'text-[11px] uppercase tracking-[0.35em] text-[#7d6755] dark:text-gray-400',
  } as const;
  const heroAnchors = [
    { label: 'Cities', value: visitingCities || trip?.destination || 'Drop a city' },
    { label: 'Dates', value: dateRangeLabel ?? 'Pick dates' },
    { label: 'Status', value: tripStatusLabel },
  ];
  const tripLastTouched = formatRelativeTime(trip?.updated_at);
  const flowSteps = [
    {
      id: 'shape',
      label: 'Shape the vibe',
      description: 'Name the trip and anchor the experience.',
      done: Boolean(editedTitle.trim() && (trip?.destination || visitingCities)),
      accent: 'from-amber-200/70 to-amber-100/20',
    },
    {
      id: 'crew',
      label: 'Invite your crew',
      description: 'Share a code, toggle visibility, or DM a link.',
      done: Boolean(trip?.is_public || shareMessage),
      accent: 'from-blue-200/60 to-indigo-100/20',
    },
    {
      id: 'timeline',
      label: 'Build the days',
      description: 'Drop must-do stops into each day.',
      done: itineraryItems.length > 0,
      accent: 'from-emerald-200/60 to-emerald-100/20',
    },
  ];
  const shareIntents = [
    {
      title: 'Invite followers',
      body: 'Send the latest itinerary drop to your circle.',
      icon: Users,
      action: () => handleShareAction('Invite flow coming soon'),
    },
    {
      title: 'Send to friends',
      body: 'Push to chat, SMS, or email with one click.',
      icon: Send,
      action: () => handleShareAction('Send to friends coming soon'),
    },
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
  const insightCards = [
    {
      label: 'Cities tracked',
      value: uniqueCities.size > 0 ? `${uniqueCities.size} city${uniqueCities.size > 1 ? 'ies' : ''}` : 'Add cities',
      helper: 'Auto-detected from itinerary items and trip destination.',
    },
    {
      label: 'Flights logged',
      value: flightItems.length > 0 ? `${flightItems.length} saved` : 'Log a flight',
      helper: 'Keep departure + return tickets inside this doc.',
    },
    {
      label: 'Last edit',
      value: tripLastTouched,
      helper: `${totalDays || 0} day plan • ${totalStops} stops`,
    },
  ];

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

  function formatDate(dateStr: string | null) {
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
  }

  function formatDateForInput(dateStr: string | null) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  function formatRelativeTime(dateStr?: string | null) {
    if (!dateStr) return 'moments ago';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return 'moments ago';
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.round(diffMs / (1000 * 60));
    if (minutes < 1) return 'moments ago';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.round(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.round(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.round(days / 365);
    return `${years}y ago`;
  }

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
    <div className="flex w-full items-center gap-3">
      <button
        onClick={onClose}
        className="p-2 rounded-full bg-white/60 dark:bg-gray-900/60 border border-white/80 dark:border-gray-800 shadow-sm text-gray-600 dark:text-gray-200 hover:bg-white"
        aria-label="Close trip drawer"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-gray-400 dark:text-gray-500">
          <span>Trip workspace</span>
          <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-300">{tripStatusLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{trip.title || 'Untitled trip'}</p>
          <span className="text-xs text-gray-500 dark:text-gray-400">{totalDays || 0} days • {totalStops} stops</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleCopyShareLink}
          className="p-2 rounded-full bg-white/80 dark:bg-gray-900/60 border border-white/80 dark:border-gray-800 text-gray-600 dark:text-gray-200 hover:bg-white"
          aria-label="Copy share link"
        >
          <Share2 className="w-4 h-4" />
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
                  className="p-2 rounded-full bg-white/80 dark:bg-gray-900/60 border border-white/80 dark:border-gray-800 text-gray-600 dark:text-gray-200 hover:bg-white"
                  aria-label="Edit trip"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-full bg-red-50/80 dark:bg-red-900/30 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-300 hover:bg-red-100"
                  aria-label="Delete trip"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  ) : undefined;

  const content = (
    <div className="px-5 py-6">
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
        <div className="space-y-8 pb-16">
          {isEditMode && (
            <div className="rounded-3xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/80 dark:bg-blue-950/30 px-4 py-3 text-xs text-blue-900 dark:text-blue-100">
              <strong className="font-semibold">Edit mode</strong> — Live inputs unlock across this drawer. Save before leaving so the crew sees the updates.
            </div>
          )}

          <section className={`relative overflow-hidden rounded-[32px] ${designTokens.border} ${designTokens.surface.accent} p-6 space-y-6`}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/40 blur-3xl" />
              <div className="absolute left-10 bottom-0 h-32 w-32 rounded-full bg-amber-100/60 blur-2xl" />
            </div>
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row">
              <div className="flex-1 space-y-5">
                <div className="space-y-3">
                  <p className={designTokens.label}>Trip identity</p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full rounded-3xl border border-white/70 bg-white/80 px-4 py-3 text-lg font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                      placeholder="Name this trip"
                    />
                  ) : (
                    <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">{trip.title || 'Name this trip'}</h2>
                  )}
                  <p className="text-sm text-gray-700/80 dark:text-gray-200">
                    {trip.description?.trim() || 'Give the crew a vibe line so everyone knows what this journey is about.'}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <p className={designTokens.label}>Depart</p>
                    {isEditMode ? (
                      <input
                        type="date"
                        value={formatDateForInput(editedStartDate)}
                        onChange={(e) => setEditedStartDate(e.target.value)}
                        className="w-full rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(editedStartDate) || 'Add date'}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className={designTokens.label}>Return</p>
                    {isEditMode ? (
                      <input
                        type="date"
                        value={formatDateForInput(editedEndDate)}
                        onChange={(e) => setEditedEndDate(e.target.value)}
                        className="w-full rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(editedEndDate) || 'Add date'}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className={designTokens.label}>Cities</p>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editedDestination}
                        onChange={(e) => setEditedDestination(e.target.value)}
                        className="w-full rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                        placeholder="Seoul, Busan, Tokyo"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{trip.destination || 'Add cities'}</p>
                    )}
                  </div>
                </div>
                {!isEditMode && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {heroAnchors.map((anchor) => (
                      <div key={anchor.label} className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">{anchor.label}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-900">{anchor.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  {overviewStats.map((stat) => (
                    <div key={stat.label} className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-left">
                      <span className="block text-[10px] uppercase tracking-[0.3em] text-amber-500">{stat.label}</span>
                      <span className="text-base font-semibold text-gray-900">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full max-w-sm space-y-4">
                <div className="rounded-[28px] border border-white/70 bg-white/80 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={designTokens.label}>Crew code</p>
                      <p className="text-3xl font-semibold tracking-[0.2em] text-gray-900">{shareCode}</p>
                      <p className="text-xs text-gray-500">Drop in chat to bring friends into the board.</p>
                    </div>
                    <div className="flex -space-x-2">
                      <div className="h-10 w-10 rounded-full border border-white/80 bg-gray-100 text-[11px] text-gray-600 flex items-center justify-center">You</div>
                      <div className="h-10 w-10 rounded-full border border-dashed border-gray-300 text-lg text-gray-400 flex items-center justify-center">+</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-[28px] border border-white/80 bg-white overflow-hidden shadow-sm">
                  <div className="relative">
                    <img src={coverImageUrl} alt={`${trip.title} cover art`} className="h-48 w-full object-cover" />
                    <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 text-xs text-gray-700">
                      <span>Trip moodboard</span>
                      <button
                        onClick={() => handleShareAction('Cover uploads coming soon')}
                        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.3em] text-gray-500"
                      >
                        Edit
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={`rounded-[28px] ${designTokens.border} ${designTokens.surface.muted} p-5 space-y-4`}>
            <div className="flex flex-col gap-3">
              <p className={designTokens.label}>Flow</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Design system steps for this trip</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {flowSteps.map((step) => (
                <div key={step.id} className={`rounded-2xl border border-white/80 bg-gradient-to-br ${step.accent} p-4`}>
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-200">
                    <span className="font-semibold">{step.label}</span>
                    <span className={step.done ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>
                      {step.done ? 'Ready' : 'Open'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-200">{step.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.4fr,0.6fr]">
            <div className={`rounded-[28px] ${designTokens.border} ${designTokens.surface.card} p-6 space-y-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={designTokens.label}>Share & crew</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">Move from inspiration to collaboration</p>
                </div>
                <UserPlus className="h-5 w-5 text-gray-400" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {shareIntents.map((intent) => (
                  <button
                    key={intent.title}
                    onClick={intent.action}
                    className="flex items-center justify-between rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white/70 px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-200"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{intent.title}</p>
                      <p>{intent.body}</p>
                    </div>
                    <intent.icon className="h-5 w-5 text-gray-400" />
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCopyShareLink}
                  className="inline-flex items-center gap-2 rounded-full border border-dashed border-gray-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-600"
                >
                  <Link2 className="h-4 w-4" /> Copy share link
                </button>
                {shareMessage && <span className="text-xs text-gray-500">{shareMessage}</span>}
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-dashed border-gray-300 bg-white/70 p-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Publish itinerary</p>
                  <p className="text-xs text-gray-500">Flip public mode to let everyone peek the timeline.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={trip.is_public}
                  onClick={() => handleVisibilityToggle(!trip.is_public)}
                  disabled={updatingVisibility}
                  className={`relative h-7 w-14 rounded-full transition-colors ${trip.is_public ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'} ${updatingVisibility ? 'opacity-60' : ''}`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${trip.is_public ? 'translate-x-7' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            </div>
            <div className="space-y-5">
              <div className={`rounded-[28px] ${designTokens.border} ${designTokens.surface.card} p-5 space-y-4`}>
                <p className={designTokens.label}>Trip insights</p>
                <div className="space-y-3">
                  {insightCards.map((insight) => (
                    <div key={insight.label} className="rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white/70 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{insight.label}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{insight.value}</p>
                      <p className="text-xs text-gray-500">{insight.helper}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`rounded-[28px] ${designTokens.border} ${designTokens.surface.card} p-5 space-y-4`}>
                <p className={designTokens.label}>Crew visibility</p>
                <p className="text-sm text-gray-600 dark:text-gray-200">Your link resolves to <span className="font-semibold">{shareUrl || 'urbanmanual.com/trips'}</span>. Adjust privacy in the share card.</p>
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 px-4 py-3 text-xs text-gray-500">
                  Last touched {tripLastTouched}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className={`rounded-[28px] ${designTokens.border} ${designTokens.surface.card} p-5 space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={designTokens.label}>Flights & rails</p>
                  <p className="text-sm text-gray-600 dark:text-gray-200">Keep departure + return tickets pinned here.</p>
                </div>
                <Globe className="h-5 w-5 text-blue-400" />
              </div>
              <div className="space-y-3">
                {renderFlightTicket('Departure', departureFlight, <PlaneTakeoff className="w-4 h-4" />)}
                {renderFlightTicket('Return', returnFlight, <PlaneLanding className="w-4 h-4" />)}
              </div>
            </div>
            <div className={`rounded-[28px] ${designTokens.border} ${designTokens.surface.card} p-5 space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={designTokens.label}>Trip memo</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Pin inspiration, reminders, or packing notes.</p>
                </div>
                {!isEditMode && trip.user_id === user?.id && (
                  <button onClick={() => setIsEditMode(true)} className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50">
                    <StickyNote className="h-4 w-4" />
                  </button>
                )}
              </div>
              {isEditMode ? (
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  placeholder={memoPlaceholder}
                />
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">
                  {trip.description?.trim() || memoPlaceholder}
                </p>
              )}
            </div>
          </section>

          <section className={`rounded-[32px] ${designTokens.border} ${designTokens.surface.card} p-6 space-y-5`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className={designTokens.label}>Add experiences</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Drop a location straight into a day</p>
              </div>
              <button
                onClick={() => setShowDayPicker((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700"
              >
                <Plus className="h-4 w-4" /> {showDayPicker ? 'Close day picker' : 'Choose a day'}
              </button>
            </div>
            {showDayPicker && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {dayNumbers.map((dayNumber) => (
                  <button
                    key={dayNumber}
                    onClick={() => handleDayPickerSelect(dayNumber)}
                    className="rounded-2xl border border-gray-200 bg-white/80 px-3 py-2 text-xs font-semibold text-gray-700"
                  >
                    Day {dayNumber}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={`rounded-[32px] ${designTokens.border} ${designTokens.surface.base} p-6 space-y-6`}>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className={designTokens.label}>Itinerary blueprint</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">Day-by-day experience map</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Drag to reorder, add new stops, and keep each day balanced.</p>
              </div>
              <span className="text-xs uppercase tracking-[0.3em] text-gray-400">{totalDays} day plan</span>
            </div>
            {dayNumbers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-white/60 px-4 py-8 text-center text-sm text-gray-500">
                No itinerary items yet. Use “Add experiences” to pin your first stop.
              </div>
            ) : (
              <div className="space-y-4">
                {dayNumbers.map((dayNumber) => {
                  const items = itemsByDay[dayNumber] || [];
                  const transformedLocations = transformItemsToLocations(items);
                  const dayDate = getDateForDay(dayNumber);

                  return (
                    <div key={dayNumber} className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm">
                      <TripDay
                        dayNumber={dayNumber}
                        date={dayDate}
                        locations={transformedLocations}
                        onAddLocation={isEditMode ? () => handleAddLocation(dayNumber) : undefined}
                        onRemoveLocation={isEditMode ? handleRemoveLocation : undefined}
                        onReorderLocations={isEditMode ? async (reorderedLocations) => {
                          try {
                            const supabaseClient = createClient();
                            if (!supabaseClient) return;

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

