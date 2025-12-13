'use client';

import { Plane, ArrowRight } from 'lucide-react';
import TicketCard, { TicketDivider, TicketBadge } from './TicketCard';
import { cn } from '@/lib/utils';

interface BoardingPassCardProps {
  // Route
  from: string;
  to: string;
  fromCity?: string;
  toCity?: string;
  // Flight details
  airline?: string;
  flightNumber?: string;
  // Times
  departureTime?: string;
  arrivalTime?: string;
  departureDate?: string;
  // Terminal/Gate
  terminal?: string;
  gate?: string;
  // Booking
  confirmationNumber?: string;
  seatNumber?: string;
  // Status
  status?: 'scheduled' | 'boarding' | 'departed' | 'in_flight' | 'landed' | 'delayed' | 'cancelled';
  statusText?: string;
  delay?: number;
  // Interaction
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * BoardingPassCard - Flight Card (Boarding Pass) variant
 *
 * Design: Boarding pass aesthetic with dashed divider, punch-out notches
 * Data: Airport Codes (LHR -> JFK), Flight Number, Terminal, Gate
 */
export default function BoardingPassCard({
  from,
  to,
  fromCity,
  toCity,
  airline,
  flightNumber,
  departureTime,
  arrivalTime,
  departureDate,
  terminal,
  gate,
  confirmationNumber,
  seatNumber,
  status = 'scheduled',
  statusText,
  delay,
  isActive,
  onClick,
  className,
}: BoardingPassCardProps) {
  // Parse airport code from string like "EWR - Newark" or just "EWR"
  const parseAirport = (value?: string) => {
    if (!value) return { code: '---', city: '' };
    const parts = value.split(/[-–—]/);
    const code = parts[0]?.trim().toUpperCase().slice(0, 3) || '---';
    const city = parts[1]?.trim() || '';
    return { code, city };
  };

  const origin = parseAirport(from);
  const destination = parseAirport(to);

  // Use provided city names or parsed ones
  const originCity = fromCity || origin.city;
  const destCity = toCity || destination.city;

  // Format time
  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    return time;
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Status badge variant
  const getStatusVariant = (): 'success' | 'warning' | 'default' => {
    switch (status) {
      case 'scheduled':
      case 'boarding':
      case 'landed':
        return 'success';
      case 'delayed':
      case 'cancelled':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <TicketCard
      variant="boarding-pass"
      onClick={onClick}
      isActive={isActive}
      className={cn('relative', className)}
    >
      {/* Top Section: Route Display */}
      <div className="p-4 pb-2">
        {/* Airport Codes with Arrow */}
        <div className="flex items-center justify-between mb-1">
          {/* Origin */}
          <div className="text-left">
            <p className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
              {origin.code}
            </p>
            {originCity && (
              <p className="text-[10px] text-stone-500 dark:text-gray-400 uppercase tracking-wider">
                {originCity}
              </p>
            )}
          </div>

          {/* Flight Path Indicator */}
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-gray-600" />
              <div className="flex-1 h-px bg-stone-200 dark:bg-gray-700 min-w-[40px] relative">
                <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-gray-500 rotate-90" />
              </div>
              <ArrowRight className="w-3 h-3 text-stone-400 dark:text-gray-500" />
              <div className="w-2 h-2 rounded-full bg-stone-900 dark:bg-white" />
            </div>
          </div>

          {/* Destination */}
          <div className="text-right">
            <p className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
              {destination.code}
            </p>
            {destCity && (
              <p className="text-[10px] text-stone-500 dark:text-gray-400 uppercase tracking-wider">
                {destCity}
              </p>
            )}
          </div>
        </div>

        {/* Time Row */}
        <div className="flex items-center justify-between text-xs mt-3">
          <span className="font-medium text-stone-700 dark:text-gray-300">
            {formatTime(departureTime)}
          </span>
          {departureDate && (
            <span className="text-stone-400 dark:text-gray-500">
              {formatDate(departureDate)}
            </span>
          )}
          <span className="font-medium text-stone-700 dark:text-gray-300">
            {formatTime(arrivalTime)}
          </span>
        </div>
      </div>

      {/* Notched Divider */}
      <TicketDivider withNotch />

      {/* Bottom Section: Flight Details */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center justify-between">
          {/* Left: Flight Identity */}
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wider">
                Flight
              </p>
              <p className="text-sm font-bold text-stone-900 dark:text-white">
                {airline} {flightNumber}
              </p>
            </div>
            {terminal && (
              <div className="pl-3 border-l border-stone-200 dark:border-gray-700">
                <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wider">
                  Terminal
                </p>
                <p className="text-sm font-bold text-stone-900 dark:text-white">
                  {terminal}
                </p>
              </div>
            )}
            {gate && (
              <div className="pl-3 border-l border-stone-200 dark:border-gray-700">
                <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wider">
                  Gate
                </p>
                <p className="text-sm font-bold text-stone-900 dark:text-white">
                  {gate}
                </p>
              </div>
            )}
          </div>

          {/* Right: Status & Seat */}
          <div className="flex items-center gap-2">
            {seatNumber && (
              <div className="text-right">
                <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wider">
                  Seat
                </p>
                <p className="text-sm font-bold text-stone-900 dark:text-white">
                  {seatNumber}
                </p>
              </div>
            )}
            {(statusText || status) && (
              <TicketBadge variant={getStatusVariant()}>
                {statusText || status}
                {delay && delay > 0 && ` +${delay}m`}
              </TicketBadge>
            )}
          </div>
        </div>

        {/* Confirmation Number */}
        {confirmationNumber && (
          <div className="mt-3 pt-2 border-t border-stone-100 dark:border-gray-800">
            <p className="text-[10px] text-stone-400 dark:text-gray-500">
              Confirmation: <span className="font-mono font-medium text-stone-600 dark:text-gray-300">{confirmationNumber}</span>
            </p>
          </div>
        )}
      </div>

      {/* Decorative notch cutouts on edges */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-stone-100 dark:bg-gray-800 rounded-r-full" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-stone-100 dark:bg-gray-800 rounded-l-full" />
    </TicketCard>
  );
}
