'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Plane,
  Plus,
  Settings,
  Sparkles,
  Map,
  List,
  Loader2,
  Search,
} from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import TimelineCanvas from '@/components/trip/TimelineCanvas';
import TripPlannerMap from '@/components/trip/TripPlannerMap';
import TripHero from '@/components/trip/TripHero';
import QuickActions from '@/components/trip/QuickActions';
import SearchOverlay from '@/components/search/SearchOverlay';
import { formatTripDate } from '@/lib/utils';
import type { FlightData } from '@/types/trip';
import type { Destination } from '@/types/destination';

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;
  const { user } = useAuth();
  const openDrawer = useDrawerStore((s) => s.openDrawer);

  // Use centralized editor hook
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
    updateItemTime,
    refresh,
  } = useTripEditor({
    tripId,
    userId: user?.id,
    onError: (error) => console.error('Trip editor error:', error),
  });

  // UI State
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'timeline' | 'map'>('timeline');
  const [isAIPlanning, setIsAIPlanning] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Open place selector drawer
  const openPlaceSelector = useCallback((dayNumber: number) => {
    openDrawer('place-selector', {
      tripId: trip?.id,
      dayNumber,
      city: trip?.destination,
      onSelect: (destination: Destination) => addPlace(destination, dayNumber),
    });
  }, [trip?.id, trip?.destination, openDrawer, addPlace]);

  // Open flight drawer
  const openFlightDrawer = useCallback((dayNumber: number) => {
    openDrawer('add-flight', {
      tripId: trip?.id,
      dayNumber,
      onAdd: (flightData: FlightData) => addFlight(flightData, dayNumber),
    });
  }, [trip?.id, openDrawer, addFlight]);

  // Open item detail drawer
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

  // AI Trip Planning
  const handleAITripPlanning = async () => {
    if (!trip || !user) return;

    if (!trip.destination) {
      alert('Please add a destination to your trip first');
      return;
    }
    if (!trip.start_date || !trip.end_date) {
      alert('Please add dates to your trip first');
      return;
    }

    try {
      setIsAIPlanning(true);

      const allItems = days.flatMap(day => day.items);

      if (allItems.length > 0) {
        // Smart-fill for existing trips
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

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get AI suggestions');
        }

        const result = await response.json();

        if (!result.suggestions || result.suggestions.length === 0) {
          alert('Your trip looks complete! No additional suggestions needed.');
          return;
        }

        // Add suggestions
        for (const suggestion of result.suggestions) {
          if (suggestion.destination) {
            await addPlace(suggestion.destination, suggestion.day, suggestion.startTime);
          }
        }
      } else {
        // Multi-day plan for empty trips
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

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate trip plan');
        }

        // Refresh after API adds items
        await refresh();
      }

      await refresh();
    } catch (err: any) {
      console.error('Error with AI trip planning:', err);
      alert(err.message || 'Failed to generate AI trip plan. Please try again.');
    } finally {
      setIsAIPlanning(false);
    }
  };

  // Search handler
  const handleSearch = useCallback((query: string, filters: string[]) => {
    // Search logic would go here
    console.log('Search:', query, filters);
  }, []);

  // Loading state
  if (loading) {
    return (
      <main className="w-full min-h-screen bg-white dark:bg-[#0a0a0a]">
        <PageLoader />
      </main>
    );
  }

  // Not found
  if (!trip) {
    return (
      <main className="w-full min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 dark:text-gray-600 mb-4">Trip not found</p>
          <Link
            href="/trips"
            className="text-sm text-gray-900 dark:text-white hover:underline"
          >
            Back to trips
          </Link>
        </div>
      </main>
    );
  }

  // Get trip cover image
  const coverImage = days
    .flatMap(d => d.items)
    .find(item => item.destination?.image)?.destination?.image;

  return (
    <main className="w-full min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* Hero Header */}
      <TripHero
        title={trip.title}
        destination={trip.destination || undefined}
        startDate={trip.start_date || undefined}
        endDate={trip.end_date || undefined}
        coverImage={coverImage || undefined}
        onTitleChange={(title) => updateTrip({ title })}
      />

      {/* Navigation Bar */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-900">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left: Back + Breadcrumb */}
          <div className="flex items-center gap-4">
            <Link
              href="/trips"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Trips
            </Link>
            <span className="text-gray-200 dark:text-gray-800">/</span>
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
              {trip.title}
            </span>
          </div>

          {/* Center: Mobile View Toggle */}
          <div className="md:hidden flex bg-gray-100 dark:bg-gray-900 rounded-full p-1">
            <button
              onClick={() => setMobileView('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                mobileView === 'timeline'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Timeline
            </button>
            <button
              onClick={() => setMobileView('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                mobileView === 'map'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              Map
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={handleAITripPlanning}
              disabled={isAIPlanning || saving}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              {isAIPlanning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isAIPlanning ? 'Planning...' : 'AI Plan'}
              </span>
            </button>
            <button
              onClick={() => openDrawer('trip-settings', {
                trip,
                onUpdate: updateTrip,
                onDelete: () => router.push('/trips'),
              })}
              className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions
          onAddPlace={() => openPlaceSelector(selectedDayNumber)}
          onAddFlight={() => openFlightDrawer(selectedDayNumber)}
          onAddNote={() => openDrawer('trip-notes', { tripId: trip.id })}
        />
      </div>

      {/* Split-Screen Layout */}
      <div className="flex h-[calc(100vh-200px)]">
        {/* Left: Timeline Sidebar */}
        <div
          className={`
            w-full md:w-[500px] lg:w-[560px] flex-shrink-0
            border-r border-gray-100 dark:border-gray-900
            ${mobileView === 'timeline' ? 'block' : 'hidden md:block'}
          `}
        >
          <TimelineCanvas
            days={days}
            selectedDayNumber={selectedDayNumber}
            onSelectDay={setSelectedDayNumber}
            onReorderItems={reorderItems}
            onRemoveItem={removeItem}
            onEditItem={handleEditItem}
            onTimeChange={updateItemTime}
            onAddItem={openPlaceSelector}
            activeItemId={activeItemId}
            className="h-full"
          />
        </div>

        {/* Right: Map Canvas */}
        <div
          className={`
            flex-1 min-w-0
            ${mobileView === 'map' ? 'block' : 'hidden md:block'}
          `}
        >
          <TripPlannerMap
            days={days}
            selectedDayNumber={selectedDayNumber}
            activeItemId={activeItemId}
            onMarkerClick={setActiveItemId}
            className="h-full"
          />
        </div>
      </div>

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={handleSearch}
        placeholder={`Search places in ${trip.destination || 'your trip'}...`}
        filters={[
          { id: 'restaurant', label: 'Restaurants' },
          { id: 'hotel', label: 'Hotels' },
          { id: 'museum', label: 'Museums' },
          { id: 'bar', label: 'Bars' },
          { id: 'cafe', label: 'Cafes' },
        ]}
      />

      {/* Saving Indicator */}
      {saving && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-lg text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving...
        </div>
      )}
    </main>
  );
}
