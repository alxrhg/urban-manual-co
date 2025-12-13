'use client';

import { useState, useEffect } from 'react';
import { Plane, ChevronDown, RefreshCw, Loader2 } from 'lucide-react';
import type { ItineraryItemNotes } from '@/types/trip';

interface FlightCardProps {
  flight: ItineraryItemNotes;
  departureDate?: string;
  onExpand?: () => void;
}

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

/**
 * FlightCard - Premium ticket-inspired flight card
 *
 * Design philosophy:
 * - Conceptual plane ticket, not a realistic boarding pass
 * - Abstracted, clean, and digital-first
 * - Fixed anchor event that feels calm, confident, and reliable
 * - Premium but restrained aesthetic
 */
export default function FlightCard({ flight, departureDate, onExpand }: FlightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch flight status
  const fetchFlightStatus = async () => {
    if (!flight.flightNumber || !flight.airline) return;

    setLoading(true);
    try {
      const today = new Date();
      const flightDate = departureDate || flight.departureDate;

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
  };

  useEffect(() => {
    fetchFlightStatus();
    const interval = setInterval(fetchFlightStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [flight.flightNumber, flight.airline, departureDate]);

  // Parse airport codes from "from" and "to" fields (e.g., "EWR - Newark" or just "EWR")
  const parseAirport = (value?: string) => {
    if (!value) return { code: '---', city: '' };
    const parts = value.split(/[-–—]/);
    const code = parts[0]?.trim().toUpperCase().slice(0, 3) || '---';
    const city = parts[1]?.trim() || '';
    return { code, city };
  };

  const origin = parseAirport(flight.from);
  const destination = parseAirport(flight.to);

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Format time with tabular figures
  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    return time;
  };

  // Calculate duration from departure and arrival times
  const calculateDuration = () => {
    const depTime = flightInfo?.actualDeparture || flight.departureTime;
    const arrTime = flightInfo?.actualArrival || flight.arrivalTime;

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
  };

  const duration = calculateDuration();

  // Status styling
  const getStatusStyles = (status: FlightStatus) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
      case 'landed':
        return 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300';
      case 'boarding':
      case 'departed':
      case 'in_flight':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
      case 'delayed':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
      case 'cancelled':
        return 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300';
      default:
        return 'bg-stone-100 text-stone-600 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && onExpand) {
      onExpand();
    }
  };

  return (
    <div className="relative rounded-2xl bg-stone-50 dark:bg-gray-800/60 overflow-hidden shadow-sm ring-1 ring-stone-200/50 dark:ring-gray-700/50">
      {/* Main Card Content */}
      <div className="p-5">
        {/* Header: Route + Status */}
        <div className="flex items-start justify-between mb-4">
          {/* Large Route Display */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-white font-mono">
                {origin.code}
              </p>
              {origin.city && (
                <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-0.5 max-w-[80px] truncate">
                  {origin.city}
                </p>
              )}
            </div>

            {/* Flight Path Visualization */}
            <div className="flex items-center gap-1.5 px-2">
              <div className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-gray-600" />
              <div className="w-12 h-px bg-stone-300 dark:bg-gray-600 relative">
                <Plane className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 dark:text-gray-500 rotate-90" />
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-gray-600" />
            </div>

            <div className="text-center">
              <p className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-white font-mono">
                {destination.code}
              </p>
              {destination.city && (
                <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-0.5 max-w-[80px] truncate">
                  {destination.city}
                </p>
              )}
            </div>
          </div>

          {/* Status Badge */}
          {flightInfo && (
            <div className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${getStatusStyles(flightInfo.status)}`}>
              {flightInfo.statusText}
            </div>
          )}
        </div>

        {/* Dotted Perforation Line (Ticket Stub Hint) */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dashed border-stone-200 dark:border-gray-700" />
          </div>
          <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-3 h-6 bg-white dark:bg-gray-900 rounded-r-full" />
          <div className="absolute -right-5 top-1/2 -translate-y-1/2 w-3 h-6 bg-white dark:bg-gray-900 rounded-l-full" />
        </div>

        {/* Time Row */}
        <div className="flex items-center justify-between">
          {/* Departure */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-gray-500 mb-0.5">
              Depart
            </p>
            <p className="text-lg font-semibold text-stone-900 dark:text-white font-mono tabular-nums">
              {formatTime(flightInfo?.actualDeparture || flight.departureTime)}
            </p>
            {(departureDate || flight.departureDate) && (
              <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-0.5">
                {formatDate(departureDate || flight.departureDate)}
              </p>
            )}
          </div>

          {/* Duration + Nonstop */}
          <div className="flex flex-col items-center px-4">
            {duration && (
              <p className="text-xs text-stone-500 dark:text-gray-400 font-mono tabular-nums">
                {duration}
              </p>
            )}
            <p className="text-[10px] text-stone-400 dark:text-gray-500 mt-0.5">
              Nonstop
            </p>
            {flightInfo?.delay && flightInfo.delay > 0 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                +{flightInfo.delay}m delay
              </p>
            )}
          </div>

          {/* Arrival */}
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-gray-500 mb-0.5">
              Arrive
            </p>
            <p className="text-lg font-semibold text-stone-900 dark:text-white font-mono tabular-nums">
              {formatTime(flightInfo?.actualArrival || flight.arrivalTime)}
            </p>
            {flight.arrivalDate && flight.arrivalDate !== flight.departureDate && (
              <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-0.5">
                {formatDate(flight.arrivalDate)}
              </p>
            )}
          </div>
        </div>

        {/* Flight Identity Row */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-stone-700 dark:text-gray-300">
              {flight.airline}
            </p>
            <p className="text-xs text-stone-500 dark:text-gray-400 font-mono">
              {flight.flightNumber}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchFlightStatus();
              }}
              disabled={loading}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              title="Refresh status"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Expand Button */}
            <button
              onClick={handleExpand}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              title={isExpanded ? 'Collapse details' : 'Show details'}
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Details Section */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isExpanded ? 'max-h-48' : 'max-h-0'
        }`}
      >
        <div className="px-5 pb-5 pt-2 space-y-3 border-t border-stone-100 dark:border-gray-700/50 bg-stone-100/50 dark:bg-gray-800/80">
          {/* Terminal & Gate */}
          {(flightInfo?.terminal || flightInfo?.gate || flight.terminal || flight.gate) && (
            <div className="flex gap-6">
              {(flightInfo?.terminal || flight.terminal) && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-gray-500">
                    Terminal
                  </p>
                  <p className="text-sm font-medium text-stone-700 dark:text-gray-300 font-mono">
                    {flightInfo?.terminal || flight.terminal}
                  </p>
                </div>
              )}
              {(flightInfo?.gate || flight.gate) && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-gray-500">
                    Gate
                  </p>
                  <p className="text-sm font-medium text-stone-700 dark:text-gray-300 font-mono">
                    {flightInfo?.gate || flight.gate}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Seat */}
          {flight.seatNumber && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-gray-500">
                Seat
              </p>
              <p className="text-sm font-medium text-stone-700 dark:text-gray-300 font-mono">
                {flight.seatNumber}
              </p>
            </div>
          )}

          {/* Confirmation Number */}
          {flight.confirmationNumber && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-gray-500">
                Confirmation
              </p>
              <p className="text-sm font-medium text-stone-700 dark:text-gray-300 font-mono tracking-wide">
                {flight.confirmationNumber}
              </p>
            </div>
          )}

          {/* Notes */}
          {flight.notes && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-gray-500">
                Notes
              </p>
              <p className="text-xs text-stone-600 dark:text-gray-400 mt-0.5">
                {flight.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
