'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarIcon,
  ShareIcon,
  DownloadIcon,
  SparklesIcon,
  PrinterIcon,
  SaveIcon,
  Loader2,
  Camera,
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

  const timelineEntries = days.map((day, index) => ({
    label: `Day ${index + 1}`,
    date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    stops: day.locations.length,
  }));

  // Build custom header with tabs and actions
  const headerContent = step === 'plan' ? (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] tracking-[0.3em] text-gray-400 dark:text-gray-500 uppercase">Itinerary Studio</p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {tripName || 'Untitled trip'}
            </h2>
            {destination && (
              <span className="text-xs px-3 py-1 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                {destination}
              </span>
            )}
            {days.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {days.length} day{days.length === 1 ? '' : 's'} · {totalStops} stop{totalStops === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {formattedRange && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{formattedRange}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currentTripId && (
            <button
              onClick={handleSaveTrip}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save trip"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="w-3 h-3" />
                  Save
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setShowShare(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            title="Share trip"
          >
            <ShareIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={handleExportToCalendar}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            title="Export to calendar"
          >
            <DownloadIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={handlePrint}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            title="Print itinerary"
          >
            <PrinterIcon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  ) : undefined;

  const renderCreateStep = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-white p-6">
        <p className="text-[11px] tracking-[0.4em] uppercase text-white/60 mb-2">Step 1</p>
        <h2 className="text-xl font-semibold mb-3">Design the outline of your trip</h2>
        <p className="text-sm text-white/70 max-w-2xl">
          Give the trip a name, anchor it to a destination, and set your dates. We will craft the planning workspace based on these foundations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-5">
          <div>
            <label htmlFor="trip-name" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
              Trip Name *
            </label>
            <input
              id="trip-name"
              type="text"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="Summer in Paris"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100 transition-colors text-sm"
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
              placeholder="Paris, France"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100 transition-colors text-sm"
            />
          </div>

          <div>
            <label htmlFor="hotel" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
              Base or hotel
            </label>
            <input
              id="hotel"
              type="text"
              value={hotelLocation}
              onChange={(e) => setHotelLocation(e.target.value)}
              placeholder="Hotel Le Marais"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100 transition-colors text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                Start Date *
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100 transition-colors text-sm"
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
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100 transition-colors text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="budget" className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
              Total Budget
            </label>
            <input
              id="budget"
              type="number"
              value={totalBudget || ''}
              onChange={(e) => setTotalBudget(Number(e.target.value))}
              placeholder="2000"
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 focus:outline-none focus:border-gray-900 dark:focus:border-gray-100 transition-colors text-sm"
            />
          </div>

          <button
            onClick={handleCreateTrip}
            disabled={!tripName || !destination || !startDate || !endDate || saving || !user}
            className="w-full px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create trip workspace'
            )}
          </button>
        </div>

        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-6 flex flex-col gap-6">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500 mb-2">Live preview</p>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{tripName || 'Your next escape'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {destination ? `Planning around ${destination}` : 'Add a destination to unlock tailored suggestions'}
            </p>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <CalendarIcon className="w-4 h-4" />
                {formattedRange || 'Select dates to see the rhythm of your trip'}
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-4 space-y-4">
              {previewTimeline.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Once you add dates we will map out each day for you.
                </div>
              ) : (
                previewTimeline.map((entry) => (
                  <div key={entry.label} className="flex items-center justify-between text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">{entry.label}</div>
                    <div className="text-gray-500 dark:text-gray-400">{entry.date}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <SparklesIcon className="w-4 h-4" />
            AI suggestions unlock after you create the trip.
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlanStep = () => (
    <div className="space-y-8">
      <div className="rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950">
        <div className="grid lg:grid-cols-3">
          <div className="lg:col-span-2 relative h-56 md:h-64 bg-gray-200 dark:bg-gray-800">
            <Image
              src={heroImage}
              alt={tripName || 'Trip cover'}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 66vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white space-y-1">
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">Destination</p>
              <h3 className="text-2xl font-semibold">{destination || 'Set a destination'}</h3>
              {formattedRange && <p className="text-sm text-white/80">{formattedRange}</p>}
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500 mb-2">Logistics</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Start</p>
                  <p className="text-gray-900 dark:text-white font-medium">{startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">End</p>
                  <p className="text-gray-900 dark:text-white font-medium">{endDate ? new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Base</p>
                  <p className="text-gray-900 dark:text-white font-medium">{hotelLocation || 'Add base'}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Status</p>
                  <p className="text-gray-900 dark:text-white font-medium capitalize">planning</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
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
                className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900/60 transition-colors cursor-pointer text-sm font-medium"
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
              {(coverImage || coverImagePreview) && (
                <button
                  onClick={() => {
                    setCoverImage(null);
                    setCoverImageFile(null);
                    setCoverImagePreview(null);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
                >
                  Remove cover image
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 flex flex-wrap items-center gap-6 justify-between">
        <div className="space-y-3">
          <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500">Workflow</p>
          <div className="flex flex-wrap items-center gap-4">
            {['Set foundations', 'Design each day', 'Share & export'].map((stepLabel, index) => (
              <div key={stepLabel} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${index === 1 ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                  {index + 1}
                </div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{stepLabel}</span>
                {index < 2 && <div className="w-10 h-px bg-gray-200 dark:bg-gray-700" />}
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleAddDay}
            className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/60"
          >
            Add another day
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium"
          >
            Share link
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {days.map((day, index) => (
            <div key={day.date} className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 sm:p-6">
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
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>{day.locations.length > 0 ? `${day.locations.length} planned stop${day.locations.length === 1 ? '' : 's'}` : 'No stops yet'}</span>
                <button
                  onClick={() => setShowAddLocation(index)}
                  className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900/60"
                >
                  Add location
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-950">
            <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500 mb-4">Trip timeline</p>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {timelineEntries.map((entry) => (
                <div key={entry.label} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{entry.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{entry.date}</p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{entry.stops} stop{entry.stops === 1 ? '' : 's'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 p-6 bg-gray-50 dark:bg-gray-900/40 space-y-4">
            <p className="text-[11px] tracking-[0.3em] uppercase text-gray-500 dark:text-gray-400">Quick actions</p>
            <button
              onClick={() => setShowAddLocation(0)}
              className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              Add featured place
            </button>
            <button
              onClick={handleSaveTrip}
              disabled={saving}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50"
            >
              Save itinerary
            </button>
            <button
              onClick={handleExportToCalendar}
              className="w-full px-4 py-3 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
            >
              Export to calendar
            </button>
          </div>

          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-950">
            <p className="text-[11px] tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500 mb-4">Stats</p>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Days planned</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{days.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Stops</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{totalStops}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Budget</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{totalBudget ? `$${totalBudget.toLocaleString()}` : 'Add budget'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Base</dt>
                <dd className="text-gray-900 dark:text-white font-medium">{hotelLocation || 'Unset'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

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
