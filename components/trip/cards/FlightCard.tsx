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
        cursor-pointer rounded-2xl transition-all duration-200
        ${isSelected ? 'bg-stone-200/80 dark:bg-gray-700/80' : 'hover:bg-stone-200/60 dark:hover:bg-gray-700/60'}
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
