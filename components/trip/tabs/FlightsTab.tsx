'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import {
  Plus,
  Plane,
  Check,
  AlertCircle,
  Calendar,
  Pencil,
  Trash2,
  ExternalLink,
  Armchair,
} from 'lucide-react';
import type { Trip } from '@/types/trip';
import type { Flight } from './ItineraryTab';

interface FlightsTabProps {
  trip: Trip;
  flights: Flight[];
  onAddFlight: () => void;
  onEditFlight: (flight: Flight) => void;
  onDeleteFlight: (flightId: string) => void;
}

// Airline logo mapping (could be expanded or use an API)
const airlineLogos: Record<string, string> = {
  united: 'https://www.gstatic.com/flights/airline_logos/70px/UA.png',
  delta: 'https://www.gstatic.com/flights/airline_logos/70px/DL.png',
  american: 'https://www.gstatic.com/flights/airline_logos/70px/AA.png',
  jetblue: 'https://www.gstatic.com/flights/airline_logos/70px/B6.png',
  southwest: 'https://www.gstatic.com/flights/airline_logos/70px/WN.png',
  alaska: 'https://www.gstatic.com/flights/airline_logos/70px/AS.png',
  spirit: 'https://www.gstatic.com/flights/airline_logos/70px/NK.png',
  frontier: 'https://www.gstatic.com/flights/airline_logos/70px/F9.png',
  british: 'https://www.gstatic.com/flights/airline_logos/70px/BA.png',
  lufthansa: 'https://www.gstatic.com/flights/airline_logos/70px/LH.png',
  emirates: 'https://www.gstatic.com/flights/airline_logos/70px/EK.png',
  qatar: 'https://www.gstatic.com/flights/airline_logos/70px/QR.png',
  singapore: 'https://www.gstatic.com/flights/airline_logos/70px/SQ.png',
  ana: 'https://www.gstatic.com/flights/airline_logos/70px/NH.png',
  jal: 'https://www.gstatic.com/flights/airline_logos/70px/JL.png',
};

/**
 * FlightsTab - Display all trip flights grouped by leg type
 *
 * Features:
 * - Group by leg type (outbound, return, multi-city)
 * - Full flight details with airline logo
 * - Lounge info if loungeAccess
 * - Actions: check-in, add to calendar, edit, delete
 * - Empty state with add CTA
 */
export default function FlightsTab({
  trip,
  flights,
  onAddFlight,
  onEditFlight,
  onDeleteFlight,
}: FlightsTabProps) {
  // Group flights by leg type
  const groupedFlights = useMemo(() => {
    const groups: Record<string, Flight[]> = {
      outbound: [],
      return: [],
      'multi-city': [],
    };

    flights.forEach((flight) => {
      const leg = flight.legType || 'outbound';
      if (!groups[leg]) groups[leg] = [];
      groups[leg].push(flight);
    });

    // Sort each group by departure date/time
    Object.keys(groups).forEach((leg) => {
      groups[leg].sort((a, b) => {
        const dateA = new Date(`${a.departureDate}T${a.departureTime}`);
        const dateB = new Date(`${b.departureDate}T${b.departureTime}`);
        return dateA.getTime() - dateB.getTime();
      });
    });

    return groups;
  }, [flights]);

  // Calculate total air time
  const totalAirTime = useMemo(() => {
    return flights.reduce((total, flight) => {
      if (flight.departureTime && flight.arrivalTime) {
        const dep = new Date(`${flight.departureDate}T${flight.departureTime}`);
        const arr = new Date(`${flight.arrivalDate}T${flight.arrivalTime}`);
        return total + differenceInMinutes(arr, dep);
      }
      return total;
    }, 0);
  }, [flights]);

  const legLabels: Record<string, string> = {
    outbound: 'OUTBOUND',
    return: 'RETURN',
    'multi-city': 'MULTI-CITY',
  };

  if (flights.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Flights</h2>
          <button
            onClick={onAddFlight}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Flight
          </button>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <Plane className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No flights added
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-sm">
            Add your flight details to keep track of your travel itinerary and get check-in reminders.
          </p>
          <button
            onClick={onAddFlight}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Add your first flight
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Flights</h2>
        <button
          onClick={onAddFlight}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Flight
        </button>
      </div>

      {/* Flights List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {(['outbound', 'return', 'multi-city'] as const).map((legType) => {
          const legFlights = groupedFlights[legType];
          if (!legFlights || legFlights.length === 0) return null;

          return (
            <div key={legType}>
              {/* Leg Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400">
                  {legLabels[legType]}
                </span>
                {legFlights[0] && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {format(parseISO(legFlights[0].departureDate), 'EEEE, MMM d')}
                  </span>
                )}
              </div>

              {/* Flight Cards */}
              <div className="space-y-4">
                {legFlights.map((flight) => (
                  <FlightCard
                    key={flight.id}
                    flight={flight}
                    onEdit={() => onEditFlight(flight)}
                    onDelete={() => onDeleteFlight(flight.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Summary */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            SUMMARY
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total flights: {flights.length} · Total air time: {formatDuration(totalAirTime)}
          </p>
        </div>
      </div>
    </div>
  );
}

function FlightCard({
  flight,
  onEdit,
  onDelete,
}: {
  flight: Flight;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Calculate flight duration
  const duration = useMemo(() => {
    if (!flight.departureTime || !flight.arrivalTime) return null;
    const dep = new Date(`${flight.departureDate}T${flight.departureTime}`);
    const arr = new Date(`${flight.arrivalDate}T${flight.arrivalTime}`);
    return differenceInMinutes(arr, dep);
  }, [flight]);

  // Get airline logo
  const airlineLower = flight.airline.toLowerCase();
  const logoUrl = Object.entries(airlineLogos).find(([key]) =>
    airlineLower.includes(key)
  )?.[1];

  // Format seat class
  const seatClassLabels: Record<string, string> = {
    economy: 'Economy',
    premium_economy: 'Premium Economy',
    business: 'Business',
    first: 'First Class',
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header Row */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {/* Airline Logo */}
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={flight.airline}
              width={32}
              height={32}
              className="rounded"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Plane className="w-4 h-4 text-gray-500" />
            </div>
          )}
          <div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {flight.airline} {flight.flightNumber}
            </span>
          </div>
        </div>

        {/* Status */}
        {flight.status === 'confirmed' ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
            <Check className="w-3.5 h-3.5" />
            Confirmed
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            Add details
          </span>
        )}
      </div>

      {/* Route */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          {/* Departure */}
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {flight.from}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {flight.fromCity || flight.from}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              {formatTime(flight.departureTime)}
              {flight.terminal && (
                <span className="text-xs text-gray-400 ml-1">· Terminal {flight.terminal}</span>
              )}
            </p>
          </div>

          {/* Duration Line */}
          <div className="flex-1 mx-6 flex flex-col items-center">
            <div className="relative w-full flex items-center">
              <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
              <Plane className="w-4 h-4 text-gray-400 mx-2 rotate-90" />
              <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
            </div>
            {duration && (
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatDuration(duration)}
              </span>
            )}
          </div>

          {/* Arrival */}
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {flight.to}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {flight.toCity || flight.to}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              {formatTime(flight.arrivalTime)}
              {flight.gate && (
                <span className="text-xs text-gray-400 ml-1">· Gate {flight.gate}</span>
              )}
            </p>
          </div>
        </div>

        {/* Details Row */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {flight.seatClass && (
              <span>{seatClassLabels[flight.seatClass] || flight.seatClass}</span>
            )}
            {flight.seatNumber && (
              <>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span>Seat {flight.seatNumber}</span>
              </>
            )}
            {flight.baggageAllowance && (
              <>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span>{flight.baggageAllowance}</span>
              </>
            )}
          </div>
          {flight.confirmationNumber && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Confirmation: <span className="font-mono">{flight.confirmationNumber}</span>
            </p>
          )}
        </div>

        {/* Lounge Info */}
        {flight.loungeAccess && flight.loungeName && (
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Armchair className="w-4 h-4" />
            <span>{flight.loungeName}</span>
            {flight.loungeLocation && (
              <span className="text-gray-400">· {flight.loungeLocation}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => {
            // Open airline check-in page
            const checkInUrl = getCheckInUrl(flight.airline);
            if (checkInUrl) window.open(checkInUrl, '_blank');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Plane className="w-3.5 h-3.5" />
          Check in
        </button>
        <button
          onClick={() => {
            // Add to calendar (generate ICS or open calendar app)
            alert('Calendar export coming soon');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          Calendar
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Helper functions

function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return '--:--';
  // Convert 24h to 12h format
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function getCheckInUrl(airline: string): string | null {
  const checkInUrls: Record<string, string> = {
    united: 'https://www.united.com/en/us/checkin',
    delta: 'https://www.delta.com/mytrips/check-in',
    american: 'https://www.aa.com/checkin',
    jetblue: 'https://www.jetblue.com/check-in',
    southwest: 'https://www.southwest.com/air/check-in/',
    alaska: 'https://www.alaskaair.com/checkin',
  };

  const airlineLower = airline.toLowerCase();
  for (const [key, url] of Object.entries(checkInUrls)) {
    if (airlineLower.includes(key)) return url;
  }
  return null;
}
