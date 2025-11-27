'use client';

import { useState, useCallback, useEffect } from 'react';
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
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  ArrowLeft,
  Settings,
  Calendar,
  MapPin,
  Plus,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PageLoader } from '@/components/LoadingStates';
import ItineraryCard from '@/components/trip/ItineraryCard';
import DayTabNav from '@/components/trip/DayTabNav';
import FloatingActionBar from '@/components/trip/FloatingActionBar';
import MapDrawer from '@/components/trip/MapDrawer';
import type { FlightData } from '@/types/trip';
import type { Destination } from '@/types/destination';

/**
 * TripPage - Fresh Journal-style trip planner
 * Immersive imagery, elegant typography, floating interactions
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
    updateItemTime,
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
  const [mounted, setMounted] = useState(false);

  // Animation trigger
  useEffect(() => {
    setMounted(true);
  }, []);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Get current day's items
  const currentDay = days.find((d) => d.dayNumber === selectedDayNumber);
  const currentItems = currentDay?.items || [];

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

  // Loading state
  if (loading) {
    return (
      <main className="w-full min-h-screen bg-[#faf9f7] dark:bg-[#0a0a0a]">
        <PageLoader />
      </main>
    );
  }

  // Not found
  if (!trip) {
    return (
      <main className="w-full min-h-screen bg-[#faf9f7] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-400 mb-4">Trip not found</p>
          <Link href="/trips" className="text-sm text-stone-900 dark:text-white hover:underline">
            Back to trips
          </Link>
        </div>
      </main>
    );
  }

  // Cover image from first destination
  const coverImage = days
    .flatMap(d => d.items)
    .find(item => item.destination?.image)?.destination?.image;

  // Format date range
  const dateRange = trip.start_date && trip.end_date
    ? `${format(parseISO(trip.start_date), 'MMM d')} — ${format(parseISO(trip.end_date), 'MMM d, yyyy')}`
    : null;

  return (
    <main className="w-full min-h-screen bg-[#faf9f7] dark:bg-[#0a0a0a]">
      {/* Hero Section */}
      <header className="relative h-[50vh] min-h-[400px] overflow-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-br from-stone-300 to-stone-400 dark:from-stone-800 dark:to-stone-900" />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#faf9f7] via-[#faf9f7]/50 to-transparent dark:from-[#0a0a0a] dark:via-[#0a0a0a]/50" />

        {/* Top Navigation */}
        <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 md:p-6">
          <Link
            href="/trips"
            className={`
              flex items-center gap-2 px-3 py-2 rounded-full
              bg-white/80 dark:bg-black/60 backdrop-blur-sm
              text-sm text-stone-600 dark:text-stone-300
              hover:bg-white dark:hover:bg-black transition-colors
              shadow-lg
              opacity-0 ${mounted ? 'animate-fade-in' : ''}
            `}
            style={{ animationDelay: '0.1s' }}
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
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              bg-white/80 dark:bg-black/60 backdrop-blur-sm
              text-stone-600 dark:text-stone-300
              hover:bg-white dark:hover:bg-black transition-colors
              shadow-lg
              opacity-0 ${mounted ? 'animate-fade-in' : ''}
            `}
            style={{ animationDelay: '0.2s' }}
          >
            <Settings className="w-5 h-5" />
          </button>
        </nav>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 md:p-10">
          <div className="max-w-4xl mx-auto">
            {/* Destination Tag */}
            {trip.destination && (
              <div
                className={`
                  inline-flex items-center gap-1.5 mb-4
                  text-xs uppercase tracking-[0.2em] font-medium
                  text-stone-500 dark:text-stone-400
                  opacity-0 ${mounted ? 'animate-fade-in' : ''}
                `}
                style={{ animationDelay: '0.1s' }}
              >
                <MapPin className="w-3 h-3" />
                {trip.destination}
              </div>
            )}

            {/* Title */}
            <h1
              className={`
                text-4xl md:text-6xl lg:text-7xl font-display
                text-stone-900 dark:text-white
                leading-[1.1] tracking-tight
                opacity-0 ${mounted ? 'animate-slide-up' : ''}
              `}
              style={{ animationDelay: '0.2s' }}
            >
              {trip.title}
            </h1>

            {/* Date Range */}
            {dateRange && (
              <div
                className={`
                  flex items-center gap-2 mt-4
                  text-sm text-stone-500 dark:text-stone-400
                  opacity-0 ${mounted ? 'animate-fade-in' : ''}
                `}
                style={{ animationDelay: '0.3s' }}
              >
                <Calendar className="w-4 h-4" />
                {dateRange}
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span>{days.length} days</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Day Navigation */}
      <div
        className={`
          sticky top-0 z-30
          bg-[#faf9f7]/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm
          border-b border-stone-200/50 dark:border-stone-800/50
          opacity-0 ${mounted ? 'animate-fade-in' : ''}
        `}
        style={{ animationDelay: '0.4s' }}
      >
        <div className="max-w-4xl mx-auto">
          <DayTabNav
            days={days}
            selectedDayNumber={selectedDayNumber}
            onSelectDay={setSelectedDayNumber}
          />
        </div>
      </div>

      {/* Content Grid */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 py-8 pb-32">
        {currentItems.length === 0 ? (
          /* Empty State */
          <div
            className={`
              flex flex-col items-center justify-center py-20 text-center
              opacity-0 ${mounted ? 'animate-fade-in' : ''}
            `}
            style={{ animationDelay: '0.5s' }}
          >
            <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-stone-400" />
            </div>
            <h3 className="text-lg font-display text-stone-900 dark:text-white mb-2">
              Day {selectedDayNumber} is empty
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 max-w-xs">
              Add your first stop to start planning this day of your trip.
            </p>
            <button
              onClick={() => openPlaceSelector(selectedDayNumber)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 font-medium text-sm hover:scale-105 transition-transform shadow-lg"
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
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`
                      opacity-0 ${mounted ? 'animate-fade-in' : ''}
                      ${index === 0 ? 'md:col-span-2' : ''}
                    `}
                    style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                  >
                    <ItineraryCard
                      item={item}
                      index={index}
                      variant={index === 0 ? 'featured' : 'default'}
                      onEdit={handleEditItem}
                      onRemove={removeItem}
                      isActive={item.id === activeItemId}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
