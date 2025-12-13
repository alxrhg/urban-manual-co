'use client';

import { useState } from 'react';
import { Plane, Pencil, Trash2 } from 'lucide-react';
import type { FlightSegment, ItineraryItemNotes } from '@/types/trip';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

// Legacy Flight type from ItineraryCard for backwards compatibility
interface LegacyFlight {
  id: string;
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalDate?: string;
  arrivalTime?: string;
  confirmationNumber?: string;
  terminal?: string;
  gate?: string;
  seatNumber?: string;
}

// Legacy ItineraryItem type for backwards compatibility
interface LegacyItineraryItem {
  id: string;
  trip_id: string;
  destination_slug: string | null;
  day: number;
  order_index: number;
  time: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  created_at: string;
  category?: string;
  flightId?: string;
  hotelBookingId?: string;
  parsedNotes?: ItineraryItemNotes | null;
}

// Trip settings for legacy compatibility
interface TripSettings {
  id: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  destination?: string | null;
  timezone?: string;
  is24HourTime?: boolean;
}

interface FlightCardProps {
  /** FlightSegment data for the new boarding pass interface */
  flight?: FlightSegment | LegacyFlight;
  /** Itinerary item (supports both EnrichedItineraryItem and legacy) */
  item?: EnrichedItineraryItem | LegacyItineraryItem;
  /** Whether this card is currently selected/active */
  isSelected?: boolean;
  /** Click handler for the card */
  onSelect?: () => void;
  /** Edit action handler */
  onEdit?: () => void;
  /** Remove action handler */
  onRemove?: () => void;
  /** Additional class names */
  className?: string;
  /** Legacy trip settings (ignored but kept for API compatibility) */
  tripSettings?: TripSettings;
}

/**
 * FlightCard - Premium "Boarding Pass" design component
 *
 * Features:
 * - Boarding pass visual with notch/tear effect
 * - Glassmorphism aesthetic (Glass & Depth theme)
 * - Large airport codes with route visualization
 * - Flight details grid (flight number, terminal, duration)
 * - Stub section with boarding time, gate, seat
 * - Hover actions for edit/remove
 */
export default function FlightCard({
  flight,
  item,
  isSelected = false,
  onSelect,
  onEdit,
  onRemove,
  className = '',
}: FlightCardProps) {
  const [showActions, setShowActions] = useState(false);

  // Extract flight data from either FlightSegment or legacy ItineraryItem
  const flightData = extractFlightData(flight, item);

  if (!flightData) {
    return null;
  }

  const {
    airline,
    airlineCode,
    flightNumber,
    departureCode,
    departureCity,
    departureTime,
    departureTerminal,
    departureGate,
    arrivalCode,
    arrivalCity,
    arrivalTime,
    arrivalTerminal,
    seat,
    flightClass,
    boardingTime,
    boardingGroup,
    durationDisplay,
    confirmationNumber,
  } = flightData;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.()}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={`
        relative group cursor-pointer
        transition-all duration-300 ease-out
        ${isSelected ? 'scale-[1.02] shadow-xl' : 'hover:scale-[1.01] hover:shadow-lg'}
        ${className}
      `}
    >
      {/* Main Card Container with Boarding Pass Shape */}
      <div
        className={`
          relative overflow-hidden rounded-2xl
          bg-white/80 dark:bg-gray-900/80
          backdrop-blur-md
          border border-gray-200/60 dark:border-gray-700/60
          ${isSelected ? 'ring-2 ring-gray-900 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-gray-950' : ''}
        `}
      >
        {/* Notch Effect - Left side */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-gray-100 dark:bg-gray-950 rounded-r-full -ml-2" />
        {/* Notch Effect - Right side */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-gray-100 dark:bg-gray-950 rounded-l-full -mr-2" />

        {/* Content Grid: Main Section | Divider | Stub Section */}
        <div className="flex">
          {/* Left Section - Main Ticket (flex-1) */}
          <div className="flex-1 p-4 sm:p-5">
            {/* Header: Airline & Class */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Plane className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {airline}
                  </p>
                  {flightClass && (
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {flightClass}
                    </p>
                  )}
                </div>
              </div>
              {/* Flight Number Badge */}
              <div className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">
                  {airlineCode || airline?.slice(0, 2).toUpperCase()}{flightNumber}
                </span>
              </div>
            </div>

            {/* Route Display: Origin → Destination */}
            <div className="flex items-center justify-between gap-3 mb-4">
              {/* Origin */}
              <div className="text-left">
                <p className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white font-mono">
                  {departureCode}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[80px] sm:max-w-[100px]">
                  {departureCity}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                  {formatTime(departureTime)}
                </p>
              </div>

              {/* Flight Path Visualization */}
              <div className="flex-1 flex flex-col items-center px-2">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">
                  {durationDisplay}
                </p>
                <div className="w-full flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 relative">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <Plane className="w-3 h-3 text-gray-400 dark:text-gray-500 rotate-90" />
                    </div>
                    {/* Dotted pattern for flight path */}
                    <div className="absolute inset-0 flex items-center justify-around">
                      <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                      <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                      <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-gray-900 dark:bg-white flex-shrink-0" />
                </div>
              </div>

              {/* Destination */}
              <div className="text-right">
                <p className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white font-mono">
                  {arrivalCode}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[80px] sm:max-w-[100px]">
                  {arrivalCity}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                  {formatTime(arrivalTime)}
                </p>
              </div>
            </div>

            {/* Flight Details Grid */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Terminal
                </p>
                <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                  {departureTerminal || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Gate
                </p>
                <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                  {departureGate || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Arrives
                </p>
                <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                  {arrivalTerminal ? `T${arrivalTerminal}` : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Divider with perforated effect */}
          <div className="relative w-px">
            <div className="absolute inset-0 border-l border-dashed border-gray-200 dark:border-gray-700" />
          </div>

          {/* Right Section - Stub */}
          <div className="w-28 sm:w-32 p-3 sm:p-4 flex flex-col justify-between bg-gray-50/50 dark:bg-gray-800/30">
            {/* Boarding Info */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Boarding
                </p>
                <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                  {boardingTime || formatBoardingTime(departureTime)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Seat
                </p>
                <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                  {seat || '—'}
                </p>
              </div>
              {boardingGroup && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Group
                  </p>
                  <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                    {boardingGroup}
                  </p>
                </div>
              )}
            </div>

            {/* QR Code Placeholder */}
            <div className="mt-3">
              <div className="aspect-square w-full max-w-[60px] mx-auto rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <div className="grid grid-cols-5 grid-rows-5 gap-0.5 w-10 h-10">
                  {/* Simple QR code pattern simulation */}
                  {[...Array(25)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-full h-full ${
                        [0, 1, 2, 4, 5, 6, 10, 14, 18, 20, 21, 22, 24].includes(i)
                          ? 'bg-gray-900 dark:bg-white'
                          : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Number Footer (if available) */}
        {confirmationNumber && (
          <div className="px-4 sm:px-5 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200/60 dark:border-gray-700/60">
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Confirmation: <span className="font-mono font-medium">{confirmationNumber}</span>
            </p>
          </div>
        )}
      </div>

      {/* Hover Actions */}
      {(onEdit || onRemove) && (
        <div
          className={`
            absolute top-2 right-2 flex items-center gap-1
            transition-opacity duration-200
            ${showActions ? 'opacity-100' : 'opacity-0'}
          `}
        >
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm"
              title="Edit flight"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors shadow-sm"
              title="Remove flight"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

interface ExtractedFlightData {
  airline: string;
  airlineCode?: string;
  flightNumber: string;
  departureCode: string;
  departureCity: string;
  departureTime: string;
  departureTerminal?: string;
  departureGate?: string;
  arrivalCode: string;
  arrivalCity: string;
  arrivalTime: string;
  arrivalTerminal?: string;
  seat?: string;
  flightClass?: string;
  boardingTime?: string;
  boardingGroup?: string;
  durationDisplay: string;
  confirmationNumber?: string;
}

/**
 * Type guard to check if flight is a FlightSegment (has departure/arrival objects)
 */
function isFlightSegment(flight: FlightSegment | LegacyFlight): flight is FlightSegment {
  return 'departure' in flight && typeof flight.departure === 'object';
}

/**
 * Extracts flight data from FlightSegment, LegacyFlight, or legacy ItineraryItem
 */
function extractFlightData(
  flight?: FlightSegment | LegacyFlight,
  item?: EnrichedItineraryItem | LegacyItineraryItem
): ExtractedFlightData | null {
  // Parse airport codes helper
  const parseAirport = (value?: string) => {
    if (!value) return { code: '---', city: '' };
    const parts = value.split(/[-–—]/);
    const code = parts[0]?.trim().toUpperCase().slice(0, 3) || '---';
    const city = parts[1]?.trim() || parts[0]?.trim() || '';
    return { code, city };
  };

  // Use FlightSegment if provided (new format with departure/arrival objects)
  if (flight && isFlightSegment(flight)) {
    return {
      airline: flight.airline,
      airlineCode: flight.airlineCode,
      flightNumber: flight.flightNumber,
      departureCode: flight.departure.code,
      departureCity: flight.departure.city,
      departureTime: flight.departure.time,
      departureTerminal: flight.departure.terminal,
      departureGate: flight.departure.gate,
      arrivalCode: flight.arrival.code,
      arrivalCity: flight.arrival.city,
      arrivalTime: flight.arrival.time,
      arrivalTerminal: flight.arrival.terminal,
      seat: flight.seat,
      flightClass: flight.class,
      boardingTime: flight.boardingTime,
      boardingGroup: flight.boardingGroup,
      durationDisplay: formatDuration(flight.durationMinutes),
      confirmationNumber: flight.confirmationNumber,
    };
  }

  // Use LegacyFlight if provided (from/to string format)
  if (flight && !isFlightSegment(flight)) {
    const origin = parseAirport(flight.from);
    const destination = parseAirport(flight.to);

    return {
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      departureCode: origin.code,
      departureCity: origin.city,
      departureTime: flight.departureTime,
      departureTerminal: flight.terminal,
      departureGate: flight.gate,
      arrivalCode: destination.code,
      arrivalCity: destination.city,
      arrivalTime: flight.arrivalTime || '',
      seat: flight.seatNumber,
      durationDisplay: '—',
      confirmationNumber: flight.confirmationNumber,
    };
  }

  // Fallback to ItineraryItem with parsed notes
  if (item?.parsedNotes) {
    const notes = item.parsedNotes as ItineraryItemNotes;

    const origin = parseAirport(notes.from);
    const destination = parseAirport(notes.to);

    if (!notes.airline && !notes.flightNumber) {
      return null;
    }

    return {
      airline: notes.airline || 'Unknown',
      flightNumber: notes.flightNumber || '',
      departureCode: origin.code,
      departureCity: origin.city,
      departureTime: notes.departureTime || '',
      departureTerminal: notes.terminal,
      departureGate: notes.gate,
      arrivalCode: destination.code,
      arrivalCity: destination.city,
      arrivalTime: notes.arrivalTime || '',
      seat: notes.seatNumber,
      durationDisplay: notes.duration ? `${notes.duration}m` : '—',
      confirmationNumber: notes.confirmationNumber,
    };
  }

  return null;
}

/**
 * Formats time for display (handles both ISO strings and time strings)
 */
function formatTime(time?: string): string {
  if (!time) return '—';

  // If it's just a time string like "14:30", return it
  if (/^\d{1,2}:\d{2}$/.test(time)) {
    return time;
  }

  // Try to parse as ISO string
  try {
    const date = new Date(time);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
  } catch {
    // Fall through
  }

  return time;
}

/**
 * Formats duration in minutes to display string
 */
function formatDuration(minutes?: number): string {
  if (!minutes) return '—';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Calculates approximate boarding time (30 mins before departure)
 */
function formatBoardingTime(departureTime?: string): string {
  if (!departureTime) return '—';

  // If it's just a time string like "14:30"
  if (/^\d{1,2}:\d{2}$/.test(departureTime)) {
    const [hours, minutes] = departureTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes - 30;
    const boardingHours = Math.floor(totalMinutes / 60);
    const boardingMinutes = totalMinutes % 60;
    return `${boardingHours.toString().padStart(2, '0')}:${boardingMinutes.toString().padStart(2, '0')}`;
  }

  // Try to parse as ISO string
  try {
    const date = new Date(departureTime);
    if (!isNaN(date.getTime())) {
      date.setMinutes(date.getMinutes() - 30);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
  } catch {
    // Fall through
  }

  return '—';
}
