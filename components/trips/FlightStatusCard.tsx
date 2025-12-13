'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, RefreshCw, Loader2, CheckCircle2, Clock, AlertCircle, Plane, Armchair, DoorOpen } from 'lucide-react';
import type { ItineraryItemNotes } from '@/types/trip';

interface FlightStatusCardProps {
  flight: ItineraryItemNotes;
  departureDate?: string;
  compact?: boolean;
  /** Departure terminal from booking (not live status) */
  departureTerminal?: string;
  /** Arrival terminal from booking (not live status) */
  arrivalTerminal?: string;
  /** Whether passenger has lounge access */
  loungeAccess?: boolean;
  /** Name of the lounge */
  loungeName?: string;
  /** Seat number */
  seatNumber?: string;
  /** Seat class (economy, business, first) */
  seatClass?: string;
}

type FlightStatus = 'scheduled' | 'boarding' | 'departed' | 'in_flight' | 'landed' | 'delayed' | 'cancelled' | 'unknown';

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
 * FlightStatusCard - Compact flight card with route-focused design
 * Layout: Route header → Schedule row → Flight identity
 */
export default function FlightStatusCard({
  flight,
  departureDate,
  compact = true,
  departureTerminal,
  arrivalTerminal,
  loungeAccess,
  loungeName,
  seatNumber,
  seatClass,
}: FlightStatusCardProps) {
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Determine terminals: prefer live data, fallback to booking data, then flight notes
  const getDepartureTerminal = () => flightInfo?.terminal || departureTerminal || flight.terminal;
  const getArrivalTerminal = () => arrivalTerminal;
  const getDepartureGate = () => flightInfo?.gate || flight.gate;

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
            status: 'scheduled',
            statusText: 'On Time',
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
          status: data.status || 'scheduled',
          statusText: data.statusText || 'On Time',
          actualDeparture: data.actualDeparture,
          actualArrival: data.actualArrival,
          delay: data.delay,
          gate: data.gate,
          terminal: data.terminal,
          lastUpdated: new Date(),
        });
      } else {
        setFlightInfo({
          status: 'scheduled',
          statusText: 'On Time',
          lastUpdated: new Date(),
        });
      }
    } catch {
      setFlightInfo({
        status: 'scheduled',
        statusText: 'On Time',
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

  // Format time for display
  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    return time;
  };

  const getStatusColor = (status: FlightStatus) => {
    switch (status) {
      case 'scheduled':
      case 'boarding':
      case 'landed':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30';
      case 'departed':
      case 'in_flight':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30';
      case 'delayed':
        return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30';
      case 'cancelled':
        return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30';
      default:
        return 'text-stone-600 bg-stone-50 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  const getStatusIcon = (status: FlightStatus) => {
    switch (status) {
      case 'scheduled':
      case 'boarding':
      case 'landed':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'departed':
      case 'in_flight':
        return <Plane className="w-3 h-3" />;
      case 'delayed':
        return <Clock className="w-3 h-3" />;
      case 'cancelled':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Plane className="w-3 h-3" />;
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-stone-100 dark:bg-gray-800/50">
      {/* REGION 1: Route Header (EWR → MIA) with terminals */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4 mb-3">
        {/* Origin */}
        <div>
          <p className="text-xl font-semibold text-stone-900 dark:text-white leading-tight">
            {origin.code}
          </p>
          {origin.city && (
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
              {origin.city}
            </p>
          )}
          {getDepartureTerminal() && (
            <p className="text-[10px] text-stone-400 dark:text-gray-500 mt-1 flex items-center gap-1">
              <DoorOpen className="w-3 h-3" />
              Terminal {getDepartureTerminal()}
              {getDepartureGate() && <span>• Gate {getDepartureGate()}</span>}
            </p>
          )}
        </div>

        {/* Arrow */}
        <div className="pt-1">
          <ArrowRight className="w-4 h-4 text-stone-400" />
        </div>

        {/* Destination */}
        <div>
          <p className="text-xl font-semibold text-stone-900 dark:text-white leading-tight">
            {destination.code}
          </p>
          {destination.city && (
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
              {destination.city}
            </p>
          )}
          {getArrivalTerminal() && (
            <p className="text-[10px] text-stone-400 dark:text-gray-500 mt-1 flex items-center gap-1">
              <DoorOpen className="w-3 h-3" />
              Terminal {getArrivalTerminal()}
            </p>
          )}
        </div>
      </div>

      {/* REGION 2: Schedule Row */}
      <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-gray-300 mb-3">
        {(departureDate || flight.departureDate) && (
          <>
            <span>{formatDate(departureDate || flight.departureDate)}</span>
            <span className="text-stone-400">•</span>
          </>
        )}
        <span>{formatTime(flightInfo?.actualDeparture || flight.departureTime)}</span>
        <span className="text-stone-400 px-0.5">—</span>
        <span>{formatTime(flightInfo?.actualArrival || flight.arrivalTime)}</span>
        {flightInfo?.delay && flightInfo.delay > 0 && (
          <span className="text-orange-500 ml-1">+{flightInfo.delay}m</span>
        )}
      </div>

      {/* REGION 3: Flight Identity & Status */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-gray-400">
          {flight.airline} {flight.flightNumber}
        </p>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          {flightInfo && (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(flightInfo.status)}`}>
              {getStatusIcon(flightInfo.status)}
              {flightInfo.statusText}
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={fetchFlightStatus}
            disabled={loading}
            className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
            title="Refresh status"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Lounge Access Indicator */}
      {loungeAccess && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-200 dark:border-gray-700">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            <Armchair className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium">
              {loungeName || 'Lounge Access'}
            </span>
          </div>
        </div>
      )}

      {/* Seat & Booking Info */}
      {(seatNumber || seatClass || flight.confirmationNumber) && (
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-stone-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {seatNumber && (
              <p className="text-[10px] text-stone-500 dark:text-gray-400">
                Seat: <span className="font-mono font-medium">{seatNumber}</span>
              </p>
            )}
            {seatClass && seatClass !== 'economy' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 dark:bg-gray-700 text-stone-600 dark:text-gray-300 capitalize">
                {seatClass.replace('_', ' ')}
              </span>
            )}
          </div>
          {flight.confirmationNumber && (
            <p className="text-[10px] text-stone-500 dark:text-gray-400">
              Conf: <span className="font-mono font-medium">{flight.confirmationNumber}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
