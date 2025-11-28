'use client';

import { ArrowRight, Train, Car, Clock, MapPin } from 'lucide-react';

interface TransportCardProps {
  type: 'train' | 'drive';
  from?: string;
  to?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: number;
  trainNumber?: string;
  trainLine?: string;
  confirmationNumber?: string;
  notes?: string;
  compact?: boolean;
}

/**
 * TransportCard - Compact transport card for trains and drives
 * Layout: Route header → Schedule row → Transport identity
 * Matches FlightStatusCard design pattern
 */
export default function TransportCard({
  type,
  from,
  to,
  departureDate,
  departureTime,
  arrivalTime,
  duration,
  trainNumber,
  trainLine,
  confirmationNumber,
  notes,
  compact = true,
}: TransportCardProps) {
  const isTrain = type === 'train';
  const Icon = isTrain ? Train : Car;

  // Parse location (e.g., "Penn Station - New York" or just "Penn Station")
  const parseLocation = (value?: string) => {
    if (!value) return { name: '—', detail: '' };
    const parts = value.split(/[-–—]/);
    const name = parts[0]?.trim() || '—';
    const detail = parts[1]?.trim() || '';
    return { name, detail };
  };

  const origin = parseLocation(from);
  const destination = parseLocation(to);

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

  // Format duration
  const formatDuration = (mins?: number) => {
    if (!mins) return null;
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  return (
    <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/50">
      {/* REGION 1: Route Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Transport Icon */}
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
          ${isTrain ? 'bg-purple-50 dark:bg-purple-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'}
        `}>
          <Icon className={`w-4 h-4 ${isTrain ? 'text-purple-500' : 'text-emerald-500'}`} />
        </div>

        {/* Route */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-stone-900 dark:text-white truncate">
              {origin.name}
            </span>
            <ArrowRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
            <span className="text-base font-semibold text-stone-900 dark:text-white truncate">
              {destination.name}
            </span>
          </div>
          {(origin.detail || destination.detail) && (
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
              {origin.detail || destination.detail}
            </p>
          )}
        </div>
      </div>

      {/* REGION 2: Schedule Row */}
      <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300 mb-3">
        {departureDate && (
          <>
            <span>{formatDate(departureDate)}</span>
            <span className="text-stone-400">•</span>
          </>
        )}
        <span>{formatTime(departureTime)}</span>
        <span className="text-stone-400 px-0.5">—</span>
        <span>{formatTime(arrivalTime)}</span>
        {duration && (
          <span className="text-stone-400 ml-1">
            ({formatDuration(duration)})
          </span>
        )}
      </div>

      {/* REGION 3: Transport Identity */}
      <div className="flex items-center justify-between">
        {isTrain && (trainLine || trainNumber) ? (
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            {trainLine} {trainNumber}
          </p>
        ) : (
          <p className="text-[10px] text-stone-500 dark:text-stone-400">
            {isTrain ? 'Train' : 'Drive'}
          </p>
        )}

        {confirmationNumber && (
          <p className="text-[10px] text-stone-500">
            <span className="font-mono font-medium">{confirmationNumber}</span>
          </p>
        )}
      </div>

      {/* Notes (if any) */}
      {notes && (
        <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-700">
          <p className="text-[10px] text-stone-500 dark:text-stone-400 line-clamp-2">
            {notes}
          </p>
        </div>
      )}
    </div>
  );
}
