'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
  ListChecks,
  StickyNote,
  Square,
  CheckSquare,
  X,
  Pencil,
  Check,
  Plane,
  Hotel,
  Calendar,
  Clock,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
  Share2,
  Download,
  Copy,
  Users,
  DollarSign,
  TrendingUp,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  Route,
  Camera,
  FileText,
  AlertCircle,
  Utensils,
  Coffee,
  Wine,
  Landmark,
  ShoppingBag,
} from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import DayTimeline from '@/components/trip/DayTimeline';
import { TransitMode } from '@/components/trip/TransitConnector';
import DayTabNav from '@/components/trip/DayTabNav';
import FloatingActionBar from '@/components/trip/FloatingActionBar';
import AlertsDropdown from '@/components/trip/AlertsDropdown';
import AddPlaceBox from '@/components/trip/AddPlaceBox';
import TripSettingsBox from '@/components/trip/TripSettingsBox';
import RouteMapBox from '@/components/trip/RouteMapBox';
import DestinationBox from '@/components/trip/DestinationBox';
import SmartSuggestions from '@/components/trip/SmartSuggestions';
import LocalEvents from '@/components/trip/LocalEvents';
import TripBucketList from '@/components/trip/TripBucketList';
import DayDropZone from '@/components/trip/DayDropZone';
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  analyzeScheduleForWarnings,
  detectConflicts,
  checkClosureDays,
} from '@/lib/intelligence/schedule-analyzer';
import type { FlightData, ActivityData } from '@/types/trip';
import { parseDestinations, formatDestinationsFromField, parseTripNotes, stringifyTripNotes } from '@/types/trip';
import type { Destination } from '@/types/destination';
import type { PlannerWarning } from '@/lib/intelligence/types';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatTripDateRange, calculateTripDays, parseDateString } from '@/lib/utils';

// Category icons map
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  restaurant: Utensils,
  cafe: Coffee,
  bar: Wine,
  museum: Landmark,
  hotel: Hotel,
  shopping: ShoppingBag,
  default: MapPin,
};

// Get weather icon based on condition
function getWeatherIcon(condition: string) {
  const lower = condition.toLowerCase();
  if (lower.includes('sun') || lower.includes('clear')) return Sun;
  if (lower.includes('cloud')) return Cloud;
  if (lower.includes('rain')) return CloudRain;
  if (lower.includes('snow')) return Snowflake;
  if (lower.includes('wind')) return Wind;
  return Sun;
}

// Calculate trip statistics
function calculateTripStats(days: { items: EnrichedItineraryItem[] }[]) {
  const allItems = days.flatMap(d => d.items);

  const categories: Record<string, number> = {};
  let totalDuration = 0;
  let placesWithTime = 0;

  allItems.forEach(item => {
    const category = item.parsedNotes?.category || item.destination?.category || 'other';
    categories[category] = (categories[category] || 0) + 1;

    if (item.parsedNotes?.duration) {
      totalDuration += item.parsedNotes.duration;
      placesWithTime++;
    }
  });

  const flights = allItems.filter(i => i.parsedNotes?.type === 'flight').length;
  const hotels = allItems.filter(i => i.parsedNotes?.type === 'hotel').length;
  const restaurants = Object.entries(categories)
    .filter(([cat]) => ['restaurant', 'dining', 'bistro', 'cafe', 'bar'].some(t => cat.includes(t)))
    .reduce((acc, [, count]) => acc + count, 0);
  const attractions = Object.entries(categories)
    .filter(([cat]) => ['museum', 'landmark', 'attraction', 'gallery', 'park'].some(t => cat.includes(t)))
    .reduce((acc, [, count]) => acc + count, 0);

  return {
    totalPlaces: allItems.length,
    flights,
    hotels,
    restaurants,
    attractions,
    categories,
    avgDuration: placesWithTime > 0 ? Math.round(totalDuration / placesWithTime) : 60,
  };
}

/**
 * TripPage - Enhanced trip detail view
 * Features: Overview dashboard, timeline, flights, hotels, notes, statistics
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
    addTrain,
    addActivity,
    removeItem,
    updateItemTime,
    updateItemDuration,
    updateItemNotes,
    updateItem,
    refresh,
  } = useTripEditor({
    tripId,
    userId: user?.id,
    onError: (error) => console.error('Trip editor error:', error),
  });

  // Parse destinations for multi-city support
  const destinations = useMemo(() => parseDestinations(trip?.destination ?? null), [trip?.destination]);
  const primaryCity = destinations[0] || '';
  const destinationsDisplay = useMemo(() => formatDestinationsFromField(trip?.destination ?? null), [trip?.destination]);

  // Calculate trip statistics
  const tripStats = useMemo(() => calculateTripStats(days), [days]);
  const daysCount = calculateTripDays(trip?.start_date, trip?.end_date);

  // UI State
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isAIPlanning, setIsAIPlanning] = useState(false);
  const [optimizingDay, setOptimizingDay] = useState<number | null>(null);
  const [autoFillingDay, setAutoFillingDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'flights' | 'hotels' | 'notes'>('overview');
  const [isEditMode, setIsEditMode] = useState(false);
  const [tripNotes, setTripNotes] = useState('');
  const [checklistItems, setChecklistItems] = useState<{ id: string; text: string; checked: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [warnings, setWarnings] = useState<PlannerWarning[]>([]);
  const [showAddPlaceBox, setShowAddPlaceBox] = useState(false);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [showMapBox, setShowMapBox] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EnrichedItineraryItem | null>(null);
  const [bucketDragItem, setBucketDragItem] = useState<Destination | null>(null);

  // Load saved notes from trip
  useEffect(() => {
    if (trip?.notes) {
      const parsed = parseTripNotes(trip.notes);
      const textItems = parsed.items.filter(i => i.type === 'text');
      const checkItems = parsed.items.filter(i => i.type === 'checkbox');

      if (textItems.length > 0) {
        setTripNotes(textItems.map(i => i.content).join('\n'));
      }

      setChecklistItems(checkItems.map(i => ({
        id: i.id,
        text: i.content,
        checked: i.checked || false,
      })));
    }
  }, [trip?.notes]);

  // Save notes when they change
  const saveNotes = useCallback(async () => {
    if (!trip) return;

    const items = [
      ...tripNotes.split('\n').filter(t => t.trim()).map((content, i) => ({
        id: `text-${i}`,
        type: 'text' as const,
        content,
      })),
      ...checklistItems.map(item => ({
        id: item.id,
        type: 'checkbox' as const,
        content: item.text,
        checked: item.checked,
      })),
    ];

    await updateTrip({ notes: stringifyTripNotes({ items }) });
  }, [trip, tripNotes, checklistItems, updateTrip]);

  // Debounced save
  useEffect(() => {
    const timeout = setTimeout(saveNotes, 1000);
    return () => clearTimeout(timeout);
  }, [tripNotes, checklistItems, saveNotes]);

  // Handle bucket list drag events
  const handleBucketDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'bucket-item') {
      setBucketDragItem(data.destination);
    }
  }, []);

  const handleBucketDragEnd = useCallback((event: DragEndEvent) => {
    setBucketDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    if (overId.startsWith('day-drop-')) {
      const dayNumber = parseInt(overId.replace('day-drop-', ''), 10);
      const data = active.data.current;
      if (data?.type === 'bucket-item' && data.destination) {
        addPlace(data.destination, dayNumber);
      }
    }
  }, [addPlace]);

  const handleAddFromBucket = useCallback((destination: Destination, dayNumber: number) => {
    addPlace(destination, dayNumber);
  }, [addPlace]);

  // Extract flights and hotels from itinerary
  const flights = useMemo(() => {
    return days.flatMap(d =>
      d.items.filter(item => item.parsedNotes?.type === 'flight')
        .map(item => ({ ...item, dayNumber: d.dayNumber }))
    );
  }, [days]);

  const hotels = useMemo(() => {
    const hotelItems = days.flatMap(d =>
      d.items.filter(item => item.parsedNotes?.type === 'hotel')
        .map(item => ({ ...item, dayNumber: d.dayNumber }))
    );

    // Helper to calculate effective day number
    const getEffectiveDayNum = (hotel: typeof hotelItems[0]) => {
      if (hotel.parsedNotes?.checkInDate && trip?.start_date) {
        const tripStart = new Date(trip.start_date);
        tripStart.setHours(0, 0, 0, 0);
        const checkIn = new Date(hotel.parsedNotes.checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        return Math.floor((checkIn.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }
      return hotel.dayNumber;
    };

    return hotelItems.sort((a, b) => {
      const aDayNum = getEffectiveDayNum(a);
      const bDayNum = getEffectiveDayNum(b);
      if (aDayNum !== bDayNum) return aDayNum - bDayNum;
      return (a.order_index || 0) - (b.order_index || 0);
    });
  }, [days, trip?.start_date]);

  // Compute which hotel covers each night
  const nightlyHotelByDay = useMemo(() => {
    const hotelMap: Record<number, typeof hotels[0] | null> = {};
    if (!trip?.start_date) return hotelMap;

    const tripStart = new Date(trip.start_date);
    tripStart.setHours(0, 0, 0, 0);

    hotels.forEach(hotel => {
      const checkInDate = hotel.parsedNotes?.checkInDate;
      const checkOutDate = hotel.parsedNotes?.checkOutDate;
      if (!checkInDate) return;

      const inDate = new Date(checkInDate);
      inDate.setHours(0, 0, 0, 0);
      const checkInDayNum = Math.floor((inDate.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      let nights = 1;
      if (checkOutDate) {
        try {
          const outDate = new Date(checkOutDate);
          outDate.setHours(0, 0, 0, 0);
          nights = Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
        } catch {
          nights = 1;
        }
      }

      for (let i = 0; i < nights; i++) {
        const nightDay = checkInDayNum + i;
        if (nightDay > 0 && !hotelMap[nightDay]) {
          hotelMap[nightDay] = hotel;
        }
      }
    });

    return hotelMap;
  }, [hotels, trip?.start_date]);

  // Generate trip warnings
  useMemo(() => {
    const newWarnings: PlannerWarning[] = [];

    const scheduleItems = days.flatMap(d =>
      d.items.map(item => ({
        id: item.id,
        title: item.title,
        dayNumber: d.dayNumber,
        time: item.time,
        duration: item.parsedNotes?.duration,
        category: item.parsedNotes?.category || item.destination?.category,
        parsedNotes: item.parsedNotes,
      }))
    );

    const scheduleWarnings = analyzeScheduleForWarnings(scheduleItems);
    newWarnings.push(...scheduleWarnings);

    const conflictWarnings = detectConflicts(scheduleItems);
    newWarnings.push(...conflictWarnings);

    const closureWarnings = checkClosureDays(scheduleItems, trip?.start_date ?? undefined);
    newWarnings.push(...closureWarnings);

    days.forEach(day => {
      if (day.items.length === 0) {
        newWarnings.push({
          id: `empty-day-${day.dayNumber}`,
          type: 'timing',
          severity: 'low',
          message: `Day ${day.dayNumber} has no activities planned`,
          suggestion: 'Add some places to fill your day',
        });
      }
    });

    days.forEach(day => {
      if (day.items.length > 6) {
        newWarnings.push({
          id: `busy-day-${day.dayNumber}`,
          type: 'timing',
          severity: 'medium',
          message: `Day ${day.dayNumber} looks very packed (${day.items.length} stops)`,
          suggestion: 'Consider spreading activities across multiple days',
        });
      }
    });

    setWarnings(newWarnings.slice(0, 10));
  }, [days, trip?.start_date]);

  // Callbacks
  const openPlaceSelector = useCallback((dayNumber: number, category?: string) => {
    openDrawer('place-selector', {
      tripId: trip?.id,
      dayNumber,
      city: trip?.destination,
      category,
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
    setSelectedItem(item);
    setShowAddPlaceBox(false);
    setShowTripSettings(false);
    setShowMapBox(false);
    setActiveItemId(item.id);
  }, []);

  const handleTravelModeChange = useCallback((itemId: string, mode: TransitMode) => {
    updateItem(itemId, { travelModeToNext: mode });
  }, [updateItem]);

  const handleAITripPlanning = async () => {
    if (!trip || !user) return;
    if (!primaryCity || !trip.start_date || !trip.end_date) {
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
            city: primaryCity,
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
            city: primaryCity,
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

  const handleAutoFillDay = useCallback(async (dayNumber: number) => {
    if (!trip?.destination) return;

    setAutoFillingDay(dayNumber);
    try {
      const day = days.find(d => d.dayNumber === dayNumber);
      const existingItems = day?.items.map(item => ({
        day: dayNumber,
        time: item.time,
        title: item.title,
        destination_slug: item.destination_slug,
        category: item.parsedNotes?.category || item.destination?.category,
      })) || [];

      const response = await fetch('/api/intelligence/smart-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: primaryCity,
          existingItems,
          tripDays: 1,
          targetDay: dayNumber,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        for (const suggestion of result.suggestions || []) {
          if (suggestion.destination && suggestion.day === dayNumber) {
            await addPlace(suggestion.destination, dayNumber, suggestion.startTime);
          }
        }
        await refresh();
      }
    } catch (err) {
      console.error('Failed to auto-fill day:', err);
    } finally {
      setAutoFillingDay(null);
    }
  }, [primaryCity, days, addPlace, refresh]);

  const handleAddFromNL = useCallback(async (
    destination: unknown,
    dayNumber: number,
    time?: string
  ) => {
    const dest = destination as { id: number; slug: string; name: string; category: string };
    if (dest && dest.slug) {
      const fullDest: Destination = {
        id: dest.id,
        slug: dest.slug,
        name: dest.name,
        category: dest.category,
        city: primaryCity,
      };
      await addPlace(fullDest, dayNumber, time);
      await refresh();
    }
  }, [addPlace, refresh, primaryCity]);

  const handleAddAISuggestion = useCallback(async (suggestion: {
    destination: { id: number; slug: string; name: string; category: string };
    day: number;
    startTime: string;
  }) => {
    const fullDest: Destination = {
      id: suggestion.destination.id,
      slug: suggestion.destination.slug,
      name: suggestion.destination.name,
      category: suggestion.destination.category,
      city: trip?.destination || '',
    };
    await addPlace(fullDest, suggestion.day, suggestion.startTime);
    await refresh();
  }, [addPlace, refresh, trip?.destination]);

  const shareTrip = async () => {
    if (!trip) return;
    const url = `${window.location.origin}/trips/${trip.id}`;
    const text = `Check out my trip: ${trip.title}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: trip.title, text, url });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

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

  // Cover image from trip or first destination
  const coverImage = trip.cover_image || days
    .flatMap(d => d.items)
    .find(item => item.destination?.image)?.destination?.image;

  // Trip progress
  const progress = useMemo(() => {
    if (!daysCount || daysCount <= 0) return 0;
    const itemsPerDay = tripStats.totalPlaces / daysCount;
    const hasHotel = tripStats.hotels > 0 ? 25 : 0;
    const hasFlight = tripStats.flights > 0 ? 25 : 0;
    const hasItems = Math.min(itemsPerDay * 20, 50);
    return Math.min(hasHotel + hasFlight + hasItems, 100);
  }, [daysCount, tripStats]);

  return (
    <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-32 min-h-screen bg-stone-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
            {/* Back Button */}
            <Link
              href="/trips"
              className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors min-h-[44px] -ml-2 pl-2 self-start"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Trips</span>
            </Link>

            <div className="flex-1" />

            {/* Trip Title */}
            <h1 className="text-xl sm:text-2xl font-light text-stone-900 dark:text-white truncate order-first sm:order-none">
              {trip.title}
            </h1>

            <div className="flex-1" />

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <AlertsDropdown
                warnings={warnings}
                onDismiss={(id) => setWarnings(prev => prev.filter(w => w.id !== id))}
              />
              <button
                onClick={shareTrip}
                className="p-2.5 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Share"
              >
                <Share2 className="w-5 h-5 text-stone-500 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setShowMapBox(true)}
                className="p-2.5 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="View Map"
              >
                <Map className="w-5 h-5 text-stone-500 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setShowTripSettings(true)}
                className="p-2.5 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-stone-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Trip Meta */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-stone-500 dark:text-gray-400 mb-4">
            {destinationsDisplay && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {destinationsDisplay}
              </span>
            )}
            {formatTripDateRange(trip.start_date, trip.end_date) && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatTripDateRange(trip.start_date, trip.end_date)}
              </span>
            )}
            {daysCount && daysCount > 0 && (
              <span>{daysCount} day{daysCount !== 1 ? 's' : ''}</span>
            )}
          </div>

          {/* Cover Image */}
          {coverImage && (
            <div className="relative w-full h-40 sm:h-48 rounded-2xl overflow-hidden mb-6">
              <Image
                src={coverImage}
                alt={trip.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <div className="flex items-center justify-between gap-4 mb-6">
            <TabsList className="h-auto p-1 bg-stone-100 dark:bg-gray-800 rounded-xl">
              <TabsTrigger value="overview" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="itinerary" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                <Route className="w-3.5 h-3.5 mr-1.5" />
                Itinerary
              </TabsTrigger>
              <TabsTrigger value="flights" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                <Plane className="w-3.5 h-3.5 mr-1.5" />
                Flights
                {flights.length > 0 && (
                  <span className="ml-1.5 w-4 h-4 rounded-full bg-stone-200 dark:bg-gray-600 text-[10px] flex items-center justify-center">
                    {flights.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="hotels" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                <Hotel className="w-3.5 h-3.5 mr-1.5" />
                Hotels
                {hotels.length > 0 && (
                  <span className="ml-1.5 w-4 h-4 rounded-full bg-stone-200 dark:bg-gray-600 text-[10px] flex items-center justify-center">
                    {hotels.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs px-3 py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Notes
              </TabsTrigger>
            </TabsList>

            {/* Quick Actions */}
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
                {isAIPlanning ? 'Planning...' : 'Auto-plan'}
              </button>
              <button
                onClick={() => setShowAddPlaceBox(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-200 dark:border-gray-800 rounded-full hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Trip Progress */}
                {trip.status === 'planning' && (
                  <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-stone-900 dark:text-white">Planning Progress</h3>
                      <span className="text-xs text-stone-500 dark:text-gray-400">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2 mb-4" />
                    <div className="grid grid-cols-4 gap-2">
                      <div className={`text-center p-2 rounded-lg ${tripStats.flights > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-stone-50 dark:bg-gray-800'}`}>
                        <Plane className={`w-4 h-4 mx-auto mb-1 ${tripStats.flights > 0 ? 'text-green-600' : 'text-stone-400'}`} />
                        <p className="text-[10px] text-stone-500 dark:text-gray-400">Flights</p>
                      </div>
                      <div className={`text-center p-2 rounded-lg ${tripStats.hotels > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-stone-50 dark:bg-gray-800'}`}>
                        <Hotel className={`w-4 h-4 mx-auto mb-1 ${tripStats.hotels > 0 ? 'text-green-600' : 'text-stone-400'}`} />
                        <p className="text-[10px] text-stone-500 dark:text-gray-400">Hotels</p>
                      </div>
                      <div className={`text-center p-2 rounded-lg ${tripStats.restaurants > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-stone-50 dark:bg-gray-800'}`}>
                        <Utensils className={`w-4 h-4 mx-auto mb-1 ${tripStats.restaurants > 0 ? 'text-green-600' : 'text-stone-400'}`} />
                        <p className="text-[10px] text-stone-500 dark:text-gray-400">Dining</p>
                      </div>
                      <div className={`text-center p-2 rounded-lg ${tripStats.attractions > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-stone-50 dark:bg-gray-800'}`}>
                        <Landmark className={`w-4 h-4 mx-auto mb-1 ${tripStats.attractions > 0 ? 'text-green-600' : 'text-stone-400'}`} />
                        <p className="text-[10px] text-stone-500 dark:text-gray-400">Activities</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800">
                    <MapPin className="w-5 h-5 text-stone-400 mb-2" />
                    <p className="text-2xl font-light text-stone-900 dark:text-white">{tripStats.totalPlaces}</p>
                    <p className="text-xs text-stone-500 dark:text-gray-400">Places</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800">
                    <Calendar className="w-5 h-5 text-stone-400 mb-2" />
                    <p className="text-2xl font-light text-stone-900 dark:text-white">{daysCount || 0}</p>
                    <p className="text-xs text-stone-500 dark:text-gray-400">Days</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800">
                    <Plane className="w-5 h-5 text-stone-400 mb-2" />
                    <p className="text-2xl font-light text-stone-900 dark:text-white">{tripStats.flights}</p>
                    <p className="text-xs text-stone-500 dark:text-gray-400">Flights</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800">
                    <Hotel className="w-5 h-5 text-stone-400 mb-2" />
                    <p className="text-2xl font-light text-stone-900 dark:text-white">{tripStats.hotels}</p>
                    <p className="text-xs text-stone-500 dark:text-gray-400">Hotels</p>
                  </div>
                </div>

                {/* Day Overview */}
                <div className="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-stone-900 dark:text-white">Day Overview</h3>
                    <button
                      onClick={() => setActiveTab('itinerary')}
                      className="text-xs text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white flex items-center gap-1"
                    >
                      View all <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {days.slice(0, 5).map((day) => (
                      <button
                        key={day.dayNumber}
                        onClick={() => {
                          setSelectedDayNumber(day.dayNumber);
                          setActiveTab('itinerary');
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-stone-900 dark:text-white">{day.dayNumber}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-stone-900 dark:text-white">
                            Day {day.dayNumber}
                            {day.date && (
                              <span className="text-stone-400 dark:text-gray-500 ml-2">
                                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-gray-400 truncate">
                            {day.items.length === 0 ? 'No activities yet' : `${day.items.length} ${day.items.length === 1 ? 'stop' : 'stops'}`}
                          </p>
                        </div>
                        {day.items.length === 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            Empty
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">Heads up</h3>
                    </div>
                    <div className="space-y-2">
                      {warnings.slice(0, 3).map((warning) => (
                        <p key={warning.id} className="text-xs text-amber-700 dark:text-amber-400">
                          {warning.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {showTripSettings ? (
                  <TripSettingsBox
                    trip={trip}
                    onUpdate={updateTrip}
                    onDelete={() => router.push('/trips')}
                    onClose={() => setShowTripSettings(false)}
                  />
                ) : showMapBox ? (
                  <RouteMapBox
                    days={days}
                    selectedDayNumber={selectedDayNumber}
                    activeItemId={activeItemId}
                    onMarkerClick={setActiveItemId}
                    onClose={() => setShowMapBox(false)}
                  />
                ) : showAddPlaceBox ? (
                  <AddPlaceBox
                    city={primaryCity}
                    dayNumber={selectedDayNumber}
                    onSelect={(destination) => {
                      addPlace(destination, selectedDayNumber);
                      setShowAddPlaceBox(false);
                    }}
                    onAddFlight={(flightData) => {
                      addFlight(flightData, selectedDayNumber);
                      setShowAddPlaceBox(false);
                    }}
                    onAddTrain={(trainData) => {
                      addTrain(trainData, selectedDayNumber);
                      setShowAddPlaceBox(false);
                    }}
                    onAddActivity={(activityData) => {
                      addActivity(activityData, selectedDayNumber);
                      setShowAddPlaceBox(false);
                    }}
                    onClose={() => setShowAddPlaceBox(false)}
                  />
                ) : (
                  <>
                    <SmartSuggestions
                      days={days}
                      destination={primaryCity}
                      selectedDayNumber={selectedDayNumber}
                      onAddPlace={openPlaceSelector}
                      onAddAISuggestion={handleAddAISuggestion}
                      onAddFromNL={handleAddFromNL}
                    />
                    {trip.start_date && (
                      <LocalEvents
                        city={primaryCity}
                        startDate={trip.start_date}
                        endDate={trip.end_date}
                        onAddToTrip={() => openPlaceSelector(selectedDayNumber)}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Itinerary Tab */}
          <TabsContent value="itinerary" className="mt-0">
            {days.length === 0 ? (
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
              <DndContext onDragStart={handleBucketDragStart} onDragEnd={handleBucketDragEnd}>
                <div className="lg:flex lg:gap-6">
                  {/* Main Itinerary Column */}
                  <div className="flex-1 min-w-0 space-y-4">
                    {/* Day Tabs + Edit Toggle */}
                    <div className="flex items-center gap-4 mb-4">
                      <DayTabNav
                        days={days}
                        selectedDayNumber={selectedDayNumber}
                        onSelectDay={setSelectedDayNumber}
                      />
                      <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          isEditMode
                            ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900'
                            : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        {isEditMode ? (
                          <>
                            <Check className="w-3 h-3" />
                            Done
                          </>
                        ) : (
                          <>
                            <Pencil className="w-3 h-3" />
                            Edit
                          </>
                        )}
                      </button>
                    </div>

                    {/* Selected Day Timeline */}
                    {days.filter(day => day.dayNumber === selectedDayNumber).map((day) => (
                      <DayDropZone key={day.dayNumber} dayNumber={day.dayNumber}>
                        <DayTimeline
                          day={day}
                          nightlyHotel={nightlyHotelByDay[day.dayNumber] || null}
                          onReorderItems={reorderItems}
                          onRemoveItem={isEditMode ? removeItem : undefined}
                          onEditItem={handleEditItem}
                          onTimeChange={updateItemTime}
                          onDurationChange={updateItemDuration}
                          onTravelModeChange={handleTravelModeChange}
                          onAddItem={openPlaceSelector}
                          onOptimizeDay={handleOptimizeDay}
                          onAutoFillDay={handleAutoFillDay}
                          activeItemId={activeItemId}
                          isOptimizing={optimizingDay === day.dayNumber}
                          isAutoFilling={autoFillingDay === day.dayNumber}
                          isEditMode={isEditMode}
                        />
                      </DayDropZone>
                    ))}
                  </div>

                  {/* Sidebar (Desktop) */}
                  <div className="hidden lg:block lg:w-80 lg:flex-shrink-0 space-y-4">
                    {showTripSettings ? (
                      <TripSettingsBox
                        trip={trip}
                        onUpdate={updateTrip}
                        onDelete={() => router.push('/trips')}
                        onClose={() => setShowTripSettings(false)}
                      />
                    ) : showMapBox ? (
                      <RouteMapBox
                        days={days}
                        selectedDayNumber={selectedDayNumber}
                        activeItemId={activeItemId}
                        onMarkerClick={setActiveItemId}
                        onClose={() => setShowMapBox(false)}
                      />
                    ) : showAddPlaceBox ? (
                      <AddPlaceBox
                        city={primaryCity}
                        dayNumber={selectedDayNumber}
                        onSelect={(destination) => {
                          addPlace(destination, selectedDayNumber);
                          setShowAddPlaceBox(false);
                        }}
                        onAddFlight={(flightData) => {
                          addFlight(flightData, selectedDayNumber);
                          setShowAddPlaceBox(false);
                        }}
                        onAddTrain={(trainData) => {
                          addTrain(trainData, selectedDayNumber);
                          setShowAddPlaceBox(false);
                        }}
                        onAddActivity={(activityData) => {
                          addActivity(activityData, selectedDayNumber);
                          setShowAddPlaceBox(false);
                        }}
                        onClose={() => setShowAddPlaceBox(false)}
                      />
                    ) : selectedItem ? (
                      <DestinationBox
                        item={selectedItem}
                        onClose={() => {
                          setSelectedItem(null);
                          setActiveItemId(null);
                        }}
                        onTimeChange={updateItemTime}
                        onNotesChange={updateItemNotes}
                        onItemUpdate={updateItem}
                        onRemove={(itemId) => {
                          removeItem(itemId);
                          setSelectedItem(null);
                          setActiveItemId(null);
                        }}
                      />
                    ) : (
                      <>
                        <TripBucketList
                          destinations={destinations}
                          onAddToTrip={handleAddFromBucket}
                          selectedDayNumber={selectedDayNumber}
                        />
                        <SmartSuggestions
                          days={days}
                          destination={primaryCity}
                          selectedDayNumber={selectedDayNumber}
                          onAddPlace={openPlaceSelector}
                          onAddAISuggestion={handleAddAISuggestion}
                          onAddFromNL={handleAddFromNL}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                  {bucketDragItem && (
                    <div className="flex items-center gap-3 p-2 rounded-xl border border-stone-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl cursor-grabbing w-64">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-stone-100 dark:bg-gray-800 flex-shrink-0">
                        {bucketDragItem.image || bucketDragItem.image_thumbnail ? (
                          <Image
                            src={bucketDragItem.image_thumbnail || bucketDragItem.image || ''}
                            alt={bucketDragItem.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-stone-300 dark:text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-stone-900 dark:text-white truncate">
                          {bucketDragItem.name}
                        </p>
                        <p className="text-[10px] text-stone-500 dark:text-gray-400 capitalize truncate">
                          {bucketDragItem.category?.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </TabsContent>

          {/* Flights Tab */}
          <TabsContent value="flights" className="mt-0">
            <div className="space-y-4">
              {flights.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-stone-200 dark:border-gray-800 rounded-2xl">
                  <Plane className="h-12 w-12 mx-auto text-stone-300 dark:text-gray-700 mb-4" />
                  <p className="text-sm text-stone-500 dark:text-gray-400 mb-4">No flights added yet</p>
                  <button
                    onClick={() => openFlightDrawer(selectedDayNumber)}
                    className="px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded-full hover:opacity-80 transition-opacity"
                  >
                    Add a flight
                  </button>
                </div>
              ) : (
                <>
                  {flights.map((flight) => (
                    <div
                      key={flight.id}
                      onClick={() => handleEditItem(flight)}
                      className="p-4 border border-stone-200 dark:border-gray-800 rounded-2xl hover:bg-stone-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-stone-400">Day {flight.dayNumber}</span>
                        <span className="text-xs text-stone-400">{flight.parsedNotes?.departureDate}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <Plane className="w-5 h-5 text-stone-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-stone-900 dark:text-white">
                            {flight.parsedNotes?.from} → {flight.parsedNotes?.to}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                            {flight.parsedNotes?.airline} {flight.parsedNotes?.flightNumber}
                            {flight.parsedNotes?.departureTime && ` · ${flight.parsedNotes.departureTime}`}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-400" />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => openFlightDrawer(selectedDayNumber)}
                    className="w-full py-3 border border-dashed border-stone-200 dark:border-gray-800 rounded-2xl text-xs font-medium text-stone-500 dark:text-gray-400 hover:border-stone-300 dark:hover:border-gray-700 transition-colors"
                  >
                    + Add another flight
                  </button>
                </>
              )}
            </div>
          </TabsContent>

          {/* Hotels Tab */}
          <TabsContent value="hotels" className="mt-0">
            <div className="space-y-4">
              {hotels.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-stone-200 dark:border-gray-800 rounded-2xl">
                  <Hotel className="h-12 w-12 mx-auto text-stone-300 dark:text-gray-700 mb-4" />
                  <p className="text-sm text-stone-500 dark:text-gray-400 mb-4">No hotels added yet</p>
                  <button
                    onClick={() => openPlaceSelector(selectedDayNumber)}
                    className="px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded-full hover:opacity-80 transition-opacity"
                  >
                    Add accommodation
                  </button>
                </div>
              ) : (
                <>
                  {hotels.map((hotel) => {
                    let checkInDayNum = hotel.dayNumber;
                    if (hotel.parsedNotes?.checkInDate && trip?.start_date) {
                      const tripStart = new Date(trip.start_date);
                      tripStart.setHours(0, 0, 0, 0);
                      const checkIn = new Date(hotel.parsedNotes.checkInDate);
                      checkIn.setHours(0, 0, 0, 0);
                      checkInDayNum = Math.floor((checkIn.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    }

                    let nights = 1;
                    if (hotel.parsedNotes?.checkInDate && hotel.parsedNotes?.checkOutDate) {
                      const inDate = new Date(hotel.parsedNotes.checkInDate);
                      const outDate = new Date(hotel.parsedNotes.checkOutDate);
                      nights = Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
                    }

                    return (
                      <div
                        key={hotel.id}
                        onClick={() => handleEditItem(hotel)}
                        className="p-4 border border-stone-200 dark:border-gray-800 rounded-2xl hover:bg-stone-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-stone-400">Day {checkInDayNum}</span>
                          <span className="text-xs text-stone-400 bg-stone-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                            {nights} {nights === 1 ? 'night' : 'nights'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <Hotel className="w-5 h-5 text-stone-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-stone-900 dark:text-white">
                              {hotel.title}
                            </p>
                            {hotel.parsedNotes?.address && (
                              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                                {hotel.parsedNotes.address}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-400" />
                        </div>
                        {(hotel.parsedNotes?.checkInDate || hotel.parsedNotes?.checkOutDate) && (
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-100 dark:border-gray-800">
                            {hotel.parsedNotes?.checkInDate && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-stone-400 dark:text-gray-500">Check-in</span>
                                <span className="text-xs text-stone-600 dark:text-gray-300">{hotel.parsedNotes.checkInDate}</span>
                              </div>
                            )}
                            {hotel.parsedNotes?.checkOutDate && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-stone-400 dark:text-gray-500">Check-out</span>
                                <span className="text-xs text-stone-600 dark:text-gray-300">{hotel.parsedNotes.checkOutDate}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button
                    onClick={() => openPlaceSelector(selectedDayNumber)}
                    className="w-full py-3 border border-dashed border-stone-200 dark:border-gray-800 rounded-2xl text-xs font-medium text-stone-500 dark:text-gray-400 hover:border-stone-300 dark:hover:border-gray-700 transition-colors"
                  >
                    + Add another hotel
                  </button>
                </>
              )}
            </div>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Checklist */}
              <div className="p-6 border border-stone-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-4">
                  <ListChecks className="w-4 h-4 text-stone-500" />
                  <h3 className="text-sm font-medium text-stone-900 dark:text-white">Checklist</h3>
                </div>

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
                    className="flex-1 px-3 py-2 text-sm text-stone-700 dark:text-gray-300 bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-lg placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600"
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

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
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
              <div className="p-6 border border-stone-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-4">
                  <StickyNote className="w-4 h-4 text-stone-500" />
                  <h3 className="text-sm font-medium text-stone-900 dark:text-white">Notes</h3>
                </div>
                <textarea
                  value={tripNotes}
                  onChange={(e) => setTripNotes(e.target.value)}
                  placeholder="Add notes for your trip... reservations, reminders, etc."
                  className="w-full min-h-[300px] p-4 text-sm text-stone-700 dark:text-gray-300 bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl resize-y placeholder:text-stone-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Action Bar */}
      <FloatingActionBar
        onAddPlace={() => openPlaceSelector(selectedDayNumber)}
        onAddFlight={() => openFlightDrawer(selectedDayNumber)}
        onAddNote={() => setActiveTab('notes')}
        onOpenMap={() => setShowMapBox(true)}
        onAIPlan={handleAITripPlanning}
        isAIPlanning={isAIPlanning}
        isSaving={saving}
      />
    </main>
  );
}
