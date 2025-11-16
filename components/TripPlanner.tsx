'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CalendarIcon,
  MapPinIcon,
  ShareIcon,
  DownloadIcon,
  SparklesIcon,
  WalletIcon,
  PrinterIcon,
  SaveIcon,
  Loader2,
  X,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
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

const plannerPhases = [
  {
    key: 'brief',
    label: 'Brief',
    description: 'Trip name, destination, dates, and guardrails.',
  },
  {
    key: 'compose',
    label: 'Itinerary',
    description: 'Build each day with curated stops and pacing.',
  },
  {
    key: 'polish',
    label: 'Polish & Share',
    description: 'Add cover art, notes, and export-ready outputs.',
  },
] as const;

export function TripPlanner({ isOpen, onClose, tripId }: TripPlannerProps) {
  const { user } = useAuth();
  const router = useRouter();
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
  const [justSaved, setJustSaved] = useState(false);
  const saveFeedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useToast();

  // Load existing trip if tripId is provided
  useEffect(() => {
    if (isOpen && tripId && user) {
      loadTrip(tripId);
    } else if (isOpen && !tripId) {
      // Reset form for new trip
      resetForm();
    }
  }, [isOpen, tripId, user]);

  // Body scroll is handled by Drawer component

    useEffect(() => {
      return () => {
        if (saveFeedbackTimeout.current) {
          clearTimeout(saveFeedbackTimeout.current);
        }
      };
    }, []);

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
  };

  const loadTrip = async (id: string) => {
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
            city: destination || '',
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
    } catch (error: any) {
      console.error('Error creating trip:', error);
      alert(error?.message || 'Failed to create trip. Please try again.');
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
        } catch (error: any) {
          console.error('Cover image upload error:', error);
          toast.error(`Cover image upload failed: ${error.message}`);
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

        setJustSaved(true);
        if (saveFeedbackTimeout.current) {
          clearTimeout(saveFeedbackTimeout.current);
        }
        saveFeedbackTimeout.current = setTimeout(() => {
          setJustSaved(false);
        }, 2500);
    } catch (error: any) {
      console.error('Error saving trip:', error);
      alert(error?.message || 'Failed to save trip. Please try again.');
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

    days.forEach((day, dayIndex) => {
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

  const handlePrint = () => {
    window.print();
  };

  const getAISuggestions = () => {
    // Mock AI suggestions - in real app would call AI API
    return [
      'Consider adding a morning cafe visit before the museum',
      'Your dinner reservation is 2km from your last location - allow 30 min travel time',
      'Weather forecast shows rain on Day 3 - indoor activities recommended',
    ];
  };

    const headerSubtitle =
      step === 'create'
        ? 'Start with the brief so pacing, neighborhoods, and tone feel intentional.'
        : 'Fine tune days, sync exports, and keep the itinerary editorial-tight.';

    const headerContent = (
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
              Trip Studio
            </p>
            <h2 className="text-base font-medium text-gray-900 dark:text-white">
              {step === 'create' ? 'Launch a new itinerary' : tripName || 'Untitled trip'}
            </h2>
          </div>
          {step === 'plan' && currentTripId && (
            <button
              onClick={handleSaveTrip}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save trip"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving
                </>
              ) : justSaved ? (
                <>
                  <SaveIcon className="w-3 h-3" />
                  Saved
                </>
              ) : (
                <>
                  <SaveIcon className="w-3 h-3" />
                  Save
                </>
              )}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {headerSubtitle}
        </p>
      </div>
    );

    const activePhaseIndex = step === 'create' ? 0 : 1;
    const formattedDateRange = (() => {
      if (!startDate) return 'Add dates';
      const start = new Date(startDate);
      if (!endDate) {
        return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      const end = new Date(endDate);
      const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endOptions: Intl.DateTimeFormatOptions = { day: 'numeric' };
      if (start.getMonth() !== end.getMonth()) {
        endOptions.month = 'short';
      }
      const endLabel = end.toLocaleDateString('en-US', endOptions);
      return `${startLabel} – ${endLabel}`;
    })();
    const daysLabel = days.length ? `${days.length} day${days.length > 1 ? 's' : ''} planned` : 'No days yet';
    const totalStops = days.reduce((sum, day) => sum + day.locations.length, 0);

    const content = (
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {plannerPhases.map((phase, index) => {
            const isActive = index === activePhaseIndex;
            const isComplete = index < activePhaseIndex;
            return (
              <div
                key={phase.key}
                className={`rounded-2xl border p-4 ${
                  isActive
                    ? 'bg-black text-white border-black dark:border-white'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs uppercase tracking-[0.25em] ${
                      isActive ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {phase.label}
                  </span>
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive
                        ? 'bg-white text-black'
                        : isComplete
                          ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </span>
                </div>
                <p
                  className={`text-sm ${
                    isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {phase.description}
                </p>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading trip...</p>
          </div>
        ) : step === 'create' ? (
          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-black to-gray-900 text-white p-6 space-y-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-white/60">
                  Trip Studio • Brief
                </div>
                <h3 className="text-2xl font-light leading-tight">
                  Name the trip, lock dates, and tell us the tone—everything downstream inherits it.
                </h3>
                <p className="text-sm text-white/80">
                  The brief powers pacing suggestions, keeps neighborhoods intentional, and ensures exports look editorial—not spreadsheet.
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-white/70">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-white/20">
                    <SparklesIcon className="w-3.5 h-3.5" />
                    Brief → Compose → Polish
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-white/20">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    Keep cadence calm
                  </span>
                </div>
              </div>
              <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                    Trip basics
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Set the context so the itinerary feels intentional.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="trip-name" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Trip Name *
                    </label>
                    <input
                      id="trip-name"
                      type="text"
                      value={tripName}
                      onChange={(e) => setTripName(e.target.value)}
                      placeholder="Kyoto in Four Days"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="destination" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Destination *
                    </label>
                    <input
                      id="destination"
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Kyoto, Japan"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="hotel" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Hotel / Base
                    </label>
                    <input
                      id="hotel"
                      type="text"
                      value={hotelLocation}
                      onChange={(e) => setHotelLocation(e.target.value)}
                      placeholder="Aman Kyoto"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                    Dates & pacing
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="start-date" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Start Date *
                    </label>
                    <input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="end-date" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                      End Date *
                    </label>
                    <input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="budget" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Budget (optional)
                    </label>
                    <input
                      id="budget"
                      type="number"
                      value={totalBudget || ''}
                      onChange={(e) => setTotalBudget(Number(e.target.value))}
                      placeholder="4500"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleCreateTrip}
                  disabled={!tripName || !destination || !startDate || !endDate || saving || !user}
                  className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating
                    </>
                  ) : (
                    'Continue to itinerary'
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                  Preview
                </p>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-3">
                    <MapPinIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Destination</p>
                      <p>{destination || 'Add a city'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Dates</p>
                      <p>{formattedDateRange}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <WalletIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Budget</p>
                      <p>{totalBudget ? `$${totalBudget.toLocaleString()}` : 'Optional'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                  Guardrails
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  <li>• Keep 3–6 anchor experiences per day for a calm pace.</li>
                  <li>• Mix neighborhoods so the flow feels intentional.</li>
                  <li>• Add quick notes to capture why a stop matters.</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Need fresh inspiration while planning? Jump back into the guide, save a few places, and return here to slot them into each day.
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  type="button"
                >
                  Browse the guide
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-8">
            <div className="space-y-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                    Itinerary
                  </p>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {tripName || 'Untitled trip'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {daysLabel} · {totalStops} stops tracked
                  </p>
                </div>
                <button
                  onClick={() => setStep('create')}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  type="button"
                >
                  Edit brief
                </button>
              </div>

              <div className="space-y-10">
                {days.map((day, index) => (
                  <TripDay
                    key={day.date}
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
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                      Trip summary
                    </p>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                      {destination || 'Add destination'}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formattedDateRange}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full border border-gray-200 dark:border-gray-800 text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Planning
                  </span>
                </div>
                {hotelLocation && (
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <MapPinIcon className="w-4 h-4" />
                    {hotelLocation}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                    Cover image
                  </p>
                  {(coverImage || coverImagePreview) && (
                    <button
                      onClick={() => {
                        setCoverImage(null);
                        setCoverImageFile(null);
                        setCoverImagePreview(null);
                        const input = document.getElementById('cover-image-input') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                      className="text-xs text-red-500 hover:text-red-600"
                      type="button"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {(coverImage || coverImagePreview) ? (
                    <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={coverImagePreview || coverImage || ''}
                        alt="Cover preview"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 400px"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                      Add a cover image to set the tone.
                    </div>
                  )}
                  <div>
                    <input
                      id="cover-image-input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCoverImageFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setCoverImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="cover-image-input"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer text-sm font-medium"
                    >
                      {uploadingCover ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          {coverImage || coverImagePreview ? 'Change cover image' : 'Upload cover image'}
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
                  Outputs & sharing
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowShare(true)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <span>Share private link</span>
                    <ShareIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleExportToCalendar}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <span>Export to calendar</span>
                    <DownloadIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handlePrint}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <span>Print layout</span>
                    <PrinterIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
                  <SparklesIcon className="w-4 h-4" />
                  Smart suggestions
                </div>
                <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  {getAISuggestions().map((suggestion, index) => (
                    <li key={index}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
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
          desktopWidth="960px"
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
