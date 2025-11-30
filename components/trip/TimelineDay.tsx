'use client';

import { useMemo, useRef } from 'react';
import { format, isToday, differenceInMinutes, startOfDay, addMinutes } from 'date-fns';
import { Plane, Utensils, Camera, Car, Moon, MapPin, Clock } from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

export type EventType = 'flight' | 'meal' | 'activity' | 'transport' | 'hotel';

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
  onEventClick?: (event: TimelineEvent) => void;
  onTimeSlotClick?: (time: Date) => void;
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

/**
 * TimelineDay - Visualizes a single day's activities with time-based layout
 * Features: hour grid, event blocks, now indicator, click handlers
 */
export default function TimelineDay({
  date,
  events,
  startHour = 6,
  endHour = 23,
  hourHeightPx = 60,
  onEventClick,
  onTimeSlotClick,
  className = '',
}: TimelineDayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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
    if (!onTimeSlotClick || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hourOffset = y / hourHeightPx;
    const hour = Math.floor(startHour + hourOffset);
    const minute = Math.round((hourOffset % 1) * 60 / 15) * 15; // Snap to 15 min

    const clickedTime = addMinutes(startOfDay(date), hour * 60 + minute);
    onTimeSlotClick(clickedTime);
  };

  // Format time for display
  const formatTime = (d: Date) => format(d, 'h:mm a');

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
        {isToday(date) && (
          <span className="px-2 py-0.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-[10px] font-medium">
            Today
          </span>
        )}
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

            return (
              <div
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
                className={`
                  absolute left-0 right-0 p-2 rounded-xl
                  border ${colors.border} ${colors.bg}
                  cursor-pointer hover:shadow-md transition-shadow
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
              </div>
            );
          })}
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
              Tap a time slot to add an event
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
