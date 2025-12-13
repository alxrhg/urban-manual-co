'use client';

import { useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import {
  MapPin,
  Clock,
  Plane,
  Building2,
  Plus,
  Coffee,
  UtensilsCrossed,
  Wine,
  Camera,
  ShoppingBag,
  Ticket,
  Star,
} from 'lucide-react';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import TransitConnector, { TransitMode } from './TransitConnector';
import { getAirportCoordinates } from '@/lib/utils/airports';

interface ItineraryScrollListProps {
  day?: TripDay;
  activeItemId?: string | null;
  onItemClick?: (item: EnrichedItineraryItem) => void;
  onItemHover?: (item: EnrichedItineraryItem | null) => void;
  onAddItem?: (dayNumber: number) => void;
  onRemoveItem?: (itemId: string) => void;
  registerItemRef?: (itemId: string, element: HTMLElement | null) => void;
  onItemIntersect?: (itemId: string, isIntersecting: boolean) => void;
  useHoverSelection?: boolean; // Desktop: use hover, Mobile: use intersection
}

// Category icons
const CATEGORY_ICONS: Record<string, typeof MapPin> = {
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  bar: Wine,
  museum: Camera,
  attraction: Ticket,
  shopping: ShoppingBag,
  hotel: Building2,
  default: MapPin,
};

/**
 * ItineraryScrollList - Scrollable list of itinerary items with intersection observer
 *
 * Features:
 * - Intersection observer for scroll-linked map sync
 * - Time-sorted items with transit connectors
 * - Category-based icons
 * - Active state highlighting
 */
export function ItineraryScrollList({
  day,
  activeItemId,
  onItemClick,
  onItemHover,
  onAddItem,
  onRemoveItem,
  registerItemRef,
  onItemIntersect,
  useHoverSelection = false,
}: ItineraryScrollListProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemElementsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Set up intersection observer (only for mobile/scroll-based selection)
  useEffect(() => {
    if (!onItemIntersect || useHoverSelection) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const itemId = entry.target.getAttribute('data-item-id');
          if (itemId) {
            onItemIntersect(itemId, entry.isIntersecting);
          }
        });
      },
      {
        root: null,
        rootMargin: '-30% 0px -30% 0px', // Trigger when item is in middle 40% of viewport
        threshold: 0.5,
      }
    );

    // Observe all current elements
    itemElementsRef.current.forEach((element) => {
      observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [onItemIntersect]);

  // Register item ref
  const handleItemRef = useCallback((itemId: string, element: HTMLElement | null) => {
    if (element) {
      itemElementsRef.current.set(itemId, element);
      observerRef.current?.observe(element);
    } else {
      const existingElement = itemElementsRef.current.get(itemId);
      if (existingElement) {
        observerRef.current?.unobserve(existingElement);
      }
      itemElementsRef.current.delete(itemId);
    }
    registerItemRef?.(itemId, element);
  }, [registerItemRef]);

  if (!day) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No day selected
      </div>
    );
  }

  // Sort items by time
  const sortedItems = getSortedItems(day.items);

  // Get date display
  const dateDisplay = day.date
    ? format(parseISO(day.date), 'EEEE, MMMM d')
    : `Day ${day.dayNumber}`;

  return (
    <div className="p-4">
      {/* Day Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Day {day.dayNumber}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {dateDisplay} · {day.items.length} {day.items.length === 1 ? 'stop' : 'stops'}
        </p>
      </div>

      {/* Items List */}
      {sortedItems.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800" />

          <div className="space-y-4">
            {sortedItems.map((item, index) => {
              const nextItem = sortedItems[index + 1];
              const fromLocation = getFromLocation(item);
              const toLocation = nextItem ? getToLocation(nextItem) : undefined;
              const travelMode = (item.parsedNotes?.travelModeToNext as TransitMode) || 'walking';

              return (
                <div key={item.id}>
                  {/* Item Card */}
                  <div
                    ref={(el) => handleItemRef(item.id, el)}
                    data-item-id={item.id}
                    onClick={() => onItemClick?.(item)}
                    onMouseEnter={useHoverSelection ? () => onItemHover?.(item) : undefined}
                    onMouseLeave={useHoverSelection ? () => onItemHover?.(null) : undefined}
                    className={`
                      relative pl-10 cursor-pointer transition-all duration-200
                      ${activeItemId === item.id ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
                    `}
                  >
                    {/* Timeline dot */}
                    <div
                      className={`
                        absolute left-2.5 top-4 w-3 h-3 rounded-full border-2 z-10 transition-colors
                        ${activeItemId === item.id
                          ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
                          : 'bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700'
                        }
                      `}
                    />

                    <ItemCard
                      item={item}
                      isActive={activeItemId === item.id}
                    />
                  </div>

                  {/* Transit Connector */}
                  {nextItem && (
                    <div className="relative pl-10 py-2">
                      <TransitConnector
                        from={fromLocation}
                        to={toLocation}
                        mode={travelMode}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Stop Button */}
          {onAddItem && (
            <div className="relative pl-10 mt-4">
              <div className="absolute left-2.5 top-3 w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-800 z-10" />
              <button
                onClick={() => onAddItem(day.dayNumber)}
                className="w-full py-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add stop
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16">
          <MapPin className="w-10 h-10 mx-auto text-gray-200 dark:text-gray-800 mb-4" />
          <p className="text-gray-400 dark:text-gray-500 mb-6">No stops planned yet</p>
          {onAddItem && (
            <button
              onClick={() => onAddItem(day.dayNumber)}
              className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
            >
              Add your first stop
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Item Card Component
function ItemCard({
  item,
  isActive,
}: {
  item: EnrichedItineraryItem;
  isActive: boolean;
}) {
  const itemType = item.parsedNotes?.type;

  if (itemType === 'flight') {
    return <FlightItemCard item={item} isActive={isActive} />;
  }

  if (itemType === 'hotel') {
    return <HotelItemCard item={item} isActive={isActive} />;
  }

  return <PlaceItemCard item={item} isActive={isActive} />;
}

// Flight Item Card
function FlightItemCard({
  item,
  isActive,
}: {
  item: EnrichedItineraryItem;
  isActive: boolean;
}) {
  const notes = item.parsedNotes;
  const fromCode = notes?.from?.split('-')[0]?.trim().toUpperCase() || '---';
  const toCode = notes?.to?.split('-')[0]?.trim().toUpperCase() || '---';
  const flightNumber = notes?.flightNumber
    ? `${notes?.airline || ''} ${notes.flightNumber}`.trim()
    : notes?.airline || '';

  return (
    <div
      className={`
        rounded-2xl bg-white dark:bg-gray-900 border overflow-hidden transition-all
        ${isActive
          ? 'border-gray-900 dark:border-white ring-2 ring-gray-900/10 dark:ring-white/10 shadow-lg'
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
        }
      `}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
          <Plane className="w-4 h-4" />
          <span>Flight</span>
          {flightNumber && (
            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {flightNumber}
            </span>
          )}
        </div>

        {/* Route */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{fromCode}</div>
            <div className="text-xs text-gray-500 mt-0.5">{notes?.departureTime || '--:--'}</div>
          </div>

          <div className="flex-1 flex items-center px-4">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 mx-2 relative">
              <Plane className="w-3.5 h-3.5 text-gray-400 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" />
            </div>
            <div className="w-2 h-2 rounded-full bg-gray-300" />
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{toCode}</div>
            <div className="text-xs text-gray-500 mt-0.5">{notes?.arrivalTime || '--:--'}</div>
          </div>
        </div>

        {/* Duration */}
        {notes?.duration && (
          <div className="text-center mt-2 text-xs text-gray-400">
            {notes.duration}
          </div>
        )}
      </div>
    </div>
  );
}

// Hotel Item Card
function HotelItemCard({
  item,
  isActive,
}: {
  item: EnrichedItineraryItem;
  isActive: boolean;
}) {
  const notes = item.parsedNotes;
  const checkInTime = notes?.checkInTime || '15:00';
  const checkOutTime = notes?.checkOutTime || '11:00';
  const image = notes?.image || item.destination?.image || item.destination?.image_thumbnail;

  return (
    <div
      className={`
        rounded-2xl bg-white dark:bg-gray-900 border overflow-hidden transition-all
        ${isActive
          ? 'border-gray-900 dark:border-white ring-2 ring-gray-900/10 dark:ring-white/10 shadow-lg'
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
        }
      `}
    >
      {image && (
        <div className="relative h-32 w-full">
          <Image
            src={image}
            alt={item.title || 'Hotel'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
          <Building2 className="w-4 h-4" />
          <span>Hotel</span>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white">
          {item.title || 'Hotel'}
        </h3>

        {notes?.address && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
            {notes.address}
          </p>
        )}

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400">Check-in</span>
            <span className="text-xs text-gray-600 dark:text-gray-300">{checkInTime}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400">Check-out</span>
            <span className="text-xs text-gray-600 dark:text-gray-300">{checkOutTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Place Item Card
function PlaceItemCard({
  item,
  isActive,
}: {
  item: EnrichedItineraryItem;
  isActive: boolean;
}) {
  const image = item.destination?.image || item.destination?.image_thumbnail || item.parsedNotes?.image;
  const category = item.parsedNotes?.category || item.destination?.category || 'attraction';
  const time = item.time;
  const rating = item.destination?.rating;
  const duration = item.parsedNotes?.duration;

  const IconComponent = CATEGORY_ICONS[category] || CATEGORY_ICONS.default;

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${(minutes || 0).toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div
      className={`
        rounded-2xl bg-white dark:bg-gray-900 border overflow-hidden transition-all
        ${isActive
          ? 'border-gray-900 dark:border-white ring-2 ring-gray-900/10 dark:ring-white/10 shadow-lg'
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
        }
      `}
    >
      {image && (
        <div className="relative h-36 w-full">
          <Image
            src={image}
            alt={item.title || 'Place'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          {/* Time badge */}
          {time && (
            <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2.5 py-1 rounded-lg">
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                {formatTime(time)}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <IconComponent className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {item.title || 'Place'}
              </h3>
            </div>

            <p className="text-xs text-gray-500 capitalize mt-1 ml-6">
              {category.replace(/_/g, ' ')}
            </p>
          </div>

          {rating && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Time and duration (if no image) */}
        {!image && (time || duration) && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            {time && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">{formatTime(time)}</span>
              </div>
            )}
            {duration && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <span className="text-xs">{duration} min</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions

function getSortedItems(items: EnrichedItineraryItem[]): EnrichedItineraryItem[] {
  return [...items].sort((a, b) => {
    const timeA = getEffectiveTime(a);
    const timeB = getEffectiveTime(b);
    if (!timeA && !timeB) return 0;
    if (!timeA) return 1;
    if (!timeB) return -1;
    return timeToMinutes(timeA) - timeToMinutes(timeB);
  });
}

function getEffectiveTime(item: EnrichedItineraryItem): string | null {
  if (item.parsedNotes?.type === 'hotel' && item.parsedNotes?.checkInTime) {
    return item.parsedNotes.checkInTime;
  }
  if (item.parsedNotes?.type === 'flight' && item.parsedNotes?.departureTime) {
    return item.parsedNotes.departureTime;
  }
  return item.time || null;
}

function timeToMinutes(timeStr: string): number {
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return 0;
}

function getFromLocation(item: EnrichedItineraryItem) {
  const itemType = item.parsedNotes?.type;
  if (itemType === 'flight') {
    const arrivalAirport = item.parsedNotes?.to;
    if (arrivalAirport) {
      const coords = getAirportCoordinates(arrivalAirport);
      if (coords) return coords;
    }
  }
  const lat = item.destination?.latitude ?? item.parsedNotes?.latitude;
  const lng = item.destination?.longitude ?? item.parsedNotes?.longitude;
  if (lat && lng) return { latitude: lat, longitude: lng };
  return undefined;
}

function getToLocation(item: EnrichedItineraryItem) {
  const itemType = item.parsedNotes?.type;
  if (itemType === 'flight') {
    const departureAirport = item.parsedNotes?.from;
    if (departureAirport) {
      const coords = getAirportCoordinates(departureAirport);
      if (coords) return coords;
    }
  }
  const lat = item.destination?.latitude ?? item.parsedNotes?.latitude;
  const lng = item.destination?.longitude ?? item.parsedNotes?.longitude;
  if (lat && lng) return { latitude: lat, longitude: lng };
  return undefined;
}

export default ItineraryScrollList;
