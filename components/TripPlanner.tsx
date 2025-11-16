'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarIcon,
  ShareIcon,
  DownloadIcon,
  SparklesIcon,
  SaveIcon,
  Loader2,
  Camera,
  NotebookPenIcon,
  LayersIcon,
  PlusIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { TripDay } from './TripDay';
import { AddLocationToTrip } from './AddLocationToTrip';
import { TripShareModal } from './TripShareModal';
import { Drawer } from './ui/Drawer';
import type { Trip as TripSchema, ItineraryItem, ItineraryItemNotes } from '@/types/trip';

interface TripPlannerProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string; // If provided, load existing trip
}

interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  time?: string;
  notes?: string;
  duration?: number;
}

interface DayItinerary {
  date: string;
  locations: TripLocation[];
  budget?: number;
  notes?: string;
}

type WorkspaceTab = 'itinerary' | 'logistics' | 'journal';

interface LogisticsTask {
  id: number;
  label: string;
  done: boolean;
}

const defaultLogisticsTasks: LogisticsTask[] = [
  { id: 1, label: 'Lock flights or trains', done: false },
  { id: 2, label: 'Confirm hotel / base', done: false },
  { id: 3, label: 'Outline daily anchor moments', done: false },
  { id: 4, label: 'Share itinerary with travel partners', done: false },
];

export function TripPlanner({ isOpen, onClose, tripId }: TripPlannerProps) {
  const { user } = useAuth();
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState<DayItinerary[]>([]);
  const [showAddLocation, setShowAddLocation] = useState<number | null>(null);
  const [step, setStep] = useState<'create' | 'plan'>('create');
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [showShare, setShowShare] = useState(false);
  const [hotelLocation, setHotelLocation] = useState('');
  const [currentTripId, setCurrentTripId] = useState<string | null>(tripId || null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('itinerary');
  const [tripMood, setTripMood] = useState('City discovery');
  const [travelPace, setTravelPace] = useState<'structured' | 'loose'>('structured');
  const [travelersCount, setTravelersCount] = useState(2);
  const [logisticsTasks, setLogisticsTasks] = useState<LogisticsTask[]>(() =>
    defaultLogisticsTasks.map((task) => ({ ...task }))
  );
  const [journalNotes, setJournalNotes] = useState('');
  const [packingNotes, setPackingNotes] = useState('');
  const toast = useToast();

  // Load existing trip if tripId is provided
  useEffect(() => {
    if (isOpen && tripId && user) {
      loadTrip(tripId);
    } else if (isOpen && !tripId) {
      // Reset form for new trip
      resetForm();
    }
  }, [isOpen, tripId, user, loadTrip]);

  // Body scroll is handled by Drawer component

  const resetForm = () => {
    setTripName('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setDays([]);
    setTotalBudget(0);
    setHotelLocation('');
    setStep('create');
    setCurrentTripId(null);
    setCoverImage(null);
    setCoverImageFile(null);
    setCoverImagePreview(null);
    setWorkspaceTab('itinerary');
    setTripMood('City discovery');
    setTravelPace('structured');
    setTravelersCount(2);
    setLogisticsTasks(defaultLogisticsTasks.map((task) => ({ ...task })));
    setJournalNotes('');
    setPackingNotes('');
  };

  const loadTrip = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient || !user) return;

      // Load trip
      const { data: trip, error: tripError } = await supabaseClient
        .from('trips')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (tripError || !trip) {
        console.error('Error loading trip:', tripError);
        alert('Failed to load trip');
        return;
      }

      const tripData = trip as TripSchema;

      setTripName(tripData.title);
      setDestination(tripData.destination || '');
      setStartDate(tripData.start_date || '');
      setEndDate(tripData.end_date || '');
      setHotelLocation(tripData.description || ''); // Using description for hotel location
      setCurrentTripId(tripData.id);
      setCoverImage(tripData.cover_image || null);

      // Load itinerary items
      // First verify trip ownership to avoid RLS recursion
      const { data: tripCheck, error: tripCheckError } = await supabaseClient
        .from('trips')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (tripCheckError || !tripCheck) {
        console.error('Error verifying trip ownership:', tripCheckError);
        alert('Trip not found or access denied');
        return;
      }

      const { data: items, error: itemsError } = await supabaseClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', id)
        .order('day', { ascending: true })
        .order('order_index', { ascending: true });

      if (itemsError) {
        console.error('Error loading itinerary items:', itemsError);
        // If recursion error, continue with empty items
        if (itemsError.message && itemsError.message.includes('infinite recursion')) {
          console.warn('RLS recursion detected, continuing with empty items');
        }
      }

      // Group items by day
      if (items && items.length > 0) {
        const daysMap = new Map<number, TripLocation[]>();
        (items as ItineraryItem[]).forEach((item) => {
          const day = item.day;
          if (!daysMap.has(day)) {
            daysMap.set(day, []);
          }

          // Parse notes for additional data (duration, etc.)
          let notesData: ItineraryItemNotes = {};
          if (item.notes) {
            try {
              notesData = JSON.parse(item.notes) as ItineraryItemNotes;
            } catch {
              notesData = { raw: item.notes };
            }
          }

          const location: TripLocation = {
            id: parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now(),
            name: item.title,
            city: tripData.destination || '',
            category: item.description || '',
            image: notesData.image || '/placeholder-image.jpg',
            time: item.time || undefined,
            notes: notesData.raw || undefined,
            duration: notesData.duration || undefined,
          };

          daysMap.get(day)!.push(location);
        });

        // Create days array
        const start = new Date(tripData.start_date || Date.now());
        const end = new Date(tripData.end_date || Date.now());
        const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const newDays: DayItinerary[] = [];
        for (let i = 0; i < dayCount; i++) {
          const date = new Date(start);
          date.setDate(start.getDate() + i);
          const dayNum = i + 1;
          newDays.push({
            date: date.toISOString().split('T')[0],
            locations: daysMap.get(dayNum) || [],
            budget: 0,
          });
        }

        setDays(newDays);
      } else {
        // No items, create empty days
        const start = new Date(tripData.start_date || Date.now());
        const end = new Date(tripData.end_date || Date.now());
        const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const newDays: DayItinerary[] = [];
        for (let i = 0; i < dayCount; i++) {
          const date = new Date(start);
          date.setDate(start.getDate() + i);
          newDays.push({
            date: date.toISOString().split('T')[0],
            locations: [],
            budget: 0,
          });
        }
        setDays(newDays);
      }

      setStep('plan');
    } catch (error) {
      console.error('Error loading trip:', error);
      alert('Failed to load trip');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const toggleLogisticsTask = (taskId: number) => {
    setLogisticsTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              done: !task.done,
            }
          : task
      )
    );
  };

  const adjustTravelers = (direction: 'inc' | 'dec') => {
    setTravelersCount((prev) => {
      if (direction === 'dec') {
        return Math.max(1, prev - 1);
      }
      return Math.min(12, prev + 1);
    });
  };

  const handleCreateTrip = async () => {
    if (!tripName || !destination || !startDate || !endDate || !user) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Create trip in database
      const { data: trip, error: tripError } = await supabaseClient
        .from('trips')
        .insert({
          title: tripName,
          description: hotelLocation || null,
          destination: destination,
          start_date: startDate,
          end_date: endDate,
          status: 'planning',
          user_id: user.id,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      setCurrentTripId(trip.id);

      // Create days array
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dayCount =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const newDays: DayItinerary[] = [];

      for (let i = 0; i < dayCount; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);

        newDays.push({
          date: date.toISOString().split('T')[0],
          locations: [],
          budget: 0,
        });
      }

      setDays(newDays);
      setStep('plan');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create trip. Please try again.';
      console.error('Error creating trip:', error);
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!currentTripId || !user) {
      alert('No trip to save');
      return;
    }

    setSaving(true);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Upload cover image if file selected
      let coverImageUrl = coverImage;
      if (coverImageFile) {
        setUploadingCover(true);
        try {
          const formDataToSend = new FormData();
          formDataToSend.append('file', coverImageFile);
          formDataToSend.append('tripId', currentTripId);

          const { data: { session } } = await supabaseClient.auth.getSession();
          const token = session?.access_token;
          if (!token) {
            throw new Error('Not authenticated');
          }

          const res = await fetch('/api/upload-trip-cover', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formDataToSend,
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Upload failed');
          }

          const data = await res.json();
          coverImageUrl = data.url;
          setCoverImage(coverImageUrl);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Upload failed';
          console.error('Cover image upload error:', error);
          toast.error(`Cover image upload failed: ${message}`);
          setUploadingCover(false);
          return;
        } finally {
          setUploadingCover(false);
        }
      }

      // Update trip (note: budget is not in schema, storing in description or notes)
      const { error: tripError } = await supabaseClient
        .from('trips')
        .update({
          title: tripName,
          description: hotelLocation || null,
          destination: destination || null,
          start_date: startDate || null,
          end_date: endDate || null,
          cover_image: coverImageUrl || null,
        })
        .eq('id', currentTripId)
        .eq('user_id', user.id);

      if (tripError) throw tripError;

      // Delete all existing itinerary items
      const { error: deleteError } = await supabaseClient
        .from('itinerary_items')
        .delete()
        .eq('trip_id', currentTripId);

      if (deleteError) throw deleteError;

      // Insert all itinerary items
      const itemsToInsert: Array<{
        trip_id: string;
        destination_slug: string | null;
        day: number;
        order_index: number;
        time: string | null;
        title: string;
        description: string | null;
        notes: string | null;
      }> = [];
      days.forEach((day, dayIndex) => {
        day.locations.forEach((location, locationIndex) => {
          // Store additional data in notes as JSON
          const notesData: ItineraryItemNotes = {
            raw: location.notes || '',
            duration: location.duration,
            image: location.image,
            city: location.city,
            category: location.category,
          };

          itemsToInsert.push({
            trip_id: currentTripId,
            destination_slug: location.name.toLowerCase().replace(/\s+/g, '-') || null,
            day: dayIndex + 1,
            order_index: locationIndex,
            time: location.time || null,
            title: location.name,
            description: location.category || null,
            notes: JSON.stringify(notesData),
          });
        });
      });

      if (itemsToInsert.length > 0) {
        const { error: insertError } = await supabaseClient
          .from('itinerary_items')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      // Show success feedback without alert
      // The save button will show "Saved" briefly
      const saveButton = document.querySelector('[title="Save trip"]') as HTMLButtonElement;
      if (saveButton) {
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Saved!';
        saveButton.disabled = true;
        setTimeout(() => {
          saveButton.textContent = originalText;
          saveButton.disabled = false;
        }, 2000);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save trip. Please try again.';
      console.error('Error saving trip:', error);
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async (dayIndex: number, location: TripLocation) => {
    setDays((prev) =>
      prev.map((day, idx) =>
        idx === dayIndex
          ? {
              ...day,
              locations: [...day.locations, location],
            }
          : day
      )
    );
    setShowAddLocation(null);

    // Auto-save if trip exists
    if (currentTripId) {
      await handleSaveTrip();
    }
  };

  const handleRemoveLocation = async (dayIndex: number, locationId: number) => {
    setDays((prev) =>
      prev.map((day, idx) =>
        idx === dayIndex
          ? {
              ...day,
              locations: day.locations.filter((loc) => loc.id !== locationId),
            }
          : day
      )
    );

    // Auto-save if trip exists
    if (currentTripId) {
      await handleSaveTrip();
    }
  };

  const handleReorderLocations = async (
    dayIndex: number,
    locations: TripLocation[]
  ) => {
    setDays((prev) =>
      prev.map((day, idx) =>
        idx === dayIndex
          ? {
              ...day,
              locations,
            }
          : day
      )
    );

    // Auto-save if trip exists
    if (currentTripId) {
      await handleSaveTrip();
    }
  };

  const handleDuplicateDay = (dayIndex: number) => {
    const dayToDuplicate = days[dayIndex];
    const newDay = {
      ...dayToDuplicate,
      date: new Date(new Date(dayToDuplicate.date).getTime() + 86400000)
        .toISOString()
        .split('T')[0],
      locations: dayToDuplicate.locations.map((loc) => ({
        ...loc,
        id: Date.now() + Math.random(),
      })),
    };
    setDays((prev) => [
      ...prev.slice(0, dayIndex + 1),
      newDay,
      ...prev.slice(dayIndex + 1),
    ]);
  };

  const handleAddDay = () => {
    const baseDate = days.length > 0
      ? new Date(days[days.length - 1].date)
      : startDate
        ? new Date(startDate)
        : new Date();

    const nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + 1);

    setDays((prev) => [
      ...prev,
      {
        date: nextDate.toISOString().split('T')[0],
        locations: [],
        budget: 0,
      },
    ]);
  };

  const handleOptimizeRoute = (dayIndex: number) => {
    // Simple optimization - in real app would use actual routing API
    setDays((prev) =>
      prev.map((day, idx) => {
        if (idx !== dayIndex) return day;
        const optimized = [...day.locations].sort((a, b) => {
          // Sort by time if available
          if (a.time && b.time) {
            return a.time.localeCompare(b.time);
          }
          // Put items with time first
          if (a.time && !b.time) return -1;
          if (!a.time && b.time) return 1;
          return 0;
        });
        return {
          ...day,
          locations: optimized,
        };
      })
    );
  };

  const handleExportToCalendar = () => {
    // Generate ICS file content
    let icsContent =
      'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Urban Manual//Trip Planner//EN\n';

    days.forEach((day) => {
      day.locations.forEach((location) => {
        const date = day.date.replace(/-/g, '');
        const time = location.time?.replace(':', '') || '0900';
        icsContent += `BEGIN:VEVENT\n`;
        icsContent += `DTSTART:${date}T${time}00\n`;
        icsContent += `SUMMARY:${location.name}\n`;
        icsContent += `LOCATION:${location.city}\n`;
        icsContent += `DESCRIPTION:${location.category}\n`;
        icsContent += `END:VEVENT\n`;
      });
    });

    icsContent += 'END:VCALENDAR';

    const blob = new Blob([icsContent], {
      type: 'text/calendar',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tripName.replace(/\s+/g, '_')}.ics`;
    link.click();
  };

  const getAISuggestions = () => {
    // Mock AI suggestions - in real app would call AI API
    return [
      'Consider adding a morning cafe visit before the museum',
      'Your dinner reservation is 2km from your last location - allow 30 min travel time',
      'Weather forecast shows rain on Day 3 - indoor activities recommended',
    ];
  };

  const formattedRange = startDate && endDate
    ? `${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';
  const totalStops = days.reduce((total, day) => total + day.locations.length, 0);
  const heroFallbackImage = days.find((day) => day.locations.length > 0)?.locations[0]?.image;
  const heroImage = coverImagePreview || coverImage || heroFallbackImage || '/placeholder-image.jpg';
  const previewTimeline = (() => {
    if (!startDate || !endDate) return [] as Array<{ label: string; date: string }>;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.max(0, end.getTime() - start.getTime());
    const dayCount = Math.max(1, Math.ceil(diff / 86400000) + 1);
    return Array.from({ length: dayCount }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        label: `Day ${index + 1}`,
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      };
    });
  })();

  const workspaceTabsConfig: Array<{ id: WorkspaceTab; label: string; helper: string }> = [
    { id: 'itinerary', label: 'Itinerary', helper: 'Design each day with intention' },
    { id: 'logistics', label: 'Logistics', helper: 'Budgets, transport, and tasks' },
    { id: 'journal', label: 'Journal', helper: 'Notes, memories, and ideas' },
  ];

  // Build custom header with tabs and actions
  const headerContent = step === 'plan' ? (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] tracking-[0.4em] text-gray-400 dark:text-gray-500 uppercase">Trip studio</p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {tripName || 'Untitled trip'}
            </h2>
            <span className="text-xs px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200">
              {destination || 'Destination TBD'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowShare(true)}
            className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/60 flex items-center gap-1"
          >
            <ShareIcon className="w-3.5 h-3.5" /> Share
          </button>
          <button
            onClick={handleExportToCalendar}
            className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/60 flex items-center gap-1"
          >
            <DownloadIcon className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={handleSaveTrip}
            disabled={saving}
            className="px-4 py-2 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-medium flex items-center gap-1 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon className="w-3.5 h-3.5" />} {saving ? 'Saving' : 'Save'}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <CalendarIcon className="w-3 h-3" /> {formattedRange || 'Set dates'}
        </span>
        <span className="text-gray-300 dark:text-gray-700">•</span>
        <span>{days.length} day plan</span>
        <span className="text-gray-300 dark:text-gray-700">•</span>
        <span>{totalStops} scheduled stops</span>
        <span className="text-gray-300 dark:text-gray-700">•</span>
        <span>{travelersCount} traveler{travelersCount === 1 ? '' : 's'}</span>
      </div>
    </div>
  ) : undefined;

  const renderCreateStep = () => {
    const moodOptions = ['City discovery', 'Design crawl', 'Slow mornings', 'Outdoor mix'];
    return (
      <div className="space-y-8">
        <section className="rounded-[40px] border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white p-8">
          <div className="grid gap-6 md:grid-cols-2 md:items-center">
            <div className="space-y-4">
              <p className="text-[11px] tracking-[0.5em] uppercase text-white/60">Blueprint</p>
              <h2 className="text-2xl font-semibold">Craft the north star of this trip</h2>
              <p className="text-sm text-white/80">
                Name the journey, anchor it to a place, and define the vibe. Your planning studio will adapt instantly once you hit build.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/20 bg-white/10 p-6 space-y-4">
              <div>
                <p className="text-[11px] tracking-[0.4em] uppercase text-white/70 mb-2">Live summary</p>
                <p className="text-base font-semibold">{tripName || 'Untitled adventure'}</p>
                <p className="text-sm text-white/70">{destination ? `Orbiting ${destination}` : 'Add a destination to unlock the workspace'}</p>
              </div>
              <div className="rounded-2xl border border-white/20 p-4 space-y-3 bg-white/5">
                <div className="flex items-center gap-3 text-xs text-white/80">
                  <CalendarIcon className="w-4 h-4" />
                  {formattedRange || 'Set your dates'}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-white/80">
                  <div>
                    <p className="text-white/60">Mood</p>
                    <p className="font-semibold text-white">{tripMood}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Travelers</p>
                    <p className="font-semibold text-white">{travelersCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[32px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Trip name *</label>
                <input
                  id="trip-name"
                  type="text"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="Lisbon light tour"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Destination *</label>
                <input
                  id="destination"
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Lisbon, Portugal"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Start date *</label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">End date *</label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Home base / hotel</label>
                <input
                  id="hotel"
                  type="text"
                  value={hotelLocation}
                  onChange={(e) => setHotelLocation(e.target.value)}
                  placeholder="Memmo Alfama"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Budget (optional)</label>
                <input
                  id="budget"
                  type="number"
                  value={totalBudget || ''}
                  onChange={(e) => setTotalBudget(Number(e.target.value))}
                  placeholder="3500"
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-3 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Trip mood</p>
                <div className="flex flex-wrap gap-2">
                  {moodOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTripMood(option)}
                      className={`px-4 py-2 rounded-2xl text-xs font-medium border ${
                        tripMood === option
                          ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                          : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-3">Travel pace</p>
                  <div className="flex gap-2">
                    {(['structured', 'loose'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setTravelPace(mode)}
                        className={`flex-1 px-3 py-2 rounded-2xl text-xs font-medium border ${
                          travelPace === mode
                            ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                            : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {mode === 'structured' ? 'Structured' : 'Loose'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">Travelers</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{travelersCount}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">people on this trip</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustTravelers('dec')}
                        className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-800 flex items-center justify-center text-lg"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustTravelers('inc')}
                        className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-800 flex items-center justify-center text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateTrip}
              disabled={!tripName || !destination || !startDate || !endDate || saving || !user}
              className="w-full px-6 py-3 rounded-2xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
              {saving ? 'Creating workspace...' : 'Build planning studio'}
            </button>
          </div>

          <div className="space-y-5">
            <div className="rounded-[32px] border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 p-6 space-y-4">
              <p className="text-[11px] tracking-[0.4em] uppercase text-gray-500 dark:text-gray-400">Timeline preview</p>
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {previewTimeline.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add dates to let us pre-build the day stack.</p>
                ) : (
                  previewTimeline.map((entry) => (
                    <div key={entry.label} className="flex items-center justify-between rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 px-4 py-3 text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">{entry.label}</span>
                      <span className="text-gray-500 dark:text-gray-400">{entry.date}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-[32px] border border-dashed border-gray-300 dark:border-gray-700 p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <SparklesIcon className="w-4 h-4" />
                Your trip mood ({tripMood}) and pace ({travelPace}) will influence AI recommendations.
              </div>
              <div className="rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-600 dark:text-gray-300">
                {destination
                  ? `We will prioritize experiences that feel like ${tripMood.toLowerCase()} moments in ${destination}.`
                  : 'Set a destination to start getting location-aware prompts.'}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderPlanStep = () => {
    const suggestions = getAISuggestions();
    const stopsPerDay = days.length ? Math.max(1, Math.round(totalStops / days.length)) : 0;
    const nextOpenDayIndex = days.findIndex((day) => day.locations.length === 0);
    const focusDayLabel =
      nextOpenDayIndex >= 0
        ? `Day ${nextOpenDayIndex + 1}`
        : days.length > 0
          ? `Day ${days.length}`
          : 'Start your first day';
    const taskProgress = logisticsTasks.length
      ? Math.round((logisticsTasks.filter((task) => task.done).length / logisticsTasks.length) * 100)
      : 0;

    const renderItineraryWorkspace = () => (
      <div className="space-y-6">
        <div className="rounded-[32px] border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-gray-500 dark:text-gray-400">Focus day</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white">{focusDayLabel}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {days.length ? `${days.length} days in play · ~${stopsPerDay} stops/day` : 'No days yet. Start building below.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={handleAddDay}
              className="px-4 py-2 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" /> Add day
            </button>
            <button
              onClick={() => setShowAddLocation(0)}
              className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200"
            >
              Drop a block
            </button>
          </div>
        </div>
        {days.length === 0 ? (
          <div className="rounded-[32px] border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 text-center space-y-3">
            <p className="text-base font-semibold text-gray-900 dark:text-white">No days yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Click below to seed your itinerary canvas.</p>
            <button
              onClick={handleAddDay}
              className="px-5 py-3 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-medium"
            >
              Create day one
            </button>
          </div>
        ) : (
          days.map((day, index) => (
            <div key={day.date} className="rounded-[32px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 sm:p-6 space-y-4 shadow-sm shadow-black/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500">Day {index + 1}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() => setShowAddLocation(index)}
                    className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200"
                  >
                    Add block
                  </button>
                  <button
                    onClick={() => handleDuplicateDay(index)}
                    className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200"
                  >
                    Duplicate
                  </button>
                </div>
              </div>
              <TripDay
                dayNumber={index + 1}
                date={day.date}
                locations={day.locations}
                hotelLocation={hotelLocation}
                onAddLocation={() => setShowAddLocation(index)}
                onRemoveLocation={(locationId) => handleRemoveLocation(index, locationId)}
                onReorderLocations={(locations) => handleReorderLocations(index, locations)}
                onDuplicateDay={() => handleDuplicateDay(index)}
                onOptimizeRoute={() => handleOptimizeRoute(index)}
              />
            </div>
          ))
        )}
      </div>
    );

    const renderLogisticsWorkspace = () => (
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[28px] border border-gray-200 dark:border-gray-800 p-5 space-y-4 bg-white dark:bg-gray-950">
            <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500">Key logistics</p>
            <div className="space-y-3 text-sm">
              <label className="block text-gray-600 dark:text-gray-300">
                Start date
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-2 bg-white dark:bg-gray-900"
                />
              </label>
              <label className="block text-gray-600 dark:text-gray-300">
                End date
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-2 bg-white dark:bg-gray-900"
                />
              </label>
              <label className="block text-gray-600 dark:text-gray-300">
                Base / hotel
                <input
                  type="text"
                  value={hotelLocation}
                  onChange={(e) => setHotelLocation(e.target.value)}
                  placeholder="Where are you staying?"
                  className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-2 bg-white dark:bg-gray-900"
                />
              </label>
              <label className="block text-gray-600 dark:text-gray-300">
                Budget
                <input
                  type="number"
                  value={totalBudget || ''}
                  onChange={(e) => setTotalBudget(Number(e.target.value))}
                  placeholder="5000"
                  className="mt-1 w-full rounded-2xl border border-gray-200 dark:border-gray-800 px-4 py-2 bg-white dark:bg-gray-900"
                />
              </label>
            </div>
          </div>
          <div className="rounded-[28px] border border-gray-200 dark:border-gray-800 p-5 space-y-4 bg-white dark:bg-gray-950">
            <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500">Checklist</p>
            <div className="space-y-3">
              {logisticsTasks.map((task) => (
                <label key={task.id} className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-200">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleLogisticsTask(task.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span>{task.label}</span>
                  </div>
                  {task.done && <SparklesIcon className="w-4 h-4 text-emerald-500" />}
                </label>
              ))}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{taskProgress}% complete</div>
          </div>
        </div>
        <div className="rounded-[28px] border border-gray-200 dark:border-gray-800 p-5 bg-gray-50 dark:bg-gray-900/40">
          <p className="text-[11px] tracking-[0.3em] uppercase text-gray-500 dark:text-gray-400 mb-2">Budget snapshot</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {totalBudget
              ? `You have ${days.length} days to stretch ~$${Math.round(totalBudget / Math.max(1, days.length))} per day.`
              : 'Add a budget to track pace per day.'}
          </p>
        </div>
      </div>
    );

    const renderJournalWorkspace = () => (
      <div className="space-y-6">
        <div className="rounded-[28px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
          <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500 mb-3">Travel log</p>
          <textarea
            value={journalNotes}
            onChange={(e) => setJournalNotes(e.target.value)}
            rows={6}
            placeholder="Capture intentions, inspiration, or daily recaps."
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm px-4 py-3 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100"
          />
        </div>
        <div className="rounded-[28px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5">
          <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500 mb-3">Packing + reminders</p>
          <textarea
            value={packingNotes}
            onChange={(e) => setPackingNotes(e.target.value)}
            rows={4}
            placeholder="Adapters, film, outfits, essentials..."
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-sm px-4 py-3 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100"
          />
        </div>
      </div>
    );

    const renderWorkspaceContent = () => {
      switch (workspaceTab) {
        case 'logistics':
          return renderLogisticsWorkspace();
        case 'journal':
          return renderJournalWorkspace();
        default:
          return renderItineraryWorkspace();
      }
    };

    return (
      <div className="space-y-8">
        <section className="rounded-[48px] border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
          <div className="relative h-72">
            <Image
              src={heroImage}
              alt={tripName || 'Trip cover'}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white space-y-1">
              <p className="text-[11px] tracking-[0.4em] uppercase text-white/70">{destination || 'Choose a destination'}</p>
              <h3 className="text-3xl font-semibold">{tripName || 'Untitled trip'}</h3>
              {formattedRange && <p className="text-sm text-white/80">{formattedRange}</p>}
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3 border-t border-gray-200 dark:border-gray-800 p-6">
            <div>
              <p className="text-[11px] tracking-[0.3em] uppercase text-gray-500 dark:text-gray-400 mb-1">Logistics</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{hotelLocation || 'Add your base'} · {days.length} days planned</p>
            </div>
            <div>
              <p className="text-[11px] tracking-[0.3em] uppercase text-gray-500 dark:text-gray-400 mb-1">Mood & pace</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{tripMood} · {travelPace === 'structured' ? 'Structured flow' : 'Loose wanderings'}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs justify-start md:justify-end">
              <button
                onClick={() => setWorkspaceTab('itinerary')}
                className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200"
              >
                Jump to itinerary
              </button>
              <label className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 cursor-pointer text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCoverImageFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => setCoverImagePreview(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {uploadingCover ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Cover
                  </>
                )}
              </label>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.65fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[40px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
                <div>
                  <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500">Workspace</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">Plan, align, document</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {workspaceTabsConfig.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setWorkspaceTab(tab.id)}
                      className={`px-4 py-2 rounded-full border ${
                        workspaceTab === tab.id
                          ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                          : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6">{renderWorkspaceContent()}</div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-[32px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500">Trip stats</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{days.length} days · {totalStops} stops</p>
                </div>
                <LayersIcon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Travelers</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{travelersCount}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Stops / day</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{stopsPerDay}</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Next to fill: {focusDayLabel}</div>
            </div>

            <div className="rounded-[32px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <SparklesIcon className="w-4 h-4" /> AI nudges
              </div>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                {suggestions.map((suggestion) => (
                  <p key={suggestion} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-3">
                    {suggestion}
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <NotebookPenIcon className="w-4 h-4" /> Packing + reminders
              </div>
              <textarea
                value={packingNotes}
                onChange={(e) => setPackingNotes(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 text-sm px-4 py-3 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100"
                placeholder="Sun hat, charger, reservation confirmations..."
              />
            </div>
          </div>
        </section>
      </div>
    );
  };
  // Build content based on step and tab
  const content = (
    <div className="px-6 py-6">
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading trip...</p>
        </div>
      ) : step === 'create' ? (
        renderCreateStep()
      ) : (
        renderPlanStep()
      )}
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={step === 'create' ? 'Create Trip' : undefined}
        headerContent={headerContent}
        desktopWidth="980px"
      >
        {content}
      </Drawer>

      {showAddLocation !== null && (
        <AddLocationToTrip
          onAdd={(location) => handleAddLocation(showAddLocation, location)}
          onClose={() => setShowAddLocation(null)}
        />
      )}

      {showShare && (
        <TripShareModal
          tripName={tripName}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
