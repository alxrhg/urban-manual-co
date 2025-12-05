'use client';

import type { ItineraryItem, TripSettings } from './ItineraryCard';
import TransportCardBase from '@/components/trips/TransportCard';

interface TransportCardProps {
  item: ItineraryItem;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

/**
 * TransportCard - Renders transport itinerary items (train, drive, etc.)
 */
export default function TransportCard({
  item,
  isSelected,
  onSelect,
  tripSettings,
}: TransportCardProps) {
  const notes = item.parsedNotes;
  const transportType = notes?.type === 'train' ? 'train' : 'drive';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`
        cursor-pointer rounded-2xl transition-all duration-200
        ${isSelected ? 'bg-stone-100 dark:bg-gray-800' : 'hover:bg-stone-100/80 dark:hover:bg-gray-800/80'}
      `}
    >
      <TransportCardBase
        type={transportType}
        from={notes?.from}
        to={notes?.to}
        departureDate={notes?.departureDate}
        departureTime={notes?.departureTime}
        arrivalTime={notes?.arrivalTime}
        duration={notes?.duration}
        trainNumber={notes?.trainNumber}
        trainLine={notes?.trainLine}
        confirmationNumber={notes?.confirmationNumber}
        notes={notes?.notes}
        compact
      />
    </div>
  );
}
