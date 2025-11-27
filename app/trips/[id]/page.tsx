'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  ArrowLeft,
  Settings,
  Calendar,
  MapPin,
  Plus,
  Map,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PageLoader } from '@/components/LoadingStates';
import ItineraryCard from '@/components/trip/ItineraryCard';
import FloatingActionBar from '@/components/trip/FloatingActionBar';
import MapDrawer from '@/components/trip/MapDrawer';
import type { FlightData } from '@/types/trip';
import type { Destination } from '@/types/destination';

/**
 * TripPage - Cohesive journal-style trip planner
 * Warm tones, immersive imagery, smooth interactions
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

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Get current day's items
  const currentDay = useMemo(() =>
    days.find((d) => d.dayNumber === selectedDayNumber),
    [days, selectedDayNumber]
  );
  const currentItems = currentDay?.items || [];

  // Cover image from first destination with image
  const coverImage = useMemo(() =>
    days
      .flatMap(d => d.items)
      .find(item => item.destination?.image)?.destination?.image,
    [days]
  );

  // Format date range
  const dateRange = useMemo(() => {
    if (!trip?.start_date || !trip?.end_date) return null;
    try {
      return `${format(parseISO(trip.start_date), 'MMM d')} — ${format(parseISO(trip.end_date), 'MMM d, yyyy')}`;
    } catch {
      return null;
    }
  }, [trip?.start_date, trip?.end_date]);

  // Format day date
  const formatDayDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = parseISO(dateStr);
      return {
        weekday: format(date, 'EEE'),
        day: format(date, 'd'),
        month: format(date, 'MMM'),
      };
    } catch {
      return null;
    }
  }, []);

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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = currentItems.findIndex((item) => item.id === active.id);
      const newIndex = currentItems.findIndex((item) => item.id === over.id);
      const newItems = arrayMove(currentItems, oldIndex, newIndex);
      reorderItems(selectedDayNumber, newItems);
    }
  }, [currentItems, reorderItems, selectedDayNumber]);

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

  // Day navigation
  const goToPrevDay = () => {
    if (selectedDayNumber > 1) {
      setSelectedDayNumber(selectedDayNumber - 1);
    }
  };

  const goToNextDay = () => {
    if (selectedDayNumber < days.length) {
      setSelectedDayNumber(selectedDayNumber + 1);
    }
  };

  // Loading state
  if (loading) {
    return (
      <main className="w-full min-h-screen bg-stone-50 dark:bg-stone-950">
        <PageLoader />
      </main>
    );
  }

  // Not found
  if (!trip) {
    return (
      <main className="w-full min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-400 mb-4">Trip not found</p>
          <Link href="/trips" className="text-sm text-stone-900 dark:text-white hover:underline">
            Back to trips
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* Hero Section */}
      <header className="relative h-[40vh] min-h-[320px] overflow-hidden">
        {/* Background Image */}
        {coverImage ? (
          <Image
            src={coverImage}
            alt={trip.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-stone-200 to-stone-300 dark:from-stone-800 dark:to-stone-900" />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-50 via-stone-50/60 to-transparent dark:from-stone-950 dark:via-stone-950/60" />

        {/* Top Navigation */}
        <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 md:p-6">
          <Link
            href="/trips"
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm text-sm text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-900 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Trips</span>
          </Link>

          <button
            onClick={() => openDrawer('trip-settings', {
              trip,
              onUpdate: updateTrip,
              onDelete: () => router.push('/trips'),
            })}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-900 transition-colors shadow-sm"
          >
            <Settings className="w-5 h-5" />
          </button>
        </nav>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 md:p-8">
          <div className="max-w-3xl mx-auto">
            {/* Destination Tag */}
            {trip.destination && (
              <div className="inline-flex items-center gap-1.5 mb-3 text-xs uppercase tracking-wider font-medium text-stone-500 dark:text-stone-400">
                <MapPin className="w-3 h-3" />
                {trip.destination}
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl md:text-5xl font-light text-stone-900 dark:text-white leading-tight">
              {trip.title}
            </h1>

            {/* Date Range */}
            {dateRange && (
              <div className="flex items-center gap-2 mt-3 text-sm text-stone-500 dark:text-stone-400">
                <Calendar className="w-4 h-4" />
                {dateRange}
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span>{days.length} days</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Day Navigation Bar */}
      <div className="sticky top-0 z-30 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-sm border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Previous Day */}
            <button
              onClick={goToPrevDay}
              disabled={selectedDayNumber <= 1}
              className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-stone-600 dark:text-stone-400" />
            </button>

            {/* Day Info */}
            <div className="flex items-center gap-4">
              {/* Day Pills */}
              <div className="flex items-center gap-1">
                {days.map((day) => {
                  const isSelected = day.dayNumber === selectedDayNumber;
                  return (
                    <button
                      key={day.dayNumber}
                      onClick={() => setSelectedDayNumber(day.dayNumber)}
                      className={`
                        w-8 h-8 rounded-full text-sm font-medium transition-all
                        ${isSelected
                          ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-sm'
                          : 'text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }
                      `}
                    >
                      {day.dayNumber}
                    </button>
                  );
                })}
              </div>

              {/* Current Day Label */}
              {currentDay && (
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <span className="font-medium text-stone-900 dark:text-white">
                    Day {selectedDayNumber}
                  </span>
                  {currentDay.date && (
                    <>
                      <span className="text-stone-300 dark:text-stone-600">·</span>
                      <span className="text-stone-500 dark:text-stone-400">
                        {formatDayDate(currentDay.date)?.weekday}, {formatDayDate(currentDay.date)?.month} {formatDayDate(currentDay.date)?.day}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Next Day */}
            <button
              onClick={goToNextDay}
              disabled={selectedDayNumber >= days.length}
              className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-stone-600 dark:text-stone-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 md:px-6 py-6 pb-32">
        {currentItems.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-stone-400" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-2">
              Day {selectedDayNumber} is empty
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 max-w-xs">
              Add your first stop to start planning this day.
            </p>
            <button
              onClick={() => openPlaceSelector(selectedDayNumber)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add a place
            </button>
          </div>
        ) : (
          /* Itinerary Grid */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={currentItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {currentItems.map((item, index) => (
                  <ItineraryCard
                    key={item.id}
                    item={item}
                    index={index}
                    onEdit={handleEditItem}
                    onRemove={removeItem}
                    isActive={item.id === activeItemId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Add Stop Button (when items exist) */}
        {currentItems.length > 0 && (
          <button
            onClick={() => openPlaceSelector(selectedDayNumber)}
            className="w-full mt-6 flex items-center justify-center gap-2 py-3 text-sm font-medium text-stone-500 dark:text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl hover:border-stone-300 dark:hover:border-stone-700 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add another stop
          </button>
        )}
      </section>

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
