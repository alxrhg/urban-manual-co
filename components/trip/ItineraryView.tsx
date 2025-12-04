'use client';

import React from 'react';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import {
  Clock,
  Loader2,
  Plane,
  Building2,
  MapPin,
  Navigation,
  ExternalLink,
  Plus,
} from 'lucide-react';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface ItineraryViewProps {
  days: TripDay[];
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  onEditItem?: (item: EnrichedItineraryItem) => void;
  onAddItem?: (dayNumber: number) => void;
  onOptimizeDay?: (dayNumber: number) => void;
  onUpdateItemNotes?: (itemId: string, notes: Record<string, unknown>) => void;
  onRemoveItem?: (itemId: string) => void;
  isOptimizing?: boolean;
  isEditMode?: boolean;
  activeItemId?: string | null;
}

/**
 * ItineraryView - Itinerary display with timeline
 * Features: Date badges, timeline dots, flight cards, hotel cards
 */
export default function ItineraryView({
  days,
  selectedDayNumber,
  onSelectDay,
  onEditItem,
  onAddItem,
  onOptimizeDay,
  onUpdateItemNotes,
  onRemoveItem,
  isOptimizing = false,
  isEditMode = false,
  activeItemId,
}: ItineraryViewProps) {
  const selectedDay = days.find(d => d.dayNumber === selectedDayNumber);

  if (!selectedDay) return null;

  // Helper to get effective time for sorting (handles hotel checkInTime)
  const getEffectiveTime = (item: EnrichedItineraryItem): string | null => {
    // For hotels, use checkInTime from notes
    if (item.parsedNotes?.type === 'hotel' && item.parsedNotes?.checkInTime) {
      return item.parsedNotes.checkInTime;
    }
    // For flights, use departureTime
    if (item.parsedNotes?.type === 'flight' && item.parsedNotes?.departureTime) {
      return item.parsedNotes.departureTime;
    }
    return item.time || null;
  };

  // Convert time string to minutes for proper sorting (handles both 24h and 12h formats)
  const timeToMinutes = (timeStr: string): number => {
    // Handle 24-hour format (HH:MM)
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    }
    // Handle 12-hour format (H:MM AM/PM)
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
  };

  // Sort items by time (items without time go to end)
  const sortedItems = [...selectedDay.items].sort((a, b) => {
    const timeA = getEffectiveTime(a);
    const timeB = getEffectiveTime(b);
    if (!timeA && !timeB) return 0;
    if (!timeA) return 1;
    if (!timeB) return -1;
    return timeToMinutes(timeA) - timeToMinutes(timeB);
  });

  // Find hotel for night stay card (hotel with check-in on this day)
  const nightStayHotel = selectedDay.items.find(item => item.parsedNotes?.type === 'hotel');

  return (
    <div className="space-y-6">
      {/* Day Header with Date Badge */}
      <DayHeaderSection
        day={selectedDay}
        onAutoOptimize={() => onOptimizeDay?.(selectedDay.dayNumber)}
        isOptimizing={isOptimizing}
      />

      {/* Itinerary Items with Timeline */}
      {sortedItems.length > 0 ? (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-[17px] top-0 bottom-0 w-px bg-stone-200 dark:bg-gray-800" />

          {/* Items */}
          <div className="space-y-4">
            {sortedItems.map((item, index) => (
              <ItineraryItemRow
                key={item.id}
                item={item}
                isFirst={index === 0}
                isLast={index === sortedItems.length - 1}
                isActive={item.id === activeItemId}
                isEditMode={isEditMode}
                onClick={() => onEditItem?.(item)}
                onUpdateNotes={onUpdateItemNotes}
                onRemove={onRemoveItem ? () => onRemoveItem(item.id) : undefined}
              />
            ))}
          </div>

          {/* Add Stop Button */}
          {onAddItem && (
            <div className="relative pl-10 mt-4">
              <div className="absolute left-[14px] top-3 w-2 h-2 rounded-full bg-stone-300 dark:bg-gray-700 z-10" />
              <button
                onClick={() => onAddItem(selectedDay.dayNumber)}
                className="w-full py-3 border border-dashed border-stone-200 dark:border-gray-800 rounded-xl text-xs text-stone-400 dark:text-gray-500 hover:text-stone-900 dark:hover:text-white hover:border-stone-300 dark:hover:border-gray-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add stop
              </button>
            </div>
          )}

          {/* Night Stay Card */}
          {nightStayHotel && (
            <div className="mt-6">
              <NightStayCard
                hotel={nightStayHotel}
                onClick={() => onEditItem?.(nightStayHotel)}
              />
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="space-y-6">
          <div className="text-center py-16">
            <MapPin className="w-8 h-8 mx-auto text-stone-300 dark:text-gray-700 mb-4" />
            <p className="text-sm text-stone-400 dark:text-gray-500 mb-6">No stops planned yet</p>
            {onAddItem && (
              <button
                onClick={() => onAddItem(selectedDay.dayNumber)}
                className="px-5 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded-full hover:opacity-90 transition-opacity"
              >
                Add your first stop
              </button>
            )}
          </div>

          {/* Night Stay Card (even for empty days) */}
          {nightStayHotel && (
            <NightStayCard
              hotel={nightStayHotel}
              onClick={() => onEditItem?.(nightStayHotel)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Day Header with Date Badge
function DayHeaderSection({
  day,
  onAutoOptimize,
  isOptimizing,
}: {
  day: TripDay;
  onAutoOptimize?: () => void;
  isOptimizing?: boolean;
}) {
  const formatMonth = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'MMM').toUpperCase();
    } catch {
      return '';
    }
  };

  const formatDayNum = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'd');
    } catch {
      return '';
    }
  };

  const formatDayOfWeek = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'EEEE');
    } catch {
      return '';
    }
  };

  const month = formatMonth(day.date);
  const dayNum = formatDayNum(day.date);
  const dayOfWeek = formatDayOfWeek(day.date);

  return (
    <div className="flex items-center gap-3 mb-6">
      {/* Date Badge */}
      {day.date && (
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-stone-100 dark:bg-gray-900 flex flex-col items-center justify-center">
          <span className="text-[9px] font-medium text-stone-400 dark:text-gray-500 tracking-wider uppercase">
            {month}
          </span>
          <span className="text-base font-semibold text-stone-900 dark:text-white leading-none">
            {dayNum}
          </span>
        </div>
      )}

      {/* Day Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-stone-900 dark:text-white">
          Day {day.dayNumber}
        </h3>
        <p className="text-xs text-stone-400 dark:text-gray-500">
          {dayOfWeek && `${dayOfWeek} · `}
          {day.items.length} {day.items.length === 1 ? 'stop' : 'stops'}
        </p>
      </div>

      {/* Auto-optimize Button */}
      {onAutoOptimize && (
        <button
          onClick={onAutoOptimize}
          disabled={isOptimizing}
          className="flex-shrink-0 text-xs text-stone-400 dark:text-gray-500 hover:text-stone-900 dark:hover:text-white transition-colors disabled:opacity-50"
        >
          {isOptimizing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Clock className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

// Single itinerary item with timeline dot
function ItineraryItemRow({
  item,
  isFirst,
  isLast,
  isActive,
  isEditMode,
  onClick,
  onUpdateNotes,
  onRemove,
}: {
  item: EnrichedItineraryItem;
  isFirst: boolean;
  isLast: boolean;
  isActive: boolean;
  isEditMode?: boolean;
  onClick?: () => void;
  onUpdateNotes?: (itemId: string, notes: Record<string, unknown>) => void;
  onRemove?: () => void;
}) {
  const itemType = item.parsedNotes?.type;

  return (
    <div className="relative pl-10 group">
      {/* Timeline Dot */}
      <div className={`absolute left-[14px] top-4 w-2 h-2 rounded-full z-10 ${
        isActive ? 'bg-stone-900 dark:bg-white' : 'bg-stone-300 dark:bg-gray-600'
      }`} />

      {/* Delete Button (Edit Mode) */}
      {isEditMode && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -left-1 top-3 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-20"
        >
          ×
        </button>
      )}

      {/* Content Card */}
      {itemType === 'flight' ? (
        <FlightCard item={item} isActive={isActive} onClick={onClick} onUpdateNotes={onUpdateNotes} />
      ) : itemType === 'hotel' ? (
        <HotelCard item={item} isActive={isActive} onClick={onClick} />
      ) : (
        <PlaceCard item={item} isActive={isActive} onClick={onClick} />
      )}
    </div>
  );
}

// Inline editable field component
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

// Flight Card Component
function FlightCard({
  item,
  isActive,
  onClick,
  onUpdateNotes,
}: {
  item: EnrichedItineraryItem;
  isActive: boolean;
  onClick?: () => void;
  onUpdateNotes?: (itemId: string, notes: Record<string, unknown>) => void;
}) {
  const notes = item.parsedNotes;

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
        rounded-2xl bg-white dark:bg-gray-900/80 border overflow-hidden cursor-pointer transition-all
        ${isActive ? 'border-stone-900 dark:border-white ring-1 ring-stone-900/10 dark:ring-white/10' : 'border-stone-200 dark:border-gray-800 hover:border-stone-300 dark:hover:border-gray-700'}
      `}
    >
      {/* Flight Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 text-stone-500 dark:text-gray-400 text-sm mb-4">
          <Plane className="w-4 h-4" />
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
            <div className="text-sm font-medium text-stone-900 dark:text-white mt-1">
              {notes?.departureTime || '--:--'}
            </div>
          </div>

          {/* Flight Path */}
          <div className="flex-1 flex flex-col items-center px-4">
            <div className="text-xs text-stone-500 mb-1">{duration}</div>
            <div className="w-full flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-gray-600" />
              <div className="flex-1 h-px bg-stone-200 dark:bg-gray-700 relative">
                <Plane className="w-4 h-4 text-stone-400 dark:text-gray-500 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-gray-600" />
            </div>
            <div className="px-2 py-0.5 bg-stone-100 dark:bg-gray-800 rounded text-xs text-stone-500 dark:text-gray-400 mt-2">
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
            <div className="text-sm font-medium text-stone-900 dark:text-white mt-1">
              {notes?.arrivalTime || '--:--'}
            </div>
          </div>
        </div>
      </div>

      {/* Footer with editable details */}
      <div className="px-4 py-3 bg-stone-50 dark:bg-gray-900/50 border-t border-stone-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-stone-500 font-mono">
          <InlineEditField
            label="TERMINAL"
            value={notes?.terminal || ''}
            placeholder="T1"
            onSave={(v) => handleUpdateField('terminal', v)}
          />
          <InlineEditField
            label="GATE"
            value={notes?.gate || ''}
            placeholder="A1"
            onSave={(v) => handleUpdateField('gate', v)}
          />
          <InlineEditField
            label="SEAT"
            value={notes?.seatNumber || ''}
            placeholder="1A"
            onSave={(v) => handleUpdateField('seatNumber', v)}
          />
        </div>
        <button className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors">
          Details
        </button>
      </div>
    </div>
  );
}

// Hotel Check-in Card Component
function HotelCard({
  item,
  isActive,
  onClick,
}: {
  item: EnrichedItineraryItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  const notes = item.parsedNotes;

  // Use checkInTime from notes, or fall back to item.time, or show placeholder
  const checkInTime = notes?.checkInTime || item.time || null;
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes?.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl bg-white dark:bg-gray-900/80 border p-4 cursor-pointer transition-all
        ${isActive ? 'border-stone-900 dark:border-white ring-1 ring-stone-900/10 dark:ring-white/10' : 'border-stone-200 dark:border-gray-800 hover:border-stone-300 dark:hover:border-gray-700'}
      `}
    >
      <div className="flex gap-4">
        {/* Hotel Icon */}
        <div className="w-16 h-16 rounded-xl bg-stone-100 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-7 h-7 text-stone-500 dark:text-gray-400" />
        </div>

        {/* Hotel Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-stone-900 dark:text-white">
                Check-in at {item.title || 'Hotel'}
              </h4>
              <p className="text-sm text-stone-500 dark:text-gray-400 mt-0.5">
                {notes?.roomType ? `${notes.roomType} · ` : ''}{notes?.address || 'Address not set'}
              </p>
            </div>
            <div className="text-sm text-stone-500 flex-shrink-0">
              {checkInTime ? formatTime(checkInTime) : <span className="text-stone-400">Time not set</span>}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-gray-800 rounded-lg text-xs text-stone-600 dark:text-gray-300 hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors">
              <Navigation className="w-3 h-3" />
              Get Directions
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-gray-800 rounded-lg text-xs text-stone-600 dark:text-gray-300 hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors">
              <ExternalLink className="w-3 h-3" />
              View Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Night Stay Card Component - Shows at the end of each day
function NightStayCard({
  hotel,
  onClick,
}: {
  hotel: EnrichedItineraryItem;
  onClick?: () => void;
}) {
  const notes = hotel.parsedNotes;

  // Format time for display
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return `${hours.toString().padStart(2, '0')}:${minutes?.toString().padStart(2, '0') || '00'}`;
  };

  const checkInTime = formatTime(notes?.checkInTime);
  const checkOutTime = formatTime(notes?.checkOutTime);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-stone-400 dark:text-gray-500">☽</span>
        <span className="text-sm font-medium text-stone-600 dark:text-gray-300">Overnight</span>
        <span className="px-2 py-0.5 bg-stone-100 dark:bg-gray-800 rounded-full text-xs text-stone-500 dark:text-gray-400">
          1 night
        </span>
      </div>

      {/* Hotel Card */}
      <div
        onClick={onClick}
        className="rounded-2xl bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 p-5 cursor-pointer transition-all hover:border-stone-300 dark:hover:border-gray-700"
      >
        <h4 className="text-base font-semibold text-stone-900 dark:text-white mb-1">
          {hotel.title || 'Hotel'}
        </h4>
        <p className="text-sm text-stone-500 dark:text-gray-400 mb-4">
          {notes?.address || 'Address not set'}
        </p>

        {/* Divider */}
        <div className="border-t border-stone-100 dark:border-gray-800 pt-4">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-stone-400 dark:text-gray-500 mr-2">Check-in</span>
              <span className="font-medium text-stone-900 dark:text-white">{checkInTime || '—'}</span>
            </div>
            <div>
              <span className="text-stone-400 dark:text-gray-500 mr-2">Check-out</span>
              <span className="font-medium text-stone-900 dark:text-white">{checkOutTime || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generic Place Card
function PlaceCard({
  item,
  isActive,
  onClick,
}: {
  item: EnrichedItineraryItem;
  isActive: boolean;
  onClick?: () => void;
}) {
  const image = item.destination?.image || item.destination?.image_thumbnail;
  const category = item.parsedNotes?.category || item.destination?.category;
  const time = item.time;

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
        rounded-2xl bg-white dark:bg-gray-900/80 border overflow-hidden cursor-pointer transition-all
        ${isActive ? 'border-stone-900 dark:border-white ring-1 ring-stone-900/10 dark:ring-white/10' : 'border-stone-200 dark:border-gray-800 hover:border-stone-300 dark:hover:border-gray-700'}
      `}
    >
      {image && (
        <div className="relative h-32 w-full">
          <Image
            src={image}
            alt={item.title || 'Place'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-stone-500 flex-shrink-0" />
              <h4 className="font-semibold text-stone-900 dark:text-white truncate">
                {item.title || 'Place'}
              </h4>
            </div>
            {category && (
              <p className="text-xs text-stone-500 capitalize mt-1 ml-6">
                {category.replace(/_/g, ' ')}
              </p>
            )}
          </div>
          {formattedTime && (
            <div className="text-sm text-stone-600 dark:text-gray-400 flex-shrink-0">
              {formattedTime.time} {formattedTime.period}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
