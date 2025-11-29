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
  Calendar,
  MoreHorizontal,
} from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import TripDaySection from '@/components/trip/TripDaySection';
import DayTabNav from '@/components/trip/DayTabNav';
import FloatingActionBar from '@/components/trip/FloatingActionBar';
import MapDrawer from '@/components/trip/MapDrawer';
import SmartSuggestions from '@/components/trip/SmartSuggestions';
import { formatTripDateRange, calculateTripDays } from '@/lib/utils';
import type { FlightData } from '@/types/trip';
import type { Destination } from '@/types/destination';

/**
 * TripPage - Clean, minimal editorial design
 * Features: Day-based navigation, smart suggestions, floating actions
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

  // Computed values
  const dateDisplay = formatTripDateRange(trip?.start_date, trip?.end_date);
  const daysCount = calculateTripDays(trip?.start_date, trip?.end_date);
  const totalStops = days.reduce((acc, day) => acc + day.items.length, 0);

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
      <main className="w-full min-h-screen bg-white dark:bg-gray-950">
        <PageLoader />
      </main>
    );
  }

  // Not found
  if (!trip) {
    return (
      <main className="w-full min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Trip not found</p>
          <Link
            href="/trips"
            className="text-sm font-medium text-gray-900 dark:text-white underline underline-offset-4"
          >
            Back to trips
          </Link>
        </div>
      </main>
    );
  }

  // Cover image from trip or first destination
  const coverImage = trip.cover_image || days
    .flatMap(d => d.items)
    .find(item => item.destination?.image)?.destination?.image;

  return (
    <main className="w-full min-h-screen bg-white dark:bg-gray-950 pb-32">
      {/* Hero Section */}
      <div className="relative">
        {/* Cover Image */}
        {coverImage ? (
          <div className="relative w-full h-64 md:h-80">
            <Image
              src={coverImage}
              alt={trip.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </div>
        ) : (
          <div className="w-full h-32 md:h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900" />
        )}

        {/* Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between z-10">
          <Link
            href="/trips"
            className={`p-2.5 rounded-full backdrop-blur-sm transition-colors ${coverImage ? 'bg-black/20 hover:bg-black/30 text-white' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMapOpen(true)}
              className={`p-2.5 rounded-full backdrop-blur-sm transition-colors ${coverImage ? 'bg-black/20 hover:bg-black/30 text-white' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white'}`}
            >
              <Map className="w-5 h-5" />
            </button>
            <button
              onClick={() => openDrawer('trip-settings', {
                trip,
                onUpdate: updateTrip,
                onDelete: () => router.push('/trips'),
              })}
              className={`p-2.5 rounded-full backdrop-blur-sm transition-colors ${coverImage ? 'bg-black/20 hover:bg-black/30 text-white' : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white'}`}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Title Overlay (when cover image exists) */}
        {coverImage && (
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <h1 className="text-3xl md:text-4xl font-light text-white mb-2">
              {trip.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-white/80">
              {trip.destination && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {trip.destination}
                </span>
              )}
              {dateDisplay && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/40" />
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {dateDisplay}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 md:px-10">
        {/* Title (when no cover image) */}
        {!coverImage && (
          <div className="py-8 md:py-10">
            <h1 className="text-3xl md:text-4xl font-light text-gray-900 dark:text-white mb-2">
              {trip.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              {trip.destination && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {trip.destination}
                </span>
              )}
              {dateDisplay && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {dateDisplay}
                  </span>
                </>
              )}
              {daysCount && daysCount > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <span>{daysCount} days</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className={`flex items-center gap-6 text-sm ${coverImage ? 'py-8 md:py-10' : 'pb-8 md:pb-10'}`}>
          <div>
            <span className="text-2xl font-light text-gray-900 dark:text-white">{totalStops}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1.5">stops</span>
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-800" />
          <div>
            <span className="text-2xl font-light text-gray-900 dark:text-white">{days.length}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1.5">days</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={handleAITripPlanning}
            disabled={isAIPlanning || saving}
            className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {isAIPlanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isAIPlanning ? 'Planning...' : 'AI Autopilot'}
          </button>
          <button
            onClick={() => openPlaceSelector(selectedDayNumber)}
            className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-full hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Stop
          </button>
        </div>

        {/* Smart Suggestions */}
        {days.length > 0 && (
          <SmartSuggestions
            days={days}
            destination={trip.destination}
            onAddPlace={(dayNumber) => {
              setSelectedDayNumber(dayNumber);
              openPlaceSelector(dayNumber);
            }}
            className="mb-8"
          />
        )}

        {/* Itinerary */}
        <div className="space-y-6">
          {days.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16 px-6">
              <MapPin className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <h3 className="text-lg font-light text-gray-900 dark:text-white mb-2">
                Start planning your trip
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                Add your first stop to begin building your itinerary
              </p>
              <button
                onClick={() => openPlaceSelector(1)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Add your first stop
              </button>
            </div>
          ) : (
            <>
              {/* Day Navigation */}
              <DayTabNav
                days={days}
                selectedDayNumber={selectedDayNumber}
                onSelectDay={setSelectedDayNumber}
                className="mb-6"
              />

              {/* Selected Day */}
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
                  activeItemId={activeItemId}
                />
              ))}
            </>
          )}
        </div>
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
