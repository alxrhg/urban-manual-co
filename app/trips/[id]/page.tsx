'use client';

import { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { parseDestinations } from '@/types/trip';

// Trip components
import TripHeader from '@/components/trip/TripHeader';
import TripInfoCards from '@/components/trip/TripInfoCards';
import ItineraryView from '@/components/trip/ItineraryView';
import TravelAISidebar from '@/components/trip/TravelAISidebar';
import InteractiveMapCard from '@/components/trip/InteractiveMapCard';

// Existing components
import { PageLoader } from '@/components/LoadingStates';
import AddPlaceBox from '@/components/trip/AddPlaceBox';
import TripSettingsBox from '@/components/trip/TripSettingsBox';
import DestinationBox from '@/components/trip/DestinationBox';

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

  // Parse destinations
  const destinations = useMemo(() => parseDestinations(trip?.destination ?? null), [trip?.destination]);
  const primaryCity = destinations[0] || '';

  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary'>('itinerary');
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [selectedItem, setSelectedItem] = useState<EnrichedItineraryItem | null>(null);
  const [showAddPlaceBox, setShowAddPlaceBox] = useState(false);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [optimizingDay, setOptimizingDay] = useState<number | null>(null);

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

  // Calculate saved places count
  const savedPlacesCount = useMemo(() => {
    return days.reduce((acc, day) => acc + day.items.length, 0);
  }, [days]);

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PageLoader />
        </div>
      </main>
    );
  }

  // Not found
  if (!trip) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Trip not found</p>
          <button
            onClick={() => router.push('/trips')}
            className="text-gray-900 dark:text-white hover:opacity-70 underline underline-offset-4"
          >
            Back to trips
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <TripHeader
          title={trip.title}
          destination={primaryCity}
          startDate={trip.start_date ?? undefined}
          endDate={trip.end_date ?? undefined}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSettingsClick={() => setShowTripSettings(true)}
          collaborators={[
            { name: 'John Doe', initials: 'JD', color: '#374151' },
            { name: 'Anna Miller', initials: 'AM', color: '#6B7280' },
          ]}
        />

        {/* Info Cards */}
        <div className="mt-8 mb-8">
          <TripInfoCards
            weather={{ temp: 78, condition: 'sunny' }}
            savedPlacesCount={savedPlacesCount}
            onSavedPlacesClick={() => setShowAddPlaceBox(true)}
          />
        </div>

        {/* Main Content */}
        <div className="lg:flex lg:gap-6">
          {/* Left Column - Itinerary */}
          <div className="flex-1 min-w-0">
            {activeTab === 'itinerary' && (
              <ItineraryView
                days={days}
                selectedDayNumber={selectedDayNumber}
                onSelectDay={setSelectedDayNumber}
                onEditItem={handleEditItem}
                onAddItem={(dayNumber) => {
                  setSelectedDayNumber(dayNumber);
                  setShowAddPlaceBox(true);
                }}
                onOptimizeDay={handleOptimizeDay}
                onUpdateItemNotes={(itemId, notes) => updateItemNotes(itemId, notes as Record<string, string>)}
                isOptimizing={optimizingDay !== null}
                activeItemId={selectedItem?.id}
              />
            )}

            {activeTab === 'overview' && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">Overview tab coming soon</p>
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
                onClose={() => setSelectedItem(null)}
                onTimeChange={updateItemTime}
                onNotesChange={updateItemNotes}
                onItemUpdate={updateItem}
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

                {/* Travel AI */}
                <TravelAISidebar
                  onAddSuggestion={handleAddSuggestion}
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
              onClose={() => setSelectedItem(null)}
              onTimeChange={updateItemTime}
              onNotesChange={updateItemNotes}
              onItemUpdate={updateItem}
              onRemove={(itemId) => {
                removeItem(itemId);
                setSelectedItem(null);
              }}
            />
          ) : (
            <TravelAISidebar
              onAddSuggestion={handleAddSuggestion}
            />
          )}
        </div>
      </div>
    </main>
  );
}
