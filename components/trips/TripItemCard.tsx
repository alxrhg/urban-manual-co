'use client';

import { memo } from 'react';
import Image from 'next/image';
import { 
  GripVertical, 
  Clock, 
  MapPin, 
  Plane, 
  Trash2,
  ChevronRight
} from 'lucide-react';
import { Destination } from '@/types/destination';
import { ItineraryItem, ItineraryItemNotes } from '@/types/trip';
import { getEstimatedDuration, formatDuration } from '@/lib/trip-intelligence';
import AvailabilityAlert from '@/components/trips/AvailabilityAlert';
import FlightStatusCard from '@/components/trips/FlightStatusCard';
import LodgingCard from '@/components/trips/LodgingCard';
import NearbyDiscoveries from '@/components/trips/NearbyDiscoveries';

interface TripItemCardProps {
  item: ItineraryItem & { destination?: Destination; parsedNotes?: ItineraryItemNotes };
  isDragging?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onUpdateTime?: (time: string) => void;
  onRemove?: () => void;
  onView?: () => void;
  onAddPlace?: (destination: Destination) => void;
  currentDayDate?: string | null;
  dragHandleProps?: any;
}

export const TripItemCard = memo(function TripItemCard({
  item,
  isDragging,
  isExpanded,
  onToggleExpand,
  onUpdateTime,
  onRemove,
  onView,
  onAddPlace,
  currentDayDate,
  dragHandleProps
}: TripItemCardProps) {
  const category = item.destination?.category || item.parsedNotes?.category;
  const normalizedCategory = category?.toLowerCase();
  const isFlight = item.parsedNotes?.type === 'flight';
  const isHotel =
    item.parsedNotes?.type === 'hotel' ||
    item.parsedNotes?.isHotel ||
    normalizedCategory === 'hotel';
  const estimatedDuration = getEstimatedDuration(category);

  return (
    <div
      className={`
        group relative rounded-2xl border transition-all duration-200
        ${isDragging ? 'shadow-lg border-black/10 dark:border-white/20 bg-white dark:bg-gray-800 z-10' : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'}
        ${isFlight ? 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' : ''}
      `}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className="mt-2.5 p-1 -m-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 touch-none rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Drag to reorder"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Time Input */}
        <div className="mt-1 flex-shrink-0">
          <div className="relative group/time">
            <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 group-hover/time:text-gray-600 dark:group-hover/time:text-gray-300 pointer-events-none transition-colors" />
            <input
              type="time"
              value={item.time || ''}
              onChange={(e) => onUpdateTime?.(e.target.value)}
              className="w-[88px] pl-6 pr-2 py-1.5 text-xs font-medium text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all text-gray-900 dark:text-gray-100 cursor-pointer"
              placeholder="Set time"
              title="Click to set time"
              aria-label="Activity time"
            />
            {!item.time && (
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 dark:text-gray-500 whitespace-nowrap opacity-0 group-hover/time:opacity-100 transition-opacity">
                Click to set
              </span>
            )}
          </div>
        </div>

        {/* Content Container */}
        <div
          className={`flex-1 min-w-0 flex gap-3 ${!isFlight && onView ? 'cursor-pointer' : ''}`}
          onClick={(e) => {
            // Prevent expanding if clicking controls
            if ((e.target as HTMLElement).closest('input, button')) return;
            if (!isFlight) onView?.();
          }}
        >
          {/* Thumbnail */}
          <div className={`
            relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800
            ${isFlight ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}
          `}>
            {isFlight ? (
              <div className="w-full h-full flex items-center justify-center">
                <Plane className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>
            ) : item.destination?.image || item.destination?.image_thumbnail ? (
              <Image
                src={item.destination.image_thumbnail || item.destination.image || ''}
                alt={item.title}
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-600" />
              </div>
            )}
          </div>

          {/* Info */}
          {isFlight && item.parsedNotes ? (
            <div className="flex-1 min-w-0">
              <FlightStatusCard
                flight={item.parsedNotes}
                departureDate={item.parsedNotes.departureDate}
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0 py-0.5">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {item.title}
              </h4>

              <div className="flex items-center gap-2 mt-0.5">
                {item.description && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                    {item.description}
                  </span>
                )}

                {!isFlight && (
                  <>
                    <span className="w-0.5 h-0.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      ~{formatDuration(estimatedDuration)}
                    </span>
                  </>
                )}
              </div>

              {/* Availability Alert (Compact) */}
              {!isFlight && item.time && (
                <div className="mt-1.5">
                  <AvailabilityAlert
                    placeName={item.title}
                    category={category}
                    scheduledTime={item.time}
                    scheduledDate={currentDayDate}
                    compact
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-1">
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className={`p-1.5 rounded-lg transition-colors ${
                isExpanded 
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' 
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Remove "${item.title}" from this day?`)) {
                onRemove?.();
              }
            }}
            className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 opacity-60 hover:opacity-100"
            title="Remove from itinerary"
            aria-label={`Remove ${item.title} from itinerary`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && !isFlight && (
        <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2 duration-200">
          <div className="pl-[88px] pt-2 border-t border-gray-100 dark:border-gray-800/50">
            {isHotel && (
              <LodgingCard
                hotelName={item.title}
                address={
                  item.destination?.formatted_address ||
                  item.destination?.vicinity ||
                  item.destination?.city ||
                  item.description
                }
                checkInDate={item.parsedNotes?.checkInDate || item.parsedNotes?.arrivalDate}
                checkOutDate={item.parsedNotes?.checkOutDate || item.parsedNotes?.departureDate}
                checkInTime={item.parsedNotes?.checkInTime || item.time || undefined}
                checkOutTime={item.parsedNotes?.checkOutTime}
                confirmationNumber={
                  item.parsedNotes?.hotelConfirmation || item.parsedNotes?.confirmationNumber
                }
              />
            )}
            {!isFlight && item.parsedNotes && onAddPlace && (
              <NearbyDiscoveries
                currentPlace={{
                  name: item.title,
                  latitude: (item.parsedNotes?.latitude ?? item.destination?.latitude) || undefined,
                  longitude: (item.parsedNotes?.longitude ?? item.destination?.longitude) || undefined,
                  city: item.destination?.city,
                }}
                excludeSlugs={[]} // This should be passed from parent if needed
                onAddPlace={onAddPlace}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
});

