'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import {
  ArrowLeft,
  Plus,
  Loader2,
  MapPin,
  Plane,
  Hotel,
  Calendar,
  Clock,
  Share2,
  MoreHorizontal,
  Sparkles,
  ChevronRight,
  X,
  Trash2,
  Settings,
  GripVertical,
  Utensils,
  Coffee,
  Wine,
  Landmark,
  ShoppingBag,
  Camera,
  Check,
  Map,
  Route,
  Sun,
  Moon,
  Sunrise,
  Sunset,
} from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import type { FlightData, ActivityData } from '@/types/trip';
import { parseDestinations, formatDestinationsFromField } from '@/types/trip';
import type { Destination } from '@/types/destination';
import { formatTripDateRange, calculateTripDays } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

// Time slot categories
type TimeSlot = 'morning' | 'afternoon' | 'evening';

function getTimeSlot(time: string | null | undefined): TimeSlot {
  if (!time) return 'morning';
  const hour = parseInt(time.split(':')[0], 10);
  if (isNaN(hour)) return 'morning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const timeSlotConfig: Record<TimeSlot, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  morning: { label: 'Morning', icon: Sunrise, color: 'text-amber-500' },
  afternoon: { label: 'Afternoon', icon: Sun, color: 'text-orange-500' },
  evening: { label: 'Evening', icon: Sunset, color: 'text-purple-500' },
};

// Category icons
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  restaurant: Utensils,
  cafe: Coffee,
  bar: Wine,
  museum: Landmark,
  hotel: Hotel,
  shopping: ShoppingBag,
  attraction: Camera,
  default: MapPin,
};

function getCategoryIcon(category: string | null | undefined) {
  if (!category) return categoryIcons.default;
  const lower = category.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (lower.includes(key)) return icon;
  }
  return categoryIcons.default;
}

// Sortable Item Component
interface SortableItemProps {
  item: EnrichedItineraryItem;
  onEdit: (item: EnrichedItineraryItem) => void;
  onRemove: (id: string) => void;
}

function SortableItem({ item, onEdit, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const CategoryIcon = getCategoryIcon(item.parsedNotes?.category || item.destination?.category);
  const isTransport = item.parsedNotes?.type === 'flight' || item.parsedNotes?.type === 'train';
  const isHotel = item.parsedNotes?.type === 'hotel';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 hover:border-stone-300 dark:hover:border-gray-700 transition-all"
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-stone-400" />
      </button>

      {/* Image/Icon */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-stone-100 dark:bg-gray-800 flex-shrink-0 ml-4">
        {item.destination?.image_thumbnail || item.destination?.image ? (
          <Image
            src={item.destination.image_thumbnail || item.destination.image || ''}
            alt={item.title}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {isTransport ? (
              <Plane className="w-5 h-5 text-stone-400" />
            ) : isHotel ? (
              <Hotel className="w-5 h-5 text-stone-400" />
            ) : (
              <CategoryIcon className="w-5 h-5 text-stone-400" />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(item)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-stone-900 dark:text-white truncate">
              {item.title}
            </h4>
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5 truncate">
              {isTransport ? (
                `${item.parsedNotes?.from} → ${item.parsedNotes?.to}`
              ) : isHotel ? (
                item.parsedNotes?.address || item.destination?.neighborhood || 'Accommodation'
              ) : (
                item.destination?.neighborhood || item.parsedNotes?.category || item.destination?.category
              )}
            </p>
          </div>
          {item.time && (
            <span className="flex-shrink-0 text-xs text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {item.time}
            </span>
          )}
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        className="absolute right-2 top-2 p-1 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Day Section Component
interface DaySectionProps {
  dayNumber: number;
  date: string | null;
  items: EnrichedItineraryItem[];
  onEditItem: (item: EnrichedItineraryItem) => void;
  onRemoveItem: (id: string) => void;
  onAddItem: (dayNumber: number) => void;
  onReorderItems: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
  isActive: boolean;
}

function DaySection({
  dayNumber,
  date,
  items,
  onEditItem,
  onRemoveItem,
  onAddItem,
  onReorderItems,
  isActive
}: DaySectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newItems = [...items];
      const [removed] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, removed);
      onReorderItems(dayNumber, newItems);
    }
  };

  // Group items by time slot
  const groupedItems = useMemo(() => {
    const groups: Record<TimeSlot, EnrichedItineraryItem[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };

    items.forEach(item => {
      const slot = getTimeSlot(item.time);
      groups[slot].push(item);
    });

    return groups;
  }, [items]);

  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  return (
    <section
      id={`day-${dayNumber}`}
      className={`scroll-mt-20 transition-all ${isActive ? '' : ''}`}
    >
      {/* Day Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-900 dark:bg-white flex items-center justify-center">
            <span className="text-sm font-semibold text-white dark:text-gray-900">{dayNumber}</span>
          </div>
          <div>
            <h3 className="text-base font-medium text-stone-900 dark:text-white">Day {dayNumber}</h3>
            {formattedDate && (
              <p className="text-xs text-stone-500 dark:text-gray-400">{formattedDate}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => onAddItem(dayNumber)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div
          className="border-2 border-dashed border-stone-200 dark:border-gray-800 rounded-2xl p-8 text-center cursor-pointer hover:border-stone-300 dark:hover:border-gray-700 transition-colors"
          onClick={() => onAddItem(dayNumber)}
        >
          <MapPin className="w-8 h-8 mx-auto text-stone-300 dark:text-gray-700 mb-2" />
          <p className="text-sm text-stone-500 dark:text-gray-400">No activities yet</p>
          <p className="text-xs text-stone-400 dark:text-gray-500 mt-1">Click to add your first stop</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map(item => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onEdit={onEditItem}
                  onRemove={onRemoveItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

/**
 * TripPage - Fresh design for trip detail view
 * Single-scroll layout with day sections and inline editing
 */
export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;
  const { user } = useAuth();
  const openDrawer = useDrawerStore((s) => s.openDrawer);
  const sectionRefs = useRef<Map<number, HTMLElement>>(new Map());
  const [activeDay, setActiveDay] = useState(1);
  const [isAIPlanning, setIsAIPlanning] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

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

  // Parse destinations
  const destinations = useMemo(() => parseDestinations(trip?.destination ?? null), [trip?.destination]);
  const primaryCity = destinations[0] || '';
  const destinationsDisplay = useMemo(() => formatDestinationsFromField(trip?.destination ?? null), [trip?.destination]);
  const daysCount = calculateTripDays(trip?.start_date, trip?.end_date);

  // Stats
  const stats = useMemo(() => {
    const allItems = days.flatMap(d => d.items);
    return {
      places: allItems.filter(i => !['flight', 'train', 'hotel'].includes(i.parsedNotes?.type || '')).length,
      flights: allItems.filter(i => i.parsedNotes?.type === 'flight').length,
      hotels: allItems.filter(i => i.parsedNotes?.type === 'hotel').length,
    };
  }, [days]);

  // Active day intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const dayNumber = parseInt(entry.target.id.replace('day-', ''), 10);
            if (!isNaN(dayNumber)) {
              setActiveDay(dayNumber);
            }
          }
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    days.forEach(day => {
      const el = document.getElementById(`day-${day.dayNumber}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [days]);

  // Callbacks
  const handleOpenPlaceSelector = useCallback((dayNumber: number) => {
    openDrawer('place-selector', {
      tripId: trip?.id,
      dayNumber,
      city: primaryCity,
      onSelect: (destination: Destination) => addPlace(destination, dayNumber),
    });
  }, [trip?.id, primaryCity, openDrawer, addPlace]);

  const handleOpenFlightDrawer = useCallback((dayNumber: number) => {
    openDrawer('add-flight', {
      tripId: trip?.id,
      dayNumber,
      onAdd: (flightData: FlightData) => addFlight(flightData, dayNumber),
    });
  }, [trip?.id, openDrawer, addFlight]);

  const handleEditItem = useCallback((item: EnrichedItineraryItem) => {
    openDrawer('edit-item', {
      item,
      tripId: trip?.id,
      onUpdate: refresh,
    });
  }, [trip?.id, openDrawer, refresh]);

  const handleAIPlan = async () => {
    if (!trip || !primaryCity) return;
    setIsAIPlanning(true);
    try {
      const allItems = days.flatMap(day => day.items);
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

      if (response.ok) {
        const result = await response.json();
        for (const suggestion of result.suggestions || []) {
          if (suggestion.destination) {
            await addPlace(suggestion.destination, suggestion.day, suggestion.startTime);
          }
        }
        await refresh();
      }
    } catch (err) {
      console.error('AI Planning error:', err);
    } finally {
      setIsAIPlanning(false);
    }
  };

  const handleShare = async () => {
    if (!trip) return;
    const url = `${window.location.origin}/trips/${trip.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: trip.title, text: `Check out my trip: ${trip.title}`, url });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const handleDeleteTrip = async () => {
    if (!trip || !user || !confirm('Delete this trip? This cannot be undone.')) return;
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.from('trips').delete().eq('id', trip.id).eq('user_id', user.id);
      router.push('/trips');
    } catch (err) {
      console.error('Failed to delete trip:', err);
    }
  };

  const scrollToDay = (dayNumber: number) => {
    const el = document.getElementById(`day-${dayNumber}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Loading
  if (loading) {
    return (
      <main className="w-full min-h-screen bg-stone-50 dark:bg-gray-950 pt-16">
        <PageLoader />
      </main>
    );
  }

  // Not found
  if (!trip) {
    return (
      <main className="w-full min-h-screen bg-stone-50 dark:bg-gray-950 pt-16 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-stone-500 dark:text-gray-400 mb-4">Trip not found</p>
          <Link
            href="/trips"
            className="text-sm text-stone-900 dark:text-white hover:underline"
          >
            Back to trips
          </Link>
        </div>
      </main>
    );
  }

  const coverImage = trip.cover_image || days
    .flatMap(d => d.items)
    .find(item => item.destination?.image)?.destination?.image;

  return (
    <main className="w-full min-h-screen bg-stone-50 dark:bg-gray-950">
      {/* Hero Section */}
      <div className="relative h-64 sm:h-80 bg-stone-900">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={trip.title}
            fill
            className="object-cover opacity-60"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-900" />
        )}

        {/* Overlay Content */}
        <div className="absolute inset-0 flex flex-col">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 pt-20">
            <Link
              href="/trips"
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Trips</span>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share trip
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip })}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDeleteTrip} className="text-red-600 dark:text-red-400">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete trip
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Trip Info */}
          <div className="flex-1 flex flex-col justify-end p-6">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-2">
              {trip.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
              {destinationsDisplay && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {destinationsDisplay}
                </span>
              )}
              {formatTripDateRange(trip.start_date, trip.end_date) && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatTripDateRange(trip.start_date, trip.end_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="sticky top-16 z-30 bg-white dark:bg-gray-900 border-b border-stone-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-stone-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                {stats.places} places
              </span>
              {stats.flights > 0 && (
                <span className="flex items-center gap-1.5 text-stone-600 dark:text-gray-400">
                  <Plane className="w-4 h-4" />
                  {stats.flights}
                </span>
              )}
              {stats.hotels > 0 && (
                <span className="flex items-center gap-1.5 text-stone-600 dark:text-gray-400">
                  <Hotel className="w-4 h-4" />
                  {stats.hotels}
                </span>
              )}
            </div>

            {/* Day Pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {days.map(day => (
                <button
                  key={day.dayNumber}
                  onClick={() => scrollToDay(day.dayNumber)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    activeDay === day.dayNumber
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900'
                      : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-800'
                  }`}
                >
                  Day {day.dayNumber}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 pb-32">
        <div className="space-y-10">
          {days.map(day => (
            <DaySection
              key={day.dayNumber}
              dayNumber={day.dayNumber}
              date={day.date}
              items={day.items}
              onEditItem={handleEditItem}
              onRemoveItem={removeItem}
              onAddItem={handleOpenPlaceSelector}
              onReorderItems={reorderItems}
              isActive={activeDay === day.dayNumber}
            />
          ))}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2 items-end">
        {/* Quick Actions */}
        {showQuickAdd && (
          <div className="flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <button
              onClick={() => { handleOpenPlaceSelector(activeDay); setShowQuickAdd(false); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 text-stone-900 dark:text-white text-sm font-medium rounded-full shadow-lg border border-stone-200 dark:border-gray-700 hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Add Place
            </button>
            <button
              onClick={() => { handleOpenFlightDrawer(activeDay); setShowQuickAdd(false); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 text-stone-900 dark:text-white text-sm font-medium rounded-full shadow-lg border border-stone-200 dark:border-gray-700 hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Plane className="w-4 h-4" />
              Add Flight
            </button>
            <button
              onClick={() => { handleAIPlan(); setShowQuickAdd(false); }}
              disabled={isAIPlanning}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 text-stone-900 dark:text-white text-sm font-medium rounded-full shadow-lg border border-stone-200 dark:border-gray-700 hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {isAIPlanning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              AI Suggestions
            </button>
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
            showQuickAdd
              ? 'bg-stone-200 dark:bg-gray-700 rotate-45'
              : 'bg-stone-900 dark:bg-white hover:scale-105'
          }`}
        >
          <Plus className={`w-6 h-6 ${showQuickAdd ? 'text-stone-900 dark:text-white' : 'text-white dark:text-gray-900'}`} />
        </button>
      </div>

      {/* Saving Indicator */}
      {saving && (
        <div className="fixed bottom-6 left-6 z-40 px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-full shadow-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving...
        </div>
      )}
    </main>
  );
}
