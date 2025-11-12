'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAddItineraryItemMutation,
  useBatchUpdateItineraryMutation,
  useCreateTripMutation,
  useTripQuery,
  useTripsQuery,
  useUpdateTripMutation,
  type TripDetailResponse,
  type TripRecord,
  type TripSummary as TripSummaryRecord,
} from '@/features/trips/api';
import { useRouter } from 'next/navigation';
import { TripDay } from './TripDay';
import { AddLocationToTrip } from './AddLocationToTrip';
import { TripBudgetTracker } from './TripBudgetTracker';
import { TripWeatherForecast } from './TripWeatherForecast';
import { TripPackingList } from './TripPackingList';
import { TripShareModal } from './TripShareModal';

interface TripPlannerProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string; // If provided, load existing trip
  initialDestination?: {
    slug: string;
    name: string;
    city?: string | null;
    category?: string | null;
  };
}

type TripSummary = TripSummaryRecord;

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

interface DayItinerary {
  date: string;
  locations: TripLocation[];
  budget?: number;
  notes?: string;
}

export function TripPlanner({ isOpen, onClose, tripId, initialDestination }: TripPlannerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState<DayItinerary[]>([]);
  const [showAddLocation, setShowAddLocation] = useState<number | null>(null);
  const [step, setStep] = useState<'select' | 'create' | 'plan'>('create');
  const [totalBudget, setTotalBudget] = useState<number>(0);
  const [showShare, setShowShare] = useState(false);
  const [hotelLocation, setHotelLocation] = useState('');
  const [activeTab, setActiveTab] = useState<
    'itinerary' | 'budget' | 'weather' | 'packing'
  >('itinerary');
  const [currentTripId, setCurrentTripId] = useState<string | null>(tripId || null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tripSummaries, setTripSummaries] = useState<TripSummary[]>([]);
  const [addingToTripId, setAddingToTripId] = useState<string | null>(null);
  const [bypassSelection, setBypassSelection] = useState(false);
  const [isHydratingTrip, setIsHydratingTrip] = useState(false);

  const tripsQuery = useTripsQuery({ enabled: isOpen && step === 'select' });
  const tripQuery = useTripQuery(currentTripId ?? undefined, {
    enabled: !!currentTripId,
  });
  const createTripMutation = useCreateTripMutation();
  const updateTripMutation = useUpdateTripMutation();
  const batchUpdateItineraryMutation = useBatchUpdateItineraryMutation();
  const addItineraryItemMutation = useAddItineraryItemMutation();
  const loadingTripSummaries = tripsQuery.isLoading || tripsQuery.isFetching;
  const { refetch: refetchTrips } = tripsQuery;
  const { refetch: refetchTrip } = tripQuery;
  const notify = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      if (window.showToast) {
        window.showToast(message, type);
      } else if (type === 'error' || type === 'warning') {
        alert(message);
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen) {
      setBypassSelection(false);
    }
  }, [isOpen]);

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

  const resetForm = useCallback((options?: { preserveTrip?: boolean }) => {
    setTripName('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setDays([]);
    setTotalBudget(0);
    setHotelLocation('');
    setActiveTab('itinerary');
    setIsHydratingTrip(false);
    setLoading(false);
    if (!options?.preserveTrip) {
      setCurrentTripId(null);
    }
  }, []);

  const hydrateTripState = useCallback(
    (trip: TripRecord, items: TripDetailResponse['items']) => {
      setTripName(trip.title ?? '');
      setDestination(trip.destination ?? '');
      setStartDate(trip.start_date ?? '');
      setEndDate(trip.end_date ?? '');
      setHotelLocation(trip.description ?? '');
      setTotalBudget(trip.budget ?? 0);
      setCurrentTripId(trip.id);

      const start = trip.start_date ? new Date(trip.start_date) : new Date();
      const end = trip.end_date ? new Date(trip.end_date) : start;
      const dayCount = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      );

      const daysMap = new Map<number, TripLocation[]>();

      items.forEach((item) => {
        if (!daysMap.has(item.day)) {
          daysMap.set(item.day, []);
        }

        let notesData: any = {};
        if (item.notes) {
          try {
            notesData = JSON.parse(item.notes);
          } catch {
            notesData = { raw: item.notes };
          }
        }

        const location: TripLocation = {
          id:
            (item.id && parseInt(item.id.replace(/-/g, '').substring(0, 10), 16)) ||
            Date.now() + Math.random(),
          name: item.title,
          city: notesData.city || trip.destination || '',
          category: notesData.category || item.description || '',
          image: notesData.image || '/placeholder-image.jpg',
          time: item.time || undefined,
          notes:
            typeof notesData === 'string'
              ? notesData
              : notesData.raw || undefined,
          cost: typeof notesData.cost === 'number' ? notesData.cost : undefined,
          duration:
            typeof notesData.duration === 'number' ? notesData.duration : undefined,
          mealType: notesData.mealType || undefined,
        };

        daysMap.get(item.day)!.push(location);
      });

      const newDays: DayItinerary[] = [];
      for (let i = 0; i < dayCount; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const dayNumber = i + 1;
        newDays.push({
          date: date.toISOString().split('T')[0],
          locations: daysMap.get(dayNumber) || [],
          budget: 0,
        });
      }

      setDays(newDays);
    },
    []
  );

  const loadTrip = useCallback(
    (id: string) => {
      setStep('plan');
      setActiveTab('itinerary');
      setShowAddLocation(null);
      setIsHydratingTrip(true);
      setLoading(true);

      if (currentTripId === id) {
        refetchTrip();
      } else {
        setCurrentTripId(id);
      }
    },
    [currentTripId, refetchTrip]
  );

  // Initialize drawer state based on provided props
  useEffect(() => {
    if (!isOpen) return;

    if (tripId && user) {
      resetForm();
      loadTrip(tripId);
      return;
    }

    if (initialDestination) {
      if (bypassSelection || step === 'plan') return;
      if (step !== 'select') {
        resetForm();
        setStep('select');
        refetchTrips();
      }
      return;
    }

    resetForm();
    setStep('create');
  }, [bypassSelection, initialDestination, isOpen, loadTrip, refetchTrips, resetForm, step, tripId, user]);

  useEffect(() => {
    if (tripsQuery.data) {
      setTripSummaries(tripsQuery.data);
    }
  }, [tripsQuery.data]);

  useEffect(() => {
    if (tripsQuery.error) {
      console.error('Error loading trips:', tripsQuery.error);
      setTripSummaries([]);
      notify('Failed to load trips', 'error');
    }
  }, [notify, tripsQuery.error]);

  useEffect(() => {
    if (!isHydratingTrip || !tripQuery.data) return;

    hydrateTripState(tripQuery.data.trip, tripQuery.data.items);
    setLoading(false);
    setIsHydratingTrip(false);
  }, [hydrateTripState, isHydratingTrip, tripQuery.data]);

  useEffect(() => {
    if (!isHydratingTrip || !tripQuery.error) return;

    console.error('Error loading trip:', tripQuery.error);
    setLoading(false);
    setIsHydratingTrip(false);
    notify('Failed to load trip', 'error');
  }, [isHydratingTrip, notify, tripQuery.error]);

  const handleAddDestinationToTrip = async (targetTripId: string) => {
    if (!user) return;

    if (!initialDestination) {
      loadTrip(targetTripId);
      return;
    }

    setAddingToTripId(targetTripId);
    try {
      await addItineraryItemMutation.mutateAsync({
        tripId: targetTripId,
        title: initialDestination.name,
        description: initialDestination.category || '',
        destinationSlug: initialDestination.slug,
        notes: {
          raw: '',
          cost: undefined,
          duration: undefined,
          mealType: undefined,
          image: undefined,
          city: initialDestination.city || undefined,
          category: initialDestination.category || undefined,
        },
      });

      notify('Destination added to trip', 'success');
      setBypassSelection(true);
      loadTrip(targetTripId);
      refetchTrips();
    } catch (error: any) {
      console.error('Error adding destination to trip:', error);
      notify(error?.message || 'Failed to add destination to trip. Please try again.', 'error');
    } finally {
      setAddingToTripId(null);
    }
  };

  const handleCreateTrip = async () => {
    if (!tripName || !destination || !startDate || !endDate || !user) {
      notify('Please fill in all required fields', 'warning');
      return;
    }

    setSaving(true);
    try {
      const trip = await createTripMutation.mutateAsync({
        title: tripName,
        destination,
        startDate,
        endDate,
        description: hotelLocation || null,
        status: 'planning',
        budget: totalBudget > 0 ? totalBudget : null,
      });

      if (initialDestination) {
        await handleAddDestinationToTrip(trip.id);
        return;
      }

      notify('Trip created', 'success');
      hydrateTripState(trip, []);
      setStep('plan');
      setActiveTab('itinerary');
      setLoading(false);
      setIsHydratingTrip(false);
    } catch (error: any) {
      console.error('Error creating trip:', error);
      notify(error?.message || 'Failed to create trip. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTrip = async (
    options: { showSuccess?: boolean; trackSaving?: boolean } = {}
  ) => {
    if (!currentTripId || !user) {
      notify('No trip to save', 'warning');
      return;
    }

    const { showSuccess = true, trackSaving = true } = options;
    if (trackSaving) {
      setSaving(true);
    }
    try {
      await updateTripMutation.mutateAsync({
        tripId: currentTripId,
        title: tripName,
        destination,
        startDate,
        endDate,
        description: hotelLocation || null,
        status: 'planning',
        budget: totalBudget > 0 ? totalBudget : null,
      });

      const itemsToPersist = days.flatMap((day, dayIndex) =>
        day.locations.map((location, locationIndex) => ({
          destination_slug: location.name.toLowerCase().replace(/\s+/g, '-'),
          day: dayIndex + 1,
          order_index: locationIndex,
          time: location.time || null,
          title: location.name,
          description: location.category || '',
          notes: {
            raw: location.notes || '',
            cost: location.cost,
            duration: location.duration,
            mealType: location.mealType,
            image: location.image,
            city: location.city,
            category: location.category,
          },
        }))
      );

      await batchUpdateItineraryMutation.mutateAsync({
        tripId: currentTripId,
        items: itemsToPersist,
      });

      if (showSuccess) {
        notify('Trip saved', 'success');
      }
    } catch (error: any) {
      console.error('Error saving trip:', error);
      notify(error?.message || 'Failed to save trip. Please try again.', 'error');
    } finally {
      if (trackSaving) {
        setSaving(false);
      }
    }
  };

  const handleSaveTripClick = useCallback(() => {
    void handleSaveTrip();
  }, [handleSaveTrip]);

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
      await handleSaveTrip({ showSuccess: false, trackSaving: false });
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
      await handleSaveTrip({ showSuccess: false, trackSaving: false });
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
      await handleSaveTrip({ showSuccess: false, trackSaving: false });
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

  const plannerTabs: { id: typeof activeTab; label: string }[] = [
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'budget', label: 'Budget' },
    { id: 'weather', label: 'Weather' },
    { id: 'packing', label: 'Packing' },
  ];

  const baseTranslateClass = isOpen ? 'translate-x-0' : 'translate-x-full';
  const desktopTranslateClass = isOpen ? 'md:translate-x-0' : 'md:translate-x-[calc(100%+1.5rem)]';

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

      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full transform transition-transform duration-300 ease-in-out ${baseTranslateClass} ${desktopTranslateClass} md:inset-y-auto md:top-4 md:bottom-4 md:w-auto md:right-4`}
      >
        <div
          className="flex h-full w-full flex-col bg-white shadow-2xl dark:bg-gray-950 md:w-[640px] md:max-w-[640px] md:rounded-3xl md:ring-1 md:ring-black/5 md:border md:border-gray-200 dark:md:border-gray-800 md:overflow-hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 px-5 py-6 md:px-8 md:py-8 dark:border-gray-800">
              <div>
              <p className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                {step === 'plan'
                  ? 'Trip planner'
                  : step === 'select'
                  ? 'Add to trip'
                  : 'Start a trip'}
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {step === 'plan'
                  ? tripName || 'Untitled trip'
                  : step === 'select'
                  ? `Add “${initialDestination?.name ?? ''}” to a trip`
                  : 'Create a new itinerary'}
              </h2>
              {step === 'plan' && destination && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{destination}</p>
              )}
              {step === 'select' && initialDestination?.city && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{initialDestination.city}</p>
              )}
                </div>
            <div className="flex flex-wrap items-center gap-2">
            {step === 'plan' && (
              <>
                {currentTripId && (
                  <button
                    onClick={handleSaveTripClick}
                    disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3.5 py-2 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-900/60"
                    title="Save trip"
                  >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SaveIcon className="h-3.5 w-3.5" />}
                      {saving ? 'Saving…' : 'Save'}
                  </button>
                )}
                <button
                  onClick={() => setShowShare(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-800 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
                  title="Share trip"
                >
                    <ShareIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={handleExportToCalendar}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-800 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
                  title="Export to calendar"
                >
                    <DownloadIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={handlePrint}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-800 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
                  title="Print itinerary"
                >
                    <PrinterIcon className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-800 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700"
                aria-label="Close"
            >
                <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8 md:py-8">
            {step === 'select' && initialDestination ? (
              <div className="space-y-8">
                <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
                  <div className="flex flex-col gap-4">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[3px] text-gray-500 dark:text-gray-400">
                      Add to trip
                    </span>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Add “{initialDestination.name}” to your itinerary
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Choose an itinerary that fits this spot or start a new plan that mirrors the homepage’s clean structure.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {initialDestination.city && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[2px] text-gray-600 dark:border-gray-700 dark:text-gray-300">
                          <MapPinIcon className="h-3.5 w-3.5" />
                          {initialDestination.city}
                        </span>
                      )}
                      {initialDestination.category && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[2px] text-gray-600 dark:border-gray-700 dark:text-gray-300">
                          <SparklesIcon className="h-3.5 w-3.5" />
                          {initialDestination.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[3px] text-gray-500 dark:text-gray-400">
                      Your itineraries
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">Tap to keep building</span>
                  </div>
                  {loadingTripSummaries ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : tripSummaries.length > 0 ? (
                    <div className="space-y-3">
                      {tripSummaries.map((trip) => (
                        <button
                          key={trip.id}
                          onClick={() => handleAddDestinationToTrip(trip.id)}
                          disabled={addingToTripId === trip.id}
                          className="group flex w-full items-start justify-between gap-4 rounded-3xl border border-gray-200 bg-white/95 p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-900/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-950/80 dark:hover:border-gray-700 dark:hover:bg-gray-900"
                        >
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[0.65rem] font-semibold uppercase tracking-[2px] text-gray-400 dark:text-gray-500">
                                Itinerary
                              </span>
                              <span className="text-[0.65rem] font-medium uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                                Updated {new Date(trip.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 transition-colors group-hover:text-gray-600 dark:text-white dark:group-hover:text-gray-200">
                              {trip.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              {trip.destination && <span className="uppercase tracking-[2px]">{trip.destination}</span>}
                              {(trip.start_date || trip.end_date) && (
                                <span>
                                  {[trip.start_date, trip.end_date]
                                    .filter(Boolean)
                                    .map((date) => (date ? new Date(date).toLocaleDateString() : ''))
                                    .join(' – ')}
                                </span>
                              )}
                            </div>
                          </div>
                          {addingToTripId === trip.id ? (
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          ) : (
                            <ArrowRight className="h-5 w-5 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-gray-200 bg-white/90 p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-400">
                      You haven’t created any trips yet. Start a new itinerary below.
                    </div>
                  )}
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-gray-900 bg-black px-6 py-7 text-white shadow-xl dark:border-gray-100 dark:bg-white dark:text-black">
                  <div className="pointer-events-none absolute inset-0 opacity-80 [background:radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_rgba(255,255,255,0)_60%)] dark:[background:radial-gradient(circle_at_top,_rgba(0,0,0,0.14),_rgba(0,0,0,0)_60%)]" aria-hidden="true" />
                  <div className="relative flex flex-col gap-5">
                    <span className="inline-flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[3px]">
                      <SparklesIcon className="h-4 w-4" />
                      Start fresh
                    </span>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-semibold leading-snug">
                        Start a new itinerary for this destination
                      </h3>
                      <p className="text-sm text-gray-300 dark:text-gray-600">
                        We’ll prefill the essentials so you can curate days, budgets, and highlights with the same polish as the homepage grid.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setBypassSelection(true);
                          resetForm();
                          setTripName(initialDestination.name);
                          if (initialDestination.city) {
                            setDestination(initialDestination.city);
                          }
                          setStep('create');
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[2px] text-black transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/40 dark:bg-black dark:text-white dark:focus:ring-black/40"
                      >
                        Start a new trip
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : step === 'create' ? (
              <div className="mx-auto max-w-3xl space-y-8">
                <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white/95 px-6 py-8 shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
                  <div className="flex flex-col gap-4">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[3px] text-gray-500 dark:text-gray-400">
                      New trip
                    </span>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Build your itinerary in our signature style
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Define the essentials and we’ll keep everything structured just like the homepage layout you’re used to.
                      </p>
                    </div>
                    {(initialDestination?.name || initialDestination?.city) && (
                      <div className="flex flex-wrap items-center gap-2">
                        {initialDestination?.name && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[2px] text-gray-600 dark:border-gray-700 dark:text-gray-300">
                            <SparklesIcon className="h-3.5 w-3.5" />
                            {initialDestination.name}
                          </span>
                        )}
                        {initialDestination?.city && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[2px] text-gray-600 dark:border-gray-700 dark:text-gray-300">
                            <MapPinIcon className="h-3.5 w-3.5" />
                            {initialDestination.city}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                        Trip name *
                      </label>
                      <input
                        type="text"
                        value={tripName}
                        onChange={(e) => setTripName(e.target.value)}
                        placeholder="Summer in Paris"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                        Destination *
                      </label>
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Paris, France"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                        Hotel / base location
                      </label>
                      <input
                        type="text"
                        value={hotelLocation}
                        onChange={(e) => setHotelLocation(e.target.value)}
                        placeholder="Hotel Le Marais"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                        Start date *
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:ring-gray-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                        End date *
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:ring-gray-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                        Total budget
                      </label>
                      <input
                        type="number"
                        value={totalBudget || ''}
                        onChange={(e) => setTotalBudget(Number(e.target.value))}
                        placeholder="2000"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
                      />
                    </div>
                  </div>
                  <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 font-medium uppercase tracking-[2px] text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                        <SparklesIcon className="h-3.5 w-3.5" />
                        Smart planning
                      </span>
                      <span>Budget, packing, and weather tools unlock once you create the trip.</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateTrip}
                      disabled={!tripName || !destination || !startDate || !endDate || saving || !user}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating…
                        </>
                      ) : (
                        'Create trip'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  {plannerTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                        activeTab === tab.id
                          ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-900/60'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

              {activeTab === 'itinerary' && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/70">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                          <MapPinIcon className="h-3.5 w-3.5" />
                        {destination}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                          {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {totalBudget > 0 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                            <WalletIcon className="h-3.5 w-3.5" />
                            ${getTotalSpent()} / ${totalBudget}
                          </span>
                        )}
                      </div>
                      <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/40">
                        <p className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                          Smart suggestions
                        </p>
                        <ul className="mt-3 space-y-2">
                        {getAISuggestions().map((suggestion, index) => (
                            <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                            • {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
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
              )}

              {activeTab === 'budget' && (
                  <TripBudgetTracker days={days} totalBudget={totalBudget} onUpdateBudget={setTotalBudget} />
              )}

              {activeTab === 'weather' && (
                  <TripWeatherForecast destination={destination} startDate={startDate} endDate={endDate} />
              )}

              {activeTab === 'packing' && (
                  <TripPackingList destination={destination} days={days} startDate={startDate} endDate={endDate} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddLocation !== null && (
        <AddLocationToTrip
          onAdd={(location) => handleAddLocation(showAddLocation, location)}
          onClose={() => setShowAddLocation(null)}
        />
      )}

      {showShare && (
        <TripShareModal tripName={tripName} onClose={() => setShowShare(false)} />
      )}
    </>
  );
}
