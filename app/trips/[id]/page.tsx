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
} from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import TripDaySection from '@/components/trip/TripDaySection';
import DayTabNav from '@/components/trip/DayTabNav';
import FloatingActionBar from '@/components/trip/FloatingActionBar';
import MapDrawer from '@/components/trip/MapDrawer';
import AlertsDropdown from '@/components/trip/AlertsDropdown';
import AddPlaceBox from '@/components/trip/AddPlaceBox';
import TripSettingsBox from '@/components/trip/TripSettingsBox';
import SmartSuggestions from '@/components/trip/SmartSuggestions';
import LocalEvents from '@/components/trip/LocalEvents';
import {
  analyzeScheduleForWarnings,
  detectConflicts,
  checkClosureDays,
} from '@/lib/intelligence/schedule-analyzer';
import type { FlightData } from '@/types/trip';
import type { Destination } from '@/types/destination';
import type { PlannerWarning } from '@/lib/intelligence/types';

/**
 * TripPage - Clean, minimal design with stone palette
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
    removeItem,
    refresh,
  } = useTripEditor({
    tripId,
    userId: user?.id,
    onError: (error) => console.error('Trip editor error:', error),
  });

  // UI State
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isAIPlanning, setIsAIPlanning] = useState(false);
  const [optimizingDay, setOptimizingDay] = useState<number | null>(null);
  const [autoFillingDay, setAutoFillingDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'flights' | 'hotels' | 'notes'>('itinerary');
  const [tripNotes, setTripNotes] = useState('');
  const [checklistItems, setChecklistItems] = useState<{ id: string; text: string; checked: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [warnings, setWarnings] = useState<PlannerWarning[]>([]);
  const [showAddPlaceBox, setShowAddPlaceBox] = useState(false);
  const [showTripSettings, setShowTripSettings] = useState(false);

  // Extract flights and hotels from itinerary
  const flights = useMemo(() => {
    return days.flatMap(d =>
      d.items.filter(item => item.parsedNotes?.type === 'flight')
        .map(item => ({ ...item, dayNumber: d.dayNumber }))
    );
  }, [days]);

  const hotels = useMemo(() => {
    return days.flatMap(d =>
      d.items.filter(item => item.parsedNotes?.type === 'hotel')
        .map(item => ({ ...item, dayNumber: d.dayNumber }))
    );
  }, [days]);

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
    if (item.destination) {
      openDrawer('destination', {
        place: {
          name: item.destination.name,
          category: item.destination.category,
          neighborhood: item.destination.neighborhood ?? undefined,
          city: item.destination.city ?? undefined,
          michelinRating: item.destination.michelin_stars ?? undefined,
          hasMichelin: !!item.destination.michelin_stars,
          googleRating: item.destination.rating ?? undefined,
          googleReviews: item.destination.user_ratings_total ?? undefined,
          priceLevel: item.destination.price_level ?? undefined,
          description: item.destination.description ?? undefined,
          image: item.destination.image ?? undefined,
          image_thumbnail: item.destination.image_thumbnail ?? undefined,
          latitude: item.destination.latitude ?? undefined,
          longitude: item.destination.longitude ?? undefined,
          address: item.destination.formatted_address ?? undefined,
          website: item.destination.website ?? undefined,
        },
        hideAddToTrip: true,
      });
    }
    setActiveItemId(item.id);
  }, [openDrawer]);

  const handleAITripPlanning = async () => {
    if (!trip || !user) return;
    if (!trip.destination || !trip.start_date || !trip.end_date) {
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
            city: trip.destination,
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
            city: trip.destination,
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
          city: trip.destination,
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
  }, [trip?.destination, days, addPlace, refresh]);

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
        city: trip?.destination || '',
      };
      await addPlace(fullDest, dayNumber, time);
      await refresh();
    }
  }, [addPlace, refresh, trip?.destination]);

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
      <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-20 bg-stone-50 dark:bg-gray-950 min-h-screen">
        <PageLoader />
      </main>
    );
  }

  // Not found
  if (!trip) {
    return (
      <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-20 min-h-screen bg-stone-50 dark:bg-gray-950">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs text-stone-500 dark:text-gray-400 mb-4">Trip not found</p>
            <Link
              href="/trips"
              className="text-sm text-stone-900 dark:text-white hover:underline min-h-[44px] flex items-center justify-center"
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
    <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-32 min-h-screen bg-stone-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto">
        {/* Header - Mobile optimized */}
        <div className="mb-6 sm:mb-8">
          {/* Mobile: Stacked layout, Desktop: Inline */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Top row on mobile: Back + Actions */}
            <div className="flex items-center justify-between sm:contents">
              {/* Back Button */}
              <Link
                href="/trips"
                className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors min-h-[44px] min-w-[44px] -ml-2 pl-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Trips</span>
              </Link>

              {/* Mobile Actions */}
              <div className="flex items-center gap-1 sm:hidden">
                <AlertsDropdown
                  warnings={warnings}
                  onDismiss={(id) => setWarnings(prev => prev.filter(w => w.id !== id))}
                />
                <button
                  onClick={() => setShowTripSettings(true)}
                  className="p-2.5 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Settings"
                >
                  <Settings className="w-5 h-5 text-stone-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Desktop: Spacer */}
            <div className="hidden sm:block flex-1" />

            {/* Trip Title */}
            <h1 className="text-xl sm:text-2xl font-light text-stone-900 dark:text-white truncate">
              {trip.title}
            </h1>

            {/* Desktop: Spacer */}
            <div className="hidden sm:block flex-1" />

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <AlertsDropdown
                warnings={warnings}
                onDismiss={(id) => setWarnings(prev => prev.filter(w => w.id !== id))}
              />
              <button
                onClick={() => setIsMapOpen(true)}
                className="p-2.5 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="View Map"
              >
                <Map className="w-5 h-5 text-stone-500 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setShowTripSettings(true)}
                className="p-2.5 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-stone-500 dark:text-gray-400" />
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

        {/* Tab Navigation */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-x-1 sm:gap-x-4 text-xs overflow-x-auto scrollbar-hide -mx-1 px-1">
              {(['itinerary', 'flights', 'hotels', 'notes'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    transition-all flex items-center gap-1.5 whitespace-nowrap
                    px-3 py-2 sm:px-2 sm:py-1 rounded-full sm:rounded-none
                    min-h-[40px] sm:min-h-0
                    ${activeTab === tab
                      ? 'font-medium text-stone-900 dark:text-white bg-stone-100 dark:bg-gray-800 sm:bg-transparent sm:dark:bg-transparent'
                      : 'font-medium text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
                    }
                  `}
                >
                  {tab === 'notes' && <StickyNote className="w-3.5 h-3.5 sm:w-3 sm:h-3" />}
                  {tab === 'flights' && flights.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-stone-200 dark:bg-gray-700 text-[10px] flex items-center justify-center">
                      {flights.length}
                    </span>
                  )}
                  {tab === 'hotels' && hotels.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-stone-200 dark:bg-gray-700 text-[10px] flex items-center justify-center">
                      {hotels.length}
                    </span>
                  )}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleAITripPlanning}
                disabled={isAIPlanning || saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-stone-900 dark:bg-white dark:text-gray-900 rounded-full hover:opacity-80 disabled:opacity-50 transition-opacity"
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-200 dark:border-gray-800 rounded-full hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
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
              <div className="text-center py-12 border border-dashed border-stone-200 dark:border-gray-800 rounded-2xl">
                <MapPin className="h-12 w-12 mx-auto text-stone-300 dark:text-gray-700 mb-4" />
                <p className="text-sm text-stone-500 dark:text-gray-400 mb-4">No days in your trip yet</p>
                <button
                  onClick={() => openPlaceSelector(1)}
                  className="px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded-full hover:opacity-80 transition-opacity"
                >
                  Add your first stop
                </button>
              </div>
            ) : (
              <div className="lg:flex lg:gap-6">
                {/* Main Itinerary Column */}
                <div className="flex-1 space-y-4">
                  {/* Horizontal Day Tabs */}
                  <DayTabNav
                    days={days}
                    selectedDayNumber={selectedDayNumber}
                    onSelectDay={setSelectedDayNumber}
                    className="mb-4"
                  />

                  {/* Selected Day Only */}
                  {days.filter(day => day.dayNumber === selectedDayNumber).map((day) => (
                    <TripDaySection
                      key={day.dayNumber}
                      day={day}
                      isSelected={true}
                      onSelect={() => {}}
                      onReorderItems={reorderItems}
                      onRemoveItem={removeItem}
                      onEditItem={handleEditItem}
                      onAddItem={openPlaceSelector}
                      onOptimizeDay={handleOptimizeDay}
                      onAutoFillDay={handleAutoFillDay}
                      activeItemId={activeItemId}
                      isOptimizing={optimizingDay === day.dayNumber}
                      isAutoFilling={autoFillingDay === day.dayNumber}
                    />
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
                  ) : showAddPlaceBox ? (
                    <AddPlaceBox
                      city={trip.destination}
                      dayNumber={selectedDayNumber}
                      onSelect={(destination) => {
                        addPlace(destination, selectedDayNumber);
                        setShowAddPlaceBox(false);
                      }}
                      onClose={() => setShowAddPlaceBox(false)}
                    />
                  ) : (
                    <>
                      <SmartSuggestions
                        days={days}
                        destination={trip.destination}
                        selectedDayNumber={selectedDayNumber}
                        onAddPlace={openPlaceSelector}
                        onAddAISuggestion={handleAddAISuggestion}
                        onAddFromNL={handleAddFromNL}
                      />
                      {trip.start_date && (
                        <LocalEvents
                          city={trip.destination || ''}
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
            )}

            {/* Mobile Section */}
            {(days.length > 0 || showTripSettings) && (
              <div className="lg:hidden mt-6 space-y-4">
                {showTripSettings ? (
                  <TripSettingsBox
                    trip={trip}
                    onUpdate={updateTrip}
                    onDelete={() => router.push('/trips')}
                    onClose={() => setShowTripSettings(false)}
                  />
                ) : showAddPlaceBox ? (
                  <AddPlaceBox
                    city={trip.destination}
                    dayNumber={selectedDayNumber}
                    onSelect={(destination) => {
                      addPlace(destination, selectedDayNumber);
                      setShowAddPlaceBox(false);
                    }}
                    onClose={() => setShowAddPlaceBox(false)}
                  />
                ) : (
                  <SmartSuggestions
                    days={days}
                    destination={trip.destination}
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
              <div className="text-center py-12 border border-dashed border-stone-200 dark:border-gray-800 rounded-2xl">
                <p className="text-sm text-stone-500 dark:text-gray-400 mb-4">No flights added yet</p>
                <button
                  onClick={() => openFlightDrawer(selectedDayNumber)}
                  className="px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded-full hover:opacity-80 transition-opacity"
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
                    className="p-4 border border-stone-200 dark:border-gray-800 rounded-2xl hover:bg-stone-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-stone-400">Day {flight.dayNumber}</span>
                      <span className="text-xs text-stone-400">{flight.parsedNotes?.departureDate}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-stone-900 dark:text-white">
                          {flight.parsedNotes?.from} → {flight.parsedNotes?.to}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
                          {flight.parsedNotes?.airline} {flight.parsedNotes?.flightNumber}
                          {flight.parsedNotes?.departureTime && ` · ${flight.parsedNotes.departureTime}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => openFlightDrawer(selectedDayNumber)}
                  className="w-full py-3 border border-dashed border-stone-200 dark:border-gray-800 rounded-2xl text-xs font-medium text-stone-500 dark:text-gray-400 hover:border-stone-300 dark:hover:border-gray-700 transition-colors"
                >
                  + Add another flight
                </button>
              </>
            )}
          </div>
        )}

        {/* Hotels Tab */}
        {activeTab === 'hotels' && (
          <div className="fade-in space-y-4">
            {hotels.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-stone-200 dark:border-gray-800 rounded-2xl">
                <p className="text-sm text-stone-500 dark:text-gray-400 mb-4">No hotels added yet</p>
                <button
                  onClick={() => openPlaceSelector(selectedDayNumber)}
                  className="px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded-full hover:opacity-80 transition-opacity"
                >
                  Add accommodation
                </button>
              </div>
            ) : (
              <>
                {hotels.map((hotel) => (
                  <div
                    key={hotel.id}
                    onClick={() => handleEditItem(hotel)}
                    className="p-4 border border-stone-200 dark:border-gray-800 rounded-2xl hover:bg-stone-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-stone-400">Day {hotel.dayNumber}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900 dark:text-white">
                        {hotel.title}
                      </p>
                      {hotel.parsedNotes?.address && (
                        <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
                          {hotel.parsedNotes.address}
                        </p>
                      )}
                      {(hotel.parsedNotes?.checkInDate || hotel.parsedNotes?.checkOutDate) && (
                        <p className="text-xs text-stone-400 mt-2">
                          {hotel.parsedNotes?.checkInDate && `Check-in: ${hotel.parsedNotes.checkInDate}`}
                          {hotel.parsedNotes?.checkInDate && hotel.parsedNotes?.checkOutDate && ' · '}
                          {hotel.parsedNotes?.checkOutDate && `Check-out: ${hotel.parsedNotes.checkOutDate}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => openPlaceSelector(selectedDayNumber)}
                  className="w-full py-3 border border-dashed border-stone-200 dark:border-gray-800 rounded-2xl text-xs font-medium text-stone-500 dark:text-gray-400 hover:border-stone-300 dark:hover:border-gray-700 transition-colors"
                >
                  + Add another hotel
                </button>
              </>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="fade-in space-y-6">
            {/* Checklist / Todo List */}
            <div className="p-6 border border-stone-200 dark:border-gray-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="w-4 h-4 text-stone-500" />
                <h3 className="text-xs font-medium text-stone-500 dark:text-gray-400">Checklist</h3>
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
                  className="flex-1 px-3 py-2 text-sm text-stone-700 dark:text-gray-300 bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 rounded-lg placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-700"
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
                  className="px-3 py-2 text-sm font-medium text-white bg-stone-900 dark:bg-white dark:text-gray-900 rounded-lg hover:opacity-80 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Checklist items */}
              <div className="space-y-2">
                {checklistItems.length === 0 ? (
                  <p className="text-xs text-stone-400 dark:text-gray-500 text-center py-4">
                    No items yet. Add packing items, reminders, or tasks.
                  </p>
                ) : (
                  checklistItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-gray-800/50 group"
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
                          <Square className="w-5 h-5 text-stone-400 dark:text-gray-500" />
                        )}
                      </button>
                      <span className={`flex-1 text-sm ${item.checked ? 'text-stone-400 dark:text-gray-500 line-through' : 'text-stone-700 dark:text-gray-300'}`}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => setChecklistItems(prev => prev.filter(i => i.id !== item.id))}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-500 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Free-form Notes */}
            <div className="p-6 border border-stone-200 dark:border-gray-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <StickyNote className="w-4 h-4 text-stone-500" />
                <h3 className="text-xs font-medium text-stone-500 dark:text-gray-400">Notes</h3>
              </div>
              <textarea
                value={tripNotes}
                onChange={(e) => setTripNotes(e.target.value)}
                placeholder="Add notes for your trip... reservations, reminders, etc."
                className="w-full min-h-[150px] p-4 text-sm text-stone-700 dark:text-gray-300 bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 rounded-xl resize-y placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-700"
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
        onOpenMap={() => setIsMapOpen(true)}
        onAIPlan={handleAITripPlanning}
        isAIPlanning={isAIPlanning}
        isSaving={saving}
      />

      {/* Map Drawer */}
      <MapDrawer
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        days={days}
        selectedDayNumber={selectedDayNumber}
        activeItemId={activeItemId}
        onMarkerClick={setActiveItemId}
      />
    </main>
  );
}
