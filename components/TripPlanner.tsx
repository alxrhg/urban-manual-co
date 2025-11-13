'use client';

import React, { useState, useEffect } from 'react';
import {
  XIcon,
  CalendarIcon,
  MapPinIcon,
  ShareIcon,
  DownloadIcon,
  SparklesIcon,
  PrinterIcon,
  SaveIcon,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { TripDay } from './TripDay';
import { AddLocationToTrip } from './AddLocationToTrip';
import { TripWeatherForecast } from './TripWeatherForecast';
import { TripPackingList } from './TripPackingList';
import { TripShareModal } from './TripShareModal';

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
  cost?: number;
  duration?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

type StoredLocationMeta = {
  raw?: string;
  cost?: number;
  duration?: number;
  mealType?: TripLocation['mealType'];
  image?: string;
  city?: string;
  category?: string;
};

const isStoredLocationMeta = (value: unknown): value is StoredLocationMeta => {
  return typeof value === 'object' && value !== null;
};

interface DayItinerary {
  date: string;
  locations: TripLocation[];
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
  const [showShare, setShowShare] = useState(false);
  const [hotelLocation, setHotelLocation] = useState('');
  const [activeTab, setActiveTab] = useState<'itinerary' | 'weather' | 'packing'>(
    'itinerary'
  );
  const [currentTripId, setCurrentTripId] = useState<string | null>(tripId || null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing trip if tripId is provided
  useEffect(() => {
    if (isOpen && tripId && user) {
      loadTrip(tripId);
    } else if (isOpen && !tripId) {
      // Reset form for new trip
      resetForm();
    }
  }, [isOpen, tripId, user]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  const resetForm = () => {
    setTripName('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setDays([]);
    setHotelLocation('');
    setStep('create');
    setCurrentTripId(null);
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

      setTripName(trip.title);
      setDestination(trip.destination || '');
      setStartDate(trip.start_date || '');
      setEndDate(trip.end_date || '');
      setHotelLocation(trip.description || ''); // Using description for hotel location
      setCurrentTripId(trip.id);

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
        items.forEach((item) => {
          const day = item.day;
          if (!daysMap.has(day)) {
            daysMap.set(day, []);
          }

          // Parse notes for additional data (cost, duration, mealType)
          let notesData: StoredLocationMeta = {};
          if (item.notes) {
            try {
              const parsedNotes = JSON.parse(item.notes) as unknown;
              if (typeof parsedNotes === 'string') {
                notesData = { raw: parsedNotes };
              } else if (isStoredLocationMeta(parsedNotes)) {
                notesData = parsedNotes;
              } else {
                notesData = { raw: String(parsedNotes) };
              }
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
            cost: notesData.cost || undefined,
            duration: notesData.duration || undefined,
            mealType: notesData.mealType || undefined,
          };

          daysMap.get(day)!.push(location);
        });

        // Create days array
        const start = new Date(trip.start_date || Date.now());
        const end = new Date(trip.end_date || Date.now());
        const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const newDays: DayItinerary[] = [];
        for (let i = 0; i < dayCount; i++) {
          const date = new Date(start);
          date.setDate(start.getDate() + i);
          const dayNum = i + 1;
          newDays.push({
            date: date.toISOString().split('T')[0],
            locations: daysMap.get(dayNum) || [],
          });
        }

        setDays(newDays);
      } else {
        // No items, create empty days
        const start = new Date(trip.start_date || Date.now());
        const end = new Date(trip.end_date || Date.now());
        const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const newDays: DayItinerary[] = [];
        for (let i = 0; i < dayCount; i++) {
          const date = new Date(start);
          date.setDate(start.getDate() + i);
          newDays.push({
            date: date.toISOString().split('T')[0],
            locations: [],
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
        });
      }

      setDays(newDays);
      setStep('plan');
    } catch (error) {
      console.error('Error creating trip:', error);
      const message = error instanceof Error ? error.message : undefined;
      alert(message || 'Failed to create trip. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTrip = async (overrideDays?: DayItinerary[]) => {
    if (!currentTripId || !user) {
      alert('No trip to save');
      return;
    }

    setSaving(true);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const daysToPersist = overrideDays ?? days;

      // Update trip details
      const { error: tripError } = await supabaseClient
        .from('trips')
        .update({
          title: tripName,
          description: hotelLocation || null,
          destination: destination,
          start_date: startDate,
          end_date: endDate,
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
        destination_slug: string;
        day: number;
        order_index: number;
        time: string | null;
        title: string;
        description: string;
        notes: string;
      }> = [];
      daysToPersist.forEach((day, dayIndex) => {
        day.locations.forEach((location, locationIndex) => {
          // Store additional data in notes as JSON
          const notesData: StoredLocationMeta = {
            raw: location.notes || '',
            cost: location.cost,
            duration: location.duration,
            mealType: location.mealType,
            image: location.image,
            city: location.city,
            category: location.category,
          };

          itemsToInsert.push({
            trip_id: currentTripId,
            destination_slug: location.name.toLowerCase().replace(/\s+/g, '-'),
            day: dayIndex + 1,
            order_index: locationIndex,
            time: location.time || null,
            title: location.name,
            description: location.category,
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
      console.error('Error saving trip:', error);
      const message = error instanceof Error ? error.message : undefined;
      alert(message || 'Failed to save trip. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async (dayIndex: number, location: TripLocation) => {
    const nextDays = days.map((day, idx) =>
      idx === dayIndex
        ? {
            ...day,
            locations: [...day.locations, location],
          }
        : day
    );
    setDays(nextDays);
    setShowAddLocation(null);

    // Auto-save if trip exists
    if (currentTripId) {
      await handleSaveTrip(nextDays);
    }
  };

  const handleRemoveLocation = async (dayIndex: number, locationId: number) => {
    const nextDays = days.map((day, idx) =>
      idx === dayIndex
        ? {
            ...day,
            locations: day.locations.filter((loc) => loc.id !== locationId),
          }
        : day
    );
    setDays(nextDays);

    // Auto-save if trip exists
    if (currentTripId) {
      await handleSaveTrip(nextDays);
    }
  };

  const handleReorderLocations = async (
    dayIndex: number,
    locations: TripLocation[]
  ) => {
    const nextDays = days.map((day, idx) =>
      idx === dayIndex
        ? {
            ...day,
            locations,
          }
        : day
    );
    setDays(nextDays);

    // Auto-save if trip exists
    if (currentTripId) {
      await handleSaveTrip(nextDays);
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
          // Sort by meal type and time
          const mealOrder = {
            breakfast: 0,
            snack: 1,
            lunch: 2,
            dinner: 3,
          };
          const aOrder = a.mealType ? mealOrder[a.mealType] : 999;
          const bOrder = b.mealType ? mealOrder[b.mealType] : 999;
          return aOrder - bOrder;
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Mobile-Optimized Drawer (bottom sheet) */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 top-[10vh] bg-white dark:bg-gray-950 z-50 rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } overflow-hidden flex flex-col`}
      >
        {/* Close Button - Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center shadow-sm"
          aria-label="Close"
        >
          <XIcon className="h-4 w-4 text-gray-900 dark:text-gray-100" />
        </button>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-24">
          {step === 'create' ? (
            <div className="space-y-8">
              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  Trip Name
                </label>
                <input
                  type="text"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="Summer in Paris"
                  className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  Destination
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Paris, France"
                  className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  Hotel / Base Location (Optional)
                </label>
                <input
                  type="text"
                  value={hotelLocation}
                  onChange={(e) => setHotelLocation(e.target.value)}
                  placeholder="Hotel Le Marais"
                  className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateTrip}
                disabled={!tripName || !destination || !startDate || !endDate || saving || !user}
                className="w-full px-6 py-3 border border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs tracking-wide hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Trip'
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Mobile tabs */}
              {step === 'plan' && (
                <div className="flex items-center gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <button
                    onClick={() => setActiveTab('itinerary')}
                    className={`text-xs transition-colors ${
                      activeTab === 'itinerary'
                        ? 'text-neutral-900 dark:text-neutral-100'
                        : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    Itinerary
                  </button>
                  <button
                    onClick={() => setActiveTab('weather')}
                    className={`text-xs transition-colors ${
                      activeTab === 'weather'
                        ? 'text-neutral-900 dark:text-neutral-100'
                        : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    Weather
                  </button>
                  <button
                    onClick={() => setActiveTab('packing')}
                    className={`text-xs transition-colors ${
                      activeTab === 'packing'
                        ? 'text-neutral-900 dark:text-neutral-100'
                        : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    Packing
                  </button>
                </div>
              )}

              {/* Mobile content - same as desktop but simplified */}
              {activeTab === 'itinerary' && (
                <div className="space-y-8">
                  {days.map((day, index) => (
                    <TripDay
                      key={day.date}
                      dayNumber={index + 1}
                      date={day.date}
                      locations={day.locations}
                      hotelLocation={hotelLocation}
                      onAddLocation={() => setShowAddLocation(index)}
                      onRemoveLocation={(locationId) =>
                        handleRemoveLocation(index, locationId)
                      }
                      onReorderLocations={(locations) =>
                        handleReorderLocations(index, locations)
                      }
                      onDuplicateDay={() => handleDuplicateDay(index)}
                      onOptimizeRoute={() => handleOptimizeRoute(index)}
                    />
                  ))}
                </div>
              )}
              {activeTab === 'weather' && (
                <TripWeatherForecast
                  destination={destination}
                  startDate={startDate}
                  endDate={endDate}
                />
              )}
              {activeTab === 'packing' && (
                <TripPackingList
                  destination={destination}
                  days={days}
                  startDate={startDate}
                  endDate={endDate}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Drawer (right side) */}
      <div
        className={`hidden md:flex fixed right-4 top-4 bottom-4 w-[600px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-950 z-50 shadow-2xl ring-1 ring-black/5 dark:ring-white/5 rounded-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-[calc(100%+2rem)]'
        } overflow-hidden flex-col`}
      >
        {/* Header */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 px-8 py-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.2em] uppercase">
              {step === 'create' ? 'New Trip' : tripName}
            </h2>
            {step === 'plan' && (
              <div className="flex items-center gap-4 pl-6 border-l border-neutral-200 dark:border-neutral-800">
                <button
                  onClick={() => setActiveTab('itinerary')}
                  className={`text-[11px] tracking-wide transition-colors ${
                    activeTab === 'itinerary'
                      ? 'text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  Itinerary
                </button>
                <button
                  onClick={() => setActiveTab('weather')}
                  className={`text-[11px] tracking-wide transition-colors ${
                    activeTab === 'weather'
                      ? 'text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  Weather
                </button>
                <button
                  onClick={() => setActiveTab('packing')}
                  className={`text-[11px] tracking-wide transition-colors ${
                    activeTab === 'packing'
                      ? 'text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  Packing
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 'plan' && (
              <>
                {currentTripId && (
                  <button
                    onClick={() => handleSaveTrip()}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 text-xs border border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save trip"
                  >
                    {saving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <SaveIcon className="w-3 h-3" />
                    )}
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                )}
                <button
                  onClick={() => setShowShare(true)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Share trip"
                >
                  <ShareIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                </button>
                <button
                  onClick={handleExportToCalendar}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Export to calendar"
                >
                  <DownloadIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                </button>
                <button
                  onClick={handlePrint}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Print itinerary"
                >
                  <PrinterIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <XIcon className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'create' ? (
            <div className="p-8 max-w-2xl mx-auto">
              <div className="space-y-8">
                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Trip Name
                  </label>
                  <input
                    type="text"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    placeholder="Summer in Paris"
                    className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Paris, France"
                    className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Hotel / Base Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={hotelLocation}
                    onChange={(e) => setHotelLocation(e.target.value)}
                    placeholder="Hotel Le Marais"
                    className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreateTrip}
                  disabled={!tripName || !destination || !startDate || !endDate || saving || !user}
                  className="w-full px-6 py-3 border border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs tracking-wide hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Trip'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'itinerary' && (
                <div className="p-8">
                  {/* Trip Overview */}
                  <div className="mb-8 pb-8 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400 tracking-wide">
                        <MapPinIcon className="w-3.5 h-3.5" />
                        {destination}
                        <span className="text-neutral-300 dark:text-neutral-600">•</span>
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {new Date(startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        –{' '}
                        {new Date(endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    {/* AI Suggestions */}
                    <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <h4 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase">
                          Smart Suggestions
                        </h4>
                      </div>
                      <ul className="space-y-2">
                        {getAISuggestions().map((suggestion, index) => (
                          <li
                            key={index}
                            className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed"
                          >
                            • {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Days */}
                  <div className="space-y-12">
                    {days.map((day, index) => (
                      <TripDay
                        key={day.date}
                        dayNumber={index + 1}
                        date={day.date}
                        locations={day.locations}
                        hotelLocation={hotelLocation}
                        onAddLocation={() => setShowAddLocation(index)}
                        onRemoveLocation={(locationId) =>
                          handleRemoveLocation(index, locationId)
                        }
                        onReorderLocations={(locations) =>
                          handleReorderLocations(index, locations)
                        }
                        onDuplicateDay={() => handleDuplicateDay(index)}
                        onOptimizeRoute={() => handleOptimizeRoute(index)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'weather' && (
                <TripWeatherForecast
                  destination={destination}
                  startDate={startDate}
                  endDate={endDate}
                />
              )}

              {activeTab === 'packing' && (
                <TripPackingList
                  destination={destination}
                  days={days}
                  startDate={startDate}
                  endDate={endDate}
                />
              )}
            </>
          )}
        </div>
      </div>

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
