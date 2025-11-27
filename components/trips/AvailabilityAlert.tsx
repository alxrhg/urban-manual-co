'use client';

import { useState, useEffect } from 'react';
import { Clock, CalendarCheck, ChevronDown } from 'lucide-react';
import { predictAvailability, type AvailabilityPrediction } from '@/lib/trip-intelligence';

interface AvailabilityAlertProps {
  placeName: string;
  category?: string | null;
  scheduledTime?: string | null;
  scheduledDate?: string | null;
  popularity?: number;
  onTimeChange?: (time: string) => void;
  compact?: boolean;
  className?: string;
}

export default function AvailabilityAlert({
  placeName,
  category,
  scheduledTime,
  scheduledDate,
  popularity,
  onTimeChange,
  compact = false,
  className = '',
}: AvailabilityAlertProps) {
  const [expanded, setExpanded] = useState(false);
  const [prediction, setPrediction] = useState<AvailabilityPrediction | null>(null);

  useEffect(() => {
    if (!scheduledTime) {
      setPrediction(null);
      return;
    }

    let dayOfWeek: number | undefined;
    if (scheduledDate) {
      const date = new Date(scheduledDate);
      if (!isNaN(date.getTime())) {
        dayOfWeek = date.getDay();
      }
    }

    const result = predictAvailability(category, scheduledTime, dayOfWeek, popularity);
    setPrediction(result);
  }, [category, scheduledTime, scheduledDate, popularity]);

  // Don't show if no prediction or minimal wait
  if (!prediction || (!prediction.hasWait && !prediction.requiresReservation)) {
    return null;
  }

  // Compact mode: simple inline badge
  if (compact) {
    if (prediction.waitMinutes <= 15 && !prediction.requiresReservation) {
      return null;
    }

    return (
      <span className={`text-[10px] text-stone-400 ${className}`}>
        {prediction.requiresReservation ? (
          <span className="flex items-center gap-1">
            <CalendarCheck className="w-3 h-3" />
            Reservation
          </span>
        ) : prediction.waitMinutes > 30 ? (
          <span className="text-orange-500">~{prediction.waitMinutes}m wait</span>
        ) : (
          <span>~{prediction.waitMinutes}m wait</span>
        )}
      </span>
    );
  }

  // Only show expanded view for significant waits
  if (prediction.waitMinutes <= 20 && !prediction.requiresReservation) {
    return null;
  }

  return (
    <div className={`text-xs ${className}`}>
      {/* Clickable header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          {prediction.requiresReservation ? (
            <>
              <CalendarCheck className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-stone-500">Reservation recommended</span>
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span className={prediction.waitMinutes > 30 ? 'text-orange-500' : 'text-stone-500'}>
                {prediction.waitLabel}
              </span>
            </>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-stone-300 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="pb-2 space-y-2">
          {prediction.suggestion && (
            <p className="text-[11px] text-stone-500 leading-relaxed">
              {prediction.suggestion}
            </p>
          )}

          {/* Alternative time */}
          {prediction.alternativeTime && onTimeChange && (
            <button
              onClick={() => onTimeChange(prediction.alternativeTime!)}
              className="flex items-center gap-2 text-[11px] text-stone-900 dark:text-white hover:underline"
            >
              <span>→</span>
              <span>Try {prediction.alternativeTime}</span>
              {prediction.alternativeTimeWait !== undefined && prediction.alternativeTimeWait < prediction.waitMinutes && (
                <span className="text-stone-400">
                  ({prediction.alternativeTimeWait < 10 ? 'no wait' : `~${prediction.alternativeTimeWait}m`})
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
