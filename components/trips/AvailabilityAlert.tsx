'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  CalendarCheck,
  ChevronRight,
  Utensils,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { predictAvailability, type AvailabilityPrediction } from '@/lib/trip-intelligence';

interface Alternative {
  slug: string;
  name: string;
  category?: string;
  waitEstimate?: string;
  distance?: string;
}

interface AvailabilityAlertProps {
  placeName: string;
  category?: string | null;
  scheduledTime?: string | null;
  scheduledDate?: string | null;
  popularity?: number;
  alternatives?: Alternative[];
  onTimeChange?: (time: string) => void;
  onSelectAlternative?: (alternative: Alternative) => void;
  compact?: boolean;
  className?: string;
}

export default function AvailabilityAlert({
  placeName,
  category,
  scheduledTime,
  scheduledDate,
  popularity,
  alternatives = [],
  onTimeChange,
  onSelectAlternative,
  compact = false,
  className = '',
}: AvailabilityAlertProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [prediction, setPrediction] = useState<AvailabilityPrediction | null>(null);

  useEffect(() => {
    if (!scheduledTime) {
      setPrediction(null);
      return;
    }

    // Get day of week from date
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

  // Don't show anything if no prediction or no significant wait
  if (!prediction || (!prediction.hasWait && !prediction.requiresReservation)) {
    return null;
  }

  const getWaitColor = (minutes: number) => {
    if (minutes <= 15) return 'text-green-500';
    if (minutes <= 30) return 'text-yellow-500';
    if (minutes <= 45) return 'text-orange-500';
    return 'text-red-500';
  };

  const getWaitBg = (minutes: number) => {
    if (minutes <= 15) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    if (minutes <= 30) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    if (minutes <= 45) return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  };

  const getDifficultyLabel = (difficulty: AvailabilityPrediction['reservationDifficulty']) => {
    switch (difficulty) {
      case 'easy': return 'Easy to book';
      case 'moderate': return 'Book in advance';
      case 'hard': return 'Book 1-2 weeks ahead';
      case 'very_hard': return 'Book 2-4 weeks ahead';
    }
  };

  // Compact mode: just show a warning badge
  if (compact) {
    if (prediction.waitMinutes <= 15 && !prediction.requiresReservation) {
      return null;
    }

    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {prediction.requiresReservation ? (
          <div className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400">
            <CalendarCheck className="w-3 h-3" />
            <span>Reservation</span>
          </div>
        ) : (
          <div className={`flex items-center gap-1 text-[10px] ${getWaitColor(prediction.waitMinutes)}`}>
            <Clock className="w-3 h-3" />
            <span>~{prediction.waitMinutes}min wait</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-3 ${getWaitBg(prediction.waitMinutes)} ${className}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${prediction.requiresReservation ? 'bg-purple-100 dark:bg-purple-900/50' : 'bg-white dark:bg-gray-900'}`}>
          {prediction.requiresReservation ? (
            <CalendarCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          ) : (
            <Clock className={`w-4 h-4 ${getWaitColor(prediction.waitMinutes)}`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-medium ${prediction.requiresReservation ? 'text-purple-900 dark:text-purple-100' : getWaitColor(prediction.waitMinutes)}`}>
              {prediction.requiresReservation ? 'Reservation Recommended' : prediction.waitLabel}
            </h4>
            {prediction.waitMinutes > 30 && (
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
            )}
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            at {scheduledTime} for {placeName}
          </p>

          {/* Reservation difficulty */}
          {prediction.requiresReservation && (
            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-purple-600 dark:text-purple-400">
              <Sparkles className="w-3 h-3" />
              <span>{getDifficultyLabel(prediction.reservationDifficulty)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Suggestion */}
      {prediction.suggestion && (
        <p className="text-xs text-gray-700 dark:text-gray-300 mt-3 leading-relaxed">
          {prediction.suggestion}
        </p>
      )}

      {/* Alternative time button */}
      {prediction.alternativeTime && onTimeChange && (
        <button
          onClick={() => onTimeChange(prediction.alternativeTime!)}
          className="mt-3 w-full flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-500" />
            <div className="text-left">
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                Try {prediction.alternativeTime} instead
              </span>
              {prediction.alternativeTimeWait !== undefined && (
                <span className="text-[10px] text-green-600 dark:text-green-400 ml-2">
                  {prediction.alternativeTimeWait < 10 ? 'Minimal wait' : `~${prediction.alternativeTimeWait} min wait`}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </button>
      )}

      {/* Alternative places */}
      {alternatives.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowAlternatives(!showAlternatives)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <Utensils className="w-3 h-3" />
            <span>Or try a similar place nearby</span>
            <ChevronRight className={`w-3 h-3 transition-transform ${showAlternatives ? 'rotate-90' : ''}`} />
          </button>

          {showAlternatives && (
            <div className="mt-2 space-y-1.5">
              {alternatives.slice(0, 3).map((alt) => (
                <button
                  key={alt.slug}
                  onClick={() => onSelectAlternative?.(alt)}
                  className="w-full flex items-center gap-3 p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                      {alt.name}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      {alt.waitEstimate && <span className="text-green-500">{alt.waitEstimate}</span>}
                      {alt.distance && <span>{alt.distance}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
