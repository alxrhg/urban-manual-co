'use client';

import { X, Plane, MapPin, Clock, Calendar, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import type { TimeBlock } from '@/lib/intelligence/types';

interface EventDetailDrawerProps {
  event: TimeBlock | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}

/**
 * EventDetailDrawer - Flight/event detail view
 * Lovably style: serif headers, info grid, route visualizer
 */
export default function EventDetailDrawer({
  event,
  isOpen,
  onClose,
  onEdit,
  onRemove,
}: EventDetailDrawerProps) {
  if (!isOpen || !event) return null;

  const isFlight = event.type === 'flight';

  // Format time range
  const timeRange = [event.startTime, event.endTime].filter(Boolean).join(' - ');

  // Format duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-[#0a0a0a] shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-900">
          <h2 className="font-serif text-xl text-gray-900 dark:text-white">
            {isFlight ? 'Flight Details' : 'Event Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-80px)]">
          {/* Hero Image or Route Visualizer */}
          {isFlight ? (
            <div className="flex justify-between items-center py-8 px-6 bg-gray-50 dark:bg-gray-900/50 my-4 mx-4 rounded-sm">
              <div className="text-center">
                <p className="text-3xl font-serif text-gray-900 dark:text-white">
                  {event.startTime || '--:--'}
                </p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                  Departure
                </p>
              </div>

              <div className="flex-1 flex items-center justify-center px-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="h-px w-12 bg-gray-300 dark:bg-gray-700" />
                  <Plane className="w-5 h-5" />
                  <div className="h-px w-12 bg-gray-300 dark:bg-gray-700" />
                </div>
              </div>

              <div className="text-center">
                <p className="text-3xl font-serif text-gray-900 dark:text-white">
                  {event.endTime || '--:--'}
                </p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                  Arrival
                </p>
              </div>
            </div>
          ) : event.place?.image ? (
            <div className="relative h-48 mx-4 my-4 rounded-sm overflow-hidden">
              <Image
                src={event.place.image}
                alt={event.title}
                fill
                className="object-cover"
              />
            </div>
          ) : null}

          {/* Title */}
          <div className="px-6 py-4">
            <h3 className="font-serif text-2xl text-gray-900 dark:text-white">
              {event.title}
            </h3>
            {event.category && (
              <p className="text-sm text-gray-500 capitalize mt-1">
                {event.category}
              </p>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 p-6 border-t border-gray-100 dark:border-gray-900">
            {/* Time */}
            {timeRange && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-gray-400">
                  Time
                </span>
                <span className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {timeRange}
                </span>
              </div>
            )}

            {/* Duration */}
            {event.durationMinutes && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-gray-400">
                  Duration
                </span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {formatDuration(event.durationMinutes)}
                </span>
              </div>
            )}

            {/* Location */}
            {event.place?.city && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-gray-400">
                  Location
                </span>
                <span className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {event.place.city}
                </span>
              </div>
            )}

            {/* Address */}
            {event.place?.address && (
              <div className="flex flex-col gap-1 col-span-2">
                <span className="text-[10px] uppercase tracking-widest text-gray-400">
                  Address
                </span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {event.place.address}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {event.notes && (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-900">
              <span className="text-[10px] uppercase tracking-widest text-gray-400 block mb-2">
                Notes
              </span>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {event.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="p-6 border-t border-gray-100 dark:border-gray-900 space-y-3">
            {onEdit && (
              <button
                onClick={onEdit}
                className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-sm hover:opacity-90 transition-opacity"
              >
                Edit Details
              </button>
            )}
            {onRemove && (
              <button
                onClick={() => {
                  if (window.confirm(`Remove "${event.title}" from your trip?`)) {
                    onRemove();
                  }
                }}
                className="w-full py-3 text-red-600 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/10 rounded-sm transition-colors"
              >
                Remove from Trip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
