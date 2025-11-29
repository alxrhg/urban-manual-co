'use client';

import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronDown, Calendar, List } from 'lucide-react';
import TimelineView from './TimelineView';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TimelineDayViewProps {
  dayNumber: number;
  date: string | null;
  items: EnrichedItineraryItem[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onEventClick?: (eventId: string) => void;
  onEventEdit?: (eventId: string) => void;
  className?: string;
}

/**
 * TimelineDayView - A day section with visual timeline
 * Combines day header with the timeline view for a complete day representation
 */
export default function TimelineDayView({
  dayNumber,
  date,
  items,
  isExpanded = true,
  onToggleExpand,
  onEventClick,
  onEventEdit,
  className = '',
}: TimelineDayViewProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');

  const formattedDate = useMemo(() => {
    if (!date) return null;
    try {
      return format(parseISO(date), 'EEEE, MMMM d');
    } catch {
      return null;
    }
  }, [date]);

  const itemCount = items.length;

  return (
    <div
      className={`
        bg-white dark:bg-stone-900
        border border-stone-200 dark:border-stone-700
        rounded-2xl overflow-hidden
        ${className}
      `}
    >
      {/* Day Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-3 flex-1"
        >
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
            <span className="text-lg font-light text-stone-900 dark:text-white">
              Day {dayNumber}
            </span>
            {formattedDate && (
              <span className="text-xs text-stone-500 dark:text-stone-400">
                {formattedDate}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
              {itemCount} {itemCount === 1 ? 'stop' : 'stops'}
            </span>
            <ChevronDown
              className={`
                w-4 h-4 text-stone-400 transition-transform duration-200
                ${isExpanded ? 'rotate-0' : '-rotate-90'}
              `}
            />
          </div>
        </button>

        {/* View Mode Toggle */}
        {isExpanded && items.length > 0 && (
          <div className="flex items-center gap-1 ml-3 p-0.5 bg-stone-100 dark:bg-stone-800 rounded-lg">
            <button
              onClick={() => setViewMode('timeline')}
              className={`
                p-1.5 rounded-md transition-colors
                ${viewMode === 'timeline'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }
              `}
              title="Timeline view"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`
                p-1.5 rounded-md transition-colors
                ${viewMode === 'list'
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }
              `}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-stone-400 dark:text-stone-500">
                No stops planned for this day
              </p>
            </div>
          ) : viewMode === 'timeline' ? (
            <TimelineView
              itineraryItems={items}
              date={date}
              onEventClick={onEventClick}
              onEventEdit={onEventEdit}
            />
          ) : (
            // List view placeholder - you can replace with existing TripDaySection content
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => onEventClick?.(item.id)}
                  className="p-3 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-stone-400 dark:text-stone-500 tabular-nums">
                      {item.time || '--:--'}
                    </span>
                    <span className="font-medium text-stone-900 dark:text-white">
                      {item.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
