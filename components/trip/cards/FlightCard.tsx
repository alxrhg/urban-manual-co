'use client';

import type { ItineraryItem, Flight, TripSettings } from './ItineraryCard';
import FlightStatusCard from '@/components/trips/FlightStatusCard';

interface FlightCardProps {
  item: ItineraryItem;
  flight?: Flight;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

/**
 * FlightCard - Renders flight itinerary items
 * Uses FlightStatusCard for the actual display
 */
export default function FlightCard({
  item,
  flight,
  isSelected,
  onSelect,
  tripSettings,
}: FlightCardProps) {
  // Build flight data from the flight booking or parsed notes
  const flightData = flight
    ? {
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        from: flight.from,
        to: flight.to,
        departureDate: flight.departureDate,
        departureTime: flight.departureTime,
        arrivalDate: flight.arrivalDate,
        arrivalTime: flight.arrivalTime,
        confirmationNumber: flight.confirmationNumber,
        terminal: flight.terminal,
        gate: flight.gate,
      }
    : item.parsedNotes;

  if (!flightData) {
    return null;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`
        cursor-pointer rounded-2xl transition-all duration-200 ease-out
        ${isSelected
          ? 'bg-stone-100 dark:bg-gray-800 shadow-sm'
          : 'hover:bg-stone-100/80 dark:hover:bg-gray-800/80 hover:shadow-sm hover:-translate-y-0.5'}
        active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2
      `}
    >
      <FlightStatusCard
        flight={flightData}
        departureDate={flight?.departureDate || item.parsedNotes?.departureDate}
        compact
      />
    </div>
  );
}
