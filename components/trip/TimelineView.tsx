'use client';

import { useState, useEffect, useMemo } from 'react';
import TimelineEventCard, {
  TimelineEventType,
  TimelineSubItem,
} from './TimelineEventCard';
import {
  parseTimeToMinutes,
  formatMinutesToTime,
  estimateDuration,
} from '@/lib/utils/time-calculations';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

// Height of one hour in pixels
const HOUR_HEIGHT = 80;

// Timeline hours range
const START_HOUR = 6;
const END_HOUR = 23;

export interface TimelineEvent {
  id: string;
  title: string;
  startTime: string; // HH:MM format
  duration: number; // in minutes
  type?: TimelineEventType;
  icon?: string;
  subItems?: TimelineSubItem[];
  scheduledItems?: number;
  isHotel?: boolean;
  isAutoExpanded?: boolean;
}

interface TimelineViewProps {
  events?: TimelineEvent[];
  itineraryItems?: EnrichedItineraryItem[];
  date?: string | null;
  showCurrentTime?: boolean;
  isEditMode?: boolean;
  onEventClick?: (eventId: string) => void;
  onEventEdit?: (eventId: string) => void;
  onTimeChange?: (eventId: string, time: string) => void;
  onToggleSubItem?: (eventId: string, subItemId: string) => void;
  className?: string;
}

/**
 * Map category to timeline event type
 */
function getCategoryType(category?: string, itemType?: string): TimelineEventType {
  // Check itemType first (from parsedNotes.type)
  if (itemType === 'hotel') return 'hotel';
  if (itemType === 'flight' || itemType === 'train' || itemType === 'drive') return 'travel';
  if (itemType === 'breakfast') return 'meal';

  if (!category) return 'default';

  const lowerCategory = category.toLowerCase();

  if (lowerCategory.includes('restaurant') || lowerCategory.includes('cafe') || lowerCategory.includes('breakfast') || lowerCategory.includes('lunch') || lowerCategory.includes('dinner')) {
    return 'meal';
  }
  if (lowerCategory.includes('museum') || lowerCategory.includes('gallery') || lowerCategory.includes('landmark')) {
    return 'leisure';
  }
  if (lowerCategory.includes('hotel') || lowerCategory.includes('lodging')) {
    return 'hotel';
  }
  if (lowerCategory.includes('flight') || lowerCategory.includes('train') || lowerCategory.includes('drive')) {
    return 'travel';
  }
  if (lowerCategory.includes('bar') || lowerCategory.includes('club') || lowerCategory.includes('spa')) {
    return 'leisure';
  }
  if (lowerCategory.includes('shop') || lowerCategory.includes('market')) {
    return 'task';
  }

  return 'default';
}

/**
 * Map category to emoji icon
 */
function getCategoryIcon(category?: string, type?: string): string {
  if (type === 'flight') return '✈️';
  if (type === 'train') return '🚄';
  if (type === 'hotel') return '🏨';
  if (type === 'breakfast') return '🥐';
  if (type === 'drive') return '🚗';

  if (!category) return '📍';

  const lowerCategory = category.toLowerCase();

  if (lowerCategory.includes('restaurant')) return '🍽️';
  if (lowerCategory.includes('cafe') || lowerCategory.includes('coffee')) return '☕';
  if (lowerCategory.includes('bar') || lowerCategory.includes('cocktail')) return '🍸';
  if (lowerCategory.includes('museum')) return '🏛️';
  if (lowerCategory.includes('gallery')) return '🎨';
  if (lowerCategory.includes('park') || lowerCategory.includes('garden')) return '🌳';
  if (lowerCategory.includes('beach')) return '🏖️';
  if (lowerCategory.includes('shop') || lowerCategory.includes('market')) return '🛍️';
  if (lowerCategory.includes('spa') || lowerCategory.includes('wellness')) return '💆';
  if (lowerCategory.includes('landmark') || lowerCategory.includes('monument')) return '🗼';

  return '📍';
}

/**
 * TimelineView - Visual timeline with hourly grid and event cards
 * Similar to calendar apps with hour markers on the left
 */
export default function TimelineView({
  events = [],
  itineraryItems = [],
  date,
  showCurrentTime = true,
  isEditMode = false,
  onEventClick,
  onEventEdit,
  onTimeChange,
  onToggleSubItem,
  className = '',
}: TimelineViewProps) {
  const [currentTime, setCurrentTime] = useState<string>('');

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Convert itinerary items to timeline events
  const timelineEvents = useMemo((): TimelineEvent[] => {
    // If events are passed directly, use them (but still apply hotel expansion)
    let eventsList: TimelineEvent[] = [];

    if (events.length > 0) {
      eventsList = events;
    } else {
      // Convert itinerary items to timeline events
      eventsList = itineraryItems
        .filter((item) => item.time) // Only items with time
        .map((item): TimelineEvent => {
          const category = item.parsedNotes?.category || item.destination?.category;
          const itemType = item.parsedNotes?.type;
          const isHotel = itemType === 'hotel' || category?.toLowerCase().includes('hotel') || category?.toLowerCase().includes('lodging');

          return {
            id: item.id,
            title: item.title,
            startTime: item.time || '09:00',
            duration: item.parsedNotes?.duration || estimateDuration(category),
            type: getCategoryType(category, itemType),
            icon: getCategoryIcon(category, itemType),
            isHotel,
          };
        });
    }

    // Sort events by start time
    eventsList.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

    // Auto-expand hotel durations to fill time until next event
    return eventsList.map((event, index): TimelineEvent => {
      if (event.isHotel || event.type === 'hotel') {
        const nextEvent = eventsList[index + 1];
        if (nextEvent) {
          const hotelStartMinutes = parseTimeToMinutes(event.startTime);
          const nextStartMinutes = parseTimeToMinutes(nextEvent.startTime);
          const expandedDuration = nextStartMinutes - hotelStartMinutes;

          // Only expand if next event is later
          if (expandedDuration > event.duration) {
            return {
              ...event,
              duration: expandedDuration,
              isAutoExpanded: true,
            };
          }
        } else {
          // No next event - expand until end of day (23:00)
          const hotelStartMinutes = parseTimeToMinutes(event.startTime);
          const endOfDayMinutes = END_HOUR * 60;
          const expandedDuration = endOfDayMinutes - hotelStartMinutes;

          if (expandedDuration > event.duration) {
            return {
              ...event,
              duration: expandedDuration,
              isAutoExpanded: true,
            };
          }
        }
      }
      return event;
    });
  }, [events, itineraryItems]);

  // Generate hour markers
  const hours = useMemo(() => {
    const result: string[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      result.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return result;
  }, []);

  // Calculate position for an event based on time
  const getEventPosition = (startTime: string) => {
    const minutes = parseTimeToMinutes(startTime);
    const startMinutes = START_HOUR * 60;
    const offsetMinutes = minutes - startMinutes;
    return (offsetMinutes / 60) * HOUR_HEIGHT;
  };

  // Calculate height for an event based on duration
  const getEventHeight = (duration: number) => {
    return Math.max((duration / 60) * HOUR_HEIGHT, 48); // Minimum height of 48px
  };

  // Current time position
  const currentTimePosition = useMemo(() => {
    if (!currentTime) return null;
    const minutes = parseTimeToMinutes(currentTime);
    const startMinutes = START_HOUR * 60;
    const endMinutes = END_HOUR * 60;

    if (minutes < startMinutes || minutes > endMinutes) return null;

    const offsetMinutes = minutes - startMinutes;
    return (offsetMinutes / 60) * HOUR_HEIGHT;
  }, [currentTime]);

  // Check if we should show current time (only for today)
  const shouldShowCurrentTime = useMemo(() => {
    if (!showCurrentTime) return false;
    if (!date) return true; // No date specified, assume today

    const today = new Date().toISOString().split('T')[0];
    return date === today;
  }, [showCurrentTime, date]);

  // Total timeline height
  const timelineHeight = (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT;

  return (
    <div className={`relative ${className}`}>
      <div
        className="relative flex"
        style={{ height: timelineHeight }}
      >
        {/* Hour markers column */}
        <div className="w-14 flex-shrink-0 relative">
          {hours.map((hour, index) => (
            <div
              key={hour}
              className="absolute right-0 pr-3 -translate-y-1/2"
              style={{ top: index * HOUR_HEIGHT }}
            >
              <span className="text-xs text-stone-400 dark:text-stone-500 tabular-nums font-medium">
                {hour}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline grid and events */}
        <div className="flex-1 relative border-l border-stone-200 dark:border-stone-700">
          {/* Hour grid lines */}
          {hours.map((hour, index) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-stone-100 dark:border-stone-800"
              style={{ top: index * HOUR_HEIGHT }}
            />
          ))}

          {/* Current time indicator */}
          {shouldShowCurrentTime && currentTimePosition !== null && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: currentTimePosition }}
            >
              {/* Time label */}
              <div className="absolute -left-14 -translate-y-1/2">
                <span className="text-xs font-semibold text-rose-500 dark:text-rose-400 tabular-nums">
                  {currentTime}
                </span>
              </div>
              {/* Line with dot */}
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 dark:bg-rose-400 -ml-[5px]" />
                <div className="flex-1 h-[2px] bg-rose-500 dark:bg-rose-400" />
              </div>
            </div>
          )}

          {/* Events */}
          <div className="relative z-10">
            {timelineEvents.map((event) => {
              const top = getEventPosition(event.startTime);
              const height = getEventHeight(event.duration);

              // Skip events outside visible range
              if (top < 0 || top > timelineHeight) return null;

              return (
                <div
                  key={event.id}
                  className="absolute left-2 right-2"
                  style={{ top, minHeight: height }}
                >
                  <TimelineEventCard
                    id={event.id}
                    title={event.title}
                    icon={event.icon}
                    time={event.startTime}
                    duration={event.duration}
                    type={event.type}
                    subItems={event.subItems}
                    scheduledItems={event.scheduledItems}
                    isEditMode={isEditMode}
                    isAutoExpanded={event.isAutoExpanded}
                    onClick={onEventClick}
                    onEdit={onEventEdit}
                    onTimeChange={onTimeChange}
                    onToggleSubItem={onToggleSubItem}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
