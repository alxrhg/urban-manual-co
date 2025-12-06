'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw, Map, Calendar } from 'lucide-react';
import type { TripNarrative } from '@/types/trip';

interface TripNarrativeCardProps {
  narrative: TripNarrative;
  tripTitle: string;
  startDate?: string;
  endDate?: string;
  onViewItinerary?: () => void;
  onViewMap?: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  className?: string;
}

/**
 * Format date range for display (e.g., "Jan 5-12, 2026")
 */
function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate) return '';

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    if (startDay === endDay) {
      return `${startMonth} ${startDay}, ${year}`;
    }
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }

  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * TripNarrativeCard - O3Pack-inspired trip summary card
 * Shows AI-generated narrative with actions
 */
export default function TripNarrativeCard({
  narrative,
  tripTitle,
  startDate,
  endDate,
  onViewItinerary,
  onViewMap,
  onRegenerate,
  isRegenerating = false,
  className = '',
}: TripNarrativeCardProps) {
  const dateRange = formatDateRange(startDate, endDate);

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Your {dateRange} {tripTitle} vacation plan
        </h3>
      </div>

      {/* Narrative */}
      <div className="px-5 pb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {narrative.summary}
        </p>
      </div>

      {/* Day highlights (if available) */}
      {narrative.dayHighlights && narrative.dayHighlights.length > 0 && (
        <div className="px-5 pb-4">
          <div className="flex flex-wrap gap-2">
            {narrative.dayHighlights.slice(0, 3).map((highlight, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-gray-800 rounded-full text-xs text-gray-600 dark:text-gray-400"
              >
                <span className="text-gray-400 dark:text-gray-500">Day {index + 1}</span>
                {highlight}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 pb-5 flex items-center gap-2">
        {onViewItinerary && (
          <button
            onClick={onViewItinerary}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Calendar className="w-4 h-4" />
            View Itinerary
          </button>
        )}

        {onViewMap && (
          <button
            onClick={onViewMap}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <Map className="w-4 h-4" />
            See Map
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isRegenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            New plan
          </button>
        )}
      </div>
    </div>
  );
}
