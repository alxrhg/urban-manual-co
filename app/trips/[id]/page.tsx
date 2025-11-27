'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import TripStats from '@/components/trip/TripStats';
import TripDaySection from '@/components/trip/TripDaySection';
import MapDrawer from '@/components/trip/MapDrawer';
import type { FlightData } from '@/types/trip';
import type { Destination } from '@/types/destination';

/**
 * TripPage - Unified design matching Account page and Destination drawer
 * Features: Stats grid, collapsible day sections, text-based tabs, rounded-2xl cards
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
  const [activeTab, setActiveTab] = useState<'itinerary' | 'overview'>('itinerary');

  // Callbacks
  const openPlaceSelector = useCallback((dayNumber: number) => {
    openDrawer('place-selector', {
      tripId: trip?.id,
      dayNumber,
      city: trip?.destination,
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
      <main className="w-full px-6 md:px-10 py-20 min-h-screen">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Trip not found</p>
            <Link
              href="/trips"
              className="text-sm text-gray-900 dark:text-white hover:underline"
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
      <div className="w-full max-w-4xl mx-auto">
        {/* Header - Matches Account page style */}
        <div className="mb-12">
          {/* Back Link */}
          <Link
            href="/trips"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Trips
          </Link>

          {/* Title Row */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              {/* Destination Tag */}
              {trip.destination && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <MapPin className="w-3 h-3" />
                  {trip.destination}
                </div>
              )}
              {/* Trip Title */}
              <h1 className="text-2xl font-light text-gray-900 dark:text-white truncate">
                {trip.title}
              </h1>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsMapOpen(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="View Map"
              >
                <Map className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
              <button
                onClick={() => openDrawer('trip-settings', {
                  trip,
                  onUpdate: updateTrip,
                  onDelete: () => router.push('/trips'),
                })}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Cover Image (optional) */}
          {coverImage && (
            <div className="relative w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-6">
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

        {/* Stats Grid - Matches Account page */}
        <TripStats
          days={days}
          destination={trip.destination}
          startDate={trip.start_date}
          endDate={trip.end_date}
          className="mb-12"
        />

        {/* Tab Navigation - Matches Account page style */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex gap-x-4 text-xs">
              {(['itinerary', 'overview'] as const).map((tab) => (
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
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleAITripPlanning}
                disabled={isAIPlanning || saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-black dark:bg-white dark:text-black rounded-2xl hover:opacity-80 disabled:opacity-50 transition-opacity"
              >
                {isAIPlanning ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {isAIPlanning ? 'Planning...' : 'AI Plan'}
              </button>
              <button
                onClick={() => openPlaceSelector(selectedDayNumber)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Stop
              </button>
            </div>
          </div>
        </div>

        {/* Itinerary Tab */}
        {activeTab === 'itinerary' && (
          <div className="space-y-4 fade-in">
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
              /* Day Sections */
              days.map((day) => (
                <TripDaySection
                  key={day.dayNumber}
                  day={day}
                  isSelected={day.dayNumber === selectedDayNumber}
                  onSelect={() => setSelectedDayNumber(day.dayNumber)}
                  onReorderItems={reorderItems}
                  onRemoveItem={removeItem}
                  onEditItem={handleEditItem}
                  onAddItem={openPlaceSelector}
                  activeItemId={activeItemId}
                />
              ))
            )}
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="fade-in">
            <div className="p-6 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">Trip Summary</h3>
              <div className="space-y-4">
                {trip.description ? (
                  <p className="text-sm text-gray-600 dark:text-gray-300">{trip.description}</p>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    No description added yet. Edit your trip to add one.
                  </p>
                )}

                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">All Stops</h4>
                  <div className="space-y-2">
                    {days.flatMap(day =>
                      day.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleEditItem(item)}
                          className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 w-8">D{day.dayNumber}</span>
                            <span className="text-sm text-gray-900 dark:text-white truncate flex-1">
                              {item.title}
                            </span>
                            <span className="text-xs text-gray-400 capitalize">
                              {item.parsedNotes?.category || item.destination?.category}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                    {days.flatMap(d => d.items).length === 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">
                        No stops added yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Saving Indicator */}
        {saving && (
          <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-2xl shadow-lg text-xs font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving...
          </div>
        )}
      </div>

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
