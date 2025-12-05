'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { parseDestinations, parseTripNotes, stringifyTripNotes, type TripNotes } from '@/types/trip';
import { calculateDayNumberFromDate } from '@/lib/utils/time-calculations';

// Trip components
import TripHeader, { type AddItemType } from '@/components/trip/TripHeader';
import { ItineraryViewRedesign } from '@/components/trip/itinerary';
import TravelAISidebar from '@/components/trip/TravelAISidebar';
import InteractiveMapCard from '@/components/trip/InteractiveMapCard';
import TripMapView from '@/components/trips/TripMapView';

// Existing components
import { PageLoader } from '@/components/LoadingStates';
import AddPlaceBox from '@/components/trip/AddPlaceBox';
import TripSettingsBox from '@/components/trip/TripSettingsBox';
import DestinationBox from '@/components/trip/DestinationBox';
import CompanionPanel from '@/components/trip/CompanionPanel';
import TripNotesEditor from '@/components/trips/TripNotesEditor';

/**
 * TripPage - Trip detail page with itinerary view
 */
export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;
  const { user } = useAuth();

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
    addHotel,
    addActivity,
    removeItem,
    updateItemTime,
    updateItemDuration,
    updateItemNotes,
    updateItem,
    moveItemToDay,
    refresh,
  } = useTripEditor({
    tripId,
    userId: user?.id,
    onError: (error) => console.error('Trip editor error:', error),
  });

  // Parse destinations
  const destinations = useMemo(() => parseDestinations(trip?.destination ?? null), [trip?.destination]);
  const primaryCity = destinations[0] || '';

  // UI State
  const [activeContentTab, setActiveContentTab] = useState<'itinerary' | 'flights' | 'hotels' | 'notes'>('itinerary');
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [selectedItem, setSelectedItem] = useState<EnrichedItineraryItem | null>(null);
  const [showAddPlaceBox, setShowAddPlaceBox] = useState(false);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [optimizingDay, setOptimizingDay] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [showCompanionPanel, setShowCompanionPanel] = useState(false);

  // Auto-fix items on wrong days based on their dates
  const hasAutoFixed = useRef(false);
  useEffect(() => {
    // Wait for data to load and only run once
    if (loading || !trip?.start_date || days.length === 0 || hasAutoFixed.current) return;

    // Count items to ensure we have data
    const totalItems = days.reduce((sum, day) => sum + day.items.length, 0);
    if (totalItems === 0) return;

    // Check all items and move any that are on the wrong day
    for (const day of days) {
      for (const item of day.items) {
        const checkInDate = item.parsedNotes?.checkInDate;
        const departureDate = item.parsedNotes?.departureDate;
        const dateToCheck = checkInDate || departureDate;

        if (dateToCheck) {
          const targetDay = calculateDayNumberFromDate(trip.start_date, trip.end_date, dateToCheck);
          if (targetDay !== null && targetDay !== day.dayNumber) {
            moveItemToDay(item.id, targetDay);
          }
        }
      }
    }
    hasAutoFixed.current = true;
  }, [loading, trip?.start_date, trip?.end_date, days, moveItemToDay]);

  // Calculate flight and hotel counts
  const { flightCount, hotelCount } = useMemo(() => {
    let flights = 0;
    let hotels = 0;
    for (const day of days) {
      for (const item of day.items) {
        if (item.parsedNotes?.type === 'flight') flights++;
        if (item.parsedNotes?.type === 'hotel') hotels++;
      }
    }
    return { flightCount: flights, hotelCount: hotels };
  }, [days]);

  // Get all flights for flights tab
  const allFlights = useMemo(() => {
    const flights: EnrichedItineraryItem[] = [];
    for (const day of days) {
      for (const item of day.items) {
        if (item.parsedNotes?.type === 'flight') {
          flights.push(item);
        }
      }
    }
    return flights;
  }, [days]);

  // Get all hotels for hotels tab
  const allHotels = useMemo(() => {
    const hotels: EnrichedItineraryItem[] = [];
    for (const day of days) {
      for (const item of day.items) {
        if (item.parsedNotes?.type === 'hotel') {
          hotels.push(item);
        }
      }
    }
    return hotels;
  }, [days]);

  // Handlers
  const handleEditItem = useCallback((item: EnrichedItineraryItem) => {
    setSelectedItem(item);
    setShowAddPlaceBox(false);
    setShowTripSettings(false);
  }, []);

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

  const handleAddSuggestion = useCallback(async (suggestion: { category?: string; dayNumber?: number }) => {
    if (!trip?.destination) return;

    try {
      const response = await fetch('/api/intelligence/smart-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: primaryCity,
          existingItems: [],
          tripDays: days.length,
          targetDay: suggestion.dayNumber || selectedDayNumber,
          category: suggestion.category,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        for (const s of result.suggestions || []) {
          if (s.destination) {
            await addPlace(s.destination, s.day || selectedDayNumber, s.startTime);
          }
        }
        await refresh();
      }
    } catch (err) {
      console.error('Failed to add suggestion:', err);
    }
  }, [primaryCity, days, selectedDayNumber, addPlace, refresh, trip?.destination]);

  const handleAutoplan = useCallback(async () => {
    await handleAddSuggestion({ dayNumber: selectedDayNumber });
  }, [handleAddSuggestion, selectedDayNumber]);

  // Handle add item from dropdown menu
  const handleAddItemClick = useCallback((type: AddItemType) => {
    setShowAddPlaceBox(true);
    // The AddPlaceBox component will handle the different item types
    // based on its UI - user can switch between tabs for different types
  }, []);

  // Handle item updates with automatic day move when dates change
  const handleItemUpdate = useCallback((itemId: string, updates: Record<string, unknown>) => {
    // Update the item notes
    updateItem(itemId, updates);

    // Find the item to get its current/new date
    let item: EnrichedItineraryItem | undefined;
    for (const day of days) {
      item = day.items.find(i => i.id === itemId);
      if (item) break;
    }

    // Get the date to check - prefer new value from updates, fall back to existing
    const checkInDate = (updates.checkInDate as string | undefined) || item?.parsedNotes?.checkInDate;
    const departureDate = (updates.departureDate as string | undefined) || item?.parsedNotes?.departureDate;
    const dateToCheck = checkInDate || departureDate;

    if (dateToCheck && trip?.start_date) {
      const targetDay = calculateDayNumberFromDate(trip.start_date, trip.end_date, dateToCheck);
      if (targetDay !== null) {
        moveItemToDay(itemId, targetDay);
      }
    }
  }, [updateItem, moveItemToDay, trip?.start_date, trip?.end_date, days]);

  // Handle travel mode change between items
  const handleUpdateTravelMode = useCallback((itemId: string, mode: 'walking' | 'driving' | 'transit') => {
    updateItem(itemId, { travelModeToNext: mode });
  }, [updateItem]);

  // Loading state
  if (loading) {
    return (
      <main className="w-full px-4 sm:px-6 md:px-10 py-20 min-h-screen bg-white dark:bg-gray-950">
        <div className="max-w-5xl mx-auto">
          <PageLoader />
        </div>
      </main>
    );
  }

  // Not found
  if (!trip) {
    return (
      <main className="w-full px-4 sm:px-6 md:px-10 py-20 min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Trip not found</p>
          <button
            onClick={() => router.push('/trips')}
            className="text-gray-900 dark:text-white hover:opacity-70 transition-opacity"
          >
            Back to trips
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 sm:px-6 md:px-10 py-20 min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-5xl mx-auto">
        {/* Header with Tabs */}
        <TripHeader
          title={trip.title}
          trip={trip}
          heroImage={trip.cover_image || undefined}
          activeContentTab={activeContentTab}
          onContentTabChange={setActiveContentTab}
          flightCount={flightCount}
          hotelCount={hotelCount}
          days={days}
          selectedDayNumber={selectedDayNumber}
          onSelectDay={setSelectedDayNumber}
          onSettingsClick={() => setShowTripSettings(true)}
          onAutoplanClick={handleAutoplan}
          onAddClick={() => setShowAddPlaceBox(true)}
          onAddItemClick={handleAddItemClick}
          onEditClick={() => setIsEditMode(!isEditMode)}
          isEditMode={isEditMode}
          onMapClick={() => setShowMapView(true)}
        />

        {/* Main Content */}
        <div className="lg:flex lg:gap-6">
          {/* Left Column - Content */}
          <div className="flex-1 min-w-0">
            {activeContentTab === 'itinerary' && (
              <>
                {/* Map View (shown when map button clicked) */}
                {showMapView && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Day {selectedDayNumber} Map</h3>
                      <button
                        onClick={() => setShowMapView(false)}
                        className="text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Hide map
                      </button>
                    </div>
                    <TripMapView
                      places={(days.find(d => d.dayNumber === selectedDayNumber)?.items || [])
                        .filter((item) => item.parsedNotes?.type !== 'flight')
                        .map((item, index) => ({
                          id: item.id,
                          name: item.title || 'Place',
                          latitude: item.parsedNotes?.latitude ?? item.destination?.latitude ?? undefined,
                          longitude: item.parsedNotes?.longitude ?? item.destination?.longitude ?? undefined,
                          category: item.destination?.category || item.parsedNotes?.category,
                          order: index + 1,
                        }))}
                      className="h-[300px] rounded-2xl"
                    />
                  </div>
                )}

                {/* Itinerary List - New Design with Visual Cards */}
                <ItineraryViewRedesign
                  days={days}
                  selectedDayNumber={selectedDayNumber}
                  onSelectDay={setSelectedDayNumber}
                  onEditItem={handleEditItem}
                  onAddItem={(dayNumber) => {
                    setSelectedDayNumber(dayNumber);
                    setShowAddPlaceBox(true);
                  }}
                  onOptimizeDay={handleOptimizeDay}
                  onUpdateTravelMode={handleUpdateTravelMode}
                  onRemoveItem={removeItem}
                  onReorderItems={reorderItems}
                  isOptimizing={optimizingDay !== null}
                  isEditMode={isEditMode}
                  activeItemId={selectedItem?.id}
                  allHotels={allHotels}
                  showDayNavigation={false}
                />
              </>
            )}

            {activeContentTab === 'flights' && (
              <div className="space-y-3">
                {allFlights.length === 0 ? (
                  <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">No flights added yet</p>
                    <button
                      onClick={() => setShowAddPlaceBox(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      Add a flight
                    </button>
                  </div>
                ) : (
                  allFlights.map((flight) => (
                    <div
                      key={flight.id}
                      onClick={() => handleEditItem(flight)}
                      className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-all"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{flight.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {flight.parsedNotes?.from} → {flight.parsedNotes?.to}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeContentTab === 'hotels' && (
              <div className="space-y-3">
                {allHotels.length === 0 ? (
                  <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">No hotels added yet</p>
                    <button
                      onClick={() => setShowAddPlaceBox(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      Add a hotel
                    </button>
                  </div>
                ) : (
                  allHotels.map((hotel) => (
                    <div
                      key={hotel.id}
                      onClick={() => handleEditItem(hotel)}
                      className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-all"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{hotel.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {hotel.parsedNotes?.checkInTime || 'Check-in time not set'} · {hotel.parsedNotes?.address || 'Address not set'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeContentTab === 'notes' && (
              <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <TripNotesEditor
                  notes={parseTripNotes(trip?.notes ?? null)}
                  onChange={(notes: TripNotes) => {
                    updateTrip({ notes: stringifyTripNotes(notes) });
                  }}
                />
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="hidden lg:block lg:w-80 lg:flex-shrink-0 space-y-4 mt-6 lg:mt-0">
            {showTripSettings ? (
              <TripSettingsBox
                trip={trip}
                onUpdate={updateTrip}
                onDelete={() => router.push('/trips')}
                onClose={() => setShowTripSettings(false)}
              />
            ) : showAddPlaceBox ? (
              <AddPlaceBox
                city={primaryCity}
                dayNumber={selectedDayNumber}
                dayItems={days.find(d => d.dayNumber === selectedDayNumber)?.items.map(item => ({
                  id: item.id,
                  title: item.title,
                  time: item.time,
                  parsedNotes: item.parsedNotes,
                }))}
                onSelect={(destination, time) => {
                  addPlace(destination, selectedDayNumber, time);
                  setShowAddPlaceBox(false);
                }}
                onAddFlight={(flightData) => {
                  // Calculate correct day based on departure date
                  const targetDay = flightData.departureDate
                    ? calculateDayNumberFromDate(trip.start_date, trip.end_date, flightData.departureDate) ?? selectedDayNumber
                    : selectedDayNumber;
                  addFlight(flightData, targetDay);
                  setShowAddPlaceBox(false);
                }}
                onAddTrain={(trainData) => {
                  // Calculate correct day based on departure date
                  const targetDay = trainData.departureDate
                    ? calculateDayNumberFromDate(trip.start_date, trip.end_date, trainData.departureDate) ?? selectedDayNumber
                    : selectedDayNumber;
                  addTrain(trainData, targetDay);
                  setShowAddPlaceBox(false);
                }}
                onAddHotel={(hotelData) => {
                  // Calculate correct day based on check-in date
                  const targetDay = hotelData.checkInDate
                    ? calculateDayNumberFromDate(trip.start_date, trip.end_date, hotelData.checkInDate) ?? selectedDayNumber
                    : selectedDayNumber;
                  addHotel(hotelData, targetDay);
                  setShowAddPlaceBox(false);
                }}
                onAddActivity={(activityData, time) => {
                  addActivity(activityData, selectedDayNumber, time);
                  setShowAddPlaceBox(false);
                }}
                onClose={() => setShowAddPlaceBox(false)}
              />
            ) : selectedItem ? (
              <DestinationBox
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                onTimeChange={updateItemTime}
                onNotesChange={updateItemNotes}
                onItemUpdate={handleItemUpdate}
                onRemove={(itemId) => {
                  removeItem(itemId);
                  setSelectedItem(null);
                }}
              />
            ) : (
              <>
                {/* Interactive Map */}
                <InteractiveMapCard
                  locationName={primaryCity || 'Map'}
                  onExpand={() => {}}
                />

                {/* Travel AI - Opens Companion Panel */}
                <TravelAISidebar
                  onAddSuggestion={handleAddSuggestion}
                  onOpenChat={() => setShowCompanionPanel(true)}
                />
              </>
            )}
          </div>
        </div>

        {/* Mobile Sidebar */}
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
              city={primaryCity}
              dayNumber={selectedDayNumber}
              dayItems={days.find(d => d.dayNumber === selectedDayNumber)?.items.map(item => ({
                id: item.id,
                title: item.title,
                time: item.time,
                parsedNotes: item.parsedNotes,
              }))}
              onSelect={(destination, time) => {
                addPlace(destination, selectedDayNumber, time);
                setShowAddPlaceBox(false);
              }}
              onAddFlight={(flightData) => {
                // Calculate correct day based on departure date
                const targetDay = flightData.departureDate
                  ? calculateDayNumberFromDate(trip.start_date, trip.end_date, flightData.departureDate) ?? selectedDayNumber
                  : selectedDayNumber;
                addFlight(flightData, targetDay);
                setShowAddPlaceBox(false);
              }}
              onAddTrain={(trainData) => {
                // Calculate correct day based on departure date
                const targetDay = trainData.departureDate
                  ? calculateDayNumberFromDate(trip.start_date, trip.end_date, trainData.departureDate) ?? selectedDayNumber
                  : selectedDayNumber;
                addTrain(trainData, targetDay);
                setShowAddPlaceBox(false);
              }}
              onAddHotel={(hotelData) => {
                // Calculate correct day based on check-in date
                const targetDay = hotelData.checkInDate
                  ? calculateDayNumberFromDate(trip.start_date, trip.end_date, hotelData.checkInDate) ?? selectedDayNumber
                  : selectedDayNumber;
                addHotel(hotelData, targetDay);
                setShowAddPlaceBox(false);
              }}
              onAddActivity={(activityData, time) => {
                addActivity(activityData, selectedDayNumber, time);
                setShowAddPlaceBox(false);
              }}
              onClose={() => setShowAddPlaceBox(false)}
            />
          ) : selectedItem ? (
            <DestinationBox
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
              onTimeChange={updateItemTime}
              onNotesChange={updateItemNotes}
              onItemUpdate={handleItemUpdate}
              onRemove={(itemId) => {
                removeItem(itemId);
                setSelectedItem(null);
              }}
            />
          ) : (
            <TravelAISidebar
              onAddSuggestion={handleAddSuggestion}
              onOpenChat={() => setShowCompanionPanel(true)}
            />
          )}
        </div>
      </div>

      {/* Companion Panel - AI Chat Sidebar */}
      <CompanionPanel
        isOpen={showCompanionPanel}
        onClose={() => setShowCompanionPanel(false)}
        tripTitle={trip.title}
        destination={primaryCity}
        days={days}
        selectedDayNumber={selectedDayNumber}
        onAddSuggestion={handleAddSuggestion}
      />
    </main>
  );
}
