'use client';

import { memo, useMemo } from 'react';
import { TripTimelineMarker } from './TripTimelineMarker';
import { TripTimelineItem } from './TripTimelineItem';
import { formatDuration, formatMinutesToTime, formatTimeDisplay } from '@/lib/utils/time-calculations';
import type { CategoryType } from './config';

export interface TimelineEvent {
  id: string;
  title: string;
  subtitle?: string;
  category?: CategoryType | string;
  imageUrl?: string;
  /** Start time in minutes from midnight (e.g., 540 = 9:00 AM) */
  startMinutes: number;
  /** Duration in minutes */
  durationMinutes: number;
}

interface TripTimelineProps {
  events: TimelineEvent[];
  activeEventId?: string | null;
  onEventClick?: (event: TimelineEvent) => void;
  className?: string;
}

/**
 * TripTimeline - Complete timeline view with markers and event cards
 * Features: vertical timeline markers, time/duration display, event cards
 */
function TripTimelineComponent({
  events,
  activeEventId,
  onEventClick,
  className = '',
}: TripTimelineProps) {
  // Sort events by start time
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.startMinutes - b.startMinutes);
  }, [events]);

  if (sortedEvents.length === 0) {
    return (
      <div className={`py-8 text-center ${className}`}>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No events scheduled
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-0 ${className}`}>
      {sortedEvents.map((event, index) => {
        const isFirst = index === 0;
        const isLast = index === sortedEvents.length - 1;
        const isActive = event.id === activeEventId;

        // Format time display
        const timeStr = formatTimeDisplay(formatMinutesToTime(event.startMinutes));
        const durationStr = formatDuration(event.durationMinutes);

        return (
          <div key={event.id} className="flex items-stretch">
            {/* Timeline marker column */}
            <TripTimelineMarker
              time={timeStr}
              duration={durationStr}
              isFirst={isFirst}
              isLast={isLast}
              isActive={isActive}
            />

            {/* Event card column */}
            <div className="flex-1 pb-4">
              <TripTimelineItem
                id={event.id}
                title={event.title}
                subtitle={event.subtitle}
                category={event.category}
                imageUrl={event.imageUrl}
                isActive={isActive}
                onClick={() => onEventClick?.(event)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const TripTimeline = memo(TripTimelineComponent);
