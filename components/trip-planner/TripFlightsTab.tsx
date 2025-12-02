'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Plus, Clock } from 'lucide-react';
import { TripEmptyState } from './TripEmptyState';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface FlightItem extends EnrichedItineraryItem {
  dayNumber: number;
}

interface TripFlightsTabProps {
  flights: FlightItem[];
  onEditFlight: (flight: FlightItem) => void;
  onAddFlight: () => void;
}

export function TripFlightsTab({ flights, onEditFlight, onAddFlight }: TripFlightsTabProps) {
  if (flights.length === 0) {
    return (
      <TripEmptyState
        type="no-flights"
        onAddFirst={onAddFlight}
      />
    );
  }

  // Format time for display
  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } catch {
      return time;
    }
  };

  // Format date for display
  const formatDate = (date?: string) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  };

  // Calculate flight duration
  const calculateDuration = (flight: FlightItem) => {
    const depTime = flight.parsedNotes?.departureTime;
    const arrTime = flight.parsedNotes?.arrivalTime;
    const depDate = flight.parsedNotes?.departureDate;
    const arrDate = flight.parsedNotes?.arrivalDate;

    if (!depTime || !arrTime) return null;

    try {
      const depDateTime = new Date(`${depDate || '2024-01-01'}T${depTime}`);
      const arrDateTime = new Date(`${arrDate || depDate || '2024-01-01'}T${arrTime}`);

      // Handle next-day arrival
      const adjustedArrDateTime = arrDateTime < depDateTime
        ? new Date(arrDateTime.getTime() + 24 * 60 * 60 * 1000)
        : arrDateTime;

      const diffMs = adjustedArrDateTime.getTime() - depDateTime.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (hours === 0) return `${mins}m`;
      if (mins === 0) return `${hours}h`;
      return `${hours}h ${mins}m`;
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-3">
      {flights.map((flight) => (
        <Card
          key={flight.id}
          onClick={() => onEditFlight(flight)}
          className="cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
        >
          <CardContent className="p-4">
            {/* Top Row - Date & Airline */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-normal">
                  Day {flight.dayNumber}
                </Badge>
                {flight.parsedNotes?.departureDate && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(flight.parsedNotes.departureDate)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {flight.parsedNotes?.airline && (
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {flight.parsedNotes.airline}
                  </span>
                )}
                {flight.parsedNotes?.flightNumber && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {flight.parsedNotes.flightNumber}
                  </Badge>
                )}
              </div>
            </div>

            {/* Main Row - Route */}
            <div className="flex items-center justify-between">
              {/* Departure */}
              <div className="text-center">
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {flight.parsedNotes?.from || 'TBD'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatTime(flight.parsedNotes?.departureTime)}
                </p>
              </div>

              {/* Arrow & Duration */}
              <div className="flex-1 flex flex-col items-center px-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  <Plane className="w-4 h-4" />
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>
                {calculateDuration(flight) && (
                  <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {calculateDuration(flight)}
                  </span>
                )}
              </div>

              {/* Arrival */}
              <div className="text-center">
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {flight.parsedNotes?.to || 'TBD'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatTime(flight.parsedNotes?.arrivalTime)}
                </p>
              </div>
            </div>

            {/* Confirmation Number */}
            {flight.parsedNotes?.confirmationNumber && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Confirmation: <span className="font-mono">{flight.parsedNotes.confirmationNumber}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Add Flight Button */}
      <Button
        variant="outline"
        onClick={onAddFlight}
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add another flight
      </Button>
    </div>
  );
}
