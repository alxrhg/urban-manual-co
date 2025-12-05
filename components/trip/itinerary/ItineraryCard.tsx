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
  Clock,
  ExternalLink,
} from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { ItineraryItemNotes } from '@/types/trip';

interface ItineraryCardProps {
  item: EnrichedItineraryItem;
  isActive?: boolean;
  onClick?: () => void;
  onUpdateNotes?: (itemId: string, notes: Record<string, unknown>) => void;
  className?: string;
}

// Color scheme for different item types - monochromatic with info accent for transport
// Per design system: only use colors for status (green/yellow/red/blue for info)
const typeColors: Record<string, { border: string; bg: string; text: string }> = {
  flight: {
    // Blue for transport/info items per design system
    border: 'border-l-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
  },
  hotel: {
    // Gray for accommodations (no purple - forbidden)
    border: 'border-l-gray-400 dark:border-l-gray-500',
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    text: 'text-gray-600 dark:text-gray-400',
  },
  restaurant: {
    // Gray for dining
    border: 'border-l-stone-400 dark:border-l-stone-500',
    bg: 'bg-stone-50 dark:bg-gray-800/50',
    text: 'text-stone-600 dark:text-gray-400',
  },
  bar: {
    border: 'border-l-stone-400 dark:border-l-stone-500',
    bg: 'bg-stone-50 dark:bg-gray-800/50',
    text: 'text-stone-600 dark:text-gray-400',
  },
  cafe: {
    border: 'border-l-stone-400 dark:border-l-stone-500',
    bg: 'bg-stone-50 dark:bg-gray-800/50',
    text: 'text-stone-600 dark:text-gray-400',
  },
  event: {
    // Gray for events
    border: 'border-l-gray-500 dark:border-l-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    text: 'text-gray-600 dark:text-gray-400',
  },
  attraction: {
    // Gray for attractions
    border: 'border-l-stone-500 dark:border-l-stone-400',
    bg: 'bg-stone-50 dark:bg-gray-800/50',
    text: 'text-stone-600 dark:text-gray-400',
  },
  activity: {
    border: 'border-l-stone-400 dark:border-l-stone-500',
    bg: 'bg-stone-50 dark:bg-gray-800/50',
    text: 'text-stone-600 dark:text-gray-400',
  },
  place: {
    border: 'border-l-stone-300 dark:border-l-gray-600',
    bg: 'bg-stone-50 dark:bg-gray-800/50',
    text: 'text-stone-600 dark:text-gray-400',
  },
};

// Get type color scheme, with fallback
function getTypeColors(itemType: string, category?: string) {
  // Check category first (for destinations)
  if (category && typeColors[category]) {
    return typeColors[category];
  }
  return typeColors[itemType] || typeColors.place;
}

// Format time for display
function formatTime(timeStr?: string | null): string | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours)) return timeStr;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes?.toString().padStart(2, '0')} ${period}`;
}

/**
 * ItineraryCard - Unified visual card with color-coded left border
 * Used for: flights, hotels, restaurants, attractions, bars, events
 */
export default function ItineraryCard({
  item,
  isActive = false,
  onClick,
  onUpdateNotes,
  className = '',
}: ItineraryCardProps) {
  const itemType = item.parsedNotes?.type || 'place';

  // Route to specialized card based on type
  switch (itemType) {
    case 'flight':
      return <FlightCard item={item} isActive={isActive} onClick={onClick} onUpdateNotes={onUpdateNotes} className={className} />;
    case 'hotel':
      return <HotelCard item={item} isActive={isActive} onClick={onClick} className={className} />;
    case 'event':
      return <EventCard item={item} isActive={isActive} onClick={onClick} className={className} />;
    default:
      return <PlaceCard item={item} isActive={isActive} onClick={onClick} className={className} />;
  }
}

// ============================================================================
// Inline Edit Field for Flight Details
// ============================================================================

function InlineEditField({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onSave(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <span className="inline-flex items-center" onClick={(e) => e.stopPropagation()}>
        <span className="text-stone-400 mr-1">{label}</span>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.toUpperCase())}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-12 bg-white dark:bg-gray-800 border border-stone-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs font-mono text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-stone-400"
          placeholder={placeholder}
        />
      </span>
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className="cursor-text hover:bg-stone-200 dark:hover:bg-gray-700 px-1 py-0.5 rounded transition-colors"
      title="Click to edit"
    >
      {label} {value || <span className="text-stone-400">---</span>}
    </span>
  );
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
  const colors = getTypeColors('flight');

  // Parse airport codes
  const parseAirport = (value?: string) => {
    if (!value) return { code: '---', name: '' };
    const parts = value.split(/[-–—]/);
    const code = parts[0]?.trim().toUpperCase().slice(0, 3) || '---';
    const name = parts[1]?.trim() || parts[0]?.trim() || '';
    return { code, name };
  };

  const origin = parseAirport(notes?.from);
  const destination = parseAirport(notes?.to);
  const duration = notes?.duration || '--';
  const flightNumber = notes?.flightNumber
    ? `${notes?.airline || ''} ${notes.flightNumber}`.trim()
    : notes?.airline || '--';

  const handleUpdateField = (field: string, value: string) => {
    if (onUpdateNotes) {
      onUpdateNotes(item.id, { [field]: value });
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl bg-white dark:bg-gray-900/80 border-l-4 border border-t border-r border-b overflow-hidden cursor-pointer transition-all
        ${colors.border}
        ${isActive
          ? 'border-t-stone-900 border-r-stone-900 border-b-stone-900 dark:border-t-white dark:border-r-white dark:border-b-white ring-1 ring-stone-900/10 dark:ring-white/10'
          : 'border-t-stone-200 border-r-stone-200 border-b-stone-200 dark:border-t-gray-800 dark:border-r-gray-800 dark:border-b-gray-800 hover:border-t-stone-300 hover:border-r-stone-300 hover:border-b-stone-300 dark:hover:border-t-gray-700 dark:hover:border-r-gray-700 dark:hover:border-b-gray-700'
        }
        ${className}
      `}
    >
      {/* Flight Header */}
      <div className="px-4 pt-4 pb-3">
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide mb-4 ${colors.text}`}>
          <Plane className="w-3.5 h-3.5" />
          <span>Flight to {destination.name || destination.code}</span>
        </div>

        {/* Route Display */}
        <div className="flex items-center justify-between">
          {/* Origin */}
          <div>
            <div className="text-3xl font-bold text-stone-900 dark:text-white tracking-tight">
              {origin.code}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              {origin.name || 'Departure'}
            </div>
            <div className="text-sm font-semibold text-stone-900 dark:text-white mt-1">
              {notes?.departureTime || '--:--'}
            </div>
          </div>

          {/* Flight Path */}
          <div className="flex-1 flex flex-col items-center px-4">
            <div className="text-xs text-stone-500 dark:text-gray-400 mb-1">{duration}</div>
            <div className="w-full flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <div className="flex-1 h-px bg-gradient-to-r from-blue-300 to-blue-400 dark:from-blue-600 dark:to-blue-500 relative">
                <Plane className="w-4 h-4 text-blue-500 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="w-2 h-2 rounded-full bg-blue-400" />
            </div>
            <div className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded text-xs text-blue-600 dark:text-blue-400 font-medium mt-2">
              {flightNumber}
            </div>
          </div>

          {/* Destination */}
          <div className="text-right">
            <div className="text-3xl font-bold text-stone-900 dark:text-white tracking-tight">
              {destination.code}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              {destination.name || 'Arrival'}
            </div>
            <div className="text-sm font-semibold text-stone-900 dark:text-white mt-1">
              {notes?.arrivalTime || '--:--'}
            </div>
          </div>
        </div>
      </div>

      {/* Footer with editable details */}
      <div className="px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-gray-400 font-mono">
          <InlineEditField
            label="Terminal:"
            value={notes?.terminal || ''}
            placeholder="T1"
            onSave={(v) => handleUpdateField('terminal', v)}
          />
          <InlineEditField
            label="Gate:"
            value={notes?.gate || ''}
            placeholder="A1"
            onSave={(v) => handleUpdateField('gate', v)}
          />
          <InlineEditField
            label="Seat:"
            value={notes?.seatNumber || ''}
            placeholder="1A"
            onSave={(v) => handleUpdateField('seatNumber', v)}
          />
        </div>
        <ChevronRight className="w-4 h-4 text-stone-400" />
      </div>
    </div>
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
  const colors = getTypeColors('hotel');
  const image = item.destination?.image || item.parsedNotes?.image;
  const checkInTime = notes?.checkInTime || item.time;
  const nights = notes?.checkInDate && notes?.checkOutDate
    ? Math.ceil((new Date(notes.checkOutDate).getTime() - new Date(notes.checkInDate).getTime()) / (1000 * 60 * 60 * 24))
    : 1;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-2xl overflow-hidden transition-all border-l-4
        bg-white dark:bg-gray-900 border border-t border-r border-b
        ${colors.border}
        ${isActive
          ? 'border-t-stone-900 border-r-stone-900 border-b-stone-900 dark:border-t-white dark:border-r-white dark:border-b-white ring-1 ring-stone-900/10 dark:ring-white/10'
          : 'border-t-stone-200 border-r-stone-200 border-b-stone-200 dark:border-t-gray-800 dark:border-r-gray-800 dark:border-b-gray-800 hover:border-t-stone-300 hover:border-r-stone-300 hover:border-b-stone-300 dark:hover:border-t-gray-700 dark:hover:border-r-gray-700 dark:hover:border-b-gray-700'
        }
        ${className}
      `}
    >
      {/* Image */}
      {image && (
        <div className="relative h-28 w-full">
          <Image
            src={image}
            alt={item.title || 'Hotel'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {/* Badges */}
          <div className="absolute bottom-3 left-4 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-black/70 text-white text-xs font-medium">
              {nights} {nights === 1 ? 'night' : 'nights'}
            </span>
            {notes?.breakfastIncluded && (
              <span className="px-2 py-0.5 rounded-full bg-black/70 text-white text-xs font-medium">
                Breakfast
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Type Label */}
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${colors.text}`}>
          <Building2 className="w-3.5 h-3.5" />
          <span>Hotel</span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-stone-900 dark:text-white text-base leading-tight">
              {item.title || 'Hotel'}
            </h4>
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
              {checkInTime ? `Check-in ${formatTime(checkInTime)}` : 'Check-in time not set'}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0 mt-1" />
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
  const colors = getTypeColors('event');
  const image = item.destination?.image || item.parsedNotes?.image;
  const time = notes?.eventTime || item.time;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-2xl overflow-hidden transition-all border-l-4
        bg-white dark:bg-gray-900 border border-t border-r border-b
        ${colors.border}
        ${isActive
          ? 'border-t-stone-900 border-r-stone-900 border-b-stone-900 dark:border-t-white dark:border-r-white dark:border-b-white ring-1 ring-stone-900/10 dark:ring-white/10'
          : 'border-t-stone-200 border-r-stone-200 border-b-stone-200 dark:border-t-gray-800 dark:border-r-gray-800 dark:border-b-gray-800 hover:border-t-stone-300 hover:border-r-stone-300 hover:border-b-stone-300 dark:hover:border-t-gray-700 dark:hover:border-r-gray-700 dark:hover:border-b-gray-700'
        }
        ${className}
      `}
    >
      {/* Time badge */}
      {time && (
        <div className="absolute top-3 right-3 z-10">
          <span className="text-sm font-medium text-stone-700 dark:text-gray-300 bg-white/90 dark:bg-gray-900/90 px-2 py-0.5 rounded-md backdrop-blur-sm">
            {formatTime(time)}
          </span>
        </div>
      )}

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
              <span className="px-2 py-0.5 rounded-full bg-black/70 text-white text-xs font-medium capitalize">
                {notes.eventType}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Type Label */}
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${colors.text}`}>
          <Ticket className="w-3.5 h-3.5" />
          <span>Event</span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-stone-900 dark:text-white text-base leading-tight">
              {item.title || 'Event'}
            </h4>
            {notes?.venue && (
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
                {notes.venue}
              </p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0 mt-1" />
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
  const category = item.parsedNotes?.category || item.destination?.category || 'place';
  const time = item.time;
  const itemType = item.parsedNotes?.type || category;
  const colors = getTypeColors(itemType, category);

  // Get category display label
  const getCategoryLabel = (cat: string): string => {
    const labels: Record<string, string> = {
      restaurant: 'Restaurant',
      bar: 'Bar',
      cafe: 'Cafe',
      attraction: 'Attraction',
      hotel: 'Hotel',
      place: 'Place',
    };
    return labels[cat] || cat.replace(/_/g, ' ');
  };

  // Get category icon
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'restaurant':
        return <UtensilsCrossed className="w-3.5 h-3.5" />;
      case 'bar':
        return <Wine className="w-3.5 h-3.5" />;
      case 'cafe':
        return <Coffee className="w-3.5 h-3.5" />;
      default:
        return <MapPin className="w-3.5 h-3.5" />;
    }
  };

  const formattedTime = formatTime(time);

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-2xl bg-white dark:bg-gray-900/80 border-l-4 border border-t border-r border-b overflow-hidden cursor-pointer transition-all
        ${colors.border}
        ${isActive
          ? 'border-t-stone-900 border-r-stone-900 border-b-stone-900 dark:border-t-white dark:border-r-white dark:border-b-white ring-1 ring-stone-900/10 dark:ring-white/10'
          : 'border-t-stone-200 border-r-stone-200 border-b-stone-200 dark:border-t-gray-800 dark:border-r-gray-800 dark:border-b-gray-800 hover:border-t-stone-300 hover:border-r-stone-300 hover:border-b-stone-300 dark:hover:border-t-gray-700 dark:hover:border-r-gray-700 dark:hover:border-b-gray-700'
        }
        ${className}
      `}
    >
      {/* Time badge */}
      {formattedTime && (
        <div className="absolute top-3 right-3 z-10">
          <span className="text-sm font-medium text-stone-700 dark:text-gray-300 bg-white/90 dark:bg-gray-900/90 px-2 py-0.5 rounded-md backdrop-blur-sm">
            {formattedTime}
          </span>
        </div>
      )}

      {/* Image */}
      {image && (
        <div className="relative h-28 w-full">
          <Image
            src={image}
            alt={item.title || 'Place'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Type Label */}
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${colors.text}`}>
          {getCategoryIcon(category)}
          <span>{getCategoryLabel(category)}</span>
        </div>

        {/* Title */}
        <h4 className="font-semibold text-stone-900 dark:text-white text-base leading-tight mb-1">
          {item.title || 'Place'}
        </h4>

        {/* Subtitle / Address */}
        {(item.destination?.micro_description || item.parsedNotes?.address) && (
          <p className="text-xs text-stone-500 dark:text-gray-400 line-clamp-1">
            {item.destination?.micro_description || item.parsedNotes?.address}
          </p>
        )}
      </div>
    </div>
  );
}
