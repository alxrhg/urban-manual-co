'use client';

import { Calendar, MapPin, Ticket, ExternalLink, Clock } from 'lucide-react';
import type { ItineraryItemNotes } from '@/types/trip';

interface EventCardProps {
  event: ItineraryItemNotes;
  name?: string;
  compact?: boolean;
}

type EventType = 'concert' | 'show' | 'sports' | 'exhibition' | 'festival' | 'tour' | 'other';

const eventTypeLabels: Record<EventType, string> = {
  concert: 'Concert',
  show: 'Show',
  sports: 'Sports',
  exhibition: 'Exhibition',
  festival: 'Festival',
  tour: 'Tour',
  other: 'Event',
};

const eventTypeColors: Record<EventType, string> = {
  concert: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  show: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  sports: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  exhibition: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  festival: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  tour: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  other: 'bg-stone-100 text-stone-700 dark:bg-gray-800 dark:text-gray-400',
};

/**
 * EventCard - Compact event card with venue-focused design
 * Layout: Event header (name + type) -> Venue & Time -> Ticket info
 */
export default function EventCard({ event, name, compact = true }: EventCardProps) {
  const eventType = (event.eventType || 'other') as EventType;
  const displayName = name || event.name || 'Event';

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Format time for display
  const formatTime = (time?: string) => {
    if (!time) return '';
    return time;
  };

  // Calculate duration if both times are available
  const getDuration = () => {
    if (!event.eventTime || !event.endTime) return null;
    try {
      const [startH, startM] = event.eventTime.split(':').map(Number);
      const [endH, endM] = event.endTime.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;
      const diff = endMins - startMins;
      if (diff <= 0) return null;
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
      if (hours > 0) return `${hours}h`;
      return `${mins}m`;
    } catch {
      return null;
    }
  };

  const duration = getDuration();

  return (
    <div className="p-4 rounded-2xl bg-stone-100 dark:bg-gray-800/50">
      {/* REGION 1: Event Header (Name & Type Badge) */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-stone-900 dark:text-white leading-tight">
          {displayName}
        </h3>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${eventTypeColors[eventType]}`}>
          {eventTypeLabels[eventType]}
        </span>
      </div>

      {/* REGION 2: Venue */}
      {event.venue && (
        <p className="text-xs text-stone-500 dark:text-gray-400 mb-3 flex items-start gap-1.5">
          <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{event.venue}</span>
        </p>
      )}

      {/* REGION 3: Date & Time */}
      <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-gray-300 mb-3">
        <Calendar className="w-3 h-3 text-stone-400" />
        {event.eventDate && <span>{formatDate(event.eventDate)}</span>}
        {event.eventDate && event.eventTime && <span className="text-stone-400">at</span>}
        {event.eventTime && <span>{formatTime(event.eventTime)}</span>}
        {event.endTime && (
          <>
            <span className="text-stone-400 px-0.5">-</span>
            <span>{formatTime(event.endTime)}</span>
          </>
        )}
        {duration && (
          <span className="text-stone-400 flex items-center gap-1 ml-1">
            <Clock className="w-3 h-3" />
            {duration}
          </span>
        )}
      </div>

      {/* REGION 4: Ticket Info & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {event.ticketConfirmation && (
            <p className="text-[10px] text-stone-500 dark:text-gray-400 flex items-center gap-1">
              <Ticket className="w-3 h-3" />
              <span className="font-mono font-medium">{event.ticketConfirmation}</span>
            </p>
          )}
          {event.seatInfo && (
            <p className="text-[10px] text-stone-500 dark:text-gray-400">
              {event.seatInfo}
            </p>
          )}
        </div>

        {/* Actions */}
        {event.ticketUrl && (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
            title="View tickets"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Notes (if any) */}
      {event.notes && (
        <div className="mt-2 pt-2 border-t border-stone-200 dark:border-gray-700">
          <p className="text-[10px] text-stone-500 dark:text-gray-400 line-clamp-2">
            {event.notes}
          </p>
        </div>
      )}
    </div>
  );
}
