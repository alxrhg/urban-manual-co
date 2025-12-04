'use client';

import { Plane, CheckCircle2, Clock, AlertCircle, ChevronRight, Armchair } from 'lucide-react';
import type { ItineraryItem, ItineraryItemNotes } from '@/types/trip';

/**
 * Extended flight data for the FlightCard component
 * Uses Omit to avoid conflict with base bookingStatus type
 */
export interface Flight extends Omit<ItineraryItemNotes, 'bookingStatus'> {
  // Extended flight fields (beyond ItineraryItemNotes)
  departureTerminal?: string;
  arrivalTerminal?: string;
  cabinClass?: 'economy' | 'premium-economy' | 'business' | 'first';
  baggageAllowance?: string;
  lounge_access?: boolean;
  loungeName?: string;
  // Override bookingStatus with additional flight-specific values
  bookingStatus?: 'need-to-book' | 'booked' | 'waitlist' | 'walk-in' | 'confirmed' | 'cancelled';
}

/**
 * Trip settings that affect card display
 */
export interface TripSettings {
  timeFormat?: '12h' | '24h';
  showConfirmationNumbers?: boolean;
  showDetailedInfo?: boolean;
}

interface FlightCardProps {
  flight: Flight;
  item: ItineraryItem;
  isSelected: boolean;
  onSelect: () => void;
  tripSettings: TripSettings;
}

/**
 * FlightCard - Display flight information in itinerary
 *
 * Layout:
 * - Header: Airline + flight number + booking status
 * - Route: Origin -------- duration -------- Destination
 * - Times: Departure time · Terminal | Arrival time · Terminal
 * - Details: Class · Seat · Baggage
 * - Lounge: If lounge_access is true
 * - Footer: Details button
 */
export default function FlightCard({
  flight,
  item,
  isSelected,
  onSelect,
  tripSettings,
}: FlightCardProps) {
  // Parse airport codes and city names from "EWR - Newark" format
  const parseAirport = (value?: string) => {
    if (!value) return { code: '', city: '' };
    const parts = value.split(/[-–—]/);
    const code = parts[0]?.trim().toUpperCase().slice(0, 3) || '';
    const city = parts[1]?.trim() || '';
    return { code, city };
  };

  const origin = parseAirport(flight.from);
  const destination = parseAirport(flight.to);

  // Calculate flight duration from departure and arrival times
  const calculateDuration = (): string | null => {
    if (!flight.departureTime || !flight.arrivalTime) return null;

    try {
      // Parse times (expecting "HH:MM" or "HH:MM AM/PM" format)
      const parseTime = (timeStr: string): number => {
        const normalized = timeStr.toUpperCase().trim();
        let hours = 0;
        let minutes = 0;

        // Handle "HH:MM AM/PM" format
        const amPmMatch = normalized.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/);
        if (amPmMatch) {
          hours = parseInt(amPmMatch[1], 10);
          minutes = parseInt(amPmMatch[2], 10);
          if (amPmMatch[3] === 'PM' && hours !== 12) hours += 12;
          if (amPmMatch[3] === 'AM' && hours === 12) hours = 0;
        }

        return hours * 60 + minutes;
      };

      let depMinutes = parseTime(flight.departureTime);
      let arrMinutes = parseTime(flight.arrivalTime);

      // Handle overnight flights (arrival is next day)
      if (arrMinutes < depMinutes) {
        arrMinutes += 24 * 60;
      }

      // If dates are different, account for multi-day flights
      if (flight.departureDate && flight.arrivalDate && flight.departureDate !== flight.arrivalDate) {
        const depDate = new Date(flight.departureDate);
        const arrDate = new Date(flight.arrivalDate);
        const dayDiff = Math.floor((arrDate.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff > 0) {
          arrMinutes = parseTime(flight.arrivalTime) + (dayDiff * 24 * 60);
        }
      }

      const durationMinutes = arrMinutes - depMinutes;
      if (durationMinutes <= 0) return null;

      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;

      if (hours > 0 && mins > 0) {
        return `${hours}h ${mins}m`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else {
        return `${mins}m`;
      }
    } catch {
      return null;
    }
  };

  // Format time for display
  const formatTime = (time?: string): string => {
    if (!time) return '';

    // If already in 12h format, return as is
    if (time.toLowerCase().includes('am') || time.toLowerCase().includes('pm')) {
      return time.toUpperCase();
    }

    // Convert 24h to 12h if needed
    if (tripSettings.timeFormat === '12h') {
      const match = time.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = match[2];
        const period = hours >= 12 ? 'PM' : 'AM';
        if (hours > 12) hours -= 12;
        if (hours === 0) hours = 12;
        return `${hours}:${minutes} ${period}`;
      }
    }

    return time;
  };

  // Get booking status display
  const getBookingStatus = () => {
    const status = flight.bookingStatus || 'booked';
    switch (status) {
      case 'confirmed':
      case 'booked':
        return {
          label: 'Confirmed',
          icon: <CheckCircle2 className="w-3 h-3" />,
          className: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30',
        };
      case 'waitlist':
        return {
          label: 'Waitlist',
          icon: <Clock className="w-3 h-3" />,
          className: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30',
        };
      case 'need-to-book':
        return {
          label: 'Need to Book',
          icon: <AlertCircle className="w-3 h-3" />,
          className: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          icon: <AlertCircle className="w-3 h-3" />,
          className: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30',
        };
      default:
        return {
          label: 'Booked',
          icon: <CheckCircle2 className="w-3 h-3" />,
          className: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30',
        };
    }
  };

  // Get cabin class display name
  const getCabinClassDisplay = () => {
    switch (flight.cabinClass) {
      case 'first':
        return 'First Class';
      case 'business':
        return 'Business';
      case 'premium-economy':
        return 'Premium Economy';
      case 'economy':
      default:
        return 'Economy';
    }
  };

  const duration = calculateDuration();
  const bookingStatus = getBookingStatus();
  const depTerminal = flight.departureTerminal || flight.terminal;
  const arrTerminal = flight.arrivalTerminal;

  // Build the flight details line (class, seat, baggage)
  const detailParts: string[] = [];
  detailParts.push(getCabinClassDisplay());
  if (flight.seatNumber) {
    detailParts.push(`Seat ${flight.seatNumber}`);
  }
  if (flight.baggageAllowance) {
    detailParts.push(flight.baggageAllowance);
  }

  return (
    <div
      onClick={onSelect}
      className={`
        p-4 rounded-2xl bg-stone-100 dark:bg-gray-800/50 cursor-pointer
        transition-all duration-200
        ${isSelected
          ? 'ring-2 ring-stone-400 dark:ring-gray-500'
          : 'hover:bg-stone-150 dark:hover:bg-gray-800/70'
        }
      `}
    >
      {/* Header: Airline + Flight Number + Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-stone-200 dark:bg-gray-700 flex items-center justify-center">
            <Plane className="w-3.5 h-3.5 text-stone-500 dark:text-gray-400" />
          </div>
          <span className="text-sm font-medium text-stone-900 dark:text-white">
            {flight.airline} {flight.flightNumber}
          </span>
        </div>
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${bookingStatus.className}`}>
          {bookingStatus.icon}
          {bookingStatus.label}
        </div>
      </div>

      {/* Route: Origin ------ duration ------ Destination */}
      <div className="mb-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Origin Code */}
          <div className="text-left">
            <p className="text-xl font-semibold text-stone-900 dark:text-white">
              {origin.code || '---'}
            </p>
          </div>

          {/* Route Line with Duration */}
          <div className="flex items-center gap-1.5 px-2">
            <div className="w-8 h-px bg-stone-300 dark:bg-gray-600" />
            {duration && (
              <span className="text-[10px] text-stone-500 dark:text-gray-400 whitespace-nowrap">
                {duration}
              </span>
            )}
            <div className="w-8 h-px bg-stone-300 dark:bg-gray-600" />
          </div>

          {/* Destination Code */}
          <div className="text-right">
            <p className="text-xl font-semibold text-stone-900 dark:text-white">
              {destination.code || '---'}
            </p>
          </div>
        </div>

        {/* City Names Row */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 mt-0.5">
          <div className="text-left">
            {origin.city && (
              <p className="text-xs text-stone-500 dark:text-gray-400">
                {origin.city}
              </p>
            )}
          </div>
          <div /> {/* Spacer */}
          <div className="text-right">
            {destination.city && (
              <p className="text-xs text-stone-500 dark:text-gray-400">
                {destination.city}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Times & Terminals Row */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 mb-3">
        {/* Departure Time & Terminal */}
        <div className="text-left">
          <p className="text-xs text-stone-600 dark:text-gray-300">
            {formatTime(flight.departureTime)}
            {depTerminal && (
              <span className="text-stone-400 dark:text-gray-500">
                {' '}· Terminal {depTerminal}
              </span>
            )}
          </p>
        </div>

        <div /> {/* Spacer */}

        {/* Arrival Time & Terminal */}
        <div className="text-right">
          <p className="text-xs text-stone-600 dark:text-gray-300">
            {formatTime(flight.arrivalTime)}
            {arrTerminal && (
              <span className="text-stone-400 dark:text-gray-500">
                {' '}· Terminal {arrTerminal}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Details Row: Class · Seat · Baggage */}
      {detailParts.length > 0 && (
        <p className="text-xs text-stone-500 dark:text-gray-400 mb-3">
          {detailParts.join(' · ')}
        </p>
      )}

      {/* Lounge Access */}
      {flight.lounge_access && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <Armchair className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
            {flight.loungeName || 'Lounge Access'}
          </span>
        </div>
      )}

      {/* Confirmation Number */}
      {flight.confirmationNumber && tripSettings.showConfirmationNumbers !== false && (
        <div className="pt-2 border-t border-stone-200 dark:border-gray-700 mb-3">
          <p className="text-[10px] text-stone-500 dark:text-gray-400">
            Confirmation: <span className="font-mono font-medium">{flight.confirmationNumber}</span>
          </p>
        </div>
      )}

      {/* Details Button */}
      <div className="flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="inline-flex items-center gap-1 text-xs text-stone-500 dark:text-gray-400 hover:text-stone-700 dark:hover:text-gray-200 transition-colors"
        >
          Details
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
