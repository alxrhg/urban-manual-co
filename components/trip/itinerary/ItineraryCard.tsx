'use client';

import React from 'react';
import Image from 'next/image';
import {
  Plane,
  Building2,
  MapPin,
  Ticket,
  Star,
  Globe,
  Navigation,
  ExternalLink,
  Clock,
  Calendar,
} from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface ItineraryCardProps {
  item: EnrichedItineraryItem;
  isActive?: boolean;
  onClick?: () => void;
  onUpdateNotes?: (itemId: string, notes: Record<string, unknown>) => void;
  mapIndex?: number;
  className?: string;
}

/**
 * ItineraryCard - Clean sidebar card design
 */
export default function ItineraryCard({
  item,
  isActive = false,
  onClick,
  onUpdateNotes,
  mapIndex,
  className = '',
}: ItineraryCardProps) {
  const itemType = item.parsedNotes?.type || 'place';

  switch (itemType) {
    case 'flight':
      return <FlightCard item={item} isActive={isActive} onClick={onClick} onUpdateNotes={onUpdateNotes} className={className} />;
    case 'hotel':
      return <HotelCard item={item} isActive={isActive} onClick={onClick} mapIndex={mapIndex} className={className} />;
    case 'event':
      return <EventCard item={item} isActive={isActive} onClick={onClick} mapIndex={mapIndex} className={className} />;
    default:
      return <PlaceCard item={item} isActive={isActive} onClick={onClick} mapIndex={mapIndex} className={className} />;
  }
}

// ============================================================================
// Flight Card
// ============================================================================

function FlightCard({
  item,
  isActive,
  onClick,
  onUpdateNotes,
  className,
}: ItineraryCardProps & { onUpdateNotes?: (itemId: string, notes: Record<string, unknown>) => void }) {
  const notes = item.parsedNotes;

  const parseAirport = (value?: string) => {
    if (!value) return { code: '---', name: '' };
    const parts = value.split(/[-–—]/);
    const code = parts[0]?.trim().toUpperCase().slice(0, 3) || '---';
    const name = parts[1]?.trim() || parts[0]?.trim() || '';
    return { code, name };
  };

  const origin = parseAirport(notes?.from);
  const destination = parseAirport(notes?.to);
  const duration = notes?.duration || '';
  const flightNumber = notes?.flightNumber
    ? `${notes?.airline || ''} ${notes.flightNumber}`.trim()
    : notes?.airline || '';

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl bg-white dark:bg-gray-900 border overflow-hidden cursor-pointer transition-all
        ${isActive
          ? 'border-stone-300 dark:border-gray-600 shadow-lg'
          : 'border-stone-200 dark:border-gray-800 hover:shadow-md'
        }
        ${className}
      `}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-stone-100 dark:border-gray-800">
        <div className="flex items-center gap-2 text-stone-400 dark:text-gray-500 text-xs uppercase tracking-wide mb-1">
          <Plane className="w-3.5 h-3.5" />
          <span>Flight</span>
        </div>
        <h3 className="font-semibold text-stone-900 dark:text-white">
          {origin.code} → {destination.code}
        </h3>
        {flightNumber && (
          <p className="text-sm text-stone-500 dark:text-gray-400">{flightNumber}</p>
        )}
      </div>

      {/* Flight Route */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Departure */}
          <div className="flex-1">
            <p className="text-xs text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">Departure</p>
            <p className="text-2xl font-bold text-stone-900 dark:text-white">{origin.code}</p>
            <p className="text-xs text-stone-500 dark:text-gray-400 truncate">{origin.name || 'Origin'}</p>
            {notes?.departureTime && (
              <p className="text-sm font-medium text-stone-900 dark:text-white mt-1">{notes.departureTime}</p>
            )}
          </div>

          {/* Flight path indicator */}
          <div className="flex flex-col items-center px-2">
            {duration && (
              <span className="text-xs text-stone-400 dark:text-gray-500 mb-1">{duration}</span>
            )}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-gray-600" />
              <div className="w-12 h-px bg-stone-200 dark:bg-gray-700" />
              <Plane className="w-3 h-3 text-stone-400 dark:text-gray-500" />
              <div className="w-12 h-px bg-stone-200 dark:bg-gray-700" />
              <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-gray-600" />
            </div>
          </div>

          {/* Arrival */}
          <div className="flex-1 text-right">
            <p className="text-xs text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">Arrival</p>
            <p className="text-2xl font-bold text-stone-900 dark:text-white">{destination.code}</p>
            <p className="text-xs text-stone-500 dark:text-gray-400 truncate">{destination.name || 'Destination'}</p>
            {notes?.arrivalTime && (
              <p className="text-sm font-medium text-stone-900 dark:text-white mt-1">{notes.arrivalTime}</p>
            )}
          </div>
        </div>

        {/* Flight details */}
        {(notes?.terminal || notes?.gate || notes?.seatNumber) && (
          <div className="flex gap-4 mt-4 pt-4 border-t border-stone-100 dark:border-gray-800">
            {notes?.terminal && (
              <div>
                <p className="text-xs text-stone-400 dark:text-gray-500">Terminal</p>
                <p className="text-sm font-medium text-stone-900 dark:text-white">{notes.terminal}</p>
              </div>
            )}
            {notes?.gate && (
              <div>
                <p className="text-xs text-stone-400 dark:text-gray-500">Gate</p>
                <p className="text-sm font-medium text-stone-900 dark:text-white">{notes.gate}</p>
              </div>
            )}
            {notes?.seatNumber && (
              <div>
                <p className="text-xs text-stone-400 dark:text-gray-500">Seat</p>
                <p className="text-sm font-medium text-stone-900 dark:text-white">{notes.seatNumber}</p>
              </div>
            )}
          </div>
        )}

        {/* Confirmation */}
        {notes?.confirmationNumber && (
          <div className="mt-4 pt-4 border-t border-stone-100 dark:border-gray-800">
            <p className="text-xs text-stone-400 dark:text-gray-500">Confirmation #</p>
            <p className="text-sm font-mono font-medium text-stone-900 dark:text-white">{notes.confirmationNumber}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Hotel Card - Matching the screenshot design
// ============================================================================

function HotelCard({
  item,
  isActive,
  onClick,
  mapIndex,
  className,
}: ItineraryCardProps) {
  const notes = item.parsedNotes;
  const image = item.destination?.image || item.parsedNotes?.image;
  const checkInTime = notes?.checkInTime || '15:00';
  const checkOutTime = notes?.checkOutTime || '11:00';
  const rating = item.destination?.rating;
  const address = notes?.address || item.destination?.formatted_address;
  const website = notes?.website || item.destination?.website;
  const description = item.destination?.description || item.destination?.micro_description;

  // Format time for display (e.g., "15:00" -> "15:00")
  const formatTime = (time: string) => {
    if (!time) return '';
    // Already in correct format
    return time;
  };

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl bg-white dark:bg-gray-900 border overflow-hidden cursor-pointer transition-all
        ${isActive
          ? 'border-stone-300 dark:border-gray-600 shadow-lg'
          : 'border-stone-200 dark:border-gray-800 hover:shadow-md'
        }
        ${className}
      `}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 text-stone-400 dark:text-gray-500 text-xs uppercase tracking-wide mb-1">
          <Building2 className="w-3.5 h-3.5" />
          <span>Hotel</span>
        </div>
        <h3 className="font-semibold text-stone-900 dark:text-white text-lg">
          {item.title || 'Hotel'}
        </h3>
        <p className="text-sm text-stone-500 dark:text-gray-400">Hotel</p>
      </div>

      {/* Hero Image */}
      <div className="relative h-44 w-full bg-stone-100 dark:bg-gray-800 mx-4 rounded-xl overflow-hidden" style={{ width: 'calc(100% - 32px)' }}>
        {image ? (
          <Image
            src={image}
            alt={item.title || 'Hotel'}
            fill
            className="object-cover"
            sizes="400px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Building2 className="w-12 h-12 text-stone-300 dark:text-gray-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Rating badge */}
        {rating && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-800/80 backdrop-blur-sm">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium text-white">{rating.toFixed(1)}</span>
          </div>
        )}

        {/* Hotel name overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <h4 className="text-white font-semibold text-base">{item.title || 'Hotel'}</h4>
        </div>
      </div>

      <div className="p-4">
        {/* Action buttons */}
        <div className="flex gap-2 mb-4">
          {website && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(website, '_blank');
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-stone-200 dark:border-gray-700 text-sm text-stone-700 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Globe className="w-4 h-4" />
              Website
            </button>
          )}
          {(item.destination?.latitude && item.destination?.longitude) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const lat = item.destination?.latitude;
                const lng = item.destination?.longitude;
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-stone-200 dark:border-gray-700 text-sm text-stone-700 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Directions
            </button>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-stone-600 dark:text-gray-400 mb-4 line-clamp-3">
            {description}
          </p>
        )}

        {/* Rating row */}
        {rating && (
          <div className="flex items-center justify-between py-3 border-t border-stone-100 dark:border-gray-800">
            <span className="text-sm text-stone-500 dark:text-gray-400">Rating</span>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium text-stone-900 dark:text-white">{rating.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* Address */}
        {address && (
          <div className="flex items-start gap-2 py-3 border-t border-stone-100 dark:border-gray-800">
            <MapPin className="w-4 h-4 text-stone-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-stone-600 dark:text-gray-400">{address}</p>
          </div>
        )}

        {/* YOUR STAY Section */}
        <div className="mt-2 pt-4 border-t border-stone-100 dark:border-gray-800">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-gray-500 mb-3">
            Your Stay
          </p>

          <div className="flex gap-3">
            {/* Check-in */}
            <div className="flex-1 bg-stone-50 dark:bg-gray-800/50 rounded-xl p-3">
              <p className="text-xs text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                Check-in
              </p>
              <p className="text-xl font-semibold text-stone-900 dark:text-white">
                {formatTime(checkInTime)}
              </p>
            </div>

            {/* Check-out */}
            <div className="flex-1 bg-stone-50 dark:bg-gray-800/50 rounded-xl p-3">
              <p className="text-xs text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                Check-out
              </p>
              <p className="text-xl font-semibold text-stone-900 dark:text-white">
                {formatTime(checkOutTime)}
              </p>
            </div>
          </div>
        </div>

        {/* View on Urban Manual link */}
        {item.destination?.slug && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/destinations/${item.destination?.slug}`, '_blank');
            }}
            className="w-full flex items-center justify-center gap-2 mt-4 py-3 text-sm text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View on Urban Manual
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Event Card
// ============================================================================

function EventCard({
  item,
  isActive,
  onClick,
  mapIndex,
  className,
}: ItineraryCardProps) {
  const notes = item.parsedNotes;
  const image = item.destination?.image || item.parsedNotes?.image;

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl bg-white dark:bg-gray-900 border overflow-hidden cursor-pointer transition-all
        ${isActive
          ? 'border-stone-300 dark:border-gray-600 shadow-lg'
          : 'border-stone-200 dark:border-gray-800 hover:shadow-md'
        }
        ${className}
      `}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 text-stone-400 dark:text-gray-500 text-xs uppercase tracking-wide mb-1">
          <Ticket className="w-3.5 h-3.5" />
          <span>Event</span>
        </div>
        <h3 className="font-semibold text-stone-900 dark:text-white text-lg">
          {item.title || 'Event'}
        </h3>
        {notes?.eventType && (
          <p className="text-sm text-stone-500 dark:text-gray-400 capitalize">{notes.eventType}</p>
        )}
      </div>

      {/* Image */}
      {image && (
        <div className="relative h-40 w-full bg-stone-100 dark:bg-gray-800 mx-4 rounded-xl overflow-hidden" style={{ width: 'calc(100% - 32px)' }}>
          <Image
            src={image}
            alt={item.title || 'Event'}
            fill
            className="object-cover"
            sizes="400px"
          />
        </div>
      )}

      <div className="p-4">
        {/* Event Details */}
        <div className="space-y-3">
          {notes?.venue && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-stone-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-stone-600 dark:text-gray-400">{notes.venue}</p>
            </div>
          )}
          {(notes?.eventTime || item.time) && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-400 dark:text-gray-500 flex-shrink-0" />
              <p className="text-sm text-stone-600 dark:text-gray-400">{notes?.eventTime || item.time}</p>
            </div>
          )}
          {notes?.eventDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-stone-400 dark:text-gray-500 flex-shrink-0" />
              <p className="text-sm text-stone-600 dark:text-gray-400">{notes.eventDate}</p>
            </div>
          )}
        </div>

        {/* Confirmation */}
        {notes?.confirmationNumber && (
          <div className="mt-4 pt-4 border-t border-stone-100 dark:border-gray-800">
            <p className="text-xs text-stone-400 dark:text-gray-500">Confirmation #</p>
            <p className="text-sm font-mono font-medium text-stone-900 dark:text-white">{notes.confirmationNumber}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Place Card (Restaurants, Attractions, Bars, etc.)
// ============================================================================

function PlaceCard({
  item,
  isActive,
  onClick,
  mapIndex,
  className,
}: ItineraryCardProps) {
  const image = item.destination?.image || item.destination?.image_thumbnail;
  const category = item.parsedNotes?.category || item.destination?.category;
  const time = item.time;
  const rating = item.destination?.rating;
  const address = item.destination?.formatted_address;
  const description = item.destination?.description || item.destination?.micro_description;
  const website = item.destination?.website;

  // Format time display
  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes?.toString().padStart(2, '0')} ${period}`;
  };

  const formattedTime = formatTime(time);

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl bg-white dark:bg-gray-900 border overflow-hidden cursor-pointer transition-all
        ${isActive
          ? 'border-stone-300 dark:border-gray-600 shadow-lg'
          : 'border-stone-200 dark:border-gray-800 hover:shadow-md'
        }
        ${className}
      `}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 text-stone-400 dark:text-gray-500 text-xs uppercase tracking-wide mb-1">
          <MapPin className="w-3.5 h-3.5" />
          <span>{category?.replace(/_/g, ' ') || 'Place'}</span>
        </div>
        <h3 className="font-semibold text-stone-900 dark:text-white text-lg">
          {item.title || 'Place'}
        </h3>
        {category && (
          <p className="text-sm text-stone-500 dark:text-gray-400 capitalize">{category.replace(/_/g, ' ')}</p>
        )}
      </div>

      {/* Image */}
      {image && (
        <div className="relative h-44 w-full bg-stone-100 dark:bg-gray-800 mx-4 rounded-xl overflow-hidden" style={{ width: 'calc(100% - 32px)' }}>
          <Image
            src={image}
            alt={item.title || 'Place'}
            fill
            className="object-cover"
            sizes="400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Rating badge */}
          {rating && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-800/80 backdrop-blur-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium text-white">{rating.toFixed(1)}</span>
            </div>
          )}

          {/* Title overlay */}
          <div className="absolute bottom-3 left-3 right-3">
            <h4 className="text-white font-semibold text-base">{item.title || 'Place'}</h4>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Action buttons */}
        <div className="flex gap-2 mb-4">
          {website && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(website, '_blank');
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-stone-200 dark:border-gray-700 text-sm text-stone-700 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Globe className="w-4 h-4" />
              Website
            </button>
          )}
          {(item.destination?.latitude && item.destination?.longitude) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const lat = item.destination?.latitude;
                const lng = item.destination?.longitude;
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-stone-200 dark:border-gray-700 text-sm text-stone-700 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Directions
            </button>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-stone-600 dark:text-gray-400 mb-4 line-clamp-3">
            {description}
          </p>
        )}

        {/* Rating row */}
        {rating && (
          <div className="flex items-center justify-between py-3 border-t border-stone-100 dark:border-gray-800">
            <span className="text-sm text-stone-500 dark:text-gray-400">Rating</span>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium text-stone-900 dark:text-white">{rating.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* Time */}
        {formattedTime && (
          <div className="flex items-center justify-between py-3 border-t border-stone-100 dark:border-gray-800">
            <span className="text-sm text-stone-500 dark:text-gray-400">Time</span>
            <span className="text-sm font-medium text-stone-900 dark:text-white">{formattedTime}</span>
          </div>
        )}

        {/* Address */}
        {address && (
          <div className="flex items-start gap-2 py-3 border-t border-stone-100 dark:border-gray-800">
            <MapPin className="w-4 h-4 text-stone-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-stone-600 dark:text-gray-400">{address}</p>
          </div>
        )}

        {/* View on Urban Manual link */}
        {item.destination?.slug && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/destinations/${item.destination?.slug}`, '_blank');
            }}
            className="w-full flex items-center justify-center gap-2 mt-2 py-3 text-sm text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View on Urban Manual
          </button>
        )}
      </div>
    </div>
  );
}
