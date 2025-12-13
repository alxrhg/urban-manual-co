'use client';

import React from 'react';
import Image from 'next/image';
import {
  Plane,
  Building2,
  MapPin,
  Ticket,
  ChevronRight,
  Star,
  KeyRound,
  Clock,
  Coffee,
  Phone,
  Globe,
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
 * ItineraryCard - Premium key card design for sidebar view
 * Design: Elegant hotel key card aesthetic matching HotelCard
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
// Map Marker Badge
// ============================================================================

function MapMarkerBadge({ index, isActive }: { index: number; isActive?: boolean }) {
  return (
    <div
      className={`
        w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0
        ${isActive
          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-sm'
        }
      `}
      title={`Stop ${index} on map`}
    >
      {index}
    </div>
  );
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
      <div className="bg-stone-50 dark:bg-gray-800/50 rounded-xl p-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">
          {label}
        </p>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value.toUpperCase())}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-400"
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className="bg-stone-50 dark:bg-gray-800/50 rounded-xl p-3 cursor-text hover:bg-stone-100 dark:hover:bg-gray-800 transition-colors"
      title="Click to edit"
    >
      <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm font-mono font-bold text-stone-900 dark:text-white truncate">
        {value || <span className="text-stone-300 dark:text-gray-600">---</span>}
      </p>
    </div>
  );
}

// ============================================================================
// Flight Card - Boarding pass design
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
  const duration = notes?.duration || '--';
  const flightNumber = notes?.flightNumber
    ? `${notes?.airline || ''} ${notes.flightNumber}`.trim()
    : notes?.airline || '';

  const handleUpdateField = (field: string, value: string) => {
    if (onUpdateNotes) {
      onUpdateNotes(item.id, { [field]: value });
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-lg border cursor-pointer transition-all
        ${isActive
          ? 'border-stone-900 dark:border-white ring-2 ring-stone-900/20 dark:ring-white/20'
          : 'border-stone-200 dark:border-gray-800 hover:shadow-xl'
        }
        ${className}
      `}
    >
      {/* Flight Header with Route */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <Plane className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-gray-500">
              Flight
            </p>
            <p className="text-sm font-medium text-stone-900 dark:text-white">
              {flightNumber || 'Flight Details'}
            </p>
          </div>
        </div>

        {/* Route Display */}
        <div className="flex items-stretch gap-3">
          {/* Origin */}
          <div className="flex-1 bg-gradient-to-br from-blue-50 to-stone-50 dark:from-blue-950/30 dark:to-gray-800/50 rounded-xl p-3 border border-blue-100 dark:border-blue-900/30">
            <p className="text-[10px] font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
              Departure
            </p>
            <p className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">
              {origin.code}
            </p>
            <p className="text-xs text-stone-500 dark:text-gray-400 truncate">
              {origin.name || 'Origin'}
            </p>
            <p className="text-lg font-bold text-stone-900 dark:text-white mt-2">
              {notes?.departureTime || '--:--'}
            </p>
          </div>

          {/* Flight Path */}
          <div className="flex flex-col items-center justify-center px-2">
            <div className="flex-1 w-px bg-gradient-to-b from-blue-300 to-stone-300 dark:from-blue-600 dark:to-gray-600" />
            <div className="my-2 px-2 py-1 rounded-full bg-stone-100 dark:bg-gray-800">
              <Plane className="w-4 h-4 text-stone-500 dark:text-gray-400 rotate-90" />
            </div>
            {duration !== '--' && (
              <div className="px-2 py-1 rounded-full bg-stone-100 dark:bg-gray-800 text-[10px] font-medium text-stone-600 dark:text-gray-300 whitespace-nowrap mb-2">
                {duration}
              </div>
            )}
            <div className="flex-1 w-px bg-gradient-to-b from-stone-300 to-indigo-300 dark:from-gray-600 dark:to-indigo-600" />
          </div>

          {/* Destination */}
          <div className="flex-1 bg-gradient-to-br from-indigo-50 to-stone-50 dark:from-indigo-950/30 dark:to-gray-800/50 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/30">
            <p className="text-[10px] font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-1">
              Arrival
            </p>
            <p className="text-2xl font-bold text-stone-900 dark:text-white tracking-tight">
              {destination.code}
            </p>
            <p className="text-xs text-stone-500 dark:text-gray-400 truncate">
              {destination.name || 'Destination'}
            </p>
            <p className="text-lg font-bold text-stone-900 dark:text-white mt-2">
              {notes?.arrivalTime || '--:--'}
            </p>
          </div>
        </div>
      </div>

      {/* Flight Details Grid */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <InlineEditField
            label="Terminal"
            value={notes?.terminal || ''}
            placeholder="T1"
            onSave={(v) => handleUpdateField('terminal', v)}
          />
          <InlineEditField
            label="Gate"
            value={notes?.gate || ''}
            placeholder="A1"
            onSave={(v) => handleUpdateField('gate', v)}
          />
          <InlineEditField
            label="Seat"
            value={notes?.seatNumber || ''}
            placeholder="1A"
            onSave={(v) => handleUpdateField('seatNumber', v)}
          />
        </div>
      </div>

      {/* Confirmation */}
      {notes?.confirmationNumber && (
        <div className="px-5 pb-4">
          <div className="bg-stone-50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">
              Confirmation
            </p>
            <p className="text-sm font-mono font-bold text-stone-900 dark:text-white">
              {notes.confirmationNumber}
            </p>
          </div>
        </div>
      )}

      {/* Barcode Pattern */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-0.5 h-6 opacity-20 dark:opacity-10">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="bg-stone-900 dark:bg-white"
              style={{
                width: i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px',
                height: '100%',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Hotel Card - Premium key card design
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

  // Format date for display
  const formatDate = (dateStr?: string, format: 'short' | 'full' = 'short') => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (format === 'full') {
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate nights
  const calculateNights = () => {
    if (!notes?.checkInDate || !notes?.checkOutDate) return null;
    try {
      const start = new Date(notes.checkInDate);
      const end = new Date(notes.checkOutDate);
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : null;
    } catch {
      return null;
    }
  };

  const nights = calculateNights();

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-lg border cursor-pointer transition-all
        ${isActive
          ? 'border-stone-900 dark:border-white ring-2 ring-stone-900/20 dark:ring-white/20'
          : 'border-stone-200 dark:border-gray-800 hover:shadow-xl'
        }
        ${className}
      `}
    >
      {/* Hero Image */}
      <div className="relative h-36 w-full bg-stone-200 dark:bg-gray-800">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Map marker badge */}
        {mapIndex && (
          <div className="absolute top-3 left-3">
            <MapMarkerBadge index={mapIndex} isActive={isActive} />
          </div>
        )}

        {/* Rating badge */}
        {rating && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium text-white">{rating.toFixed(1)}</span>
          </div>
        )}

        {/* Hotel name and address overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-lg font-bold text-white mb-0.5">{item.title || 'Hotel'}</h3>
          {address && (
            <p className="text-xs text-white/80 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="line-clamp-1">{address}</span>
            </p>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* YOUR STAY Section */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-gray-500 mb-3">
            Your Stay
          </p>

          {/* Check-in/out timeline */}
          <div className="flex items-stretch gap-3">
            {/* Check-in */}
            <div className="flex-1 bg-gradient-to-br from-green-50 to-stone-50 dark:from-green-950/30 dark:to-gray-800/50 rounded-xl p-3 border border-green-100 dark:border-green-900/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <KeyRound className="w-3 h-3 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-green-600 dark:text-green-400">
                  Check-in
                </p>
              </div>
              <p className="text-lg font-bold text-stone-900 dark:text-white">
                {checkInTime}
              </p>
              <p className="text-xs text-stone-500 dark:text-gray-400">
                {formatDate(notes?.checkInDate, 'full')}
              </p>
            </div>

            {/* Nights indicator */}
            <div className="flex flex-col items-center justify-center px-1">
              <div className="flex-1 w-px bg-gradient-to-b from-green-300 via-stone-300 to-rose-300 dark:from-green-600 dark:via-gray-600 dark:to-rose-600" />
              {nights && (
                <div className="my-2 px-2 py-1 rounded-full bg-stone-100 dark:bg-gray-800 text-[10px] font-medium text-stone-600 dark:text-gray-300 whitespace-nowrap">
                  {nights} {nights === 1 ? 'night' : 'nights'}
                </div>
              )}
              <div className="flex-1 w-px bg-gradient-to-b from-stone-300 to-rose-300 dark:from-gray-600 dark:to-rose-600" />
            </div>

            {/* Check-out */}
            <div className="flex-1 bg-gradient-to-br from-rose-50 to-stone-50 dark:from-rose-950/30 dark:to-gray-800/50 rounded-xl p-3 border border-rose-100 dark:border-rose-900/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                  <Clock className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                </div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-rose-600 dark:text-rose-400">
                  Check-out
                </p>
              </div>
              <p className="text-lg font-bold text-stone-900 dark:text-white">
                {checkOutTime}
              </p>
              <p className="text-xs text-stone-500 dark:text-gray-400">
                {formatDate(notes?.checkOutDate, 'full')}
              </p>
            </div>
          </div>
        </div>

        {/* Room and Confirmation Grid */}
        {(notes?.roomType || notes?.hotelConfirmation || notes?.confirmation) && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {notes?.roomType && (
              <div className="bg-stone-50 dark:bg-gray-800/50 rounded-xl p-3">
                <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                  Room
                </p>
                <p className="text-sm font-medium text-stone-900 dark:text-white">{notes.roomType}</p>
              </div>
            )}

            {(notes?.hotelConfirmation || notes?.confirmation) && (
              <div className="bg-stone-50 dark:bg-gray-800/50 rounded-xl p-3">
                <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                  Confirmation
                </p>
                <p className="text-sm font-mono font-bold text-stone-900 dark:text-white truncate">
                  {notes.hotelConfirmation || notes.confirmation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Breakfast */}
        {notes?.breakfastIncluded && (
          <div className="mb-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-xl p-3 border border-orange-100 dark:border-orange-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                  <Coffee className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-white">
                    Breakfast
                    <span className="ml-2 text-[10px] text-green-600 dark:text-green-400 font-normal">
                      Included
                    </span>
                  </p>
                  {notes?.breakfastTime && (
                    <p className="text-xs text-stone-500 dark:text-gray-400">
                      {notes.breakfastTime}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>
          </div>
        )}
      </div>

      {/* Key card barcode pattern */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-0.5 h-6 opacity-20 dark:opacity-10">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="bg-stone-900 dark:bg-white"
              style={{
                width: i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px',
                height: '100%',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Event Card - Ticket design
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
        relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-lg border cursor-pointer transition-all
        ${isActive
          ? 'border-stone-900 dark:border-white ring-2 ring-stone-900/20 dark:ring-white/20'
          : 'border-stone-200 dark:border-gray-800 hover:shadow-xl'
        }
        ${className}
      `}
    >
      {/* Image */}
      {image && (
        <div className="relative h-32 w-full">
          <Image
            src={image}
            alt={item.title || 'Event'}
            fill
            className="object-cover"
            sizes="400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          {/* Map marker badge */}
          {mapIndex && (
            <div className="absolute top-3 left-3">
              <MapMarkerBadge index={mapIndex} isActive={isActive} />
            </div>
          )}
          {notes?.eventType && (
            <div className="absolute bottom-3 left-4">
              <span className="px-2 py-1 rounded-lg bg-purple-500/90 text-white text-xs font-medium capitalize backdrop-blur-sm">
                {notes.eventType}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          {!image && mapIndex && (
            <MapMarkerBadge index={mapIndex} isActive={isActive} />
          )}
          {!image && !mapIndex && (
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
              <Ticket className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-gray-500 mb-1">
              Event
            </p>
            <h4 className="font-bold text-stone-900 dark:text-white truncate text-lg">
              {item.title || 'Event'}
            </h4>
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-2">
          {notes?.venue && (
            <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-gray-400">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{notes.venue}</span>
            </div>
          )}
          {(notes?.eventTime || item.time) && (
            <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-gray-400">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{notes?.eventTime || item.time}</span>
            </div>
          )}
          {notes?.eventDate && (
            <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-gray-400">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{notes.eventDate}</span>
            </div>
          )}
        </div>

        {/* Confirmation */}
        {notes?.confirmationNumber && (
          <div className="mt-4 bg-stone-50 dark:bg-gray-800/50 rounded-xl p-3">
            <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">
              Confirmation
            </p>
            <p className="text-sm font-mono font-bold text-stone-900 dark:text-white">
              {notes.confirmationNumber}
            </p>
          </div>
        )}
      </div>

      {/* Ticket stub pattern */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-0.5 h-6 opacity-20 dark:opacity-10">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="bg-stone-900 dark:bg-white"
              style={{
                width: i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px',
                height: '100%',
              }}
            />
          ))}
        </div>
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

  // Format time display
  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return { time: `${displayHours}:${minutes?.toString().padStart(2, '0')}`, period };
  };

  const formattedTime = formatTime(time);

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-lg border cursor-pointer transition-all
        ${isActive
          ? 'border-stone-900 dark:border-white ring-2 ring-stone-900/20 dark:ring-white/20'
          : 'border-stone-200 dark:border-gray-800 hover:shadow-xl'
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
            sizes="400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Map marker badge on image */}
          {mapIndex && (
            <div className="absolute top-3 left-3">
              <MapMarkerBadge index={mapIndex} isActive={isActive} />
            </div>
          )}

          {/* Rating badge */}
          {rating && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium text-white">{rating.toFixed(1)}</span>
            </div>
          )}

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-bold text-white mb-0.5">{item.title || 'Place'}</h3>
            {category && (
              <p className="text-xs text-white/80 capitalize">
                {category.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Header when no image */}
        {!image && (
          <div className="flex items-start gap-3 mb-4">
            {mapIndex && (
              <MapMarkerBadge index={mapIndex} isActive={isActive} />
            )}
            {!mapIndex && (
              <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-stone-500 dark:text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {category && (
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-gray-500 mb-1">
                  {category.replace(/_/g, ' ')}
                </p>
              )}
              <h4 className="font-bold text-stone-900 dark:text-white truncate text-lg">
                {item.title || 'Place'}
              </h4>
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-3">
          {/* Time */}
          {formattedTime && (
            <div className="bg-stone-50 dark:bg-gray-800/50 rounded-xl p-3">
              <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                Scheduled
              </p>
              <p className="text-lg font-bold text-stone-900 dark:text-white">
                {formattedTime.time} <span className="text-sm font-normal text-stone-500">{formattedTime.period}</span>
              </p>
            </div>
          )}

          {/* Address */}
          {address && (
            <div className="flex items-start gap-2 text-sm text-stone-600 dark:text-gray-400">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">{address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Subtle barcode pattern */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-0.5 h-5 opacity-10 dark:opacity-5">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="bg-stone-900 dark:bg-white"
              style={{
                width: i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px',
                height: '100%',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
