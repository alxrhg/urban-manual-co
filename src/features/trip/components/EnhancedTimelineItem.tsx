'use client';

import { memo, useState } from 'react';
import {
  MapPin,
  Clock,
  Footprints,
  Car,
  Navigation,
  ChevronDown,
  ChevronUp,
  Star,
  AlertCircle,
  CheckCircle2,
  StickyNote,
  DollarSign,
  ExternalLink,
} from 'lucide-react';
import Image from 'next/image';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface EnhancedTimelineItemProps {
  item: EnrichedItineraryItem;
  index: number;
  totalItems: number;
  nextItem?: EnrichedItineraryItem;
  isExpanded?: boolean;
  isEditMode?: boolean;
  showTravelTime?: boolean;
  onToggle?: () => void;
  onSelect?: () => void;
  onUpdateNotes?: (notes: string) => void;
  className?: string;
}

function parseTime(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function formatMinutesToTime(mins: number): string {
  const hours = Math.floor(mins / 60) % 24;
  const minutes = mins % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatDuration(mins: number): string {
  if (mins < 1) return '<1 min';
  if (mins < 60) return `${Math.round(mins)} min`;
  const hours = Math.floor(mins / 60);
  const minutes = Math.round(mins % 60);
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
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

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

// Duration estimates by category
const DURATION_BY_CATEGORY: Record<string, number> = {
  restaurant: 90,
  cafe: 45,
  bar: 60,
  museum: 120,
  gallery: 90,
  landmark: 45,
  attraction: 90,
  shop: 45,
  flight: 180,
  train: 90,
  hotel: 30,
  default: 60,
};

function getEstimatedDuration(item: EnrichedItineraryItem): number {
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

function getItemIcon(item: EnrichedItineraryItem): React.ReactNode {
  const type = item.parsedNotes?.type;
  const category = (item.destination?.category || '').toLowerCase();

  // Return emoji based on type/category
  if (type === 'flight') return '✈️';
  if (type === 'hotel') return '🏨';
  if (type === 'train') return '🚂';
  if (category.includes('restaurant')) return '🍽️';
  if (category.includes('cafe') || category.includes('coffee')) return '☕';
  if (category.includes('bar')) return '🍸';
  if (category.includes('museum')) return '🏛️';
  if (category.includes('park')) return '🌳';
  if (category.includes('beach')) return '🏖️';
  if (category.includes('shop')) return '🛍️';
  return '📍';
}

function EnhancedTimelineItemComponent({
  item,
  index,
  totalItems,
  nextItem,
  isExpanded = false,
  isEditMode = false,
  showTravelTime = true,
  onToggle,
  onSelect,
  onUpdateNotes,
  className = '',
}: EnhancedTimelineItemProps) {
  const [showNotes, setShowNotes] = useState(false);

  const startTime = parseTime(item.time);
  const duration = getEstimatedDuration(item);
  const endTime = startTime !== null ? startTime + duration : null;
  const type = item.parsedNotes?.type;
  const notes = item.parsedNotes;

  // Calculate travel time to next item
  let travelTime: number | null = null;
  let travelDistance: number | null = null;
  let travelMode: 'walk' | 'drive' = 'walk';

  if (nextItem && showTravelTime) {
    const lat1 = item.destination?.latitude ?? item.parsedNotes?.latitude;
    const lon1 = item.destination?.longitude ?? item.parsedNotes?.longitude;
    const lat2 = nextItem.destination?.latitude ?? nextItem.parsedNotes?.latitude;
    const lon2 = nextItem.destination?.longitude ?? nextItem.parsedNotes?.longitude;

    if (lat1 && lon1 && lat2 && lon2) {
      travelDistance = calculateDistance(lat1, lon1, lat2, lon2);
      travelTime = travelDistance * 15; // ~4km/h walking
      travelMode = travelDistance < 2 ? 'walk' : 'drive';
      if (travelMode === 'drive') {
        travelTime = travelDistance * 3; // ~20km/h in city
      }
    }
  }

  // Status indicators
  const hasConfirmation = notes?.confirmationNumber || notes?.hotelConfirmation || notes?.confirmation;
  const bookingStatus = notes?.bookingStatus;
  const isConfirmed = hasConfirmation || bookingStatus === 'booked';

  return (
    <div className={`relative ${className}`}>
      {/* Timeline connector */}
      <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

      {/* Main item */}
      <div className="relative flex gap-3">
        {/* Timeline dot and time */}
        <div className="flex-shrink-0 flex flex-col items-center z-10">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
            index === 0
              ? 'bg-gray-900 dark:bg-white'
              : index === totalItems - 1
              ? 'bg-green-500'
              : 'bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600'
          }`}>
            {getItemIcon(item)}
          </div>
          {startTime !== null && (
            <div className="mt-1 text-[10px] font-medium text-gray-500 tabular-nums whitespace-nowrap">
              {formatMinutesToTime(startTime)}
            </div>
          )}
        </div>

        {/* Content */}
        <div
          className={`flex-1 pb-4 ${onSelect || onToggle ? 'cursor-pointer' : ''}`}
          onClick={() => onSelect?.() || onToggle?.()}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">
                {item.title || 'Untitled'}
              </h4>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {item.destination?.neighborhood && (
                  <span className="text-[12px] text-gray-500">
                    {item.destination.neighborhood}
                  </span>
                )}
                {item.destination?.rating && (
                  <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {item.destination.rating}
                  </span>
                )}
                {item.destination?.price_level && (
                  <span className="text-[11px] text-gray-400">
                    {'$'.repeat(item.destination.price_level)}
                  </span>
                )}
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-1.5">
              {isConfirmed ? (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="text-[10px] font-medium">Confirmed</span>
                </div>
              ) : bookingStatus === 'pending' ? (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-medium">Pending</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Time range and duration */}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
            {startTime !== null && endTime !== null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatMinutesToTime(startTime)} - {formatMinutesToTime(endTime)}
              </span>
            )}
            <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Expandable details */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
              {/* Confirmation number */}
              {hasConfirmation && (
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="text-gray-500">Confirmation:</span>
                  <span className="font-mono text-gray-900 dark:text-white">
                    {notes?.confirmationNumber || notes?.hotelConfirmation || notes?.confirmation}
                  </span>
                </div>
              )}

              {/* Address */}
              {item.destination?.formatted_address && (
                <div className="flex items-start gap-2 text-[12px]">
                  <MapPin className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {item.destination.formatted_address}
                  </span>
                </div>
              )}

              {/* Website */}
              {item.destination?.website && (
                <a
                  href={item.destination.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[12px] text-blue-600 dark:text-blue-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3" />
                  Visit website
                </a>
              )}

              {/* Notes */}
              {notes?.raw && (
                <div className="flex items-start gap-2 text-[12px]">
                  <StickyNote className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400 italic">
                    {notes.raw}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Toggle button */}
          {onToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="mt-2 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Less details
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  More details
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Travel time connector to next item */}
      {travelTime !== null && index < totalItems - 1 && (
        <div className="relative ml-[11px] pl-6 py-2">
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            {travelMode === 'walk' ? (
              <Footprints className="w-3 h-3" />
            ) : (
              <Car className="w-3 h-3" />
            )}
            <span>{formatDuration(travelTime)}</span>
            {travelDistance !== null && (
              <>
                <span className="text-gray-300">·</span>
                <span>{formatDistance(travelDistance)}</span>
              </>
            )}
            {travelMode === 'walk' ? (
              <span className="text-gray-300">walk</span>
            ) : (
              <span className="text-gray-300">drive</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const EnhancedTimelineItem = memo(EnhancedTimelineItemComponent);
export default EnhancedTimelineItem;
