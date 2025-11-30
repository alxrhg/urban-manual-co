'use client';

import { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Clock } from 'lucide-react';
import { formatTimeDisplay, formatDuration } from '@/lib/utils/time-calculations';
import FlightStatusCard from '@/components/trips/FlightStatusCard';
import LodgingCard from '@/components/trips/LodgingCard';
import PlaceCard from '@/components/trips/PlaceCard';
import TransportCard from '@/components/trips/TransportCard';
import MealCard from '@/components/trips/MealCard';
import EventCard from '@/components/trips/EventCard';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TimelineBlockProps {
  item: EnrichedItineraryItem;
  index: number;
  onEdit?: (item: EnrichedItineraryItem) => void;
  onRemove?: (id: string) => void;
  onTimeChange?: (id: string, time: string) => void;
  isActive?: boolean;
  isDraggable?: boolean;
}

/**
 * TimelineBlock - Unified time block for all itinerary item types
 * Layout: Time column (left) | Content (center) | Actions (right on hover)
 */
export default function TimelineBlock({
  item,
  index,
  onEdit,
  onRemove,
  onTimeChange,
  isActive = false,
  isDraggable = true,
}: TimelineBlockProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const showControls = isHovered || isTouched || isActive;
  const itemType = item.parsedNotes?.type;

  const handleTouchStart = useCallback(() => {
    setIsTouched(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setTimeout(() => setIsTouched(false), 2000);
  }, []);

  // Render the appropriate card based on item type
  const renderCardContent = () => {
    // Flight
    if (itemType === 'flight' && item.parsedNotes) {
      return (
        <FlightStatusCard
          flight={item.parsedNotes}
          departureDate={item.parsedNotes.departureDate}
          compact
        />
      );
    }

    // Hotel
    if (itemType === 'hotel' && item.parsedNotes) {
      return (
        <LodgingCard
          name={item.title || item.parsedNotes.name || 'Accommodation'}
          address={item.parsedNotes.address}
          checkIn={item.parsedNotes.checkInDate || item.parsedNotes.checkInTime}
          checkOut={item.parsedNotes.checkOutDate || item.parsedNotes.checkOutTime}
          confirmationNumber={item.parsedNotes.hotelConfirmation || item.parsedNotes.confirmationNumber}
          phone={item.parsedNotes.phone}
          website={item.parsedNotes.website}
          notes={item.parsedNotes.notes}
          compact
        />
      );
    }

    // Event
    if (itemType === 'event' && item.parsedNotes) {
      return (
        <EventCard
          event={item.parsedNotes}
          name={item.title}
          compact
        />
      );
    }

    // Train
    if (itemType === 'train' && item.parsedNotes) {
      return (
        <TransportCard
          type="train"
          from={item.parsedNotes.from}
          to={item.parsedNotes.to}
          departureDate={item.parsedNotes.departureDate}
          departureTime={item.parsedNotes.departureTime}
          arrivalTime={item.parsedNotes.arrivalTime}
          duration={item.parsedNotes.duration}
          trainNumber={item.parsedNotes.trainNumber}
          trainLine={item.parsedNotes.trainLine}
          confirmationNumber={item.parsedNotes.confirmationNumber}
          notes={item.parsedNotes.notes}
          compact
        />
      );
    }

    // Drive
    if (itemType === 'drive' && item.parsedNotes) {
      return (
        <TransportCard
          type="drive"
          from={item.parsedNotes.from}
          to={item.parsedNotes.to}
          departureDate={item.parsedNotes.departureDate}
          departureTime={item.parsedNotes.departureTime}
          arrivalTime={item.parsedNotes.arrivalTime}
          duration={item.parsedNotes.duration}
          notes={item.parsedNotes.notes}
          compact
        />
      );
    }

    // Breakfast/Meal
    if (itemType === 'breakfast' && item.parsedNotes) {
      return (
        <MealCard
          name={item.title || 'Breakfast'}
          type="breakfast"
          time={item.time ? formatTimeDisplay(item.time) : item.parsedNotes.departureTime}
          location={item.parsedNotes.city}
          neighborhood={item.destination?.neighborhood ?? undefined}
          rating={item.destination?.rating ?? undefined}
          image={item.destination?.image || item.parsedNotes.image}
          includedWithHotel={item.parsedNotes.breakfastIncluded}
          notes={item.parsedNotes.notes}
          compact
        />
      );
    }

    // Default: PlaceCard
    const image = item.destination?.image || item.destination?.image_thumbnail || item.parsedNotes?.image;
    const category = item.parsedNotes?.category || item.destination?.category;
    const neighborhood = item.destination?.neighborhood ?? undefined;
    const rating = item.destination?.rating ?? undefined;

    return (
      <PlaceCard
        name={item.title || 'Place'}
        category={category ?? undefined}
        neighborhood={neighborhood}
        time={item.time ? formatTimeDisplay(item.time) : undefined}
        duration={item.parsedNotes?.duration}
        rating={rating}
        image={image ?? undefined}
        notes={item.parsedNotes?.notes}
        compact
      />
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative flex gap-0
        transition-all duration-200
        ${isDragging ? 'z-50 opacity-50 scale-[1.02]' : ''}
        ${isActive ? 'ring-2 ring-stone-300 dark:ring-gray-600 rounded-2xl' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Time Column */}
      <div className="flex-shrink-0 w-16 sm:w-20 py-4 pr-3 flex flex-col items-end justify-start">
        {item.time ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Could open a time picker here
            }}
            className="text-sm font-medium text-stone-700 dark:text-stone-300 tabular-nums hover:text-stone-900 dark:hover:text-white transition-colors"
          >
            {formatTimeDisplay(item.time)}
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTimeChange?.(item.id, '09:00');
            }}
            className="text-[11px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors flex items-center gap-1"
          >
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">set time</span>
          </button>
        )}
        {item.parsedNotes?.duration && (
          <span className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">
            {formatDuration(item.parsedNotes.duration)}
          </span>
        )}
        {/* Index badge */}
        <div className="mt-2 w-5 h-5 rounded-full bg-stone-200 dark:bg-gray-700 text-stone-600 dark:text-gray-300 text-[10px] font-semibold flex items-center justify-center">
          {index + 1}
        </div>
      </div>

      {/* Content Column */}
      <div className="flex-1 min-w-0 relative">
        {/* Drag Handle */}
        {isDraggable && (
          <div
            {...attributes}
            {...listeners}
            className={`
              absolute top-3 left-3 z-10
              cursor-grab active:cursor-grabbing
              p-2 sm:p-1.5 -m-1
              bg-white/90 dark:bg-gray-900/90 rounded-xl sm:rounded-lg backdrop-blur-sm
              transition-opacity duration-200
              ${showControls ? 'opacity-100' : 'opacity-0'}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4 text-stone-400 dark:text-gray-500" />
          </div>
        )}

        {/* Remove Button */}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(item.id);
            }}
            className={`
              absolute top-3 right-3 z-10
              p-2 sm:p-1.5 -m-1
              rounded-xl sm:rounded-lg
              bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm
              text-stone-400 hover:text-red-500 active:text-red-600
              hover:bg-red-50 active:bg-red-100 dark:hover:bg-red-900/20
              transition-all duration-200
              min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0
              flex items-center justify-center
              ${showControls ? 'opacity-100' : 'opacity-0'}
            `}
            aria-label="Remove item"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Card Content - Clickable */}
        <div
          onClick={() => onEdit?.(item)}
          className={`
            ${onEdit ? 'cursor-pointer' : ''}
            transition-all duration-200
            ${onEdit ? 'hover:ring-1 hover:ring-stone-200 dark:hover:ring-stone-700 rounded-2xl' : ''}
            ${onEdit ? 'active:scale-[0.99]' : ''}
          `}
        >
          {renderCardContent()}
        </div>
      </div>
    </div>
  );
}

/**
 * Non-draggable version of TimelineBlock for view-only mode
 */
export function ViewOnlyTimelineBlock({
  item,
  index,
  onEdit,
  isActive = false,
}: Omit<TimelineBlockProps, 'onRemove' | 'onTimeChange' | 'isDraggable'>) {
  return (
    <TimelineBlock
      item={item}
      index={index}
      onEdit={onEdit}
      isActive={isActive}
      isDraggable={false}
    />
  );
}
