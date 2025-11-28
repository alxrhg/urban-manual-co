'use client';

import { useState } from 'react';
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
}

/**
 * TripItemCard - Renders specialized cards based on item type
 * All cards follow a cohesive design pattern with stone palette
 * - Flights: FlightStatusCard with route-focused layout
 * - Hotels: LodgingCard with property-focused layout
 * - Trains/Drives: TransportCard with route layout
 * - Breakfast: MealCard with meal info
 * - Places: PlaceCard with location details
 */
export default function TripItemCard({
  item,
  index,
  onEdit,
  onRemove,
  isActive = false,
}: TripItemCardProps) {
  const [isHovered, setIsHovered] = useState(false);

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

  // Shared wrapper for drag & drop + remove functionality
  const CardWrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative mb-2
        ${isDragging ? 'z-50 opacity-50' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        {/* Drag Handle - Overlaid on cards */}
        <div
          {...attributes}
          {...listeners}
          className={`
            absolute top-3 left-3 z-10 cursor-grab active:cursor-grabbing p-1
            bg-white/80 dark:bg-stone-900/80 rounded-lg backdrop-blur-sm
            transition-opacity duration-200
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-stone-400 dark:text-stone-500" />
        </div>

        {/* Remove Button - Overlaid on cards */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(item.id);
          }}
          className={`
            absolute top-3 right-3 z-10 p-1.5 rounded-lg
            bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm
            text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
            transition-all duration-200
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Clickable wrapper for edit */}
        <div
          onClick={() => onEdit?.(item)}
          className={`
            cursor-pointer rounded-2xl transition-all
            ${isActive ? 'ring-2 ring-stone-300 dark:ring-stone-600' : ''}
            hover:ring-1 hover:ring-stone-200 dark:hover:ring-stone-700
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
