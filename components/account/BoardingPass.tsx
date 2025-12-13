'use client';

import React, { useMemo } from 'react';
import { Calendar, MapPin, Plane } from 'lucide-react';
import type { Trip } from '@/types/trip';
import { parseDestinations } from '@/types/trip';

interface BoardingPassProps {
  trip: Trip;
  onClick?: () => void;
}

// Generate a simple barcode pattern from a string
function generateBarcodePattern(str: string): number[] {
  const pattern: number[] = [];
  const seed = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  for (let i = 0; i < 30; i++) {
    // Create pseudo-random heights based on seed and position
    const height = 20 + ((seed * (i + 1) * 7) % 20);
    pattern.push(height);
  }

  return pattern;
}

// Get status badge color
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'ongoing':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'upcoming':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

export function BoardingPass({ trip, onClick }: BoardingPassProps) {
  const destinations = useMemo(() => parseDestinations(trip.destination), [trip.destination]);
  const primaryDestination = destinations[0] || 'TBD';
  const hasMultipleDestinations = destinations.length > 1;

  const barcodePattern = useMemo(() => generateBarcodePattern(trip.id), [trip.id]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
    }).toUpperCase();
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: '2-digit',
    });
  };

  // Calculate trip duration
  const tripDuration = useMemo(() => {
    if (!trip.start_date || !trip.end_date) return null;
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return days;
  }, [trip.start_date, trip.end_date]);

  // Generate a flight-like number from trip ID
  const flightNumber = useMemo(() => {
    const hash = trip.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `UM${(hash % 9000) + 1000}`;
  }, [trip.id]);

  return (
    <button
      onClick={onClick}
      className="w-full text-left group"
    >
      <div className="flex">
        {/* Main ticket section */}
        <div className="flex-1 passport-paper rounded-l-xl border border-r-0 border-gray-200 dark:border-gray-800 p-4 md:p-5 boarding-pass-edge">
          {/* Header row */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="passport-data text-[10px] text-gray-400 mb-1">Urban Manual</p>
              <p className="passport-data text-[10px] text-gray-400">Travel Pass</p>
            </div>
            <div className="text-right">
              <p className="passport-data text-[10px] text-gray-400">Flight</p>
              <p className="passport-data text-sm tracking-widest">{flightNumber}</p>
            </div>
          </div>

          {/* Route section */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <p className="passport-data text-[10px] text-gray-400 mb-1">From</p>
              <p className="passport-data text-lg md:text-xl font-bold tracking-wide">HOME</p>
            </div>

            <div className="flex items-center gap-2 text-gray-300 dark:text-gray-600">
              <div className="w-8 h-px bg-current" />
              <Plane className="w-4 h-4" />
              <div className="w-8 h-px bg-current" />
            </div>

            <div className="flex-1 text-right">
              <p className="passport-data text-[10px] text-gray-400 mb-1">To</p>
              <p className="passport-data text-lg md:text-xl font-bold tracking-wide truncate">
                {primaryDestination.substring(0, 3).toUpperCase()}
                {hasMultipleDestinations && '+'}
              </p>
            </div>
          </div>

          {/* Trip title */}
          <div className="mb-4 pb-4 border-b border-dashed border-gray-200 dark:border-gray-700">
            <p className="font-medium text-sm line-clamp-1 group-hover:text-black dark:group-hover:text-white transition-colors">
              {trip.title}
            </p>
            {trip.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{trip.description}</p>
            )}
          </div>

          {/* Details row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="passport-data text-[10px] text-gray-400 mb-1">Depart</p>
              <p className="passport-data text-sm">
                {formatDate(trip.start_date)}
                <span className="text-[10px] text-gray-400 ml-1">{formatTime(trip.start_date)}</span>
              </p>
            </div>
            <div>
              <p className="passport-data text-[10px] text-gray-400 mb-1">Return</p>
              <p className="passport-data text-sm">
                {formatDate(trip.end_date)}
                <span className="text-[10px] text-gray-400 ml-1">{formatTime(trip.end_date)}</span>
              </p>
            </div>
            <div>
              <p className="passport-data text-[10px] text-gray-400 mb-1">Duration</p>
              <p className="passport-data text-sm">
                {tripDuration ? `${tripDuration}D` : '--'}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className="mt-4 flex items-center justify-between">
            <span className={`passport-data text-[10px] px-2 py-1 rounded ${getStatusColor(trip.status)}`}>
              {trip.status.toUpperCase()}
            </span>

            {hasMultipleDestinations && (
              <span className="text-[10px] text-gray-400">
                +{destinations.length - 1} more {destinations.length - 1 === 1 ? 'city' : 'cities'}
              </span>
            )}
          </div>
        </div>

        {/* Stub section (tear-off) */}
        <div className="w-24 md:w-28 passport-paper rounded-r-xl border border-l-0 border-gray-200 dark:border-gray-800 p-3 flex flex-col items-center justify-between ticket-stub">
          {/* Destination code */}
          <div className="text-center">
            <p className="passport-data text-2xl md:text-3xl font-bold tracking-widest">
              {primaryDestination.substring(0, 3).toUpperCase()}
            </p>
            <p className="passport-data text-[8px] text-gray-400 mt-1 truncate max-w-full">
              {primaryDestination}
            </p>
          </div>

          {/* Barcode */}
          <div className="barcode w-full justify-center mt-3" aria-hidden="true">
            {barcodePattern.map((height, i) => (
              <div
                key={i}
                className="barcode-line"
                style={{
                  height: `${height}px`,
                  width: i % 3 === 0 ? '3px' : '1px',
                }}
              />
            ))}
          </div>

          {/* Trip ID (truncated) */}
          <p className="passport-data text-[8px] text-gray-400 mt-2">
            {trip.id.substring(0, 8).toUpperCase()}
          </p>
        </div>
      </div>
    </button>
  );
}
