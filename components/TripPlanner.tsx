'use client';

import React, { useState, useEffect } from 'react';
import {
  XIcon,
  CalendarIcon,
  MapPinIcon,
  ShareIcon,
  DownloadIcon,
  SparklesIcon,
  WalletIcon,
  PrinterIcon,
  SaveIcon,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { TripDay } from './TripDay';
import { AddLocationToTrip } from './AddLocationToTrip';
import { TripBudgetTracker } from './TripBudgetTracker';
import { TripWeatherForecast } from './TripWeatherForecast';
import { TripPackingList } from './TripPackingList';
import { TripShareModal } from './TripShareModal';

interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  slug?: string;
  time?: string;
  notes?: string;
  cost?: number;
  duration?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface DayItinerary {
  date: string;
  locations: TripLocation[];
  budget?: number;
  notes?: string;
}

type TripSummary = {
  id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
};

type TripPlannerDestination = {
  slug?: string | null;
  name: string;
  city?: string | null;
  category?: string | null;
  image?: string | null;
};

interface TripPlannerProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string;
  initialDestination?: TripPlannerDestination | null;
}

export function TripPlanner({
  isOpen,
  onClose,
  tripId,
  initialDestination,
}: TripPlannerProps) {
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
  const [activeTab, setActiveTab] = useState<
    'itinerary' | 'budget' | 'weather' | 'packing'
  >('itinerary');
  const [currentTripId, setCurrentTripId] = useState<string | null>(tripId || null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableTrips, setAvailableTrips] = useState<TripSummary[]>([]);
  const [pendingLocation, setPendingLocation] = useState<TripLocation | null>(null);
  const [autoAddMessage, setAutoAddMessage] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isOpen || !user) return;
    fetchAvailableTrips();
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen) {
      setPendingLocation(null);
      setAutoAddMessage(null);
      return;
    }

    if (initialDestination) {
      setPendingLocation({
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: initialDestination.name,
        city: initialDestination.city || '',
        category: initialDestination.category || '',
        image: initialDestination.image || '/placeholder-image.jpg',
        slug: initialDestination.slug || undefined,
      });

      if (initialDestination.city && !destination) {
        setDestination(initialDestination.city);
      }
    }
  }, [isOpen, initialDestination, destination]);

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
    setAutoAddMessage(null);
  };

  const fetchAvailableTrips = async () => {
    try {
      const supabaseClient = createClient();
      if (!supabaseClient || !user) return;

      const { data, error } = await supabaseClient
        .from('trips')
        .select('id,title,destination,start_date,end_date')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableTrips((data as TripSummary[]) || []);
    } catch (error) {
      console.error('Error fetching trips list:', error);
      setAvailableTrips([]);
    }
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
          let notesData: any = {};
          if (item.notes) {
            try {
              notesData = JSON.parse(item.notes);
            } catch {
              notesData = { raw: item.notes };
            }
          }

          const location: TripLocation = {
            id: parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now(),
            name: item.title,
            city: notesData.city || destination || '',
            category: notesData.category || item.description || '',
            image: notesData.image || '/placeholder-image.jpg',
            slug: notesData.slug || item.destination_slug || undefined,
            time: item.time || undefined,
            notes:
              typeof notesData === 'string'
                ? notesData
                : notesData.raw || undefined,
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
            budget: 0,
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

      // Update trip (including budget)
      const { error: tripError } = await supabaseClient
        .from('trips')
        .update({
          title: tripName,
          description: hotelLocation || null,
          destination: destination,
          start_date: startDate,
          end_date: endDate,
          budget: totalBudget > 0 ? totalBudget : null,
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
      days.forEach((day, dayIndex) => {
        day.locations.forEach((location, locationIndex) => {
          // Store additional data in notes as JSON
          const notesData: any = {
            raw: location.notes || '',
            cost: location.cost,
            duration: location.duration,
            mealType: location.mealType,
            image: location.image,
            city: location.city,
            category: location.category,
            slug: location.slug,
          };

          itemsToInsert.push({
            trip_id: currentTripId,
            destination_slug:
              location.slug || location.name.toLowerCase().replace(/\s+/g, '-'),
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
    } catch (error: any) {
      console.error('Error saving trip:', error);
      alert(error?.message || 'Failed to save trip. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async (dayIndex: number, location: TripLocation) => {
    setDays((prev) =>
      prev.map((day, idx) => {
        if (idx !== dayIndex) return day;

        const exists = day.locations.some((loc) =>
          location.slug ? loc.slug === location.slug : loc.name === location.name,
        );

        if (exists) {
          return day;
        }

        return {
          ...day,
          locations: [...day.locations, location],
        };
      }),
    );
    setShowAddLocation(null);

    // Auto-save if trip exists
    if (currentTripId) {
      await handleSaveTrip();
    }
  };

  useEffect(() => {
    if (!pendingLocation || step !== 'plan' || days.length === 0) return;

    const alreadyAdded = days.some((day) =>
      day.locations.some((loc) =>
        pendingLocation.slug
          ? loc.slug === pendingLocation.slug
          : loc.name === pendingLocation.name,
      ),
    );

    if (alreadyAdded) {
      setAutoAddMessage(`${pendingLocation.name} is already in your trip`);
      setPendingLocation(null);
      return;
    }

    const addLocationToPlan = async () => {
      try {
        const target = days.reduce(
          (acc, day, index) => {
            if (day.locations.length < acc.count) {
              return { index, count: day.locations.length };
            }
            return acc;
          },
          { index: 0, count: days[0].locations.length },
        );

        await handleAddLocation(target.index, pendingLocation);
        setAutoAddMessage(
          `Added ${pendingLocation.name} to Day ${target.index + 1}`,
        );
      } catch (error) {
        console.error('Error adding destination to trip automatically:', error);
      } finally {
        setPendingLocation(null);
      }
    };

    addLocationToPlan();
  }, [pendingLocation, step, days, handleAddLocation]);

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

  const getTotalSpent = () => {
    return days.reduce((total, day) => {
      return (
        total +
        day.locations.reduce((dayTotal, loc) => dayTotal + (loc.cost || 0), 0)
      );
    }, 0);
  };

  const getAISuggestions = () => {
    // Mock AI suggestions - in real app would call AI API
    return [
      'Consider adding a morning cafe visit before the museum',
      'Your dinner reservation is 2km from your last location - allow 30 min travel time',
      'Weather forecast shows rain on Day 3 - indoor activities recommended',
    ];
  };

  const formatTripDates = (trip: TripSummary) => {
    if (trip.start_date && trip.end_date) {
      return `${new Date(trip.start_date).toLocaleDateString()} – ${new Date(
        trip.end_date,
      ).toLocaleDateString()}`;
    }

    if (trip.start_date) {
      return `Starts ${new Date(trip.start_date).toLocaleDateString()}`;
    }

    if (trip.end_date) {
      return `Ends ${new Date(trip.end_date).toLocaleDateString()}`;
    }

    return 'Dates not set';
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
              {initialDestination && (
                <div className="p-4 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl">
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">
                    We'll add <span className="font-medium">{initialDestination.name}</span> to your itinerary as soon as you pick or create a trip.
                  </p>
                </div>
              )}

              {availableTrips.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase">
                    Continue planning an existing trip
                  </p>
                  <div className="space-y-2">
                    {availableTrips.map((trip) => (
                      <button
                        key={trip.id}
                        onClick={() => loadTrip(trip.id)}
                        className="w-full text-left px-4 py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-neutral-900 dark:hover:border-neutral-100 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm text-neutral-900 dark:text-neutral-100 font-medium">
                              {trip.title}
                            </p>
                            {trip.destination && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {trip.destination}
                              </p>
                            )}
                            <p className="text-xs text-neutral-400 dark:text-neutral-500">
                              {formatTripDates(trip)}
                            </p>
                          </div>
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                            Open
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

              <div>
                <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                  Total Budget (Optional)
                </label>
                <input
                  type="number"
                  value={totalBudget || ''}
                  onChange={(e) => setTotalBudget(Number(e.target.value))}
                  placeholder="2000"
                  className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                />
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
              {autoAddMessage && (
                <div className="flex items-start justify-between gap-4 p-4 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl">
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">
                    {autoAddMessage}
                  </p>
                  <button
                    onClick={() => setAutoAddMessage(null)}
                    className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}

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
                    onClick={() => setActiveTab('budget')}
                    className={`text-xs transition-colors ${
                      activeTab === 'budget'
                        ? 'text-neutral-900 dark:text-neutral-100'
                        : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    Budget
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
              {activeTab === 'budget' && (
                <TripBudgetTracker
                  days={days}
                  totalBudget={totalBudget}
                  onUpdateBudget={setTotalBudget}
                />
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
                  onClick={() => setActiveTab('budget')}
                  className={`text-[11px] tracking-wide transition-colors ${
                    activeTab === 'budget'
                      ? 'text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  Budget
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
                    onClick={handleSaveTrip}
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
                {initialDestination && (
                  <div className="p-5 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl">
                    <p className="text-sm text-neutral-700 dark:text-neutral-200">
                      We'll add <span className="font-medium">{initialDestination.name}</span> once you choose a trip.
                    </p>
                  </div>
                )}

                {availableTrips.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase">
                      Continue planning an existing trip
                    </p>
                    <div className="space-y-2">
                      {availableTrips.map((trip) => (
                        <button
                          key={trip.id}
                          onClick={() => loadTrip(trip.id)}
                          className="w-full text-left px-5 py-4 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-neutral-900 dark:hover:border-neutral-100 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm text-neutral-900 dark:text-neutral-100 font-medium">
                                {trip.title}
                              </p>
                              {trip.destination && (
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {trip.destination}
                                </p>
                              )}
                              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                                {formatTripDates(trip)}
                              </p>
                            </div>
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em]">
                              Open
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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

                <div>
                  <label className="block text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.15em] uppercase mb-3">
                    Total Budget (Optional)
                  </label>
                  <input
                    type="number"
                    value={totalBudget || ''}
                    onChange={(e) => setTotalBudget(Number(e.target.value))}
                    placeholder="2000"
                    className="w-full px-0 py-3 bg-transparent border-b border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
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
              {autoAddMessage && (
                <div className="mx-8 mt-8 flex items-start justify-between gap-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 px-6 py-4">
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">
                    {autoAddMessage}
                  </p>
                  <button
                    onClick={() => setAutoAddMessage(null)}
                    className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}

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
                        {totalBudget > 0 && (
                          <>
                            <span className="text-neutral-300 dark:text-neutral-600">•</span>
                            <WalletIcon className="w-3.5 h-3.5" />$
                            {getTotalSpent()} / ${totalBudget}
                          </>
                        )}
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

              {activeTab === 'budget' && (
                <TripBudgetTracker
                  days={days}
                  totalBudget={totalBudget}
                  onUpdateBudget={setTotalBudget}
                />
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
