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
 * Inner card component that uses sortable hook (only used in edit mode)
 */
function SortableTripItemCard({
  item,
  index,
  onEdit,
  onRemove,
  isActive = false,
  children,
}: TripItemCardProps & { children: React.ReactNode }) {
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

  const showControls = isHovered || isTouched || isActive;

  const handleTouchStart = useCallback(() => {
    setIsTouched(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setTimeout(() => setIsTouched(false), 2000);
  }, []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${isDragging ? 'z-50 opacity-50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className={`
            absolute top-3 left-3 z-10
            cursor-grab active:cursor-grabbing
            p-1.5 rounded-lg
            bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm
            transition-opacity duration-200
            ${showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Remove Button */}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(item.id);
            }}
            className={`
              absolute top-3 right-3 z-10
              p-1.5 rounded-lg
              bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm
              text-gray-400 hover:text-red-500
              transition-all duration-200
              ${showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            `}
            aria-label="Remove item"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Clickable wrapper for edit */}
        <div
          onClick={() => onEdit?.(item)}
          className={`
            ${onEdit ? 'cursor-pointer' : ''} rounded-2xl transition-all
            ${isActive ? 'ring-2 ring-gray-300 dark:ring-gray-600' : ''}
            ${onEdit ? 'hover:ring-1 hover:ring-gray-200 dark:hover:ring-gray-700' : ''}
          `}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * View-only card wrapper (no sortable functionality)
 */
function ViewOnlyTripItemCard({
  item,
  onEdit,
  isActive = false,
  children,
}: {
  item: EnrichedItineraryItem;
  onEdit?: (item: EnrichedItineraryItem) => void;
  isActive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <div className="relative">
        <div
          onClick={() => onEdit?.(item)}
          className={`
            ${onEdit ? 'cursor-pointer' : ''} rounded-2xl transition-all
            ${isActive ? 'ring-2 ring-gray-300 dark:ring-gray-600' : ''}
            ${onEdit ? 'hover:ring-1 hover:ring-gray-200 dark:hover:ring-gray-700' : ''}
          `}
        >
          {children}
        </div>
      </div>
    </div>
  );
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
  const itemType = item.parsedNotes?.type;

  // Render the appropriate card based on item type
  const renderCardContent = () => {
    // Render FlightStatusCard for flights
    if (itemType === 'flight' && item.parsedNotes) {
      return (
        <FlightStatusCard
          flight={item.parsedNotes}
          departureDate={item.parsedNotes.departureDate}
          compact
        />
      );
    }

    // Render LodgingCard for hotels
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

    // Render TransportCard for trains
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

    // Render TransportCard for drives
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

    // Render MealCard for breakfast
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

    // Default: PlaceCard for places, custom items, etc.
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

  // Use view-only wrapper when not in edit mode (no sortable context needed)
  if (isViewOnly) {
    return (
      <ViewOnlyTripItemCard item={item} onEdit={onEdit} isActive={isActive}>
        {renderCardContent()}
      </ViewOnlyTripItemCard>
    );
  }

  // Use sortable wrapper for edit mode
  return (
    <SortableTripItemCard
      item={item}
      index={index}
      onEdit={onEdit}
      onRemove={onRemove}
      isActive={isActive}
      isViewOnly={false}
    >
      {renderCardContent()}
    </SortableTripItemCard>
  );
}
