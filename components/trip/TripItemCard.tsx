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
  // Hotel quick actions
  onHotelAddBreakfast?: () => void;
  onHotelAddLunch?: () => void;
  onHotelAddDinner?: () => void;
  onHotelReturnToRest?: () => void;
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
      className={`group relative mb-2 sm:mb-2 ${isDragging ? 'z-50 opacity-50' : ''}`}
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

        {/* Remove Button */}
        {onRemove && (
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
    <div className="group relative mb-2 sm:mb-2">
      <div className="relative">
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
  onHotelAddBreakfast,
  onHotelAddLunch,
  onHotelAddDinner,
  onHotelReturnToRest,
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
      // Get hotel data from parsedNotes or linked destination
      const hotelImage = item.parsedNotes.image || item.destination?.image || item.destination?.image_thumbnail;
      const hotelRating = item.parsedNotes.rating ?? item.destination?.rating ?? undefined;
      const hotelPriceLevel = item.parsedNotes.priceLevel ?? item.destination?.price_level ?? undefined;
      const hotelBookingUrl = item.parsedNotes.bookingUrl || item.destination?.booking_url || undefined;
      const hotelNeighborhood = item.parsedNotes.neighborhood || item.destination?.neighborhood || undefined;
      const hotelAddress = item.parsedNotes.address || item.destination?.formatted_address || undefined;
      const hotelPhone = item.parsedNotes.phone || item.destination?.phone_number || undefined;
      const hotelWebsite = item.parsedNotes.website || item.destination?.website || undefined;

      return (
        <LodgingCard
          name={item.title || item.parsedNotes.name || 'Accommodation'}
          address={hotelAddress}
          neighborhood={hotelNeighborhood}
          checkIn={item.parsedNotes.checkInDate || item.parsedNotes.checkInTime}
          checkOut={item.parsedNotes.checkOutDate || item.parsedNotes.checkOutTime}
          confirmationNumber={item.parsedNotes.hotelConfirmation || item.parsedNotes.confirmationNumber}
          phone={hotelPhone}
          website={hotelWebsite}
          bookingUrl={hotelBookingUrl}
          notes={item.parsedNotes.notes}
          image={hotelImage}
          rating={hotelRating}
          priceLevel={hotelPriceLevel}
          nightStart={item.parsedNotes.nightStart}
          nightEnd={item.parsedNotes.nightEnd}
          breakfastIncluded={item.parsedNotes.breakfastIncluded}
          hasSpa={item.parsedNotes.hasSpa}
          hasPool={item.parsedNotes.hasPool}
          hasGym={item.parsedNotes.hasGym}
          travelTimeBack={item.parsedNotes.travelTimeToNext}
          onAddBreakfast={onHotelAddBreakfast}
          onAddLunch={onHotelAddLunch}
          onAddDinner={onHotelAddDinner}
          onReturnToHotel={onHotelReturnToRest}
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
