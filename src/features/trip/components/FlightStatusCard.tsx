'use client';

import { useEffect, useState } from 'react';
import { Clock, Plane } from 'lucide-react';
import type { ItineraryItemNotes } from '@/types/trip';

interface FlightStatusCardProps {
  flight: ItineraryItemNotes;
  departureDate?: string;
  compact?: boolean;
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
 * FlightStatusCard - Clean flight card with route visualization
 * Matches the new design: horizontal layout with airport codes, times in pills, and flight path
 */
export default function FlightStatusCard({ flight, departureDate, compact = true }: FlightStatusCardProps) {
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [loading, setLoading] = useState(false);

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
            statusText: 'ON TIME',
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
          statusText: data.statusText?.toUpperCase() || 'ON TIME',
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
          statusText: 'ON TIME',
          lastUpdated: new Date(),
        });
      }
    } catch {
      setFlightInfo({
        status: 'scheduled',
        statusText: 'ON TIME',
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

  // Format time for display (convert to 12-hour format with AM/PM)
  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
      return time;
    }
  };

  // Calculate flight duration
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

  const getStatusColor = (status: FlightStatus) => {
    switch (status) {
      case 'scheduled':
      case 'boarding':
      case 'landed':
        return 'text-[#E07553]'; // Coral/orange color from design
      case 'departed':
      case 'in_flight':
        return 'text-blue-500';
      case 'delayed':
        return 'text-amber-500';
      case 'cancelled':
        return 'text-red-500';
      default:
        return 'text-[#E07553]';
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
      {/* Three-column layout: Departure - Flight Path - Arrival */}
      <div className="flex items-start justify-between">
        {/* Departure Column */}
        <div className="flex flex-col items-start">
          <p className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">
            {origin.code}
          </p>
          {origin.city && (
            <p className="text-xs text-stone-400 dark:text-gray-500 mt-0.5">
              {origin.city}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-3 px-2.5 py-1 bg-stone-100 dark:bg-gray-700 rounded-full">
            <Clock className="w-3 h-3 text-stone-400 dark:text-gray-500" />
            <span className="text-xs font-medium text-stone-600 dark:text-gray-300 tabular-nums">
              {formatTime(flightInfo?.actualDeparture || flight.departureTime)}
            </span>
          </div>
        </div>

        {/* Flight Path Column */}
        <div className="flex flex-col items-center flex-1 px-4 pt-1">
          {/* Status */}
          {flightInfo && (
            <p className={`text-[10px] font-bold tracking-widest ${getStatusColor(flightInfo.status)}`}>
              {flightInfo.statusText}
            </p>
          )}

          {/* Flight path visualization */}
          <div className="flex items-center w-full mt-2">
            <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-gray-600 flex-shrink-0" />
            <div className="flex-1 mx-1 border-t-2 border-dashed border-stone-300 dark:border-gray-600 relative">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 px-1">
                <Plane className="w-4 h-4 text-[#E07553] rotate-0" />
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-gray-600 flex-shrink-0" />
          </div>

          {/* Duration */}
          {duration && (
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-2 font-medium">
              {duration}
            </p>
          )}
        </div>

        {/* Arrival Column */}
        <div className="flex flex-col items-end">
          <p className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">
            {destination.code}
          </p>
          {destination.city && (
            <p className="text-xs text-stone-400 dark:text-gray-500 mt-0.5">
              {destination.city}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-3 px-2.5 py-1 bg-stone-100 dark:bg-gray-700 rounded-full">
            <Clock className="w-3 h-3 text-stone-400 dark:text-gray-500" />
            <span className="text-xs font-medium text-stone-600 dark:text-gray-300 tabular-nums">
              {formatTime(flightInfo?.actualArrival || flight.arrivalTime)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
