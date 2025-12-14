'use client';

import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { Flight } from '@/types/trip';
import FlightStatusCard from '@/features/trip/components/FlightStatusCard';

interface FlightCardProps {
  item: EnrichedItineraryItem;
  flight?: Flight;
  isSelected: boolean;
  onSelect: () => void;
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
}: FlightCardProps) {
  // Build flight data from the flight booking or parsed notes
  const flightData = flight
    ? {
        airline: flight.airline,
        flightNumber: flight.flightNumber,
        from: flight.departureAirport,
        to: flight.arrivalAirport,
        departureDate: flight.departureTime.split('T')[0],
        departureTime: flight.departureTime,
        arrivalDate: flight.arrivalTime.split('T')[0],
        arrivalTime: flight.arrivalTime,
        confirmationNumber: flight.confirmationNumber,
        terminal: flight.departureTerminal,
        gate: flight.departureGate,
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
        ${isSelected ? 'bg-stone-100 dark:bg-gray-800' : 'hover:bg-stone-100/80 dark:hover:bg-gray-800/80'}
      `}
    >
      <FlightStatusCard
        flight={flightData}
        departureDate={flight ? flight.departureTime.split('T')[0] : item.parsedNotes?.departureDate}
        compact
      />
    </div>
  );
}
