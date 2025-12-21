'use client';

import { useMemo } from 'react';
import { AlertTriangle, Clock, Route, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';
import type { EnrichedItineraryItem, TripDay } from '@/lib/hooks/useTripEditor';

interface Conflict {
  type: 'overlap' | 'tight_buffer' | 'long_travel' | 'missing_meal' | 'closure' | 'early_start' | 'late_end';
  severity: 'error' | 'warning' | 'info';
  dayNumber: number;
  message: string;
  details: string;
  affectedItems: string[];
  suggestedFix?: {
    label: string;
    action: () => void;
  };
}

interface ScheduleConflictsProps {
  days: TripDay[];
  onMoveItem?: (itemId: string, toDay: number) => void;
  onUpdateItemTime?: (itemId: string, newTime: string) => void;
  onOptimizeRoute?: (dayNumber: number) => void;
  compact?: boolean;
  className?: string;
}

// Duration estimates by category (minutes)
const DURATION_BY_CATEGORY: Record<string, number> = {
  restaurant: 90,
  cafe: 45,
  bar: 60,
  museum: 120,
  gallery: 90,
  landmark: 45,
  attraction: 90,
  hotel: 30,
  shop: 45,
  flight: 180,
  train: 60,
  default: 60,
};

function getDuration(item: EnrichedItineraryItem): number {
  const noteDuration = item.parsedNotes?.duration;
  if (noteDuration) return noteDuration;

  const category = (item.parsedNotes?.category || item.destination?.category || '').toLowerCase();
  const type = item.parsedNotes?.type;

  if (type === 'flight') return 180;
  if (type === 'hotel') return 30;
  if (type === 'train') return 90;

  for (const [key, duration] of Object.entries(DURATION_BY_CATEGORY)) {
    if (category.includes(key)) return duration;
  }
  return DURATION_BY_CATEGORY.default;
}

function parseTime(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function formatMinutes(mins: number): string {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function estimateTravelTime(item1: EnrichedItineraryItem, item2: EnrichedItineraryItem): number | null {
  const lat1 = item1.destination?.latitude ?? item1.parsedNotes?.latitude;
  const lon1 = item1.destination?.longitude ?? item1.parsedNotes?.longitude;
  const lat2 = item2.destination?.latitude ?? item2.parsedNotes?.latitude;
  const lon2 = item2.destination?.longitude ?? item2.parsedNotes?.longitude;

  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  // Assume walking speed ~4km/h with some buffer
  return Math.ceil(distance * 15);
}

export default function ScheduleConflicts({
  days,
  onMoveItem,
  onUpdateItemTime,
  onOptimizeRoute,
  compact = false,
  className = '',
}: ScheduleConflictsProps) {
  const conflicts = useMemo(() => {
    const result: Conflict[] = [];

    days.forEach(day => {
      const items = day.items.filter(item => {
        const type = item.parsedNotes?.type;
        return type !== 'hotel' || item.parsedNotes?.hotelItemType;
      });

      if (items.length === 0) return;

      // Sort items by time
      const sortedItems = [...items]
        .filter(item => item.time)
        .sort((a, b) => {
          const timeA = parseTime(a.time);
          const timeB = parseTime(b.time);
          if (timeA === null) return 1;
          if (timeB === null) return -1;
          return timeA - timeB;
        });

      // Check for overlaps and tight buffers
      for (let i = 0; i < sortedItems.length - 1; i++) {
        const current = sortedItems[i];
        const next = sortedItems[i + 1];

        const currentStart = parseTime(current.time);
        const nextStart = parseTime(next.time);

        if (currentStart === null || nextStart === null) continue;

        const currentDuration = getDuration(current);
        const currentEnd = currentStart + currentDuration;
        const travelTime = estimateTravelTime(current, next) || 10;

        // Check for overlap
        if (currentEnd > nextStart) {
          const overlapMins = currentEnd - nextStart;
          result.push({
            type: 'overlap',
            severity: 'error',
            dayNumber: day.dayNumber,
            message: `Overlapping activities`,
            details: `${current.title} ends at ${formatMinutes(currentEnd)} but ${next.title} starts at ${formatMinutes(nextStart)}. Overlap: ${formatMinutes(overlapMins)}`,
            affectedItems: [current.id, next.id],
            suggestedFix: onUpdateItemTime ? {
              label: `Start ${current.title} at ${formatMinutes(nextStart - currentDuration - 15)}`,
              action: () => {
                const newStart = nextStart - currentDuration - 15;
                const newHours = Math.floor(newStart / 60);
                const newMins = newStart % 60;
                onUpdateItemTime(current.id, `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`);
              },
            } : undefined,
          });
        }
        // Check for tight buffer (less than travel time + 10 min buffer)
        else if (currentEnd + travelTime + 10 > nextStart) {
          const buffer = nextStart - currentEnd;
          result.push({
            type: 'tight_buffer',
            severity: 'warning',
            dayNumber: day.dayNumber,
            message: `Tight schedule between activities`,
            details: `Only ${formatMinutes(buffer)} between ${current.title} and ${next.title}. Travel time: ~${formatMinutes(travelTime)}`,
            affectedItems: [current.id, next.id],
          });
        }

        // Check for long travel times
        if (travelTime > 30) {
          result.push({
            type: 'long_travel',
            severity: 'info',
            dayNumber: day.dayNumber,
            message: `Long travel time`,
            details: `~${formatMinutes(travelTime)} travel from ${current.title} to ${next.title}`,
            affectedItems: [current.id, next.id],
            suggestedFix: onOptimizeRoute ? {
              label: 'Optimize route',
              action: () => onOptimizeRoute(day.dayNumber),
            } : undefined,
          });
        }
      }

      // Check for missing meals
      const hasMorningMeal = items.some(item => {
        const cat = (item.parsedNotes?.category || item.destination?.category || '').toLowerCase();
        const time = parseTime(item.time);
        return (cat.includes('cafe') || cat.includes('breakfast') || cat.includes('bakery')) &&
               time !== null && time < 11 * 60;
      });

      const hasLunch = items.some(item => {
        const cat = (item.parsedNotes?.category || item.destination?.category || '').toLowerCase();
        const time = parseTime(item.time);
        return cat.includes('restaurant') && time !== null && time >= 11 * 60 && time <= 14 * 60;
      });

      const hasDinner = items.some(item => {
        const cat = (item.parsedNotes?.category || item.destination?.category || '').toLowerCase();
        const time = parseTime(item.time);
        return cat.includes('restaurant') && time !== null && time >= 18 * 60;
      });

      if (items.length >= 3 && !hasLunch) {
        result.push({
          type: 'missing_meal',
          severity: 'info',
          dayNumber: day.dayNumber,
          message: 'No lunch planned',
          details: 'Consider adding a lunch spot between 12:00-14:00',
          affectedItems: [],
        });
      }

      if (items.length >= 4 && !hasDinner) {
        result.push({
          type: 'missing_meal',
          severity: 'info',
          dayNumber: day.dayNumber,
          message: 'No dinner planned',
          details: 'Consider adding a dinner reservation for the evening',
          affectedItems: [],
        });
      }

      // Check for early starts or late ends
      const firstTime = sortedItems.length > 0 ? parseTime(sortedItems[0].time) : null;
      const lastItem = sortedItems.length > 0 ? sortedItems[sortedItems.length - 1] : null;
      const lastEnd = lastItem ? (parseTime(lastItem.time) || 0) + getDuration(lastItem) : null;

      if (firstTime !== null && firstTime < 7 * 60) {
        result.push({
          type: 'early_start',
          severity: 'info',
          dayNumber: day.dayNumber,
          message: 'Early start',
          details: `Day starts at ${formatMinutes(firstTime)} - consider if this is intentional`,
          affectedItems: [sortedItems[0].id],
        });
      }

      if (lastEnd !== null && lastEnd > 23 * 60) {
        result.push({
          type: 'late_end',
          severity: 'info',
          dayNumber: day.dayNumber,
          message: 'Late finish',
          details: `Activities end around ${formatMinutes(lastEnd)}`,
          affectedItems: [lastItem!.id],
        });
      }
    });

    // Sort by severity
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return result.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [days, onUpdateItemTime, onOptimizeRoute]);

  const errorCount = conflicts.filter(c => c.severity === 'error').length;
  const warningCount = conflicts.filter(c => c.severity === 'warning').length;
  const infoCount = conflicts.filter(c => c.severity === 'info').length;

  // No conflicts - show success state
  if (conflicts.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-[13px] font-medium">No schedule conflicts</span>
        </div>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
          Your itinerary looks well-organized!
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`p-3 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-[13px] font-medium text-gray-900 dark:text-white">
            Schedule Analysis
          </span>
        </div>
        <div className="flex items-center gap-3 text-[12px]">
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {errorCount} conflict{errorCount > 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {warningCount} warning{warningCount > 1 ? 's' : ''}
            </span>
          )}
          {infoCount > 0 && (
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {infoCount} suggestion{infoCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-800">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <span className="text-[13px] font-medium text-gray-900 dark:text-white">
          Schedule Analysis
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-[11px]">
          {errorCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              {errorCount} error{errorCount > 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              {warningCount} warning{warningCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {conflicts.map((conflict, index) => (
          <div key={index} className="p-4">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-1 rounded-full ${
                conflict.severity === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                conflict.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                {conflict.type === 'overlap' || conflict.type === 'tight_buffer' ? (
                  <Clock className={`w-3 h-3 ${
                    conflict.severity === 'error' ? 'text-red-600 dark:text-red-400' :
                    conflict.severity === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`} />
                ) : conflict.type === 'long_travel' ? (
                  <Route className={`w-3 h-3 text-blue-600 dark:text-blue-400`} />
                ) : (
                  <Calendar className={`w-3 h-3 text-blue-600 dark:text-blue-400`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] font-medium ${
                    conflict.severity === 'error' ? 'text-red-600 dark:text-red-400' :
                    conflict.severity === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`}>
                    {conflict.message}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Day {conflict.dayNumber}
                  </span>
                </div>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {conflict.details}
                </p>
                {conflict.suggestedFix && (
                  <button
                    onClick={conflict.suggestedFix.action}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {conflict.suggestedFix.label}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
