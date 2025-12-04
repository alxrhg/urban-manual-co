'use client';

import React from 'react';
import Image from 'next/image';
import {
  Plane,
  Building2,
  MapPin,
  UtensilsCrossed,
  Wine,
  Coffee,
  Ticket,
  ChevronRight,
} from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { ItineraryItemNotes } from '@/types/trip';

interface ItineraryCardProps {
  item: EnrichedItineraryItem;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * ItineraryCard - Full visual card with image
 * Used for: flights, hotels, restaurants, attractions, bars, events
 */
export default function ItineraryCard({
  item,
  isActive = false,
  onClick,
  className = '',
}: ItineraryCardProps) {
  const itemType = item.parsedNotes?.type || 'place';

  // Route to specialized card based on type
  switch (itemType) {
    case 'flight':
      return <FlightCard item={item} isActive={isActive} onClick={onClick} className={className} />;
    case 'hotel':
      return <HotelCard item={item} isActive={isActive} onClick={onClick} className={className} />;
    case 'event':
      return <EventCard item={item} isActive={isActive} onClick={onClick} className={className} />;
    default:
      return <PlaceCard item={item} isActive={isActive} onClick={onClick} className={className} />;
  }
}

// ============================================================================
// Flight Card
// ============================================================================

function FlightCard({
  item,
  isActive,
  onClick,
  className,
}: ItineraryCardProps) {
  const notes = item.parsedNotes;

  const parseAirport = (value?: string) => {
    if (!value) return { code: '---', name: '' };
    const parts = value.split(/[-–—]/);
    const code = parts[0]?.trim().toUpperCase().slice(0, 3) || '---';
    const name = parts[1]?.trim() || '';
    return { code, name };
  };

  const origin = parseAirport(notes?.from);
  const destination = parseAirport(notes?.to);
  const flightNumber = notes?.flightNumber
    ? `${notes?.airline || ''} ${notes.flightNumber}`.trim()
    : notes?.airline || '';
  const duration = notes?.duration ? `${Math.floor(notes.duration / 60)}h ${notes.duration % 60}m` : '';

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-2xl overflow-hidden transition-all
        bg-gradient-to-br from-slate-900 to-slate-800
        ${isActive ? 'ring-2 ring-white/20' : 'hover:from-slate-800 hover:to-slate-700'}
        ${className}
      `}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 text-slate-400 text-xs mb-4">
          <Plane className="w-3.5 h-3.5" />
          <span className="uppercase tracking-wide font-medium">{flightNumber || 'Flight'}</span>
          {duration && <span className="ml-auto">{duration}</span>}
        </div>

        {/* Route */}
        <div className="flex items-center">
          {/* Origin */}
          <div className="flex-1">
            <div className="text-3xl font-bold text-white tracking-tight">{origin.code}</div>
            <div className="text-xs text-slate-400 mt-1">{notes?.departureTime || '--:--'}</div>
          </div>

          {/* Flight Path */}
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="w-full flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <div className="flex-1 h-px bg-gradient-to-r from-white/40 via-white/20 to-white/40 relative">
                <Plane className="w-3 h-3 text-white/60 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" />
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
            </div>
          </div>

          {/* Destination */}
          <div className="flex-1 text-right">
            <div className="text-3xl font-bold text-white tracking-tight">{destination.code}</div>
            <div className="text-xs text-slate-400 mt-1">{notes?.arrivalTime || '--:--'}</div>
          </div>
        </div>
      </div>

      {/* Footer Details */}
      {(notes?.terminal || notes?.gate || notes?.seatNumber) && (
        <div className="px-5 py-3 bg-white/5 border-t border-white/10 flex items-center gap-4">
          <div className="flex items-center gap-4 text-xs text-slate-400 font-mono tracking-wider">
            {notes?.terminal && <span>T{notes.terminal}</span>}
            {notes?.gate && <span>Gate {notes.gate}</span>}
            {notes?.seatNumber && <span>Seat {notes.seatNumber}</span>}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 ml-auto" />
        </div>
      )}
    </button>
  );
}

// ============================================================================
// Hotel Card
// ============================================================================

function HotelCard({
  item,
  isActive,
  onClick,
  className,
}: ItineraryCardProps) {
  const notes = item.parsedNotes;
  const image = item.destination?.image || item.parsedNotes?.image;
  const checkInTime = notes?.checkInTime || item.time;
  const nights = notes?.checkInDate && notes?.checkOutDate
    ? Math.ceil((new Date(notes.checkOutDate).getTime() - new Date(notes.checkInDate).getTime()) / (1000 * 60 * 60 * 24))
    : 1;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-2xl overflow-hidden transition-all
        bg-white dark:bg-gray-900 border
        ${isActive
          ? 'border-stone-900 dark:border-white ring-1 ring-stone-900/10 dark:ring-white/10'
          : 'border-stone-200 dark:border-gray-800 hover:border-stone-300 dark:hover:border-gray-700'
        }
        ${className}
      `}
    >
      {/* Image */}
      {image && (
        <div className="relative h-32 w-full">
          <Image
            src={image}
            alt={item.title || 'Hotel'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {/* Nights Badge */}
          <div className="absolute bottom-3 left-4 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
              {nights} {nights === 1 ? 'night' : 'nights'}
            </span>
            {notes?.breakfastIncluded && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/80 text-white text-xs font-medium">
                Breakfast
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {!image && (
            <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-stone-500 dark:text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-stone-900 dark:text-white truncate">
              {item.title || 'Hotel'}
            </h4>
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
              {checkInTime ? `Check-in ${checkInTime}` : 'Check-in time not set'}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Event Card
// ============================================================================

function EventCard({
  item,
  isActive,
  onClick,
  className,
}: ItineraryCardProps) {
  const notes = item.parsedNotes;
  const image = item.destination?.image || item.parsedNotes?.image;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-2xl overflow-hidden transition-all
        bg-white dark:bg-gray-900 border
        ${isActive
          ? 'border-stone-900 dark:border-white ring-1 ring-stone-900/10 dark:ring-white/10'
          : 'border-stone-200 dark:border-gray-800 hover:border-stone-300 dark:hover:border-gray-700'
        }
        ${className}
      `}
    >
      {/* Image */}
      {image && (
        <div className="relative h-28 w-full">
          <Image
            src={image}
            alt={item.title || 'Event'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {notes?.eventType && (
            <div className="absolute bottom-3 left-4">
              <span className="px-2 py-0.5 rounded-full bg-purple-500/80 text-white text-xs font-medium capitalize">
                {notes.eventType}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {!image && (
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <Ticket className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-stone-900 dark:text-white truncate">
              {item.title || 'Event'}
            </h4>
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
              {notes?.venue && `${notes.venue} · `}
              {notes?.eventTime || item.time || 'Time not set'}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Place Card (Restaurants, Attractions, Bars, etc.)
// ============================================================================

function PlaceCard({
  item,
  isActive,
  onClick,
  className,
}: ItineraryCardProps) {
  const image = item.destination?.image || item.destination?.image_thumbnail || item.parsedNotes?.image;
  const category = item.parsedNotes?.category || item.destination?.category || '';
  const time = item.time;

  // Get category icon
  const getCategoryIcon = (cat: string) => {
    const lowerCat = cat.toLowerCase();
    if (lowerCat.includes('restaurant') || lowerCat.includes('food')) return UtensilsCrossed;
    if (lowerCat.includes('bar') || lowerCat.includes('wine')) return Wine;
    if (lowerCat.includes('cafe') || lowerCat.includes('coffee')) return Coffee;
    return MapPin;
  };

  const CategoryIcon = getCategoryIcon(category);

  // Format time
  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes?.toString().padStart(2, '0')} ${period}`;
  };

  const formattedTime = formatTime(time);

  // Check if this is a "featured" destination (has high rating or Michelin stars)
  const isFeatured = item.destination?.michelin_stars || (item.destination?.rating && item.destination.rating >= 4.5);

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-2xl overflow-hidden transition-all
        bg-white dark:bg-gray-900 border
        ${isActive
          ? 'border-stone-900 dark:border-white ring-1 ring-stone-900/10 dark:ring-white/10'
          : 'border-stone-200 dark:border-gray-800 hover:border-stone-300 dark:hover:border-gray-700'
        }
        ${className}
      `}
    >
      {/* Image */}
      {image && (
        <div className="relative h-36 w-full">
          <Image
            src={image}
            alt={item.title || 'Place'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Time Badge */}
          {formattedTime && (
            <div className="absolute top-3 right-3">
              <span className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-xs font-medium text-stone-900 dark:text-white">
                {formattedTime}
              </span>
            </div>
          )}

          {/* Category & Rating */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium capitalize">
              {category.replace(/_/g, ' ') || 'Place'}
            </span>
            {isFeatured && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-white text-xs font-medium">
                {item.destination?.michelin_stars ? (
                  <>{'★'.repeat(item.destination.michelin_stars)}</>
                ) : (
                  <>★ {item.destination?.rating?.toFixed(1)}</>
                )}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {!image && (
            <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <CategoryIcon className="w-5 h-5 text-stone-500 dark:text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-stone-900 dark:text-white truncate">
              {item.title || 'Place'}
            </h4>
            {!image && category && (
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5 capitalize">
                {category.replace(/_/g, ' ')}
                {formattedTime && ` · ${formattedTime}`}
              </p>
            )}
            {image && item.destination?.neighborhood && (
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                {item.destination.neighborhood}
              </p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" />
        </div>
      </div>
    </button>
  );
}
