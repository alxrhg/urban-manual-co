'use client';

import { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import {
  ArrowLeft,
  Settings,
  Sparkles,
  Map,
  Plus,
  Loader2,
  MapPin,
  ListChecks,
  StickyNote,
  Square,
  CheckSquare,
  X,
  Pencil,
  Check,
} from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import DayTimeline from '@/components/trip/DayTimeline';
import { TransitMode } from '@/components/trip/TransitConnector';
import DayTabNav from '@/components/trip/DayTabNav';
import FloatingActionBar from '@/components/trip/FloatingActionBar';
import AlertsDropdown from '@/components/trip/AlertsDropdown';
import AddPlaceBox from '@/components/trip/AddPlaceBox';
import TripSettingsBox from '@/components/trip/TripSettingsBox';
import RouteMapBox from '@/components/trip/RouteMapBox';
import DestinationBox from '@/components/trip/DestinationBox';
import SmartSuggestions from '@/components/trip/SmartSuggestions';
import LocalEvents from '@/components/trip/LocalEvents';
import TripBucketList from '@/components/trip/TripBucketList';
import DayDropZone from '@/components/trip/DayDropZone';
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  analyzeScheduleForWarnings,
  detectConflicts,
  checkClosureDays,
} from '@/lib/intelligence/schedule-analyzer';
import type { FlightData, ActivityData } from '@/types/trip';
import { parseDestinations, formatDestinationsFromField } from '@/types/trip';
import type { Destination } from '@/types/destination';
import type { PlannerWarning } from '@/lib/intelligence/types';

/**
 * TripPage - Clean, minimal design matching site patterns
 * Features: Stats grid, collapsible day sections, travel intelligence
 */
export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;
  const { user } = useAuth();
  const openDrawer = useDrawerStore((s) => s.openDrawer);

  // Trip Editor Hook
  const {
    trip,
    days,
    loading,
    saving,
    updateTrip,
    reorderItems,
    addPlace,
    addFlight,
    addTrain,
    addActivity,
    removeItem,
    updateItemTime,
    updateItemDuration,
    updateItemNotes,
    updateItem,
    refresh,
  } = useTripEditor({
    tripId,
    userId: user?.id,
    onError: (error) => console.error('Trip editor error:', error),
  });

  // Parse destinations for multi-city support
  const destinations = useMemo(() => parseDestinations(trip?.destination ?? null), [trip?.destination]);
  const primaryCity = destinations[0] || '';
  const destinationsDisplay = useMemo(() => formatDestinationsFromField(trip?.destination ?? null), [trip?.destination]);

  // UI State
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isAIPlanning, setIsAIPlanning] = useState(false);
  const [optimizingDay, setOptimizingDay] = useState<number | null>(null);
  const [autoFillingDay, setAutoFillingDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'flights' | 'hotels' | 'notes'>('itinerary');
  const [isEditMode, setIsEditMode] = useState(false);
  const [tripNotes, setTripNotes] = useState('');
  const [checklistItems, setChecklistItems] = useState<{ id: string; text: string; checked: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [warnings, setWarnings] = useState<PlannerWarning[]>([]);
  const [showAddPlaceBox, setShowAddPlaceBox] = useState(false);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [showMapBox, setShowMapBox] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EnrichedItineraryItem | null>(null);
  const [bucketDragItem, setBucketDragItem] = useState<Destination | null>(null);

  // Handle bucket list drag events
  const handleBucketDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'bucket-item') {
      setBucketDragItem(data.destination);
    }
  }, []);

  const handleBucketDragEnd = useCallback((event: DragEndEvent) => {
    setBucketDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    if (overId.startsWith('day-drop-')) {
      const dayNumber = parseInt(overId.replace('day-drop-', ''), 10);
      const data = active.data.current;
      if (data?.type === 'bucket-item' && data.destination) {
        addPlace(data.destination, dayNumber);
      }
    }
  }, [addPlace]);

  const handleAddFromBucket = useCallback((destination: Destination, dayNumber: number) => {
    addPlace(destination, dayNumber);
  }, [addPlace]);

  // Extract flights and hotels from itinerary
  const flights = useMemo(() => {
    return days.flatMap(d =>
      d.items.filter(item => item.parsedNotes?.type === 'flight')
        .map(item => ({ ...item, dayNumber: d.dayNumber }))
    );
  }, [days]);

  const hotels = useMemo(() => {
    const hotelItems = days.flatMap(d =>
      d.items.filter(item => item.parsedNotes?.type === 'hotel')
        .map(item => ({ ...item, dayNumber: d.dayNumber }))
    );

    // Helper to calculate effective day number (same as display logic)
    const getEffectiveDayNum = (hotel: typeof hotelItems[0]) => {
      if (hotel.parsedNotes?.checkInDate && trip?.start_date) {
        const tripStart = new Date(trip.start_date);
        tripStart.setHours(0, 0, 0, 0);
        const checkIn = new Date(hotel.parsedNotes.checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        return Math.floor((checkIn.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }
      return hotel.dayNumber;
    };

    // Sort hotels by effective day number (matches display)
    return hotelItems.sort((a, b) => {
      const aDayNum = getEffectiveDayNum(a);
      const bDayNum = getEffectiveDayNum(b);

      // First compare by effective day number
      if (aDayNum !== bDayNum) {
        return aDayNum - bDayNum;
      }

      // If same day, compare by order_index
      return (a.order_index || 0) - (b.order_index || 0);
    });
  }, [days, trip?.start_date]);

  // Compute which hotel covers each night based on check-in/check-out dates
  const nightlyHotelByDay = useMemo(() => {
    const hotelMap: Record<number, typeof hotels[0] | null> = {};
    if (!trip?.start_date) return hotelMap;

    const tripStart = new Date(trip.start_date);
    tripStart.setHours(0, 0, 0, 0);

    hotels.forEach(hotel => {
      const checkInDate = hotel.parsedNotes?.checkInDate;
      const checkOutDate = hotel.parsedNotes?.checkOutDate;

      if (!checkInDate) return;

      // Calculate actual check-in day number based on trip start
      const inDate = new Date(checkInDate);
      inDate.setHours(0, 0, 0, 0);
      const checkInDayNum = Math.floor((inDate.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Calculate number of nights
      let nights = 1;
      if (checkOutDate) {
        try {
          const outDate = new Date(checkOutDate);
          outDate.setHours(0, 0, 0, 0);
          nights = Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
        } catch {
          nights = 1;
        }
      }

      // Mark this hotel for the check-in day and each subsequent night
      for (let i = 0; i < nights; i++) {
        const nightDay = checkInDayNum + i;
        if (nightDay > 0 && !hotelMap[nightDay]) {
          hotelMap[nightDay] = hotel;
        }
      }
    });

    return hotelMap;
  }, [hotels, trip?.start_date]);

  // Generate trip warnings based on analysis
  useMemo(() => {
    const newWarnings: PlannerWarning[] = [];

    // Prepare items for schedule analysis
    const scheduleItems = days.flatMap(d =>
      d.items.map(item => ({
        id: item.id,
        title: item.title,
        dayNumber: d.dayNumber,
        time: item.time,
        duration: item.parsedNotes?.duration,
        category: item.parsedNotes?.category || item.destination?.category,
        parsedNotes: item.parsedNotes,
      }))
    );

    // Time-aware warnings (closing times, opening hours)
    const scheduleWarnings = analyzeScheduleForWarnings(scheduleItems);
    newWarnings.push(...scheduleWarnings);

    // Conflict detection (overlapping bookings)
    const conflictWarnings = detectConflicts(scheduleItems);
    newWarnings.push(...conflictWarnings);

    // Closure day warnings (e.g., museum closed Monday)
    const closureWarnings = checkClosureDays(scheduleItems, trip?.start_date ?? undefined);
    newWarnings.push(...closureWarnings);

    // Warning: Empty days
    days.forEach(day => {
      if (day.items.length === 0) {
        newWarnings.push({
          id: `empty-day-${day.dayNumber}`,
          type: 'timing',
          severity: 'low',
          message: `Day ${day.dayNumber} has no activities planned`,
          suggestion: 'Add some places to fill your day',
        });
      }
    });

    // Warning: Too many activities in a day
    days.forEach(day => {
      if (day.items.length > 6) {
        newWarnings.push({
          id: `busy-day-${day.dayNumber}`,
          type: 'timing',
          severity: 'medium',
          message: `Day ${day.dayNumber} looks very packed (${day.items.length} stops)`,
          suggestion: 'Consider spreading activities across multiple days',
        });
      }
    });

    setWarnings(newWarnings.slice(0, 10)); // Limit to 10 warnings
  }, [days, trip?.start_date]);

  // Callbacks
  const openPlaceSelector = useCallback((dayNumber: number, category?: string) => {
    openDrawer('place-selector', {
      tripId: trip?.id,
      dayNumber,
      city: trip?.destination,
      category, // Pass category filter to drawer
      onSelect: (destination: Destination) => addPlace(destination, dayNumber),
    });
  }, [trip?.id, trip?.destination, openDrawer, addPlace]);

  const openFlightDrawer = useCallback((dayNumber: number) => {
    openDrawer('add-flight', {
      tripId: trip?.id,
      dayNumber,
      onAdd: (flightData: FlightData) => addFlight(flightData, dayNumber),
    });
  }, [trip?.id, openDrawer, addFlight]);

  const handleEditItem = useCallback((item: EnrichedItineraryItem) => {
    // Show destination details inline instead of opening drawer
    setSelectedItem(item);
    setShowAddPlaceBox(false);
    setShowTripSettings(false);
    setShowMapBox(false);
    setActiveItemId(item.id);
  }, []);

  // Handle travel mode change from TransitConnector
  const handleTravelModeChange = useCallback((itemId: string, mode: TransitMode) => {
    updateItem(itemId, { travelModeToNext: mode });
  }, [updateItem]);

  const handleAITripPlanning = async () => {
    if (!trip || !user) return;
    if (!primaryCity || !trip.start_date || !trip.end_date) {
      openDrawer('trip-settings', { trip, onUpdate: updateTrip });
      return;
    }

    try {
      setIsAIPlanning(true);
      const allItems = days.flatMap(day => day.items);

      if (allItems.length > 0) {
        const existingItemsForAPI = allItems.map(item => ({
          day: days.find(d => d.items.includes(item))?.dayNumber || 1,
          time: item.time,
          title: item.title,
          destination_slug: item.destination_slug,
          category: item.parsedNotes?.category || item.destination?.category,
        }));

        const response = await fetch('/api/intelligence/smart-fill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: primaryCity,
            existingItems: existingItemsForAPI,
            tripDays: days.length,
          }),
        });

        if (!response.ok) throw new Error('Failed to get AI suggestions');

        const result = await response.json();
        for (const suggestion of result.suggestions || []) {
          if (suggestion.destination) {
            await addPlace(suggestion.destination, suggestion.day, suggestion.startTime);
          }
        }
      } else {
        const response = await fetch('/api/intelligence/multi-day-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: primaryCity,
            startDate: trip.start_date,
            endDate: trip.end_date,
            userId: user.id,
          }),
        });

        if (!response.ok) throw new Error('Failed to generate trip plan');
        await refresh();
      }

      await refresh();
    } catch (err: unknown) {
      console.error('AI Planning error:', err);
    } finally {
      setIsAIPlanning(false);
    }
  };

  // Optimize day route order
  const handleOptimizeDay = useCallback(async (dayNumber: number) => {
    const day = days.find(d => d.dayNumber === dayNumber);
    if (!day || day.items.length < 2) return;

    setOptimizingDay(dayNumber);
    try {
      const response = await fetch('/api/intelligence/route-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: day.items.map(item => ({
            id: item.id,
            title: item.title,
            latitude: item.destination?.latitude ?? item.parsedNotes?.latitude,
            longitude: item.destination?.longitude ?? item.parsedNotes?.longitude,
            time: item.time,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.optimizedOrder && Array.isArray(result.optimizedOrder)) {
          // Reorder items based on optimization
          const orderedItems = result.optimizedOrder
            .map((id: string) => day.items.find(item => item.id === id))
            .filter(Boolean);
          if (orderedItems.length === day.items.length) {
            reorderItems(dayNumber, orderedItems);
          }
        }
      }
    } catch (err) {
      console.error('Failed to optimize day:', err);
    } finally {
      setOptimizingDay(null);
    }
  }, [days, reorderItems]);

  // Auto-fill day with suggestions
  const handleAutoFillDay = useCallback(async (dayNumber: number) => {
    if (!trip?.destination) return;

    setAutoFillingDay(dayNumber);
    try {
      const day = days.find(d => d.dayNumber === dayNumber);
      const existingItems = day?.items.map(item => ({
        day: dayNumber,
        time: item.time,
        title: item.title,
        destination_slug: item.destination_slug,
        category: item.parsedNotes?.category || item.destination?.category,
      })) || [];

      const response = await fetch('/api/intelligence/smart-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: primaryCity,
          existingItems,
          tripDays: 1, // Just this day
          targetDay: dayNumber,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        for (const suggestion of result.suggestions || []) {
          if (suggestion.destination && suggestion.day === dayNumber) {
            await addPlace(suggestion.destination, dayNumber, suggestion.startTime);
          }
        }
        await refresh();
      }
    } catch (err) {
      console.error('Failed to auto-fill day:', err);
    } finally {
      setAutoFillingDay(null);
    }
  }, [primaryCity, days, addPlace, refresh]);

  // Add destination from NL input
  const handleAddFromNL = useCallback(async (
    destination: unknown,
    dayNumber: number,
    time?: string
  ) => {
    const dest = destination as { id: number; slug: string; name: string; category: string };
    if (dest && dest.slug) {
      const fullDest: Destination = {
        id: dest.id,
        slug: dest.slug,
        name: dest.name,
        category: dest.category,
        city: primaryCity,
      };
      await addPlace(fullDest, dayNumber, time);
      await refresh();
    }
  }, [addPlace, refresh, primaryCity]);

  // Handle AI suggestion click
  const handleAddAISuggestion = useCallback(async (suggestion: {
    destination: { id: number; slug: string; name: string; category: string };
    day: number;
    startTime: string;
  }) => {
    const fullDest: Destination = {
      id: suggestion.destination.id,
      slug: suggestion.destination.slug,
      name: suggestion.destination.name,
      category: suggestion.destination.category,
      city: trip?.destination || '',
    };
    await addPlace(fullDest, suggestion.day, suggestion.startTime);
    await refresh();
  }, [addPlace, refresh, trip?.destination]);

  // Loading state
  if (loading) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <PageLoader />
      </main>
    );
  }

  // Not found
  if (!trip) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-light mb-8">Trip not found</h1>
            <Link
              href="/trips"
              className="text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              Back to trips
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Cover image from first destination
  const coverImage = days
    .flatMap(d => d.items)
    .find(item => item.destination?.image)?.destination?.image;

  return (
    <main className="w-full px-6 md:px-10 py-20 min-h-screen">
      <div className="w-full">
        {/* Header - Matches other pages */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            {/* Back + Title */}
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href="/trips"
                className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Trips</span>
              </Link>
              <h1 className="text-2xl font-light truncate">
                {trip.title}
              </h1>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <AlertsDropdown
                warnings={warnings}
                onDismiss={(id) => setWarnings(prev => prev.filter(w => w.id !== id))}
              />
              <button
                onClick={() => setShowMapBox(true)}
                className="hidden sm:flex p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="View Map"
              >
                <Map className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setShowTripSettings(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Cover Image (optional) */}
          {coverImage && (
            <div className="relative w-full h-32 sm:h-40 rounded-xl overflow-hidden">
              <Image
                src={coverImage}
                alt={trip.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          )}
        </div>

        {/* Tab Navigation - Matches account page style */}
        <div className="mb-12">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              {(['itinerary', 'flights', 'hotels', 'notes'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`transition-all ${
                    activeTab === tab
                      ? 'font-medium text-black dark:text-white'
                      : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'flights' && flights.length > 0 && ` (${flights.length})`}
                  {tab === 'hotels' && hotels.length > 0 && ` (${hotels.length})`}
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleAITripPlanning}
                disabled={isAIPlanning || saving}
                className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {isAIPlanning ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {isAIPlanning ? 'Planning...' : 'Auto-plan'}
              </button>
              <button
                onClick={() => setShowAddPlaceBox(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 text-xs font-medium rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Itinerary Tab */}
        {activeTab === 'itinerary' && (
          <div className="fade-in">
            {days.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No days in your trip yet</p>
                <button
                  onClick={() => openPlaceSelector(1)}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity"
                >
                  Add your first stop
                </button>
              </div>
            ) : (
              <DndContext onDragStart={handleBucketDragStart} onDragEnd={handleBucketDragEnd}>
              <div className="lg:flex lg:gap-6">
                {/* Main Itinerary Column */}
                <div className="flex-1 min-w-0 space-y-4">
                  {/* Day Tabs + Edit Toggle */}
                  <div className="flex items-center gap-4 mb-4">
                    <DayTabNav
                      days={days}
                      selectedDayNumber={selectedDayNumber}
                      onSelectDay={setSelectedDayNumber}
                    />
                    <button
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-2xl transition-colors ${
                        isEditMode
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {isEditMode ? (
                        <>
                          <Check className="w-3 h-3" />
                          Done
                        </>
                      ) : (
                        <>
                          <Pencil className="w-3 h-3" />
                          Edit
                        </>
                      )}
                    </button>
                  </div>

                  {/* Selected Day Timeline */}
                  {days.filter(day => day.dayNumber === selectedDayNumber).map((day) => (
                    <DayDropZone key={day.dayNumber} dayNumber={day.dayNumber}>
                      <DayTimeline
                        day={day}
                        nightlyHotel={nightlyHotelByDay[day.dayNumber] || null}
                        onReorderItems={reorderItems}
                        onRemoveItem={isEditMode ? removeItem : undefined}
                        onEditItem={handleEditItem}
                        onTimeChange={updateItemTime}
                        onDurationChange={updateItemDuration}
                        onTravelModeChange={handleTravelModeChange}
                        onAddItem={openPlaceSelector}
                        onOptimizeDay={handleOptimizeDay}
                        onAutoFillDay={handleAutoFillDay}
                        activeItemId={activeItemId}
                        isOptimizing={optimizingDay === day.dayNumber}
                        isAutoFilling={autoFillingDay === day.dayNumber}
                        isEditMode={isEditMode}
                      />
                    </DayDropZone>
                  ))}
                </div>

                {/* Sidebar (Desktop) */}
                <div className="hidden lg:block lg:w-80 lg:flex-shrink-0 space-y-4">
                  {showTripSettings ? (
                    <TripSettingsBox
                      trip={trip}
                      onUpdate={updateTrip}
                      onDelete={() => router.push('/trips')}
                      onClose={() => setShowTripSettings(false)}
                    />
                  ) : showMapBox ? (
                    <RouteMapBox
                      days={days}
                      selectedDayNumber={selectedDayNumber}
                      activeItemId={activeItemId}
                      onMarkerClick={setActiveItemId}
                      onClose={() => setShowMapBox(false)}
                    />
                  ) : showAddPlaceBox ? (
                    <AddPlaceBox
                      city={primaryCity}
                      dayNumber={selectedDayNumber}
                      onSelect={(destination) => {
                        addPlace(destination, selectedDayNumber);
                        setShowAddPlaceBox(false);
                      }}
                      onAddFlight={(flightData) => {
                        addFlight(flightData, selectedDayNumber);
                        setShowAddPlaceBox(false);
                      }}
                      onAddTrain={(trainData) => {
                        addTrain(trainData, selectedDayNumber);
                        setShowAddPlaceBox(false);
                      }}
                      onAddActivity={(activityData) => {
                        addActivity(activityData, selectedDayNumber);
                        setShowAddPlaceBox(false);
                      }}
                      onClose={() => setShowAddPlaceBox(false)}
                    />
                  ) : selectedItem ? (
                    <DestinationBox
                      item={selectedItem}
                      onClose={() => {
                        setSelectedItem(null);
                        setActiveItemId(null);
                      }}
                      onTimeChange={updateItemTime}
                      onNotesChange={updateItemNotes}
                      onItemUpdate={updateItem}
                      onRemove={(itemId) => {
                        removeItem(itemId);
                        setSelectedItem(null);
                        setActiveItemId(null);
                      }}
                    />
                  ) : (
                    <>
                      {/* Bucket List - Saved places matching trip destinations */}
                      <TripBucketList
                        destinations={destinations}
                        onAddToTrip={handleAddFromBucket}
                        selectedDayNumber={selectedDayNumber}
                      />
                      <SmartSuggestions
                        days={days}
                        destination={primaryCity}
                        selectedDayNumber={selectedDayNumber}
                        onAddPlace={openPlaceSelector}
                        onAddAISuggestion={handleAddAISuggestion}
                        onAddFromNL={handleAddFromNL}
                      />
                      {trip.start_date && (
                        <LocalEvents
                          city={primaryCity}
                          startDate={trip.start_date}
                          endDate={trip.end_date}
                          onAddToTrip={() => {
                            openPlaceSelector(selectedDayNumber);
                          }}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Drag Overlay for bucket list items */}
              <DragOverlay>
                {bucketDragItem && (
                  <div className="flex items-center gap-3 p-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl cursor-grabbing w-64">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                      {bucketDragItem.image || bucketDragItem.image_thumbnail ? (
                        <Image
                          src={bucketDragItem.image_thumbnail || bucketDragItem.image || ''}
                          alt={bucketDragItem.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {bucketDragItem.name}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize truncate">
                        {bucketDragItem.category?.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                )}
              </DragOverlay>
              </DndContext>
            )}

            {/* Mobile Section */}
            {(days.length > 0 || showTripSettings || showMapBox || selectedItem) && (
              <div className="lg:hidden mt-6 space-y-4">
                {showTripSettings ? (
                  <TripSettingsBox
                    trip={trip}
                    onUpdate={updateTrip}
                    onDelete={() => router.push('/trips')}
                    onClose={() => setShowTripSettings(false)}
                  />
                ) : showMapBox ? (
                  <RouteMapBox
                    days={days}
                    selectedDayNumber={selectedDayNumber}
                    activeItemId={activeItemId}
                    onMarkerClick={setActiveItemId}
                    onClose={() => setShowMapBox(false)}
                  />
                ) : showAddPlaceBox ? (
                  <AddPlaceBox
                    city={primaryCity}
                    dayNumber={selectedDayNumber}
                    onSelect={(destination) => {
                      addPlace(destination, selectedDayNumber);
                      setShowAddPlaceBox(false);
                    }}
                    onAddFlight={(flightData) => {
                      addFlight(flightData, selectedDayNumber);
                      setShowAddPlaceBox(false);
                    }}
                    onAddTrain={(trainData) => {
                      addTrain(trainData, selectedDayNumber);
                      setShowAddPlaceBox(false);
                    }}
                    onAddActivity={(activityData) => {
                      addActivity(activityData, selectedDayNumber);
                      setShowAddPlaceBox(false);
                    }}
                    onClose={() => setShowAddPlaceBox(false)}
                  />
                ) : selectedItem ? (
                  <DestinationBox
                    item={selectedItem}
                    onClose={() => {
                      setSelectedItem(null);
                      setActiveItemId(null);
                    }}
                    onTimeChange={updateItemTime}
                    onNotesChange={updateItemNotes}
                    onItemUpdate={updateItem}
                    onRemove={(itemId) => {
                      removeItem(itemId);
                      setSelectedItem(null);
                      setActiveItemId(null);
                    }}
                  />
                ) : (
                  <SmartSuggestions
                    days={days}
                    destination={primaryCity}
                    selectedDayNumber={selectedDayNumber}
                    onAddPlace={openPlaceSelector}
                    onAddAISuggestion={handleAddAISuggestion}
                    onAddFromNL={handleAddFromNL}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Flights Tab */}
        {activeTab === 'flights' && (
          <div className="fade-in space-y-4">
            {flights.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No flights added yet</p>
                <button
                  onClick={() => openFlightDrawer(selectedDayNumber)}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity"
                >
                  Add a flight
                </button>
              </div>
            ) : (
              <>
                {flights.map((flight) => (
                  <div
                    key={flight.id}
                    onClick={() => handleEditItem(flight)}
                    className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">Day {flight.dayNumber}</span>
                      <span className="text-xs text-gray-400">{flight.parsedNotes?.departureDate}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {flight.parsedNotes?.from} → {flight.parsedNotes?.to}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {flight.parsedNotes?.airline} {flight.parsedNotes?.flightNumber}
                          {flight.parsedNotes?.departureTime && ` · ${flight.parsedNotes.departureTime}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => openFlightDrawer(selectedDayNumber)}
                  className="w-full py-3 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                >
                  + Add another flight
                </button>
              </>
            )}
          </div>
        )}

        {/* Hotels Tab */}
        {activeTab === 'hotels' && (
          <div className="fade-in">
            {hotels.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No hotels added yet</p>
                <button
                  onClick={() => openPlaceSelector(selectedDayNumber)}
                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity"
                >
                  Add accommodation
                </button>
              </div>
            ) : (
              <div className="lg:flex lg:gap-6">
                {/* Hotels List */}
                <div className="flex-1 space-y-4">
                  {hotels.map((hotel) => {
                    // Calculate correct day number based on checkInDate vs trip start
                    let checkInDayNum = hotel.dayNumber;
                    if (hotel.parsedNotes?.checkInDate && trip?.start_date) {
                      const tripStart = new Date(trip.start_date);
                      tripStart.setHours(0, 0, 0, 0);
                      const checkIn = new Date(hotel.parsedNotes.checkInDate);
                      checkIn.setHours(0, 0, 0, 0);
                      checkInDayNum = Math.floor((checkIn.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    }

                    // Calculate nights
                    let nights = 1;
                    if (hotel.parsedNotes?.checkInDate && hotel.parsedNotes?.checkOutDate) {
                      const inDate = new Date(hotel.parsedNotes.checkInDate);
                      const outDate = new Date(hotel.parsedNotes.checkOutDate);
                      nights = Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
                    }

                    return (
                      <div
                        key={hotel.id}
                        onClick={() => handleEditItem(hotel)}
                        className={`p-4 border rounded-2xl cursor-pointer transition-colors ${
                          selectedItem?.id === hotel.id
                            ? 'border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                            : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400">Day {checkInDayNum}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            {nights} {nights === 1 ? 'night' : 'nights'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {hotel.title}
                          </p>
                          {hotel.parsedNotes?.address && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {hotel.parsedNotes.address}
                            </p>
                          )}
                          {(hotel.parsedNotes?.checkInDate || hotel.parsedNotes?.checkOutDate) && (
                            <p className="text-xs text-gray-400 mt-2">
                              {hotel.parsedNotes?.checkInDate && `Check-in: ${hotel.parsedNotes.checkInDate}`}
                              {hotel.parsedNotes?.checkInDate && hotel.parsedNotes?.checkOutDate && ' · '}
                              {hotel.parsedNotes?.checkOutDate && `Check-out: ${hotel.parsedNotes.checkOutDate}`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => openPlaceSelector(selectedDayNumber)}
                    className="w-full py-3 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                  >
                    + Add another hotel
                  </button>
                </div>

                {/* Sidebar with inline editor (Desktop) */}
                {selectedItem && selectedItem.parsedNotes?.type === 'hotel' && (
                  <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
                    <DestinationBox
                      item={selectedItem}
                      onClose={() => {
                        setSelectedItem(null);
                        setActiveItemId(null);
                      }}
                      onTimeChange={updateItemTime}
                      onNotesChange={updateItemNotes}
                      onItemUpdate={updateItem}
                      onRemove={(itemId) => {
                        removeItem(itemId);
                        setSelectedItem(null);
                        setActiveItemId(null);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Mobile Inline Editor */}
            {selectedItem && selectedItem.parsedNotes?.type === 'hotel' && (
              <div className="lg:hidden mt-6">
                <DestinationBox
                  item={selectedItem}
                  onClose={() => {
                    setSelectedItem(null);
                    setActiveItemId(null);
                  }}
                  onTimeChange={updateItemTime}
                  onNotesChange={updateItemNotes}
                  onItemUpdate={updateItem}
                  onRemove={(itemId) => {
                    removeItem(itemId);
                    setSelectedItem(null);
                    setActiveItemId(null);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="fade-in space-y-6">
            {/* Checklist / Todo List */}
            <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="w-4 h-4 text-gray-500" />
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">Checklist</h3>
              </div>

              {/* Add new item */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newChecklistItem.trim()) {
                      setChecklistItems(prev => [...prev, {
                        id: `item-${Date.now()}`,
                        text: newChecklistItem.trim(),
                        checked: false,
                      }]);
                      setNewChecklistItem('');
                    }
                  }}
                  placeholder="Add item (press Enter)"
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-black dark:focus:border-white"
                />
                <button
                  onClick={() => {
                    if (newChecklistItem.trim()) {
                      setChecklistItems(prev => [...prev, {
                        id: `item-${Date.now()}`,
                        text: newChecklistItem.trim(),
                        checked: false,
                      }]);
                      setNewChecklistItem('');
                    }
                  }}
                  className="px-3 py-2 text-sm font-medium text-white bg-black dark:bg-white dark:text-black rounded-lg hover:opacity-80 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Checklist items */}
              <div className="space-y-2">
                {checklistItems.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                    No items yet. Add packing items, reminders, or tasks.
                  </p>
                ) : (
                  checklistItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 group"
                    >
                      <button
                        onClick={() => setChecklistItems(prev =>
                          prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i)
                        )}
                        className="flex-shrink-0"
                      >
                        {item.checked ? (
                          <CheckSquare className="w-5 h-5 text-green-500" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                        )}
                      </button>
                      <span className={`flex-1 text-sm ${item.checked ? 'text-gray-400 dark:text-gray-500 line-through' : ''}`}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => setChecklistItems(prev => prev.filter(i => i.id !== item.id))}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Free-form Notes */}
            <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <StickyNote className="w-4 h-4 text-gray-500" />
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400">Notes</h3>
              </div>
              <textarea
                value={tripNotes}
                onChange={(e) => setTripNotes(e.target.value)}
                placeholder="Add notes for your trip... reservations, reminders, etc."
                className="w-full min-h-[150px] p-4 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl resize-y placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>
          </div>
        )}

      </div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        onAddPlace={() => openPlaceSelector(selectedDayNumber)}
        onAddFlight={() => openFlightDrawer(selectedDayNumber)}
        onAddNote={() => openDrawer('trip-notes', { tripId: trip.id })}
        onOpenMap={() => setShowMapBox(true)}
        onAIPlan={handleAITripPlanning}
        isAIPlanning={isAIPlanning}
        isSaving={saving}
      />

    </main>
  );
}
