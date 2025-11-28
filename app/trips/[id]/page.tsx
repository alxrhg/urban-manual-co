'use client';

import { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import {
  ArrowLeft,
  Settings,
  Sparkles,
  Map,
  Plus,
  Loader2,
  MapPin,
  Cloud,
  Shield,
  ListChecks,
  StickyNote,
  Square,
  CheckSquare,
  X,
} from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import TripStats from '@/components/trip/TripStats';
import TripDaySection from '@/components/trip/TripDaySection';
import DayTabNav from '@/components/trip/DayTabNav';
import FloatingActionBar from '@/components/trip/FloatingActionBar';
import MapDrawer from '@/components/trip/MapDrawer';
import TripWeatherForecast from '@/components/trips/TripWeatherForecast';
import TripSafetyAlerts from '@/components/trips/TripSafetyAlerts';
import TripBucketList, { type BucketItem } from '@/components/trips/TripBucketList';
import type { FlightData } from '@/types/trip';
import type { Destination } from '@/types/destination';

/**
 * TripPage - Clean, minimal design with stone palette
 * Features: Stats grid, collapsible day sections, travel intelligence
 */
export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;
  const { user } = useAuth();
  const openDrawer = useDrawerStore((s) => s.openDrawer);

  // Trip Editor Hook
  const {
    trip,
    days,
    loading,
    saving,
    updateTrip,
    reorderItems,
    addPlace,
    addFlight,
    removeItem,
    refresh,
  } = useTripEditor({
    tripId,
    userId: user?.id,
    onError: (error) => console.error('Trip editor error:', error),
  });

  // UI State
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isAIPlanning, setIsAIPlanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'notes' | 'insights' | 'overview'>('itinerary');
  const [tripNotes, setTripNotes] = useState('');
  const [checklistItems, setChecklistItems] = useState<{ id: string; text: string; checked: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [bucketItems, setBucketItems] = useState<BucketItem[]>([]);

  // Get first destination coordinates for weather
  const firstDestination = useMemo(() => {
    const firstItem = days.flatMap(d => d.items).find(item => item.destination?.latitude);
    return firstItem?.destination;
  }, [days]);

  // Callbacks
  const openPlaceSelector = useCallback((dayNumber: number) => {
    openDrawer('place-selector', {
      tripId: trip?.id,
      dayNumber,
      city: trip?.destination,
      onSelect: (destination: Destination) => addPlace(destination, dayNumber),
    });
  }, [trip?.id, trip?.destination, openDrawer, addPlace]);

  const openFlightDrawer = useCallback((dayNumber: number) => {
    openDrawer('add-flight', {
      tripId: trip?.id,
      dayNumber,
      onAdd: (flightData: FlightData) => addFlight(flightData, dayNumber),
    });
  }, [trip?.id, openDrawer, addFlight]);

  const handleEditItem = useCallback((item: EnrichedItineraryItem) => {
    if (item.destination) {
      openDrawer('destination', {
        place: {
          name: item.destination.name,
          category: item.destination.category,
          neighborhood: item.destination.neighborhood ?? undefined,
          city: item.destination.city ?? undefined,
          michelinRating: item.destination.michelin_stars ?? undefined,
          hasMichelin: !!item.destination.michelin_stars,
          googleRating: item.destination.rating ?? undefined,
          googleReviews: item.destination.user_ratings_total ?? undefined,
          priceLevel: item.destination.price_level ?? undefined,
          description: item.destination.description ?? undefined,
          image: item.destination.image ?? undefined,
          image_thumbnail: item.destination.image_thumbnail ?? undefined,
          latitude: item.destination.latitude ?? undefined,
          longitude: item.destination.longitude ?? undefined,
          address: item.destination.formatted_address ?? undefined,
          website: item.destination.website ?? undefined,
        },
        hideAddToTrip: true,
      });
    }
    setActiveItemId(item.id);
  }, [openDrawer]);

  const handleAITripPlanning = async () => {
    if (!trip || !user) return;
    if (!trip.destination || !trip.start_date || !trip.end_date) {
      openDrawer('trip-settings', { trip, onUpdate: updateTrip });
      return;
    }

    try {
      setIsAIPlanning(true);
      const allItems = days.flatMap(day => day.items);

      if (allItems.length > 0) {
        const existingItemsForAPI = allItems.map(item => ({
          day: days.find(d => d.items.includes(item))?.dayNumber || 1,
          time: item.time,
          title: item.title,
          destination_slug: item.destination_slug,
          category: item.parsedNotes?.category || item.destination?.category,
        }));

        const response = await fetch('/api/intelligence/smart-fill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: trip.destination,
            existingItems: existingItemsForAPI,
            tripDays: days.length,
          }),
        });

        if (!response.ok) throw new Error('Failed to get AI suggestions');

        const result = await response.json();
        for (const suggestion of result.suggestions || []) {
          if (suggestion.destination) {
            await addPlace(suggestion.destination, suggestion.day, suggestion.startTime);
          }
        }
      } else {
        const response = await fetch('/api/intelligence/multi-day-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: trip.destination,
            startDate: trip.start_date,
            endDate: trip.end_date,
            userId: user.id,
          }),
        });

        if (!response.ok) throw new Error('Failed to generate trip plan');
        await refresh();
      }

      await refresh();
    } catch (err: unknown) {
      console.error('AI Planning error:', err);
    } finally {
      setIsAIPlanning(false);
    }
  };

  // Bucket list handlers
  const handleAddToBucketList = useCallback((item: Omit<BucketItem, 'id' | 'addedAt'>) => {
    setBucketItems(prev => [...prev, {
      ...item,
      id: `bucket-${Date.now()}`,
      addedAt: new Date().toISOString(),
    }]);
  }, []);

  const handleRemoveFromBucketList = useCallback((itemId: string) => {
    setBucketItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const handleAssignToDay = useCallback(async (item: BucketItem, dayNumber: number) => {
    // For place type items, try to find the destination and add it
    if (item.type === 'place' && item.url) {
      try {
        const slug = item.url.split('/').pop();
        if (slug) {
          const response = await fetch(`/api/destinations/${slug}`);
          if (response.ok) {
            const destination = await response.json();
            await addPlace(destination, dayNumber);
            handleRemoveFromBucketList(item.id);
          }
        }
      } catch (err) {
        console.error('Failed to add place:', err);
      }
    }
  }, [addPlace, handleRemoveFromBucketList]);

  // Loading state
  if (loading) {
    return (
      <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-20 bg-stone-50 dark:bg-gray-950 min-h-screen">
        <PageLoader />
      </main>
    );
  }

  // Not found
  if (!trip) {
    return (
      <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-20 min-h-screen bg-stone-50 dark:bg-gray-950">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs text-stone-500 dark:text-gray-400 mb-4">Trip not found</p>
            <Link
              href="/trips"
              className="text-sm text-stone-900 dark:text-white hover:underline min-h-[44px] flex items-center justify-center"
            >
              Back to trips
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Cover image from first destination
  const coverImage = days
    .flatMap(d => d.items)
    .find(item => item.destination?.image)?.destination?.image;

  return (
    <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-32 min-h-screen bg-stone-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto">
        {/* Header - Mobile optimized */}
        <div className="mb-6 sm:mb-8">
          {/* Mobile: Stacked layout, Desktop: Inline */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Top row on mobile: Back + Actions */}
            <div className="flex items-center justify-between sm:contents">
              {/* Back Button */}
              <Link
                href="/trips"
                className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors min-h-[44px] min-w-[44px] -ml-2 pl-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Trips</span>
              </Link>

              {/* Mobile Actions - Settings only (Map in FAB) */}
              <div className="flex items-center gap-1 sm:hidden">
                <button
                  onClick={() => openDrawer('trip-settings', {
                    trip,
                    onUpdate: updateTrip,
                    onDelete: () => router.push('/trips'),
                  })}
                  className="p-2.5 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Settings"
                >
                  <Settings className="w-5 h-5 text-stone-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Desktop: Spacer */}
            <div className="hidden sm:block flex-1" />

            {/* Trip Title */}
            <h1 className="text-xl sm:text-2xl font-light text-stone-900 dark:text-white truncate">
              {trip.title}
            </h1>

            {/* Desktop: Spacer */}
            <div className="hidden sm:block flex-1" />

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsMapOpen(true)}
                className="p-2.5 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="View Map"
              >
                <Map className="w-5 h-5 text-stone-500 dark:text-gray-400" />
              </button>
              <button
                onClick={() => openDrawer('trip-settings', {
                  trip,
                  onUpdate: updateTrip,
                  onDelete: () => router.push('/trips'),
                })}
                className="p-2.5 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-stone-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Cover Image (optional) - Taller on mobile for visual impact */}
          {coverImage && (
            <div className="relative w-full h-40 sm:h-48 md:h-64 rounded-xl sm:rounded-2xl overflow-hidden mb-4 sm:mb-6">
              <Image
                src={coverImage}
                alt={trip.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <TripStats
          days={days}
          destination={trip.destination}
          startDate={trip.start_date}
          endDate={trip.end_date}
          className="mb-8"
        />

        {/* Weather Preview (compact) */}
        {trip.destination && trip.start_date && (
          <div className="mb-8 p-4 border border-stone-200 dark:border-gray-800 rounded-2xl">
            <TripWeatherForecast
              destination={trip.destination}
              startDate={trip.start_date}
              endDate={trip.end_date}
              latitude={firstDestination?.latitude ?? undefined}
              longitude={firstDestination?.longitude ?? undefined}
              compact
            />
          </div>
        )}

        {/* Tab Navigation - Mobile optimized with horizontal scroll */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-4">
            {/* Tabs - Scrollable on mobile */}
            <div className="flex gap-x-1 sm:gap-x-4 text-xs overflow-x-auto scrollbar-hide -mx-1 px-1">
              {(['itinerary', 'notes', 'insights', 'overview'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    transition-all flex items-center gap-1.5 whitespace-nowrap
                    px-3 py-2 sm:px-2 sm:py-1 rounded-full sm:rounded-none
                    min-h-[40px] sm:min-h-0
                    ${activeTab === tab
                      ? 'font-medium text-stone-900 dark:text-white bg-stone-100 dark:bg-gray-800 sm:bg-transparent sm:dark:bg-transparent'
                      : 'font-medium text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
                    }
                  `}
                >
                  {tab === 'notes' && <StickyNote className="w-3.5 h-3.5 sm:w-3 sm:h-3" />}
                  {tab === 'insights' && <Cloud className="w-3.5 h-3.5 sm:w-3 sm:h-3" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Quick Actions - Hidden on mobile (use FAB instead) */}
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleAITripPlanning}
                disabled={isAIPlanning || saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-stone-900 dark:bg-white dark:text-gray-900 rounded-full hover:opacity-80 disabled:opacity-50 transition-opacity"
              >
                {isAIPlanning ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {isAIPlanning ? 'Autopilot...' : 'Autopilot'}
              </button>
              <button
                onClick={() => openPlaceSelector(selectedDayNumber)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-200 dark:border-gray-800 rounded-full hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Stop
              </button>
            </div>
          </div>
        </div>

        {/* Itinerary Tab */}
        {activeTab === 'itinerary' && (
          <div className="space-y-4 fade-in">
            {days.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12 border border-dashed border-stone-200 dark:border-gray-800 rounded-2xl">
                <MapPin className="h-12 w-12 mx-auto text-stone-300 dark:text-gray-700 mb-4" />
                <p className="text-sm text-stone-500 dark:text-gray-400 mb-4">No days in your trip yet</p>
                <button
                  onClick={() => openPlaceSelector(1)}
                  className="px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded-full hover:opacity-80 transition-opacity"
                >
                  Add your first stop
                </button>
              </div>
            ) : (
              <>
                {/* Horizontal Day Tabs */}
                <DayTabNav
                  days={days}
                  selectedDayNumber={selectedDayNumber}
                  onSelectDay={setSelectedDayNumber}
                  className="mb-4"
                />

                {/* Day Sections */}
                {days.map((day) => (
                  <TripDaySection
                    key={day.dayNumber}
                    day={day}
                    isSelected={day.dayNumber === selectedDayNumber}
                    onSelect={() => setSelectedDayNumber(day.dayNumber)}
                    onReorderItems={reorderItems}
                    onRemoveItem={removeItem}
                    onEditItem={handleEditItem}
                    onAddItem={openPlaceSelector}
                    activeItemId={activeItemId}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="fade-in space-y-6">
            {/* Checklist / Todo List */}
            <div className="p-6 border border-stone-200 dark:border-gray-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="w-4 h-4 text-stone-500" />
                <h3 className="text-xs font-medium text-stone-500 dark:text-gray-400">Checklist</h3>
              </div>

              {/* Add new item */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newChecklistItem.trim()) {
                      setChecklistItems(prev => [...prev, {
                        id: `item-${Date.now()}`,
                        text: newChecklistItem.trim(),
                        checked: false,
                      }]);
                      setNewChecklistItem('');
                    }
                  }}
                  placeholder="Add item (press Enter)"
                  className="flex-1 px-3 py-2 text-sm text-stone-700 dark:text-gray-300 bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 rounded-lg placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-700"
                />
                <button
                  onClick={() => {
                    if (newChecklistItem.trim()) {
                      setChecklistItems(prev => [...prev, {
                        id: `item-${Date.now()}`,
                        text: newChecklistItem.trim(),
                        checked: false,
                      }]);
                      setNewChecklistItem('');
                    }
                  }}
                  className="px-3 py-2 text-sm font-medium text-white bg-stone-900 dark:bg-white dark:text-gray-900 rounded-lg hover:opacity-80 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Checklist items */}
              <div className="space-y-2">
                {checklistItems.length === 0 ? (
                  <p className="text-xs text-stone-400 dark:text-gray-500 text-center py-4">
                    No items yet. Add packing items, reminders, or tasks.
                  </p>
                ) : (
                  checklistItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-gray-800/50 group"
                    >
                      <button
                        onClick={() => setChecklistItems(prev =>
                          prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i)
                        )}
                        className="flex-shrink-0"
                      >
                        {item.checked ? (
                          <CheckSquare className="w-5 h-5 text-green-500" />
                        ) : (
                          <Square className="w-5 h-5 text-stone-400 dark:text-gray-500" />
                        )}
                      </button>
                      <span className={`flex-1 text-sm ${item.checked ? 'text-stone-400 dark:text-gray-500 line-through' : 'text-stone-700 dark:text-gray-300'}`}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => setChecklistItems(prev => prev.filter(i => i.id !== item.id))}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-500 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Free-form Notes */}
            <div className="p-6 border border-stone-200 dark:border-gray-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <StickyNote className="w-4 h-4 text-stone-500" />
                <h3 className="text-xs font-medium text-stone-500 dark:text-gray-400">Notes</h3>
              </div>
              <textarea
                value={tripNotes}
                onChange={(e) => setTripNotes(e.target.value)}
                placeholder="Add notes for your trip... reservations, reminders, etc."
                className="w-full min-h-[150px] p-4 text-sm text-stone-700 dark:text-gray-300 bg-stone-50 dark:bg-gray-900 border border-stone-200 dark:border-gray-800 rounded-xl resize-y placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-700"
              />
            </div>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6 fade-in">
            {/* Weather Forecast */}
            <div className="p-6 border border-stone-200 dark:border-gray-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Cloud className="w-4 h-4 text-stone-500" />
                <h3 className="text-xs font-medium text-stone-500 dark:text-gray-400">Weather Forecast</h3>
              </div>
              <TripWeatherForecast
                destination={trip.destination}
                startDate={trip.start_date}
                endDate={trip.end_date}
                latitude={firstDestination?.latitude ?? undefined}
                longitude={firstDestination?.longitude ?? undefined}
              />
            </div>

            {/* Safety Alerts */}
            <div className="p-6 border border-stone-200 dark:border-gray-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-stone-500" />
                <h3 className="text-xs font-medium text-stone-500 dark:text-gray-400">Travel Advisories</h3>
              </div>
              <TripSafetyAlerts destination={trip.destination} />
            </div>

            {/* Bucket List */}
            <div className="p-6 border border-stone-200 dark:border-gray-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="w-4 h-4 text-stone-500" />
                <h3 className="text-xs font-medium text-stone-500 dark:text-gray-400">Bucket List</h3>
              </div>
              <TripBucketList
                items={bucketItems}
                onAdd={handleAddToBucketList}
                onRemove={handleRemoveFromBucketList}
                onReorder={setBucketItems}
                onAssignToDay={handleAssignToDay}
                availableDays={days.map(d => d.dayNumber)}
              />
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="fade-in">
            <div className="p-6 border border-stone-200 dark:border-gray-800 rounded-2xl">
              <h3 className="text-xs font-medium text-stone-500 dark:text-gray-400 mb-4">Trip Summary</h3>
              <div className="space-y-4">
                {trip.description ? (
                  <p className="text-sm text-stone-600 dark:text-gray-300">{trip.description}</p>
                ) : (
                  <p className="text-xs text-stone-400 dark:text-gray-500">
                    No description added yet. Edit your trip to add one.
                  </p>
                )}

                <div className="pt-4 border-t border-stone-100 dark:border-gray-800">
                  <h4 className="text-xs font-medium text-stone-500 dark:text-gray-400 mb-3">All Stops</h4>
                  <div className="space-y-2">
                    {days.flatMap(day =>
                      day.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleEditItem(item)}
                          className="w-full text-left p-2 hover:bg-stone-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-stone-400 w-8">D{day.dayNumber}</span>
                            <span className="text-sm text-stone-900 dark:text-white truncate flex-1">
                              {item.title}
                            </span>
                            <span className="text-xs text-stone-400 capitalize">
                              {item.parsedNotes?.category || item.destination?.category}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                    {days.flatMap(d => d.items).length === 0 && (
                      <p className="text-xs text-stone-400 dark:text-gray-500 py-4 text-center">
                        No stops added yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        onAddPlace={() => openPlaceSelector(selectedDayNumber)}
        onAddFlight={() => openFlightDrawer(selectedDayNumber)}
        onAddNote={() => openDrawer('trip-notes', { tripId: trip.id })}
        onOpenMap={() => setIsMapOpen(true)}
        onAIPlan={handleAITripPlanning}
        isAIPlanning={isAIPlanning}
        isSaving={saving}
      />

      {/* Map Drawer */}
      <MapDrawer
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        days={days}
        selectedDayNumber={selectedDayNumber}
        activeItemId={activeItemId}
        onMarkerClick={setActiveItemId}
      />
    </main>
  );
}
