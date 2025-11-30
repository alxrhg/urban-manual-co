'use client';

import { useMemo, useRef, useState, useCallback } from 'react';
import { format, isToday, addMinutes } from 'date-fns';
import { Plane, Utensils, Camera, Car, Moon, MapPin, Clock, Plus, Edit2, Eye, Sunrise, Sun, Sunset } from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

export type EventType = 'flight' | 'meal' | 'activity' | 'transport' | 'hotel';

// Time period grouping
export type TimePeriod = 'morning' | 'afternoon' | 'evening';

interface TimelineEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes: number;
  type: EventType;
  item?: EnrichedItineraryItem;
  address?: string;
}

interface TimelineDayProps {
  date: Date;
  events: TimelineEvent[];
  startHour?: number;  // First hour to show (default 6)
  endHour?: number;    // Last hour to show (default 23)
  hourHeightPx?: number;
  mode?: 'view' | 'edit'; // View mode: clean, Edit mode: full controls
  showTimeGroups?: boolean; // Group by Morning/Afternoon/Evening
  collapseEmptyHours?: boolean;
  onEventClick?: (event: TimelineEvent) => void;
  onTimeSlotClick?: (time: Date) => void;
  onEventMove?: (eventId: string, newStartTime: Date) => void;
  onEventResize?: (eventId: string, newDurationMinutes: number) => void;
  onModeChange?: (mode: 'view' | 'edit') => void;
  className?: string;
}

// Default durations by event type (in minutes)
const DEFAULT_DURATIONS: Record<EventType, number> = {
  flight: 120,
  meal: 60,
  activity: 90,
  transport: 30,
  hotel: 480, // 8 hours for overnight
};

// Colors by event type (following gray palette design system)
const EVENT_COLORS: Record<EventType, { bg: string; border: string; text: string; icon: string }> = {
  flight: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    icon: 'text-blue-500',
  },
  meal: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-700 dark:text-orange-300',
    icon: 'text-orange-500',
  },
  activity: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-300',
    icon: 'text-green-500',
  },
  transport: {
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    icon: 'text-gray-500',
  },
  hotel: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-700',
    text: 'text-gray-800 dark:text-gray-200',
    icon: 'text-gray-600 dark:text-gray-400',
  },
};

// Icons by event type
const EVENT_ICONS: Record<EventType, React.ComponentType<{ className?: string }>> = {
  flight: Plane,
  meal: Utensils,
  activity: Camera,
  transport: Car,
  hotel: Moon,
};

// Time period icons
const PERIOD_ICONS: Record<TimePeriod, React.ComponentType<{ className?: string }>> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
};

// Get time period for an hour
function getTimePeriod(hour: number): TimePeriod {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// Period display info
const PERIOD_INFO: Record<TimePeriod, { label: string; range: string }> = {
  morning: { label: 'Morning', range: '6 AM – 12 PM' },
  afternoon: { label: 'Afternoon', range: '12 PM – 5 PM' },
  evening: { label: 'Evening', range: '5 PM – 11 PM' },
};

/**
 * TimelineDay - Visualizes a single day's activities with time-based layout
 * Features: hour grid, event blocks, now indicator, view/edit modes, time grouping
 */
export default function TimelineDay({
  date,
  events,
  startHour = 6,
  endHour = 23,
  hourHeightPx = 60,
  mode = 'view',
  showTimeGroups = false,
  collapseEmptyHours = false,
  onEventClick,
  onTimeSlotClick,
  onEventMove,
  onEventResize,
  onModeChange,
  className = '',
}: TimelineDayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [longPressEvent, setLongPressEvent] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const totalHours = endHour - startHour + 1;
  const totalHeight = totalHours * hourHeightPx;

  // Generate hour labels
  const hours = useMemo(() => {
    const result: number[] = [];
    for (let h = startHour; h <= endHour; h++) {
      result.push(h);
    }
    return result;
  }, [startHour, endHour]);

  // Group events by time period
  const eventsByPeriod = useMemo(() => {
    const grouped: Record<TimePeriod, TimelineEvent[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };

    events.forEach(event => {
      const period = getTimePeriod(event.startTime.getHours());
      grouped[period].push(event);
    });

    return grouped;
  }, [events]);

  // Calculate now indicator position
  const nowPosition = useMemo(() => {
    if (!isToday(date)) return null;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (currentHour < startHour || currentHour > endHour) return null;

    const hourOffset = currentHour - startHour;
    const minuteOffset = currentMinute / 60;
    return (hourOffset + minuteOffset) * hourHeightPx;
  }, [date, startHour, endHour, hourHeightPx]);

  // Calculate event positions
  const positionedEvents = useMemo(() => {
    return events.map(event => {
      const eventHour = event.startTime.getHours();
      const eventMinute = event.startTime.getMinutes();

      // Clamp to visible range
      const clampedHour = Math.max(startHour, Math.min(endHour, eventHour));
      const hourOffset = clampedHour - startHour + (eventMinute / 60);
      const top = hourOffset * hourHeightPx;

      // Calculate height based on duration
      const duration = event.durationMinutes || DEFAULT_DURATIONS[event.type];
      const height = (duration / 60) * hourHeightPx;

      return {
        ...event,
        top,
        height: Math.max(height, 30), // Minimum height of 30px
      };
    });
  }, [events, startHour, endHour, hourHeightPx]);

  // Handle clicking on empty time slot
  const handleContainerClick = (e: React.MouseEvent) => {
    if (!onTimeSlotClick || !containerRef.current || mode === 'view') return;

    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hourOffset = y / hourHeightPx;
    const hour = Math.floor(startHour + hourOffset);
    const minute = Math.round((hourOffset % 1) * 60 / 15) * 15; // Snap to 15 min

    const clickedTime = addMinutes(new Date(date), hour * 60 + minute);
    clickedTime.setHours(hour, minute, 0, 0);
    onTimeSlotClick(clickedTime);
  };

  // Long press handling for view mode quick actions
  const handleLongPressStart = useCallback((eventId: string) => {
    if (mode !== 'view') return;
    longPressTimer.current = setTimeout(() => {
      setLongPressEvent(eventId);
    }, 500);
  }, [mode]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Format time for display
  const formatTime = (d: Date) => format(d, 'h:mm a');

  // Render grouped view
  if (showTimeGroups) {
    return (
      <div className={`${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-2">
          <div>
            <h3 className="text-sm font-medium text-black dark:text-white">
              {format(date, 'EEEE')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {format(date, 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isToday(date) && (
              <span className="px-2 py-0.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-medium">
                Today
              </span>
            )}
            {onModeChange && (
              <button
                onClick={() => onModeChange(mode === 'view' ? 'edit' : 'view')}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={mode === 'view' ? 'Switch to edit mode' : 'Switch to view mode'}
              >
                {mode === 'view' ? (
                  <Edit2 className="w-4 h-4 text-gray-400" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-400" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Time Period Groups */}
        <div className="space-y-4">
          {(['morning', 'afternoon', 'evening'] as TimePeriod[]).map(period => {
            const periodEvents = eventsByPeriod[period];
            const PeriodIcon = PERIOD_ICONS[period];
            const info = PERIOD_INFO[period];

            if (periodEvents.length === 0 && collapseEmptyHours) return null;

            return (
              <div key={period} className="space-y-2">
                {/* Period Header */}
                <div className="flex items-center gap-2 px-2">
                  <PeriodIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {info.label}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {info.range}
                  </span>
                </div>

                {/* Period Events */}
                <div className="space-y-2 pl-6">
                  {periodEvents.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                      No events
                    </p>
                  ) : (
                    periodEvents.map(event => {
                      const colors = EVENT_COLORS[event.type];
                      const Icon = EVENT_ICONS[event.type];

                      return (
                        <div
                          key={event.id}
                          onClick={() => onEventClick?.(event)}
                          className={`
                            p-3 rounded-xl border ${colors.border} ${colors.bg}
                            ${mode === 'view' ? 'cursor-pointer' : 'cursor-move'}
                            hover:shadow-md transition-shadow
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className={`w-4 h-4 mt-0.5 ${colors.icon}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${colors.text}`}>
                                {event.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {formatTime(event.startTime)}
                                {event.endTime && ` – ${formatTime(event.endTime)}`}
                              </p>
                              {event.address && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate flex items-center gap-1">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  {event.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Add button in edit mode */}
                  {mode === 'edit' && (
                    <button
                      onClick={() => {
                        const hour = period === 'morning' ? 9 : period === 'afternoon' ? 14 : 19;
                        const time = new Date(date);
                        time.setHours(hour, 0, 0, 0);
                        onTimeSlotClick?.(time);
                      }}
                      className="w-full p-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-400 hover:border-gray-400 dark:hover:border-gray-600 hover:text-gray-500 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add to {info.label.toLowerCase()}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render standard timeline view
  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div>
          <h3 className="text-sm font-medium text-black dark:text-white">
            {format(date, 'EEEE')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {format(date, 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isToday(date) && (
            <span className="px-2 py-0.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-medium">
              Today
            </span>
          )}
          {onModeChange && (
            <button
              onClick={() => onModeChange(mode === 'view' ? 'edit' : 'view')}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={mode === 'view' ? 'Switch to edit mode' : 'Switch to view mode'}
            >
              {mode === 'view' ? (
                <Edit2 className="w-4 h-4 text-gray-400" />
              ) : (
                <Eye className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Timeline container */}
      <div
        ref={containerRef}
        className="relative border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900"
        style={{ height: totalHeight }}
        onClick={handleContainerClick}
      >
        {/* Hour grid lines */}
        {hours.map((hour, index) => (
          <div
            key={hour}
            className="absolute left-0 right-0 flex"
            style={{ top: index * hourHeightPx }}
          >
            {/* Hour label */}
            <div className="w-14 flex-shrink-0 pr-2 text-right">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 relative -top-2">
                {format(new Date().setHours(hour, 0), 'h a')}
              </span>
            </div>
            {/* Grid line */}
            <div className="flex-1 border-t border-gray-100 dark:border-gray-800" />
          </div>
        ))}

        {/* Now indicator */}
        {nowPosition !== null && (
          <div
            className="absolute left-14 right-0 z-20 pointer-events-none"
            style={{ top: nowPosition }}
          >
            <div className="relative flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <div className="flex-1 h-0.5 bg-red-500" />
            </div>
          </div>
        )}

        {/* Events */}
        <div className="absolute left-14 right-2 top-0 bottom-0">
          {positionedEvents.map(event => {
            const colors = EVENT_COLORS[event.type];
            const Icon = EVENT_ICONS[event.type];
            const showQuickActions = longPressEvent === event.id;

            return (
              <div
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
                onMouseDown={() => handleLongPressStart(event.id)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={() => handleLongPressStart(event.id)}
                onTouchEnd={handleLongPressEnd}
                className={`
                  absolute left-0 right-0 p-2 rounded-xl
                  border ${colors.border} ${colors.bg}
                  ${mode === 'view' ? 'cursor-pointer' : 'cursor-move'}
                  hover:shadow-md transition-shadow
                  overflow-hidden
                `}
                style={{
                  top: event.top,
                  height: event.height,
                  minHeight: 30,
                }}
              >
                <div className="flex items-start gap-2 h-full">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${colors.icon}`} />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className={`text-xs font-medium truncate ${colors.text}`}>
                      {event.title}
                    </p>
                    {event.height > 40 && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatTime(event.startTime)}
                        {event.endTime && ` – ${formatTime(event.endTime)}`}
                      </p>
                    )}
                    {event.height > 60 && event.address && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {event.address}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick actions on long press (view mode) */}
                {showQuickActions && (
                  <div className="absolute inset-0 bg-black/80 rounded-xl flex items-center justify-center gap-3">
                    <button className="p-2 bg-white rounded-full">
                      <Edit2 className="w-4 h-4 text-gray-900" />
                    </button>
                  </div>
                )}

                {/* Resize handle (edit mode) */}
                {mode === 'edit' && event.height > 40 && (
                  <div className="absolute left-2 right-2 bottom-0 h-3 flex items-center justify-center cursor-ns-resize opacity-0 hover:opacity-100 transition-opacity">
                    <div className="w-8 h-1 rounded-full bg-gray-400 dark:bg-gray-500" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Quick add buttons between hours (edit mode) */}
          {mode === 'edit' && hours.slice(0, -1).map((hour, index) => (
            <button
              key={`add-${hour}`}
              onClick={(e) => {
                e.stopPropagation();
                const time = new Date(date);
                time.setHours(hour, 30, 0, 0);
                onTimeSlotClick?.(time);
              }}
              className="absolute left-0 right-0 h-6 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
              style={{ top: (index + 0.5) * hourHeightPx - 12 }}
            >
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] text-gray-500 group-hover:bg-gray-200 dark:group-hover:bg-gray-700">
                <Plus className="w-3 h-3" />
                Add
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {events.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No events scheduled
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {mode === 'edit' ? 'Tap a time slot to add an event' : 'Switch to edit mode to add events'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to convert itinerary items to timeline events
export function itemToTimelineEvent(
  item: EnrichedItineraryItem,
  date: Date,
  type?: EventType
): TimelineEvent | null {
  // Parse time from item
  const timeStr = item.time;
  if (!timeStr) return null;

  // Parse time like "10:00 AM" or "14:30"
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!timeMatch) return null;

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const meridiem = timeMatch[3]?.toUpperCase();

  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  const startTime = new Date(date);
  startTime.setHours(hours, minutes, 0, 0);

  // Determine event type
  const eventType: EventType = type ||
    (item.parsedNotes?.type as EventType) ||
    inferEventType(item);

  // Get duration
  const durationMinutes = item.parsedNotes?.durationMinutes ||
    item.parsedNotes?.duration ||
    DEFAULT_DURATIONS[eventType];

  const endTime = addMinutes(startTime, durationMinutes);

  return {
    id: item.id,
    title: item.title || item.destination?.name || 'Event',
    startTime,
    endTime,
    durationMinutes,
    type: eventType,
    item,
    address: item.destination?.formatted_address || undefined,
  };
}

// Infer event type from item data
function inferEventType(item: EnrichedItineraryItem): EventType {
  const category = item.destination?.category?.toLowerCase() || '';
  const title = (item.title || '').toLowerCase();

  if (category.includes('hotel') || category.includes('lodging')) return 'hotel';
  if (category.includes('restaurant') || category.includes('cafe') || category.includes('food')) return 'meal';
  if (category.includes('airport') || title.includes('flight')) return 'flight';
  if (category.includes('transit') || category.includes('station')) return 'transport';

  return 'activity';
}
