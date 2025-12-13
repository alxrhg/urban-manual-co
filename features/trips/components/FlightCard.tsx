'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plane, ChevronDown, RefreshCw, Loader2 } from 'lucide-react';
import { cn, badge, textStyles, iconSize, tripStyles } from '@/lib/design-tokens';
import type { FlightItem } from '../types';

// ============================================
// TYPES
// ============================================

type FlightStatus =
  | 'scheduled'
  | 'boarding'
  | 'departed'
  | 'in_flight'
  | 'landed'
  | 'delayed'
  | 'cancelled'
  | 'confirmed'
  | 'unknown';

interface FlightInfo {
  status: FlightStatus;
  statusText: string;
  actualDeparture?: string;
  actualArrival?: string;
  delay?: number;
  gate?: string;
  terminal?: string;
  lastUpdated: Date;
}

interface FlightCardProps {
  /** Flight item data */
  flight: FlightItem;
  /** Compact mode for list views */
  compact?: boolean;
  /** Whether card is selected */
  isSelected?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Expand handler */
  onExpand?: () => void;
  /** Additional class names */
  className?: string;
}

// ============================================
// UTILITIES
// ============================================

/**
 * Parse airport code from strings like "EWR - Newark" or just "EWR"
 */
function parseAirport(value?: string): { code: string; city: string } {
  if (!value) return { code: '---', city: '' };
  const parts = value.split(/[-–—]/);
  const code = parts[0]?.trim().toUpperCase().slice(0, 3) || '---';
  const city = parts[1]?.trim() || '';
  return { code, city };
}

/**
 * Format date for display
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Format time with fallback
 */
function formatTime(time?: string): string {
  if (!time) return '--:--';
  return time;
}

/**
 * Calculate flight duration from departure and arrival times
 */
function calculateDuration(depTime?: string, arrTime?: string): string | null {
  if (!depTime || !arrTime) return null;

  try {
    const [depHours, depMins] = depTime.split(':').map(Number);
    const [arrHours, arrMins] = arrTime.split(':').map(Number);

    let totalMins = (arrHours * 60 + arrMins) - (depHours * 60 + depMins);
    if (totalMins < 0) totalMins += 24 * 60; // Handle overnight flights

    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;

    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  } catch {
    return null;
  }
}

/**
 * Get status badge styling
 */
function getStatusStyles(status: FlightStatus): string {
  switch (status) {
    case 'confirmed':
    case 'scheduled':
    case 'landed':
      return badge.success;
    case 'boarding':
    case 'departed':
    case 'in_flight':
      return badge.info;
    case 'delayed':
      return badge.warning;
    case 'cancelled':
      return badge.error;
    default:
      return badge.neutral;
  }
}

// ============================================
// COMPONENT
// ============================================

/**
 * FlightCard - Premium ticket-inspired flight display
 *
 * Design philosophy:
 * - Conceptual plane ticket, not a realistic boarding pass
 * - Abstracted, clean, and digital-first
 * - Fixed anchor event that feels calm, confident, and reliable
 * - Premium but restrained aesthetic
 */
export function FlightCard({
  flight,
  compact = false,
  isSelected = false,
  onClick,
  onExpand,
  className,
}: FlightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch flight status
  const fetchFlightStatus = useCallback(async () => {
    if (!flight.flightNumber || !flight.airline) return;

    setLoading(true);
    try {
      const today = new Date();
      const flightDate = flight.departureDate;

      // Only fetch live status if flight is within 1 day
      if (flightDate) {
        const flightDay = new Date(flightDate);
        const diffDays = Math.abs((today.getTime() - flightDay.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          setFlightInfo({
            status: 'confirmed',
            statusText: 'Confirmed',
            lastUpdated: new Date(),
          });
          setLoading(false);
          return;
        }
      }

      const response = await fetch('/api/flight-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airline: flight.airline,
          flightNumber: flight.flightNumber,
          date: flightDate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFlightInfo({
          status: data.status || 'confirmed',
          statusText: data.statusText || 'Confirmed',
          actualDeparture: data.actualDeparture,
          actualArrival: data.actualArrival,
          delay: data.delay,
          gate: data.gate,
          terminal: data.terminal,
          lastUpdated: new Date(),
        });
      } else {
        setFlightInfo({
          status: 'confirmed',
          statusText: 'Confirmed',
          lastUpdated: new Date(),
        });
      }
    } catch {
      setFlightInfo({
        status: 'confirmed',
        statusText: 'Confirmed',
        lastUpdated: new Date(),
      });
    } finally {
      setLoading(false);
    }
  }, [flight.airline, flight.flightNumber, flight.departureDate]);

  // Fetch status on mount and periodically
  useEffect(() => {
    fetchFlightStatus();
    const interval = setInterval(fetchFlightStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchFlightStatus]);

  const origin = parseAirport(flight.from);
  const destination = parseAirport(flight.to);
  const duration = calculateDuration(
    flightInfo?.actualDeparture || flight.departureTime,
    flightInfo?.actualArrival || flight.arrivalTime
  );

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && onExpand) {
      onExpand();
    }
  };

  // Compact mode for list views
  if (compact) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => onClick && e.key === 'Enter' && onClick()}
        className={cn(
          tripStyles.flightCard,
          'p-3',
          onClick && 'cursor-pointer',
          isSelected && 'ring-2 ring-black dark:ring-white',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={cn(textStyles.cardTitle, 'font-mono')}>
              {origin.code}
            </span>
            <Plane className={cn(iconSize.xs, 'text-gray-400')} />
            <span className={cn(textStyles.cardTitle, 'font-mono')}>
              {destination.code}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {duration && (
              <span className={textStyles.caption}>{duration}</span>
            )}
            {flightInfo && (
              <span className={getStatusStyles(flightInfo.status)}>
                {flightInfo.statusText}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className={textStyles.bodySecondary}>
            {flight.airline} {flight.flightNumber}
          </span>
          <span className={cn(textStyles.caption, 'font-mono tabular-nums')}>
            {formatTime(flightInfo?.actualDeparture || flight.departureTime)}
          </span>
        </div>
      </div>
    );
  }

  // Full card view
  return (
    <div className={cn(tripStyles.flightCard, 'overflow-hidden', className)}>
      {/* Main Card Content */}
      <div className="p-5">
        {/* Header: Route + Status */}
        <div className="flex items-start justify-between mb-4">
          {/* Large Route Display */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white font-mono">
                {origin.code}
              </p>
              {origin.city && (
                <p className={cn(textStyles.caption, 'mt-0.5 max-w-[80px] truncate')}>
                  {origin.city}
                </p>
              )}
            </div>

            {/* Flight Path Visualization */}
            <div className="flex items-center gap-1.5 px-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
              <div className="w-12 h-px bg-gray-300 dark:bg-gray-600 relative">
                <Plane className={cn(iconSize.sm, 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500')} />
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            <div className="text-center">
              <p className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white font-mono">
                {destination.code}
              </p>
              {destination.city && (
                <p className={cn(textStyles.caption, 'mt-0.5 max-w-[80px] truncate')}>
                  {destination.city}
                </p>
              )}
            </div>
          </div>

          {/* Status Badge */}
          {flightInfo && (
            <div className={getStatusStyles(flightInfo.status)}>
              {flightInfo.statusText}
            </div>
          )}
        </div>

        {/* Dotted Perforation Line (Ticket Stub Hint) */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dashed border-gray-200 dark:border-gray-700" />
          </div>
          <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-3 h-6 bg-white dark:bg-gray-900 rounded-r-full" />
          <div className="absolute -right-5 top-1/2 -translate-y-1/2 w-3 h-6 bg-white dark:bg-gray-900 rounded-l-full" />
        </div>

        {/* Time Row */}
        <div className="flex items-center justify-between">
          {/* Departure */}
          <div>
            <p className={textStyles.labelUppercase}>Depart</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono tabular-nums">
              {formatTime(flightInfo?.actualDeparture || flight.departureTime)}
            </p>
            {flight.departureDate && (
              <p className={cn(textStyles.caption, 'mt-0.5')}>
                {formatDate(flight.departureDate)}
              </p>
            )}
          </div>

          {/* Duration + Nonstop */}
          <div className="flex flex-col items-center px-4">
            {duration && (
              <p className={cn(textStyles.caption, 'font-mono tabular-nums')}>
                {duration}
              </p>
            )}
            <p className={cn(textStyles.caption, 'mt-0.5')}>Nonstop</p>
            {flightInfo?.delay && flightInfo.delay > 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5 font-medium">
                +{flightInfo.delay}m delay
              </p>
            )}
          </div>

          {/* Arrival */}
          <div className="text-right">
            <p className={textStyles.labelUppercase}>Arrive</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono tabular-nums">
              {formatTime(flightInfo?.actualArrival || flight.arrivalTime)}
            </p>
            {flight.arrivalDate && flight.arrivalDate !== flight.departureDate && (
              <p className={cn(textStyles.caption, 'mt-0.5')}>
                {formatDate(flight.arrivalDate)}
              </p>
            )}
          </div>
        </div>

        {/* Flight Identity Row */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <p className={textStyles.label}>{flight.airline}</p>
            <p className={cn(textStyles.caption, 'font-mono')}>{flight.flightNumber}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchFlightStatus();
              }}
              disabled={loading}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              title="Refresh status"
            >
              {loading ? (
                <Loader2 className={cn(iconSize.sm, 'animate-spin')} />
              ) : (
                <RefreshCw className={iconSize.sm} />
              )}
            </button>

            {/* Expand Button */}
            <button
              onClick={handleExpand}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              title={isExpanded ? 'Collapse details' : 'Show details'}
            >
              <ChevronDown className={cn(iconSize.sm, 'transition-transform duration-200', isExpanded && 'rotate-180')} />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Details Section */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          isExpanded ? 'max-h-48' : 'max-h-0'
        )}
      >
        <div className="px-5 pb-5 pt-2 space-y-3 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/80">
          {/* Terminal & Gate */}
          {(flightInfo?.terminal || flightInfo?.gate || flight.terminal || flight.gate) && (
            <div className="flex gap-6">
              {(flightInfo?.terminal || flight.terminal) && (
                <div>
                  <p className={textStyles.labelUppercase}>Terminal</p>
                  <p className={cn(textStyles.label, 'font-mono')}>
                    {flightInfo?.terminal || flight.terminal}
                  </p>
                </div>
              )}
              {(flightInfo?.gate || flight.gate) && (
                <div>
                  <p className={textStyles.labelUppercase}>Gate</p>
                  <p className={cn(textStyles.label, 'font-mono')}>
                    {flightInfo?.gate || flight.gate}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Seat */}
          {flight.seatNumber && (
            <div>
              <p className={textStyles.labelUppercase}>Seat</p>
              <p className={cn(textStyles.label, 'font-mono')}>{flight.seatNumber}</p>
            </div>
          )}

          {/* Confirmation Number */}
          {flight.confirmationNumber && (
            <div>
              <p className={textStyles.labelUppercase}>Confirmation</p>
              <p className={cn(textStyles.label, 'font-mono tracking-wide')}>
                {flight.confirmationNumber}
              </p>
            </div>
          )}

          {/* Notes */}
          {flight.notes && (
            <div>
              <p className={textStyles.labelUppercase}>Notes</p>
              <p className={cn(textStyles.caption, 'mt-0.5')}>{flight.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FlightCard;
