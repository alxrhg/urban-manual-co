'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MapPin, X, GripVertical, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { parseDestinations, formatDestinations } from '@/types/trip';
import { calculateDayNumberFromDate } from '@/lib/utils/time-calculations';
import { PageLoader } from '@/components/LoadingStates';

/**
 * TripPage - Minimal trip detail
 *
 * Philosophy: A trip is just a list. Nothing more.
 * - No tabs, no sidebars, no buttons
 * - Just days with places
 * - Drag to reorder, tap to view/edit
 * - Intelligence works invisibly
 */
export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;
  const { user } = useAuth();

  const {
    trip,
    days,
    loading,
    reorderItems,
    removeItem,
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

  // Format date range
  const dateDisplay = useMemo(() => {
    if (!trip?.start_date) return '';
    const start = new Date(trip.start_date);
    const end = trip.end_date ? new Date(trip.end_date) : start;
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();
    if (start.getMonth() === end.getMonth() && startDay !== endDay) {
      return `${startMonth} ${startDay}–${endDay}`;
    }
    if (startDay === endDay) {
      return `${startMonth} ${startDay}`;
    }
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
  }, [trip?.start_date, trip?.end_date]);

  // Count total items
  const totalItems = useMemo(() => {
    return days.reduce((sum, day) => sum + day.items.length, 0);
  }, [days]);

  // Auto-fix items on wrong days based on their dates
  const hasAutoFixed = useRef(false);
  useEffect(() => {
    if (loading || !trip?.start_date || days.length === 0 || hasAutoFixed.current) return;
    const totalItems = days.reduce((sum, day) => sum + day.items.length, 0);
    if (totalItems === 0) return;

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

  // Loading state
  if (loading) {
    return (
      <main className="w-full px-4 sm:px-6 py-20 min-h-screen bg-white dark:bg-gray-950">
        <div className="max-w-xl mx-auto">
          <PageLoader />
        </div>
      </main>
    );
  }

  // Not found
  if (!trip) {
    return (
      <main className="w-full px-4 sm:px-6 py-20 min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
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
    <main className="w-full px-4 sm:px-6 py-20 min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-xl mx-auto">
        {/* Header - minimal */}
        <header className="mb-8">
          <Link
            href="/trips"
            className="inline-flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Trips
          </Link>

          <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white mb-1">
            {trip.title}
          </h1>

          <p className="text-[13px] text-gray-400">
            {[primaryCity, dateDisplay, `${totalItems} ${totalItems === 1 ? 'place' : 'places'}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </header>

        {/* Days - simple list */}
        <div className="space-y-6">
          {days.map((day) => (
            <DaySection
              key={day.dayNumber}
              dayNumber={day.dayNumber}
              date={day.date ?? undefined}
              items={day.items}
              onReorder={(items) => reorderItems(day.dayNumber, items)}
              onRemove={removeItem}
            />
          ))}
        </div>

        {/* Empty state */}
        {totalItems === 0 && (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-[14px] text-gray-500 mb-4">
              No places yet
            </p>
            <Link
              href="/"
              className="text-[13px] font-medium text-gray-900 dark:text-white hover:opacity-70 transition-opacity"
            >
              Browse destinations
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * Day section with reorderable items
 */
function DaySection({
  dayNumber,
  date,
  items,
  onReorder,
  onRemove,
}: {
  dayNumber: number;
  date?: string;
  items: EnrichedItineraryItem[];
  onReorder: (items: EnrichedItineraryItem[]) => void;
  onRemove: (id: string) => void;
}) {
  const [orderedItems, setOrderedItems] = useState(items);

  // Sync with parent
  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  // Handle reorder complete
  const handleReorderComplete = useCallback(() => {
    if (JSON.stringify(orderedItems.map(i => i.id)) !== JSON.stringify(items.map(i => i.id))) {
      onReorder(orderedItems);
    }
  }, [orderedItems, items, onReorder]);

  const dateDisplay = date
    ? new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  return (
    <div>
      {/* Day header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
          Day {dayNumber}
        </span>
        {dateDisplay && (
          <span className="text-[11px] text-gray-300 dark:text-gray-600">
            {dateDisplay}
          </span>
        )}
      </div>

      {/* Items */}
      {items.length > 0 ? (
        <Reorder.Group
          axis="y"
          values={orderedItems}
          onReorder={setOrderedItems}
          className="space-y-2"
        >
          {orderedItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onRemove={() => onRemove(item.id)}
              onDragEnd={handleReorderComplete}
            />
          ))}
        </Reorder.Group>
      ) : (
        <div className="py-6 text-center">
          <p className="text-[12px] text-gray-400">No places for this day</p>
        </div>
      )}
    </div>
  );
}

/**
 * Single item row
 */
function ItemRow({
  item,
  onRemove,
  onDragEnd,
}: {
  item: EnrichedItineraryItem;
  onRemove: () => void;
  onDragEnd: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  // Get display info
  const title = item.title || item.destination?.name || 'Untitled';
  const image = item.destination?.image_thumbnail || item.destination?.image;
  const time = item.time || item.parsedNotes?.departureTime || item.parsedNotes?.checkInTime;
  const category = item.destination?.category || item.parsedNotes?.category || item.parsedNotes?.type;

  // Format time display
  const timeDisplay = time
    ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null;

  return (
    <Reorder.Item
      value={item}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => {
        setIsDragging(false);
        onDragEnd();
      }}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-xl
        bg-gray-50 dark:bg-gray-900/50
        group cursor-grab active:cursor-grabbing
        ${isDragging ? 'shadow-lg ring-1 ring-gray-200 dark:ring-gray-700 z-10' : ''}
      `}
    >
      {/* Drag handle */}
      <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Time */}
      <span className="w-14 text-[11px] text-gray-400 text-right flex-shrink-0">
        {timeDisplay || '—'}
      </span>

      {/* Image */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
        {image ? (
          <Image
            src={image}
            alt=""
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
          {title}
        </p>
        {category && (
          <p className="text-[11px] text-gray-400 capitalize">
            {category}
          </p>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
      >
        <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
      </button>
    </Reorder.Item>
  );
}
