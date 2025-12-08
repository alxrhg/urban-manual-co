'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, MapPin, X, GripVertical, Plus, Settings, StickyNote, Map,
  Plane, Building2, Train, Clock, Route, Loader2, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { parseDestinations } from '@/types/trip';
import { calculateDayNumberFromDate } from '@/lib/utils/time-calculations';
import { PageLoader } from '@/components/LoadingStates';

// Sidebar components
import AddPlaceBox from '@/components/trip/AddPlaceBox';
import TripSettingsBox from '@/components/trip/TripSettingsBox';
import DestinationBox from '@/components/trip/DestinationBox';
import TripNotesEditor from '@/components/trips/TripNotesEditor';
import TripMapView from '@/components/trips/TripMapView';
import { parseTripNotes, stringifyTripNotes, type TripNotes } from '@/types/trip';

type SidebarView = 'none' | 'add' | 'settings' | 'notes' | 'map' | 'item';

/**
 * TripPage - Minimal trip detail with sidebar panels
 *
 * Philosophy: Clean list with powerful sidebar
 * - Main view: days with items, travel time between
 * - Sidebar: add, settings, notes, map, item detail
 * - Distinct cards for flights/hotels
 * - Subtle recommendations
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
    saving,
    updateTrip,
    reorderItems,
    addPlace,
    addFlight,
    addTrain,
    addHotel,
    addActivity,
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

  // Sidebar state
  const [sidebarView, setSidebarView] = useState<SidebarView>('none');
  const [selectedItem, setSelectedItem] = useState<EnrichedItineraryItem | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [optimizingDay, setOptimizingDay] = useState<number | null>(null);

  // Parse destinations
  const destinations = useMemo(() => parseDestinations(trip?.destination ?? null), [trip?.destination]);
  const primaryCity = destinations[0] || '';

  // Format date range
  const dateDisplay = useMemo(() => {
    if (!trip?.start_date) return '';
    const start = new Date(trip.start_date);
    const end = trip.end_date ? new Date(trip.end_date) : start;
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();
    if (start.getMonth() === end.getMonth() && startDay !== endDay) {
      return `${startMonth} ${startDay}–${endDay}`;
    }
    if (startDay === endDay) {
      return `${startMonth} ${startDay}`;
    }
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
  }, [trip?.start_date, trip?.end_date]);

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
        const checkInDate = item.parsedNotes?.checkInDate;
        const departureDate = item.parsedNotes?.departureDate;
        const dateToCheck = checkInDate || departureDate;

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

  // Handle item click
  const handleItemClick = useCallback((item: EnrichedItineraryItem) => {
    setSelectedItem(item);
    setSidebarView('item');
  }, []);

  // Handle add for specific day
  const handleAddToDay = useCallback((dayNumber: number) => {
    setSelectedDayNumber(dayNumber);
    setSidebarView('add');
  }, []);

  // Handle route optimization
  const handleOptimizeDay = useCallback(async (dayNumber: number) => {
    const day = days.find(d => d.dayNumber === dayNumber);
    if (!day || day.items.length < 2) return;

    setOptimizingDay(dayNumber);
    try {
      const response = await fetch('/api/intelligence/route-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: day.items.map(item => ({
            id: item.id,
            title: item.title,
            latitude: item.destination?.latitude ?? item.parsedNotes?.latitude,
            longitude: item.destination?.longitude ?? item.parsedNotes?.longitude,
            time: item.time,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.optimizedOrder && Array.isArray(result.optimizedOrder)) {
          const orderedItems = result.optimizedOrder
            .map((id: string) => day.items.find(item => item.id === id))
            .filter(Boolean);
          if (orderedItems.length === day.items.length) {
            reorderItems(dayNumber, orderedItems);
          }
        }
      }
    } catch (err) {
      console.error('Failed to optimize day:', err);
    } finally {
      setOptimizingDay(null);
    }
  }, [days, reorderItems]);

  // Handle item updates
  const handleItemUpdate = useCallback((itemId: string, updates: Record<string, unknown>) => {
    updateItem(itemId, updates);

    let item: EnrichedItineraryItem | undefined;
    for (const day of days) {
      item = day.items.find(i => i.id === itemId);
      if (item) break;
    }

    const checkInDate = (updates.checkInDate as string | undefined) || item?.parsedNotes?.checkInDate;
    const departureDate = (updates.departureDate as string | undefined) || item?.parsedNotes?.departureDate;
    const dateToCheck = checkInDate || departureDate;

    if (dateToCheck && trip?.start_date) {
      const targetDay = calculateDayNumberFromDate(trip.start_date, trip.end_date, dateToCheck);
      if (targetDay !== null) {
        moveItemToDay(itemId, targetDay);
      }
    }
  }, [updateItem, moveItemToDay, trip?.start_date, trip?.end_date, days]);

  // Close sidebar
  const closeSidebar = useCallback(() => {
    setSidebarView('none');
    setSelectedItem(null);
  }, []);

  // Loading state
  if (loading) {
    return (
      <main className="w-full px-4 sm:px-6 py-20 min-h-screen bg-white dark:bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <PageLoader />
        </div>
      </main>
    );
  }

  // Not found
  if (!trip) {
    return (
      <main className="w-full px-4 sm:px-6 py-20 min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Trip not found</p>
          <button
            onClick={() => router.push('/trips')}
            className="text-gray-900 dark:text-white hover:opacity-70 transition-opacity"
          >
            Back to trips
          </button>
        </div>
      </main>
    );
  }

  const sidebarOpen = sidebarView !== 'none';

  return (
    <main className="w-full px-4 sm:px-6 py-20 min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-4xl mx-auto">
        <div className={`flex gap-6 ${sidebarOpen ? '' : ''}`}>
          {/* Main Content */}
          <div className={`flex-1 min-w-0 transition-all ${sidebarOpen ? 'lg:pr-[340px]' : ''}`}>
            {/* Header */}
            <header className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <Link
                  href="/trips"
                  className="inline-flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Trips
                </Link>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSidebarView(sidebarView === 'add' ? 'none' : 'add')}
                    className={`p-2 rounded-lg transition-colors ${sidebarView === 'add' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400'}`}
                    title="Add item"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSidebarView(sidebarView === 'notes' ? 'none' : 'notes')}
                    className={`p-2 rounded-lg transition-colors ${sidebarView === 'notes' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400'}`}
                    title="Notes"
                  >
                    <StickyNote className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSidebarView(sidebarView === 'map' ? 'none' : 'map')}
                    className={`p-2 rounded-lg transition-colors ${sidebarView === 'map' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400'}`}
                    title="Map"
                  >
                    <Map className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSidebarView(sidebarView === 'settings' ? 'none' : 'settings')}
                    className={`p-2 rounded-lg transition-colors ${sidebarView === 'settings' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400'}`}
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white mb-1">
                {trip.title}
              </h1>

              <p className="text-[13px] text-gray-400">
                {[primaryCity, dateDisplay, `${totalItems} ${totalItems === 1 ? 'place' : 'places'}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </header>

            {/* Days */}
            <div className="space-y-8">
              {days.map((day) => (
                <DaySection
                  key={day.dayNumber}
                  dayNumber={day.dayNumber}
                  date={day.date ?? undefined}
                  items={day.items}
                  onReorder={(items) => reorderItems(day.dayNumber, items)}
                  onRemove={removeItem}
                  onItemClick={handleItemClick}
                  onAddClick={() => handleAddToDay(day.dayNumber)}
                  onOptimize={() => handleOptimizeDay(day.dayNumber)}
                  isOptimizing={optimizingDay === day.dayNumber}
                />
              ))}
            </div>

            {/* Empty state */}
            {totalItems === 0 && (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-[14px] text-gray-500 mb-4">
                  No places yet
                </p>
                <button
                  onClick={() => setSidebarView('add')}
                  className="text-[13px] font-medium text-gray-900 dark:text-white hover:opacity-70 transition-opacity"
                >
                  Add your first place
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="fixed lg:absolute right-0 top-0 lg:top-20 bottom-0 w-full sm:w-[340px] bg-white dark:bg-gray-950 lg:bg-transparent z-40 lg:z-0 overflow-y-auto"
              >
                <div className="p-4 lg:p-0 lg:sticky lg:top-20">
                  {/* Mobile close button */}
                  <button
                    onClick={closeSidebar}
                    className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>

                  {sidebarView === 'add' && (
                    <AddPlaceBox
                      city={primaryCity}
                      dayNumber={selectedDayNumber}
                      dayItems={days.find(d => d.dayNumber === selectedDayNumber)?.items.map(item => ({
                        id: item.id,
                        title: item.title,
                        time: item.time,
                        parsedNotes: item.parsedNotes,
                      }))}
                      onSelect={(destination, time) => {
                        addPlace(destination, selectedDayNumber, time);
                      }}
                      onAddFlight={(flightData) => {
                        const targetDay = flightData.departureDate
                          ? calculateDayNumberFromDate(trip.start_date, trip.end_date, flightData.departureDate) ?? selectedDayNumber
                          : selectedDayNumber;
                        addFlight(flightData, targetDay);
                      }}
                      onAddTrain={(trainData) => {
                        const targetDay = trainData.departureDate
                          ? calculateDayNumberFromDate(trip.start_date, trip.end_date, trainData.departureDate) ?? selectedDayNumber
                          : selectedDayNumber;
                        addTrain(trainData, targetDay);
                      }}
                      onAddHotel={(hotelData) => {
                        const targetDay = hotelData.checkInDate
                          ? calculateDayNumberFromDate(trip.start_date, trip.end_date, hotelData.checkInDate) ?? selectedDayNumber
                          : selectedDayNumber;
                        addHotel(hotelData, targetDay);
                      }}
                      onAddActivity={(activityData, time) => {
                        addActivity(activityData, selectedDayNumber, time);
                      }}
                      onClose={closeSidebar}
                    />
                  )}

                  {sidebarView === 'settings' && (
                    <TripSettingsBox
                      trip={trip}
                      onUpdate={updateTrip}
                      onDelete={() => router.push('/trips')}
                      onClose={closeSidebar}
                    />
                  )}

                  {sidebarView === 'notes' && (
                    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <StickyNote className="w-4 h-4 text-gray-400" />
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Trip Notes</h3>
                        </div>
                        <button onClick={closeSidebar} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                      <TripNotesEditor
                        notes={parseTripNotes(trip?.notes ?? null)}
                        onChange={(notes: TripNotes) => {
                          updateTrip({ notes: stringifyTripNotes(notes) });
                        }}
                      />
                    </div>
                  )}

                  {sidebarView === 'map' && (
                    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                          <Map className="w-4 h-4 text-gray-400" />
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Trip Map</h3>
                        </div>
                        <button onClick={closeSidebar} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                      <TripMapView
                        places={days.flatMap(day => day.items)
                          .filter(item => item.parsedNotes?.type !== 'flight')
                          .map((item, index) => ({
                            id: item.id,
                            name: item.title || 'Place',
                            latitude: item.parsedNotes?.latitude ?? item.destination?.latitude ?? undefined,
                            longitude: item.parsedNotes?.longitude ?? item.destination?.longitude ?? undefined,
                            category: item.destination?.category || item.parsedNotes?.category,
                            order: index + 1,
                          }))}
                        className="h-[400px]"
                      />
                    </div>
                  )}

                  {sidebarView === 'item' && selectedItem && (
                    <DestinationBox
                      item={selectedItem}
                      onClose={closeSidebar}
                      onTimeChange={updateItemTime}
                      onNotesChange={updateItemNotes}
                      onItemUpdate={handleItemUpdate}
                      onRemove={(itemId) => {
                        removeItem(itemId);
                        closeSidebar();
                      }}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

/**
 * Day section with items
 */
function DaySection({
  dayNumber,
  date,
  items,
  onReorder,
  onRemove,
  onItemClick,
  onAddClick,
  onOptimize,
  isOptimizing,
}: {
  dayNumber: number;
  date?: string;
  items: EnrichedItineraryItem[];
  onReorder: (items: EnrichedItineraryItem[]) => void;
  onRemove: (id: string) => void;
  onItemClick: (item: EnrichedItineraryItem) => void;
  onAddClick: () => void;
  onOptimize: () => void;
  isOptimizing: boolean;
}) {
  const [orderedItems, setOrderedItems] = useState(items);

  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  const handleReorderComplete = useCallback(() => {
    if (JSON.stringify(orderedItems.map(i => i.id)) !== JSON.stringify(items.map(i => i.id))) {
      onReorder(orderedItems);
    }
  }, [orderedItems, items, onReorder]);

  const dateDisplay = date
    ? new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null;

  // Calculate total scheduled time and find gaps
  const { totalMinutes, hasGap } = useMemo(() => {
    let total = 0;
    let gap = false;
    const sortedItems = [...items].filter(i => i.time).sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return a.time.localeCompare(b.time);
    });

    for (let i = 0; i < sortedItems.length; i++) {
      const duration = sortedItems[i].parsedNotes?.duration || 60;
      total += duration;

      // Check for gaps > 2 hours
      if (i > 0 && sortedItems[i].time && sortedItems[i - 1].time) {
        const prevEnd = timeToMinutes(sortedItems[i - 1].time!) + (sortedItems[i - 1].parsedNotes?.duration || 60);
        const currStart = timeToMinutes(sortedItems[i].time!);
        if (currStart - prevEnd > 120) gap = true;
      }
    }

    return { totalMinutes: total, hasGap: gap };
  }, [items]);

  return (
    <div>
      {/* Day header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
            Day {dayNumber}
          </span>
          {dateDisplay && (
            <span className="text-[11px] text-gray-300 dark:text-gray-600">
              {dateDisplay}
            </span>
          )}
        </div>

        {/* Day actions */}
        <div className="flex items-center gap-1">
          {items.length >= 2 && (
            <button
              onClick={onOptimize}
              disabled={isOptimizing}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
              title="Optimize route"
            >
              {isOptimizing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Route className="w-3 h-3" />
              )}
              Optimize
            </button>
          )}
          <button
            onClick={onAddClick}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Items */}
      {items.length > 0 ? (
        <Reorder.Group
          axis="y"
          values={orderedItems}
          onReorder={setOrderedItems}
          className="space-y-0"
        >
          {orderedItems.map((item, index) => (
            <div key={item.id}>
              <ItemCard
                item={item}
                onRemove={() => onRemove(item.id)}
                onClick={() => onItemClick(item)}
                onDragEnd={handleReorderComplete}
              />
              {/* Travel time indicator between items */}
              {index < orderedItems.length - 1 && (
                <TravelTimeIndicator
                  fromItem={item}
                  toItem={orderedItems[index + 1]}
                />
              )}
            </div>
          ))}
        </Reorder.Group>
      ) : (
        <div className="py-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
          <p className="text-[12px] text-gray-400 mb-2">No places for this day</p>
          <button
            onClick={onAddClick}
            className="text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            + Add place
          </button>
        </div>
      )}

      {/* Spare time suggestion */}
      {hasGap && items.length > 0 && (
        <button
          onClick={onAddClick}
          className="mt-3 w-full py-2 text-[11px] text-gray-400 hover:text-gray-500 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg transition-colors"
        >
          Free time available · Add something?
        </button>
      )}
    </div>
  );
}

/**
 * Item card - different styles for flight, hotel, place
 */
function ItemCard({
  item,
  onRemove,
  onClick,
  onDragEnd,
}: {
  item: EnrichedItineraryItem;
  onRemove: () => void;
  onClick: () => void;
  onDragEnd: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const itemType = item.parsedNotes?.type || 'place';

  // Flight card
  if (itemType === 'flight') {
    return (
      <Reorder.Item
        value={item}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => { setIsDragging(false); onDragEnd(); }}
        className={`cursor-grab active:cursor-grabbing ${isDragging ? 'z-10' : ''}`}
      >
        <div
          onClick={onClick}
          className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 group cursor-pointer hover:border-blue-200 dark:hover:border-blue-700 transition-colors"
        >
          <GripVertical className="w-3.5 h-3.5 text-blue-300 dark:text-blue-700 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center flex-shrink-0">
            <Plane className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-gray-900 dark:text-white">
              <span>{item.parsedNotes?.from || '—'}</span>
              <ChevronRight className="w-3 h-3 text-gray-400" />
              <span>{item.parsedNotes?.to || '—'}</span>
            </div>
            <p className="text-[11px] text-gray-500">
              {item.parsedNotes?.departureTime || '—'} · {item.parsedNotes?.airline} {item.parsedNotes?.flightNumber}
            </p>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full"
          >
            <X className="w-3.5 h-3.5 text-blue-400 hover:text-red-500" />
          </button>
        </div>
      </Reorder.Item>
    );
  }

  // Hotel card
  if (itemType === 'hotel') {
    return (
      <Reorder.Item
        value={item}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => { setIsDragging(false); onDragEnd(); }}
        className={`cursor-grab active:cursor-grabbing ${isDragging ? 'z-10' : ''}`}
      >
        <div
          onClick={onClick}
          className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 group cursor-pointer hover:border-purple-200 dark:hover:border-purple-700 transition-colors"
        >
          <GripVertical className="w-3.5 h-3.5 text-purple-300 dark:text-purple-700 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-800/50 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
              {item.title || 'Hotel'}
            </p>
            <p className="text-[11px] text-gray-500">
              {item.parsedNotes?.checkInTime && `Check-in ${item.parsedNotes.checkInTime}`}
              {item.parsedNotes?.checkOutTime && ` · Check-out ${item.parsedNotes.checkOutTime}`}
            </p>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-100 dark:hover:bg-purple-800 rounded-full"
          >
            <X className="w-3.5 h-3.5 text-purple-400 hover:text-red-500" />
          </button>
        </div>
      </Reorder.Item>
    );
  }

  // Train card
  if (itemType === 'train') {
    return (
      <Reorder.Item
        value={item}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => { setIsDragging(false); onDragEnd(); }}
        className={`cursor-grab active:cursor-grabbing ${isDragging ? 'z-10' : ''}`}
      >
        <div
          onClick={onClick}
          className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 group cursor-pointer hover:border-orange-200 dark:hover:border-orange-700 transition-colors"
        >
          <GripVertical className="w-3.5 h-3.5 text-orange-300 dark:text-orange-700 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-800/50 flex items-center justify-center flex-shrink-0">
            <Train className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-gray-900 dark:text-white">
              <span>{item.parsedNotes?.from || '—'}</span>
              <ChevronRight className="w-3 h-3 text-gray-400" />
              <span>{item.parsedNotes?.to || '—'}</span>
            </div>
            <p className="text-[11px] text-gray-500">
              {item.parsedNotes?.departureTime || '—'} · {item.parsedNotes?.trainLine}
            </p>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-100 dark:hover:bg-orange-800 rounded-full"
          >
            <X className="w-3.5 h-3.5 text-orange-400 hover:text-red-500" />
          </button>
        </div>
      </Reorder.Item>
    );
  }

  // Default place card
  const title = item.title || item.destination?.name || 'Untitled';
  const image = item.destination?.image_thumbnail || item.destination?.image;
  const time = item.time || item.parsedNotes?.departureTime || item.parsedNotes?.checkInTime;
  const category = item.destination?.category || item.parsedNotes?.category;

  const timeDisplay = time
    ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null;

  return (
    <Reorder.Item
      value={item}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => { setIsDragging(false); onDragEnd(); }}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'z-10' : ''}`}
    >
      <div
        onClick={onClick}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-xl
          bg-gray-50 dark:bg-gray-900/50
          group cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors
          ${isDragging ? 'shadow-lg ring-1 ring-gray-200 dark:ring-gray-700' : ''}
        `}
      >
        <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

        <span className="w-14 text-[11px] text-gray-400 text-right flex-shrink-0">
          {timeDisplay || '—'}
        </span>

        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
          {image ? (
            <Image
              src={image}
              alt=""
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
            {title}
          </p>
          {category && (
            <p className="text-[11px] text-gray-400 capitalize">
              {category}
            </p>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
        >
          <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
        </button>
      </div>
    </Reorder.Item>
  );
}

/**
 * Travel time indicator between items
 */
function TravelTimeIndicator({
  fromItem,
  toItem,
}: {
  fromItem: EnrichedItineraryItem;
  toItem: EnrichedItineraryItem;
}) {
  // Calculate time gap
  const fromTime = fromItem.time;
  const toTime = toItem.time;
  const fromDuration = fromItem.parsedNotes?.duration || 60;

  if (!fromTime || !toTime) {
    return <div className="h-2" />;
  }

  const fromEnd = timeToMinutes(fromTime) + fromDuration;
  const toStart = timeToMinutes(toTime);
  const gap = toStart - fromEnd;

  if (gap <= 0) {
    return <div className="h-2" />;
  }

  // Format gap
  const hours = Math.floor(gap / 60);
  const mins = gap % 60;
  const gapText = hours > 0
    ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
    : `${mins}m`;

  return (
    <div className="flex items-center justify-center py-1">
      <div className="flex items-center gap-1.5 text-[10px] text-gray-300 dark:text-gray-600">
        <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
        <Clock className="w-2.5 h-2.5" />
        <span>{gapText}</span>
        <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

/**
 * Helper: Convert time string to minutes
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}
