'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MapPin, X, Search, Loader2, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { parseDestinations } from '@/types/trip';
import { calculateDayNumberFromDate } from '@/lib/utils/time-calculations';
import { PageLoader } from '@/components/LoadingStates';
import type { Destination } from '@/types/destination';

/**
 * TripPage - Completely rethought
 *
 * Philosophy:
 * - No sidebars - everything inline
 * - No buttons - things just work
 * - No forms - just type and select
 * - No modes - edit is default
 */
export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;
  const { user } = useAuth();

  const {
    trip,
    days,
    loading,
    updateTrip,
    reorderItems,
    removeItem,
    updateItemTime,
    updateItemNotes,
    updateItem,
    moveItemToDay,
    refresh,
  } = useTripEditor({
    tripId,
    userId: user?.id,
    onError: (error) => console.error('Trip editor error:', error),
  });

  // Expanded item state
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Parse destinations
  const destinations = useMemo(() => parseDestinations(trip?.destination ?? null), [trip?.destination]);
  const primaryCity = destinations[0] || '';

  // Count total items
  const totalItems = useMemo(() => {
    return days.reduce((sum, day) => sum + day.items.length, 0);
  }, [days]);

  // Auto-fix items on wrong days
  const hasAutoFixed = useRef(false);
  useEffect(() => {
    if (loading || !trip?.start_date || days.length === 0 || hasAutoFixed.current) return;
    const total = days.reduce((sum, day) => sum + day.items.length, 0);
    if (total === 0) return;

    for (const day of days) {
      for (const item of day.items) {
        const dateToCheck = item.parsedNotes?.checkInDate || item.parsedNotes?.departureDate;
        if (dateToCheck) {
          const targetDay = calculateDayNumberFromDate(trip.start_date, trip.end_date, dateToCheck);
          if (targetDay !== null && targetDay !== day.dayNumber) {
            moveItemToDay(item.id, targetDay);
          }
        }
      }
    }
    hasAutoFixed.current = true;
  }, [loading, trip?.start_date, trip?.end_date, days, moveItemToDay]);

  // Toggle item expansion
  const toggleItem = useCallback((itemId: string) => {
    setExpandedItemId(prev => prev === itemId ? null : itemId);
  }, []);

  if (loading) {
    return (
      <main className="w-full px-4 sm:px-6 py-20 min-h-screen bg-white dark:bg-gray-950">
        <div className="max-w-xl mx-auto"><PageLoader /></div>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="w-full px-4 sm:px-6 py-20 min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Trip not found</p>
          <Link href="/trips" className="text-gray-900 dark:text-white hover:opacity-70">Back to trips</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 sm:px-6 py-20 min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-xl mx-auto">
        {/* Back link */}
        <Link
          href="/trips"
          className="inline-flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Trips
        </Link>

        {/* Header - tap to edit */}
        <TripHeader
          trip={trip}
          primaryCity={primaryCity}
          totalItems={totalItems}
          onUpdate={updateTrip}
          onDelete={() => router.push('/trips')}
        />

        {/* Days */}
        <div className="mt-8 space-y-8">
          {days.map((day) => (
            <DaySection
              key={day.dayNumber}
              tripId={tripId}
              dayNumber={day.dayNumber}
              date={day.date ?? undefined}
              items={day.items}
              city={primaryCity}
              tripStartDate={trip.start_date}
              tripEndDate={trip.end_date}
              expandedItemId={expandedItemId}
              onToggleItem={toggleItem}
              onReorder={(items) => reorderItems(day.dayNumber, items)}
              onRemove={removeItem}
              onUpdateItem={updateItem}
              onUpdateTime={updateItemTime}
              onRefresh={refresh}
            />
          ))}
        </div>

        {/* Empty state */}
        {totalItems === 0 && days.length > 0 && (
          <p className="text-center text-[13px] text-gray-400 mt-8">
            Start typing in any day to add places
          </p>
        )}
      </div>
    </main>
  );
}

/**
 * Trip header with inline editing
 */
function TripHeader({
  trip,
  primaryCity,
  totalItems,
  onUpdate,
  onDelete,
}: {
  trip: { id: string; title: string; start_date?: string | null; end_date?: string | null; destination?: string | null };
  primaryCity: string;
  totalItems: number;
  onUpdate: (updates: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(trip.title);
  const [startDate, setStartDate] = useState(trip.start_date || '');
  const [endDate, setEndDate] = useState(trip.end_date || '');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onUpdate({ title, start_date: startDate || null, end_date: endDate || null });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setTitle(trip.title);
      setStartDate(trip.start_date || '');
      setEndDate(trip.end_date || '');
      setIsEditing(false);
    }
  };

  // Format date display
  const dateDisplay = useMemo(() => {
    if (!trip.start_date) return 'No dates';
    const start = new Date(trip.start_date);
    const end = trip.end_date ? new Date(trip.end_date) : start;
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, [trip.start_date, trip.end_date]);

  if (isEditing) {
    return (
      <div className="space-y-3">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full text-[22px] font-semibold text-gray-900 dark:text-white bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-white outline-none pb-1"
          placeholder="Trip name"
        />
        <div className="flex gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-[13px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-gray-400"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            onKeyDown={handleKeyDown}
            min={startDate}
            className="flex-1 text-[13px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-gray-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 py-2 text-[13px] font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Save
          </button>
          <button
            onClick={() => {
              setTitle(trip.title);
              setStartDate(trip.start_date || '');
              setEndDate(trip.end_date || '');
              setIsEditing(false);
            }}
            className="px-4 py-2 text-[13px] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer group"
    >
      <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white group-hover:opacity-70 transition-opacity">
        {trip.title}
      </h1>
      <p className="text-[13px] text-gray-400 group-hover:opacity-70 transition-opacity">
        {[primaryCity, dateDisplay, `${totalItems} ${totalItems === 1 ? 'place' : 'places'}`].filter(Boolean).join(' · ')}
      </p>
    </div>
  );
}

/**
 * Day section with items and inline search
 */
function DaySection({
  tripId,
  dayNumber,
  date,
  items,
  city,
  tripStartDate,
  tripEndDate,
  expandedItemId,
  onToggleItem,
  onReorder,
  onRemove,
  onUpdateItem,
  onUpdateTime,
  onRefresh,
}: {
  tripId: string;
  dayNumber: number;
  date?: string;
  items: EnrichedItineraryItem[];
  city: string;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  expandedItemId: string | null;
  onToggleItem: (id: string) => void;
  onReorder: (items: EnrichedItineraryItem[]) => void;
  onRemove: (id: string) => void;
  onUpdateItem: (id: string, updates: Record<string, unknown>) => void;
  onUpdateTime: (id: string, time: string) => void;
  onRefresh: () => void;
}) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Destination[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  // Search destinations
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(city)}&limit=5`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || data.destinations || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, city]);

  // Add destination to trip
  const addDestination = async (destination: Destination) => {
    setIsAdding(true);
    try {
      // Find optimal time slot based on existing items
      const existingTimes = items.map(i => i.time).filter(Boolean).sort();
      let suggestedTime = '12:00';

      if (existingTimes.length > 0) {
        // Add after last item with 2 hour gap
        const lastTime = existingTimes[existingTimes.length - 1]!;
        const [h, m] = lastTime.split(':').map(Number);
        const newHour = Math.min(h + 2, 22);
        suggestedTime = `${String(newHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }

      const response = await fetch(`/api/trips/${tripId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination_id: destination.id,
          day_number: dayNumber,
          time: suggestedTime,
          title: destination.name,
        }),
      });

      if (response.ok) {
        setSearchQuery('');
        setSearchResults([]);
        onRefresh();
      }
    } catch (err) {
      console.error('Add error:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleReorderComplete = useCallback(() => {
    if (JSON.stringify(orderedItems.map(i => i.id)) !== JSON.stringify(items.map(i => i.id))) {
      onReorder(orderedItems);
    }
  }, [orderedItems, items, onReorder]);

  const dateDisplay = date
    ? new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  return (
    <div>
      {/* Day header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
          Day {dayNumber}
        </span>
        {dateDisplay && (
          <span className="text-[11px] text-gray-300 dark:text-gray-600">{dateDisplay}</span>
        )}
      </div>

      {/* Items */}
      {items.length > 0 && (
        <Reorder.Group
          axis="y"
          values={orderedItems}
          onReorder={setOrderedItems}
          className="space-y-1"
        >
          {orderedItems.map((item, index) => (
            <div key={item.id}>
              <ItemRow
                item={item}
                isExpanded={expandedItemId === item.id}
                onToggle={() => onToggleItem(item.id)}
                onRemove={() => onRemove(item.id)}
                onUpdateItem={onUpdateItem}
                onUpdateTime={onUpdateTime}
                onDragEnd={handleReorderComplete}
              />
              {/* Walking time between close items */}
              {index < orderedItems.length - 1 && (
                <WalkingTime from={item} to={orderedItems[index + 1]} />
              )}
            </div>
          ))}
        </Reorder.Group>
      )}

      {/* Inline search to add */}
      <div className="mt-3 relative">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          {isSearching || isAdding ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-gray-400" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={items.length === 0 ? "Search places to add..." : "Add another place..."}
            className="flex-1 bg-transparent text-[13px] text-gray-900 dark:text-white placeholder-gray-400 outline-none"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); }}>
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg overflow-hidden z-10"
            >
              {searchResults.map((destination) => (
                <button
                  key={destination.id}
                  onClick={() => addDestination(destination)}
                  disabled={isAdding}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    {destination.image_thumbnail || destination.image ? (
                      <Image
                        src={destination.image_thumbnail || destination.image || ''}
                        alt=""
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-3 h-3 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
                      {destination.name}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {destination.category} {destination.neighborhood && `· ${destination.neighborhood}`}
                    </p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Item row - inline expandable
 */
function ItemRow({
  item,
  isExpanded,
  onToggle,
  onRemove,
  onUpdateItem,
  onUpdateTime,
  onDragEnd,
}: {
  item: EnrichedItineraryItem;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateItem: (id: string, updates: Record<string, unknown>) => void;
  onUpdateTime: (id: string, time: string) => void;
  onDragEnd: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const itemType = item.parsedNotes?.type || 'place';

  // Format item as text
  const getItemText = () => {
    if (itemType === 'flight') {
      const from = item.parsedNotes?.from || '?';
      const to = item.parsedNotes?.to || '?';
      const time = item.parsedNotes?.departureTime || '';
      const airline = [item.parsedNotes?.airline, item.parsedNotes?.flightNumber].filter(Boolean).join(' ');
      return { icon: '✈️', main: `${from} → ${to}`, sub: [time, airline].filter(Boolean).join(' · ') };
    }
    if (itemType === 'hotel') {
      const checkIn = item.parsedNotes?.checkInTime;
      const checkOut = item.parsedNotes?.checkOutTime;
      const times = [checkIn && `in ${checkIn}`, checkOut && `out ${checkOut}`].filter(Boolean).join(', ');
      return { icon: '🏨', main: item.title || 'Hotel', sub: times || 'Hotel' };
    }
    if (itemType === 'train') {
      const from = item.parsedNotes?.from || '?';
      const to = item.parsedNotes?.to || '?';
      const time = item.parsedNotes?.departureTime || '';
      return { icon: '🚂', main: `${from} → ${to}`, sub: time };
    }
    // Default place
    const time = item.time ? formatTime(item.time) : '';
    const category = item.destination?.category || item.parsedNotes?.category || '';
    return { icon: '', main: item.title || item.destination?.name || 'Place', sub: [time, category].filter(Boolean).join(' · ') };
  };

  const { icon, main, sub } = getItemText();
  const image = item.destination?.image_thumbnail || item.destination?.image;

  return (
    <Reorder.Item
      value={item}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => { setIsDragging(false); onDragEnd(); }}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'z-10' : ''}`}
    >
      <div className={`rounded-lg transition-all ${isDragging ? 'shadow-lg bg-white dark:bg-gray-900' : ''}`}>
        {/* Main row */}
        <div
          onClick={onToggle}
          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-lg cursor-pointer group"
        >
          {/* Icon or image */}
          {icon ? (
            <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
          ) : image ? (
            <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
              <Image src={image} alt="" width={24} height={24} className="w-full h-full object-cover" />
            </div>
          ) : (
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}

          {/* Text */}
          <div className="flex-1 min-w-0">
            <span className="text-[13px] text-gray-900 dark:text-white">{main}</span>
            {sub && <span className="text-[11px] text-gray-400 ml-2">{sub}</span>}
          </div>

          {/* Expand indicator */}
          <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <ItemDetails
                item={item}
                itemType={itemType}
                onUpdateItem={onUpdateItem}
                onUpdateTime={onUpdateTime}
                onRemove={onRemove}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reorder.Item>
  );
}

/**
 * Expanded item details
 */
function ItemDetails({
  item,
  itemType,
  onUpdateItem,
  onUpdateTime,
  onRemove,
}: {
  item: EnrichedItineraryItem;
  itemType: string;
  onUpdateItem: (id: string, updates: Record<string, unknown>) => void;
  onUpdateTime: (id: string, time: string) => void;
  onRemove: () => void;
}) {
  const [time, setTime] = useState(item.time || '');
  const [notes, setNotes] = useState(item.parsedNotes?.notes || '');
  const [checkInTime, setCheckInTime] = useState(item.parsedNotes?.checkInTime || '');
  const [checkOutTime, setCheckOutTime] = useState(item.parsedNotes?.checkOutTime || '');
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    if (itemType === 'hotel') {
      onUpdateItem(item.id, { checkInTime, checkOutTime, notes });
    } else if (time !== item.time) {
      onUpdateTime(item.id, time);
    }
    if (notes !== (item.parsedNotes?.notes || '')) {
      onUpdateItem(item.id, { notes });
    }
    setHasChanges(false);
  };

  const destination = item.destination;

  return (
    <div className="px-3 pb-3 pt-1 space-y-3">
      {/* Image for places */}
      {destination?.image && itemType === 'place' && (
        <div className="aspect-[2/1] rounded-lg overflow-hidden">
          <Image
            src={destination.image}
            alt=""
            width={400}
            height={200}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Time / Check-in fields */}
      {itemType === 'hotel' ? (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-wide">Check-in</label>
            <input
              type="time"
              value={checkInTime}
              onChange={(e) => { setCheckInTime(e.target.value); setHasChanges(true); }}
              className="w-full mt-1 px-2 py-1.5 text-[13px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-wide">Check-out</label>
            <input
              type="time"
              value={checkOutTime}
              onChange={(e) => { setCheckOutTime(e.target.value); setHasChanges(true); }}
              className="w-full mt-1 px-2 py-1.5 text-[13px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
            />
          </div>
        </div>
      ) : itemType !== 'flight' && itemType !== 'train' ? (
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => { setTime(e.target.value); setHasChanges(true); }}
            className="w-full mt-1 px-2 py-1.5 text-[13px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none"
          />
        </div>
      ) : null}

      {/* Notes */}
      <div>
        <label className="text-[10px] text-gray-400 uppercase tracking-wide">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setHasChanges(true); }}
          placeholder="Add a note..."
          rows={2}
          className="w-full mt-1 px-2 py-1.5 text-[13px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded outline-none resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onRemove}
          className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
        >
          Remove
        </button>
        {hasChanges && (
          <button
            onClick={handleSave}
            className="flex items-center gap-1 text-[11px] font-medium text-gray-900 dark:text-white"
          >
            <Check className="w-3 h-3" />
            Save
          </button>
        )}
      </div>

      {/* Address / Link */}
      {destination?.formatted_address && (
        <p className="text-[11px] text-gray-400 leading-relaxed">
          {destination.formatted_address}
        </p>
      )}
    </div>
  );
}

/**
 * Walking time between items (only shows if <20 min walk)
 */
function WalkingTime({ from, to }: { from: EnrichedItineraryItem; to: EnrichedItineraryItem }) {
  // Only calculate if both have coordinates
  const fromLat = from.destination?.latitude || from.parsedNotes?.latitude;
  const fromLng = from.destination?.longitude || from.parsedNotes?.longitude;
  const toLat = to.destination?.latitude || to.parsedNotes?.latitude;
  const toLng = to.destination?.longitude || to.parsedNotes?.longitude;

  if (!fromLat || !fromLng || !toLat || !toLng) return null;

  // Skip for flights/trains
  if (from.parsedNotes?.type === 'flight' || to.parsedNotes?.type === 'flight') return null;
  if (from.parsedNotes?.type === 'train' || to.parsedNotes?.type === 'train') return null;

  // Calculate distance (rough estimate)
  const R = 6371; // Earth's radius in km
  const dLat = (toLat - fromLat) * Math.PI / 180;
  const dLng = (toLng - fromLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km

  // Walking speed ~5km/h, so minutes = distance * 12
  const walkingMinutes = Math.round(distance * 12);

  // Only show if walkable (<20 min)
  if (walkingMinutes > 20 || walkingMinutes < 1) return null;

  return (
    <div className="flex justify-center py-0.5">
      <span className="text-[10px] text-gray-300 dark:text-gray-600">
        {walkingMinutes} min walk
      </span>
    </div>
  );
}

/**
 * Format time for display
 */
function formatTime(time: string): string {
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return time;
  }
}
