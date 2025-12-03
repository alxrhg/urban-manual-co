'use client';

import { memo } from 'react';
import { Plane, Clock, ArrowRight } from 'lucide-react';
import { formatTimeDisplay } from '@/lib/utils/time-calculations';
import type { ItineraryItemNotes } from '@/types/trip';

interface FlightCardProps {
  notes: ItineraryItemNotes;
  title?: string;
  isCompact?: boolean;
  onClick?: () => void;
}

/**
 * FlightCard - Tripsy-inspired flight card with airport codes and times at a glance
 */
function FlightCardComponent({ notes, title, isCompact = false, onClick }: FlightCardProps) {
  const {
    from,
    to,
    airline,
    flightNumber,
    departureTime,
    arrivalTime,
    departureDate,
    confirmationNumber,
  } = notes;

  // Format times for display
  const depTime = departureTime ? formatTimeDisplay(departureTime) : null;
  const arrTime = arrivalTime ? formatTimeDisplay(arrivalTime) : null;

  // Calculate duration if both times available
  const getDuration = () => {
    if (!departureTime || !arrivalTime) return null;
    const [depH, depM] = departureTime.split(':').map(Number);
    const [arrH, arrM] = arrivalTime.split(':').map(Number);
    let totalMinutes = (arrH * 60 + arrM) - (depH * 60 + depM);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight flights
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
  };

  const duration = getDuration();

  if (isCompact) {
    return (
      <button
        onClick={onClick}
        className="w-full p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 ring-1 ring-blue-200/50 dark:ring-blue-800/30 hover:ring-blue-300 dark:hover:ring-blue-700 transition-all text-left"
      >
        <div className="flex items-center gap-3">
          {/* Plane icon */}
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <Plane className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>

          {/* Airport codes */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-bold text-gray-900 dark:text-white">{from || '---'}</span>
            <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{to || '---'}</span>
          </div>

          {/* Time */}
          {depTime && (
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums flex-shrink-0">
              {depTime}
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-2xl bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-blue-950/50 dark:via-gray-900 dark:to-indigo-950/50 ring-1 ring-blue-200/50 dark:ring-blue-800/30 hover:ring-blue-300 dark:hover:ring-blue-700 transition-all text-left"
    >
      {/* Header with airline and flight number */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <Plane className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {airline || 'Flight'}
            </span>
            {flightNumber && (
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1.5">{flightNumber}</span>
            )}
          </div>
        </div>
        {confirmationNumber && (
          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {confirmationNumber}
          </span>
        )}
      </div>

      {/* Main content - Airport codes and times */}
      <div className="flex items-center justify-between">
        {/* Departure */}
        <div className="text-left">
          <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {from || '---'}
          </div>
          {depTime && (
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300 tabular-nums mt-0.5">
              {depTime}
            </div>
          )}
        </div>

        {/* Flight path visualization */}
        <div className="flex-1 mx-4 relative">
          <div className="flex items-center justify-center">
            <div className="h-px flex-1 bg-gradient-to-r from-blue-200 to-blue-300 dark:from-blue-800 dark:to-blue-700" />
            <div className="mx-2 relative">
              <Plane className="w-4 h-4 text-blue-500 dark:text-blue-400 transform rotate-90" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-blue-300 to-blue-200 dark:from-blue-700 dark:to-blue-800" />
          </div>
          {duration && (
            <div className="text-center mt-1">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                {duration}
              </span>
            </div>
          )}
        </div>

        {/* Arrival */}
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {to || '---'}
          </div>
          {arrTime && (
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300 tabular-nums mt-0.5">
              {arrTime}
            </div>
          )}
        </div>
      </div>

      {/* Date row */}
      {departureDate && (
        <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-900/50">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(departureDate).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
      )}
    </button>
  );
}

export const FlightCard = memo(FlightCardComponent);
