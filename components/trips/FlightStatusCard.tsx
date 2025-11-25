'use client';

import { useEffect, useState } from 'react';
import {
  Plane,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { ItineraryItemNotes } from '@/types/trip';

interface FlightStatusCardProps {
  flight: ItineraryItemNotes;
  departureDate?: string;
}

type FlightStatus = 'scheduled' | 'boarding' | 'departed' | 'in_flight' | 'landed' | 'delayed' | 'cancelled' | 'unknown';

interface FlightInfo {
  status: FlightStatus;
  statusText: string;
  actualDeparture?: string;
  actualArrival?: string;
  delay?: number; // minutes
  gate?: string;
  terminal?: string;
  lastUpdated: Date;
}

export default function FlightStatusCard({ flight, departureDate }: FlightStatusCardProps) {
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlightStatus = async () => {
    if (!flight.flightNumber || !flight.airline) {
      setError('Missing flight info');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if flight is today or in the past 24 hours or next 24 hours
      const today = new Date();
      const flightDate = departureDate || flight.departureDate;

      if (flightDate) {
        const flightDay = new Date(flightDate);
        const diffDays = Math.abs((today.getTime() - flightDay.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          // Flight is more than 1 day away or past
          setFlightInfo({
            status: 'scheduled',
            statusText: 'Scheduled',
            lastUpdated: new Date(),
          });
          setLoading(false);
          return;
        }
      }

      // Try to fetch from API (using a mock for now since most flight APIs require paid keys)
      // In production, you'd use an API like AviationStack, FlightAware, or similar
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
          statusText: data.statusText || 'Scheduled',
          actualDeparture: data.actualDeparture,
          actualArrival: data.actualArrival,
          delay: data.delay,
          gate: data.gate,
          terminal: data.terminal,
          lastUpdated: new Date(),
        });
      } else {
        // API not available, show scheduled status
        setFlightInfo({
          status: 'scheduled',
          statusText: 'On Time',
          lastUpdated: new Date(),
        });
      }
    } catch (err) {
      // API call failed, show default status
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

    // Auto-refresh every 5 minutes for flights today
    const interval = setInterval(fetchFlightStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [flight.flightNumber, flight.airline, departureDate]);

  const getStatusColor = (status: FlightStatus) => {
    switch (status) {
      case 'scheduled':
      case 'boarding':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30';
      case 'departed':
      case 'in_flight':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
      case 'landed':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30';
      case 'delayed':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30';
      case 'cancelled':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30';
    }
  };

  const getStatusIcon = (status: FlightStatus) => {
    switch (status) {
      case 'scheduled':
      case 'boarding':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'departed':
      case 'in_flight':
        return <Plane className="w-3 h-3" />;
      case 'landed':
        return <TrendingDown className="w-3 h-3" />;
      case 'delayed':
        return <Clock className="w-3 h-3" />;
      case 'cancelled':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return <Plane className="w-3 h-3" />;
    }
  };

  return (
    <div className="mt-2 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
      {/* Flight Route */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium">
            {flight.airline} {flight.flightNumber}
          </span>
        </div>
        <button
          onClick={fetchFlightStatus}
          disabled={loading}
          className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Refresh status"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Route Info */}
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
        <span className="font-medium">{flight.from}</span>
        <TrendingUp className="w-3 h-3" />
        <span className="font-medium">{flight.to}</span>
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Departure</p>
          <p className="text-sm font-medium">
            {flightInfo?.actualDeparture || flight.departureTime || '--:--'}
          </p>
          {flightInfo?.delay && flightInfo.delay > 0 && (
            <p className="text-[10px] text-orange-500">
              +{flightInfo.delay}min delay
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Arrival</p>
          <p className="text-sm font-medium">
            {flightInfo?.actualArrival || flight.arrivalTime || '--:--'}
          </p>
        </div>
      </div>

      {/* Status Badge */}
      {flightInfo && (
        <div className="flex items-center justify-between">
          <div
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
              flightInfo.status
            )}`}
          >
            {getStatusIcon(flightInfo.status)}
            {flightInfo.statusText}
          </div>

          {/* Gate/Terminal */}
          {(flightInfo.gate || flightInfo.terminal) && (
            <div className="text-xs text-gray-500">
              {flightInfo.terminal && `Terminal ${flightInfo.terminal}`}
              {flightInfo.terminal && flightInfo.gate && ' · '}
              {flightInfo.gate && `Gate ${flightInfo.gate}`}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Number */}
      {flight.confirmationNumber && (
        <div className="mt-2 pt-2 border-t border-blue-100 dark:border-blue-800">
          <p className="text-[10px] text-gray-500">
            Confirmation: <span className="font-mono">{flight.confirmationNumber}</span>
          </p>
        </div>
      )}

      {/* Last Updated */}
      {flightInfo && (
        <p className="text-[10px] text-gray-400 mt-2">
          Updated {flightInfo.lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
