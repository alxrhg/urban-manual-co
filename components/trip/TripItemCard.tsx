'use client';

import { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { formatTimeDisplay } from '@/lib/utils/time-calculations';
import FlightStatusCard from '@/components/trips/FlightStatusCard';
import LodgingCard from '@/components/trips/LodgingCard';
import PlaceCard from '@/components/trips/PlaceCard';
import TransportCard from '@/components/trips/TransportCard';
import MealCard from '@/components/trips/MealCard';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TripItemCardProps {
  item: EnrichedItineraryItem;
  index: number;
  onEdit?: (item: EnrichedItineraryItem) => void;
  onRemove?: (id: string) => void;
  isActive?: boolean;
  isViewOnly?: boolean;
}

/**
 * TripItemCard - Mobile-optimized card renderer
 * Features: Touch-friendly controls, swipe hints, proper touch targets
 * All cards follow a cohesive design pattern with stone palette
 */
export default function TripItemCard({
  item,
  index,
  onEdit,
  onRemove,
  isActive = false,
  isViewOnly = false,
}: TripItemCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

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
  };

  const itemType = item.parsedNotes?.type;

  // Show controls on hover (desktop) or touch (mobile)
  const showControls = isHovered || isTouched || isActive;

  // Handle touch for mobile - show controls briefly
  const handleTouchStart = useCallback(() => {
    setIsTouched(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Keep controls visible for a moment after touch
    setTimeout(() => setIsTouched(false), 2000);
  }, []);

  // Shared wrapper for drag & drop + remove functionality
  const CardWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      ref={isViewOnly ? undefined : setNodeRef}
      style={isViewOnly ? undefined : style}
      className={`
        group relative mb-2 sm:mb-2
        ${isDragging && !isViewOnly ? 'z-50 opacity-50' : ''}
      `}
      onMouseEnter={() => !isViewOnly && setIsHovered(true)}
      onMouseLeave={() => !isViewOnly && setIsHovered(false)}
      onTouchStart={isViewOnly ? undefined : handleTouchStart}
      onTouchEnd={isViewOnly ? undefined : handleTouchEnd}
    >
      <div className="relative">
        {/* Drag Handle - Only shown in edit mode */}
        {!isViewOnly && (
          <div
            {...attributes}
            {...listeners}
            className={`
              absolute top-2 sm:top-3 left-2 sm:left-3 z-10
              cursor-grab active:cursor-grabbing
              p-2 sm:p-1 -m-1 sm:m-0
              bg-white/90 dark:bg-gray-900/90 rounded-xl sm:rounded-lg backdrop-blur-sm
              transition-opacity duration-200
              ${showControls ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-5 h-5 sm:w-4 sm:h-4 text-stone-400 dark:text-gray-500" />
          </div>
        )}

        {/* Remove Button - Only shown in edit mode */}
        {!isViewOnly && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(item.id);
            }}
            className={`
              absolute top-2 sm:top-3 right-2 sm:right-3 z-10
              p-2.5 sm:p-1.5 -m-1 sm:m-0
              rounded-xl sm:rounded-lg
              bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm
              text-stone-400 hover:text-red-500 active:text-red-600
              hover:bg-red-50 active:bg-red-100 dark:hover:bg-red-900/20 dark:active:bg-red-900/30
              transition-all duration-200
              min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0
              flex items-center justify-center
              ${showControls ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'}
            `}
            aria-label="Remove item"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        )}

        {/* Clickable wrapper for edit */}
        <div
          onClick={() => onEdit?.(item)}
          className={`
            ${onEdit ? 'cursor-pointer' : ''} rounded-2xl transition-all
            ${onEdit ? 'active:scale-[0.98] sm:active:scale-100' : ''}
            ${isActive ? 'ring-2 ring-stone-300 dark:ring-gray-600' : ''}
            ${onEdit ? 'hover:ring-1 hover:ring-stone-200 dark:hover:ring-stone-700' : ''}
            ${onEdit ? 'active:ring-1 active:ring-stone-300 dark:active:ring-stone-600' : ''}
          `}
        >
          {children}
        </div>
      </div>
    </div>
  );

  // Render FlightStatusCard for flights
  if (itemType === 'flight' && item.parsedNotes) {
    return (
      <CardWrapper>
        <FlightStatusCard
          flight={item.parsedNotes}
          departureDate={item.parsedNotes.departureDate}
          compact
          onEdit={onEdit ? () => onEdit(item) : undefined}
        />
      </CardWrapper>
    );
  }

  // Render LodgingCard for hotels
  if (itemType === 'hotel' && item.parsedNotes) {
    return (
      <CardWrapper>
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
      </CardWrapper>
    );
  }

  // Render TransportCard for trains
  if (itemType === 'train' && item.parsedNotes) {
    return (
      <CardWrapper>
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
      </CardWrapper>
    );
  }

  // Render TransportCard for drives
  if (itemType === 'drive' && item.parsedNotes) {
    return (
      <CardWrapper>
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
      </CardWrapper>
    );
  }

  // Render MealCard for breakfast
  if (itemType === 'breakfast' && item.parsedNotes) {
    return (
      <CardWrapper>
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
      </CardWrapper>
    );
  }

  // Default: PlaceCard for places, custom items, etc.
  const image = item.destination?.image || item.destination?.image_thumbnail || item.parsedNotes?.image;
  const category = item.parsedNotes?.category || item.destination?.category;
  const neighborhood = item.destination?.neighborhood ?? undefined;
  const rating = item.destination?.rating ?? undefined;

  return (
    <CardWrapper>
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
    </CardWrapper>
  );
}
