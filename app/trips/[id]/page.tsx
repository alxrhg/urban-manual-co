'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Edit2,
  Trash2,
  Plus,
  X,
  Loader2,
  Share2,
  Download,
  Printer,
  Save,
  Upload,
  Sparkles,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import { TripDay } from '@/components/TripDay';
import { AddLocationToTrip } from '@/components/AddLocationToTrip';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import type { Trip, ItineraryItem, ItineraryItemNotes } from '@/types/trip';

type ActionSheetConfig = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => Promise<void> | void;
};

type ToastConfig = {
  message: string;
  tone?: 'success' | 'error';
};

export default function TripDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [destinations, setDestinations] = useState<Map<string, Destination>>(new Map());
  const [loading, setLoading] = useState(true);
  const [addLocationDay, setAddLocationDay] = useState<number | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [actionSheet, setActionSheet] = useState<ActionSheetConfig | null>(null);
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      fetchTripDetails();
    }
  }, [authLoading, user, tripId]);

  const fetchTripDetails = async () => {
    if (!tripId) return;
    setLoading(true);

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data: tripData, error: tripError } = await supabaseClient
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError || !tripData) {
        console.error('Error fetching trip:', tripError);
        router.push('/trips');
        return;
      }

      const tripRecord = tripData as Trip;

      if (!tripRecord.is_public && tripRecord.user_id !== user?.id) {
        router.push('/trips');
        return;
      }

      setTrip(tripRecord);
      setEditedTitle(tripRecord.title);
      setEditedStartDate(tripRecord.start_date || '');
      setEditedEndDate(tripRecord.end_date || '');
      if (tripRecord.cover_image) {
        setCoverImagePreview(tripRecord.cover_image);
      }

      const { data: itemsData, error: itemsError } = await supabaseClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })
        .order('order_index', { ascending: true });

      if (!itemsError && itemsData) {
        setItineraryItems(itemsData || []);

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
      setToast({ message: 'Unable to load trip right now.', tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!trip || !user) return;

    try {
      setSaving(true);
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const updates: any = {};

      if (editedTitle !== trip.title) {
        updates.title = editedTitle;
      }

      if (editedStartDate !== (trip.start_date || '')) {
        updates.start_date = editedStartDate || null;
      }

      if (editedEndDate !== (trip.end_date || '')) {
        updates.end_date = editedEndDate || null;
      }

      if (coverImageFile) {
        const fileExt = coverImageFile.name.split('.').pop();
        const fileName = `${trip.id}-${Date.now()}.${fileExt}`;
        const filePath = `trip-covers/${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
          .from('trip-covers')
          .upload(filePath, coverImageFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabaseClient.storage
            .from('trip-covers')
            .getPublicUrl(filePath);
          updates.cover_image = publicUrl;
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabaseClient
          .from('trips')
          .update(updates)
          .eq('id', trip.id)
          .eq('user_id', user.id);

        if (error) throw error;

        setTrip({
          ...trip,
          ...updates,
        });
        setIsEditingTitle(false);
        setIsEditingDates(false);
        setCoverImageFile(null);
        setCoverImagePreview(updates.cover_image || coverImagePreview);
        setToast({ message: 'Trip updated', tone: 'success' });
      }
    } catch (error) {
      console.error('Error saving trip:', error);
      setToast({ message: 'Failed to save trip.', tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!trip) return;

    const url = `${window.location.origin}/trips/${trip.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: trip.title,
          text: `Check out my trip: ${trip.title}`,
          url,
        });
        setToast({ message: 'Trip shared', tone: 'success' });
        return;
      } catch (err) {
        console.error('Share failed, copying link:', err);
      }
    }

    await navigator.clipboard.writeText(url);
    setToast({ message: 'Link copied to clipboard', tone: 'success' });
  };

  const handleExportToCalendar = () => {
    if (!trip || !trip.start_date) {
      setToast({ message: 'Add a start date to export to calendar.', tone: 'error' });
      return;
    }

    const startDate = new Date(trip.start_date);
    const endDate = trip.end_date
      ? new Date(trip.end_date)
      : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Urban Manual//Trip Calendar//EN',
      'BEGIN:VEVENT',
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${trip.title}`,
      `DESCRIPTION:${trip.description || ''}`,
      `LOCATION:${trip.destination || ''}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${trip.title.replace(/\s+/g, '-')}.ics`;
    link.click();
    setToast({ message: 'Exported calendar file', tone: 'success' });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteItineraryItem = async (itemId: string) => {
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('itinerary_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItineraryItems((prev) => prev.filter((item) => item.id !== itemId));
      setToast({ message: 'Stop removed from day', tone: 'success' });
    } catch (error) {
      console.error('Error deleting itinerary item:', error);
      setToast({ message: 'Failed to remove item.', tone: 'error' });
    }
  };

  const deleteTrip = async () => {
    if (!trip) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('trips')
        .delete()
        .eq('id', trip.id);

      if (error) throw error;

      router.push('/trips');
    } catch (error) {
      console.error('Error deleting trip:', error);
      setToast({ message: 'Failed to delete trip.', tone: 'error' });
    }
  };

  const openDeleteTripDrawer = () => {
    if (!trip) return;
    setActionSheet({
      title: 'Delete this trip?',
      description: `This will permanently remove "${trip.title}" and its itinerary entries.`,
      confirmLabel: 'Delete trip',
      tone: 'danger',
      onConfirm: async () => {
        await deleteTrip();
      },
    });
  };

  const openShareDrawer = () => {
    if (!trip) return;
    setActionSheet({
      title: 'Share your trip',
      description: 'Send a link to collaborators or copy it to your clipboard.',
      confirmLabel: 'Share link',
      onConfirm: async () => {
        await handleShare();
      },
    });
  };

  const openExportDrawer = () => {
    setActionSheet({
      title: 'Export itinerary',
      description: 'Create an .ics file to drop this trip onto your calendar.',
      confirmLabel: 'Export to calendar',
      onConfirm: () => handleExportToCalendar(),
    });
  };

  const deleteItineraryItemWithDrawer = (itemId: string, label: string) => {
    setActionSheet({
      title: 'Remove stop?',
      description: `Remove "${label}" from this day?`,
      confirmLabel: 'Remove stop',
      tone: 'danger',
      onConfirm: async () => {
        await deleteItineraryItem(itemId);
      },
    });
  };

  const itemsByDay = itineraryItems.reduce((acc, item) => {
    if (!acc[item.day]) {
      acc[item.day] = [];
    }
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
      const destination = item.destination_slug
        ? destinations.get(item.destination_slug)
        : null;

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
        duration: notesData.duration || undefined,
      };
    });
  };

  const handleAddLocation = (dayNumber: number) => {
    setActiveDay(dayNumber);
    setAddLocationDay(dayNumber);
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
    if (!trip || addLocationDay === null) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient || !user) return;

      const { data: existingItems } = await supabaseClient
        .from('itinerary_items')
        .select('order_index')
        .eq('trip_id', trip.id)
        .eq('day', addLocationDay)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = existingItems ? (existingItems.order_index || 0) + 1 : 0;

      const notesData = {
        raw: location.notes || '',
        duration: location.duration,
        image: location.image,
        city: location.city,
        category: location.category,
      };

      const { error } = await supabaseClient
        .from('itinerary_items')
        .insert({
          trip_id: trip.id,
          destination_slug: location.name.toLowerCase().replace(/\s+/g, '-'),
          day: addLocationDay,
          order_index: nextOrder,
          time: location.time || null,
          title: location.name,
          description: location.category,
          notes: JSON.stringify(notesData),
        });

      if (error) throw error;

      await fetchTripDetails();
      setAddLocationDay(null);
      setToast({ message: 'Location added to itinerary', tone: 'success' });
    } catch (error) {
      console.error('Error adding location:', error);
      setToast({ message: 'Failed to add location.', tone: 'error' });
    }
  };

  const handleRemoveLocation = async (locationId: number) => {
    const itemId = itineraryItems.find((item) => parseInt(item.id) === locationId)?.id;
    if (itemId) {
      const label = itineraryItems.find((item) => item.id === itemId)?.title || 'this stop';
      deleteItineraryItemWithDrawer(itemId, label);
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

  const dayKeys = Object.keys(itemsByDay).map((key) => parseInt(key, 10));
  const calculatedTotalDays = (() => {
    if (trip?.start_date && trip?.end_date) {
      const diff = Math.max(
        1,
        Math.ceil(
          (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      );
      return diff;
    }
    return dayKeys.length > 0 ? Math.max(...dayKeys) : 1;
  })();

  const dayList = Array.from({ length: calculatedTotalDays }, (_, idx) => idx + 1);
  const activeDayItems = itemsByDay[activeDay] || [];
  const activeDayLocations = transformItemsToLocations(activeDayItems);

  useEffect(() => {
    if (!dayList.includes(activeDay)) {
      setActiveDay(dayList[0]);
    }
  }, [calculatedTotalDays]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  const coverImageUrl = coverImagePreview || trip.cover_image;
  const dateRange = trip.start_date && trip.end_date
    ? `${formatDate(trip.start_date)}–${formatDate(trip.end_date)}`
    : trip.start_date
    ? `From ${formatDate(trip.start_date)}`
    : null;
  const metaInfo = [trip.destination, dateRange].filter(Boolean).join(' · ');

  return (
    <main className="w-full min-h-screen bg-slate-50 dark:bg-gray-950">
      <header className="relative">
        <div className="h-[320px] w-full overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          {coverImageUrl && (
            <Image
              src={coverImageUrl}
              alt="Trip cover"
              fill
              className="object-cover opacity-70"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />
          <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 pt-6 flex justify-between items-start">
            <Link
              href="/trips"
              className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
              aria-label="Back to Trips"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Trips
            </Link>
            {trip.user_id === user?.id && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/20 hover:bg-white/20"
              >
                <Upload className="w-4 h-4" />
                Change cover
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverImageChange}
              className="hidden"
            />
          </div>
          <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 h-full flex flex-col justify-end pb-8">
            <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm mb-3">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <Calendar className="w-4 h-4" />
                <span>{metaInfo || 'Add details'}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <MapPin className="w-4 h-4" />
                <span>{trip.destination || 'Where to?'}</span>
              </div>
            </div>
            <div className="flex flex-col gap-4 w-full">
              <div className="flex flex-wrap items-center gap-3">
                {isEditingTitle ? (
                  <div className="flex items-center gap-3 bg-white/10 px-3 py-2 rounded-lg">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="bg-transparent text-2xl font-semibold text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-slate-900 rounded-md text-sm font-medium"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingTitle(false);
                        setEditedTitle(trip.title);
                      }}
                      className="text-white/70 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-3xl font-semibold text-white">
                    <span>{trip.title}</span>
                    {trip.user_id === user?.id && (
                      <button
                        onClick={() => setIsEditingTitle(true)}
                        className="p-1 rounded-full bg-white/10 hover:bg-white/20"
                        aria-label="Edit title"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-white/90">
                {isEditingDates ? (
                  <div className="flex flex-wrap items-center gap-2 bg-white/10 px-3 py-2 rounded-lg">
                    <input
                      type="date"
                      value={formatDateForInput(editedStartDate)}
                      onChange={(e) => setEditedStartDate(e.target.value)}
                      className="bg-transparent text-sm text-white focus:outline-none"
                    />
                    <span className="text-white/60">to</span>
                    <input
                      type="date"
                      value={formatDateForInput(editedEndDate)}
                      onChange={(e) => setEditedEndDate(e.target.value)}
                      className="bg-transparent text-sm text-white focus:outline-none"
                    />
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-slate-900 rounded-md text-xs font-medium"
                    >
                      <Save className="w-4 h-4" />
                      Save dates
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingDates(false);
                        setEditedStartDate(trip.start_date || '');
                        setEditedEndDate(trip.end_date || '');
                      }}
                      className="text-white/70 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingDates(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>{dateRange || 'Add trip dates'}</span>
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={openShareDrawer}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    onClick={openExportDrawer}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 lg:px-8 -mt-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Itinerary</p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Timeline</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAddLocation(activeDay)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800"
                >
                  <Plus className="w-4 h-4" />
                  Add to Day {activeDay}
                </button>
              </div>
            </div>

            <div className="relative mb-6">
              <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent" />
              <div className="relative flex gap-3 overflow-x-auto pb-3">
                {dayList.map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`flex flex-col items-center gap-2 px-3 py-2 rounded-xl border transition-colors min-w-[80px] ${
                      activeDay === day
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="text-[11px] uppercase tracking-[0.2em]">Day {day}</span>
                    <span className="text-xs text-white/80 dark:text-gray-400">
                      {formatDate(getDateForDay(day))}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <TripDay
                dayNumber={activeDay}
                date={getDateForDay(activeDay)}
                locations={activeDayLocations}
                onAddLocation={() => handleAddLocation(activeDay)}
                onRemoveLocation={handleRemoveLocation}
                onReorderLocations={async (reorderedLocations) => {
                  const dayNumber = activeDay;
                  const supabaseClient = createClient();
                  if (!supabaseClient) return;

                  const items = itemsByDay[dayNumber] || [];

                  try {
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
                      await supabaseClient.from('itinerary_items').insert(itemsToInsert);
                    }

                    await fetchTripDetails();
                    setToast({ message: 'Reordered timeline', tone: 'success' });
                  } catch (error) {
                    console.error('Error reordering locations:', error);
                    setToast({ message: 'Failed to reorder locations.', tone: 'error' });
                  }
                }}
                onDuplicateDay={async () => {
                  setToast({ message: 'Duplicate day feature coming soon', tone: 'success' });
                }}
                onOptimizeRoute={async () => {
                  setToast({ message: 'Route optimization coming soon', tone: 'success' });
                }}
              />
            </div>
          </section>

          <aside className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 space-y-4 sticky top-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Trip overview</p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{trip.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{metaInfo || 'Add dates and destination'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">{calculatedTotalDays} days</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Stops</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">{itineraryItems.length}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleAddLocation(activeDay)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 text-white text-sm hover:bg-slate-800"
                >
                  <span>Add location to Day {activeDay}</span>
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={openShareDrawer}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <span>Share trip</span>
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={openExportDrawer}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <span>Export itinerary</span>
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={openDeleteTripDrawer}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-red-200 text-sm text-red-700 hover:bg-red-50"
                >
                  <span>Delete trip</span>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Smart suggestions</p>
                {[{ text: 'Add breakfast spots near your first destination', icon: CheckCircle2 }, { text: 'Consider adding a museum visit for Day 2', icon: Sparkles }, { text: 'You might enjoy a sunset dinner at the waterfront', icon: CheckCircle2 }].map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <suggestion.icon className="w-4 h-4 text-green-500" />
                    <span>{suggestion.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {trip && addLocationDay !== null && (
        <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-xl bg-white dark:bg-gray-950 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Day {addLocationDay}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Add locations while keeping the itinerary visible</p>
              </div>
              <button
                onClick={() => setAddLocationDay(null)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900"
                aria-label="Close add location"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AddLocationToTrip
                onAdd={handleLocationAdded}
                onClose={() => {
                  setAddLocationDay(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {actionSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-gray-950 rounded-t-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Confirmation</p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{actionSheet.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{actionSheet.description}</p>
              </div>
              <button
                onClick={() => setActionSheet(null)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900"
                aria-label="Close action drawer"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setActionSheet(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await actionSheet.onConfirm();
                  setActionSheet(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                  actionSheet.tone === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {actionSheet.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg border text-sm flex items-center gap-2 ${
              toast.tone === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-800'
            }`}
          >
            {toast.tone === 'error' ? <X className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </main>
  );
}
