'use client';

import { useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useTripEditor, type EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plane,
  Hotel,
  CalendarDays,
  StickyNote,
  Sparkles,
  Plus,
  Loader2,
} from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import { TripHeader } from './TripHeader';
import { TripDayCard } from './TripDayCard';
import { TripEmptyState } from './TripEmptyState';
import { TripFlightsTab } from './TripFlightsTab';
import { TripHotelsTab } from './TripHotelsTab';
import { TripNotesTab } from './TripNotesTab';
import { TripSidebar } from './TripSidebar';
import { AddToTripDialog } from './AddToTripDialog';
import {
  analyzeScheduleForWarnings,
  detectConflicts,
  checkClosureDays,
} from '@/lib/intelligence/schedule-analyzer';
import type { FlightData, ActivityData } from '@/types/trip';
import { parseDestinations } from '@/types/trip';
import type { Destination } from '@/types/destination';
import type { PlannerWarning } from '@/lib/intelligence/types';

export function TripPlanner() {
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
    addPlace,
    addFlight,
    addTrain,
    addActivity,
    removeItem,
    updateItemTime,
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

  // UI State
  const [selectedDayNumber, setSelectedDayNumber] = useState(1);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isAIPlanning, setIsAIPlanning] = useState(false);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [isEditMode, setIsEditMode] = useState(false);
  const [warnings, setWarnings] = useState<PlannerWarning[]>([]);
  const [selectedItem, setSelectedItem] = useState<EnrichedItineraryItem | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [sidebarView, setSidebarView] = useState<'suggestions' | 'settings' | 'map' | 'item'>('suggestions');

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
    return hotelItems.sort((a, b) => {
      if (!trip?.start_date) return (a.dayNumber || 0) - (b.dayNumber || 0);
      const getDay = (h: typeof hotelItems[0]) => {
        if (h.parsedNotes?.checkInDate) {
          const tripStart = new Date(trip.start_date!);
          const checkIn = new Date(h.parsedNotes.checkInDate);
          return Math.floor((checkIn.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
        return h.dayNumber;
      };
      return getDay(a) - getDay(b);
    });
  }, [days, trip?.start_date]);

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

    newWarnings.push(...analyzeScheduleForWarnings(scheduleItems));
    newWarnings.push(...detectConflicts(scheduleItems));
    newWarnings.push(...checkClosureDays(scheduleItems, trip?.start_date ?? undefined));

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
  const handleAddPlace = useCallback((destination: Destination, dayNumber?: number) => {
    addPlace(destination, dayNumber || selectedDayNumber);
    setShowAddDialog(false);
  }, [addPlace, selectedDayNumber]);

  const handleAddFlight = useCallback((flightData: FlightData) => {
    addFlight(flightData, selectedDayNumber);
    setShowAddDialog(false);
  }, [addFlight, selectedDayNumber]);

  const handleAddActivity = useCallback((activityData: ActivityData) => {
    addActivity(activityData, selectedDayNumber);
    setShowAddDialog(false);
  }, [addActivity, selectedDayNumber]);

  const handleEditItem = useCallback((item: EnrichedItineraryItem) => {
    setSelectedItem(item);
    setSidebarView('item');
    setActiveItemId(item.id);
  }, []);

  const handleAIPlanning = async () => {
    if (!trip || !user || !primaryCity || !trip.start_date || !trip.end_date) {
      setSidebarView('settings');
      return;
    }

    try {
      setIsAIPlanning(true);
      const allItems = days.flatMap(day => day.items);

      if (allItems.length > 0) {
        const response = await fetch('/api/intelligence/smart-fill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: primaryCity,
            existingItems: allItems.map(item => ({
              day: days.find(d => d.items.includes(item))?.dayNumber || 1,
              time: item.time,
              title: item.title,
              destination_slug: item.destination_slug,
              category: item.parsedNotes?.category || item.destination?.category,
            })),
            tripDays: days.length,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          for (const suggestion of result.suggestions || []) {
            if (suggestion.destination) {
              await addPlace(suggestion.destination, suggestion.day, suggestion.startTime);
            }
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

        if (response.ok) {
          await refresh();
        }
      }
      await refresh();
    } catch (err) {
      console.error('AI Planning error:', err);
    } finally {
      setIsAIPlanning(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-20 bg-gray-50 dark:bg-gray-950 min-h-screen">
        <PageLoader />
      </main>
    );
  }

  // Not found
  if (!trip) {
    return (
      <TripEmptyState
        type="not-found"
        onBack={() => router.push('/trips')}
      />
    );
  }

  return (
    <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-32 min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <TripHeader
          trip={trip}
          destinations={destinations}
          warnings={warnings}
          onSettingsClick={() => setSidebarView('settings')}
          onMapClick={() => setSidebarView('map')}
          onDismissWarning={(id) => setWarnings(prev => prev.filter(w => w.id !== id))}
        />

        {/* Main Content */}
        <div className="lg:flex lg:gap-6">
          {/* Left Column - Main Content */}
          <div className="flex-1 min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between gap-4 mb-4">
                <TabsList>
                  <TabsTrigger value="itinerary" className="gap-1.5">
                    <CalendarDays className="w-4 h-4" />
                    Itinerary
                  </TabsTrigger>
                  <TabsTrigger value="flights" className="gap-1.5">
                    <Plane className="w-4 h-4" />
                    Flights
                    {flights.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {flights.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="hotels" className="gap-1.5">
                    <Hotel className="w-4 h-4" />
                    Hotels
                    {hotels.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {hotels.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="gap-1.5">
                    <StickyNote className="w-4 h-4" />
                    Notes
                  </TabsTrigger>
                </TabsList>

                {/* Quick Actions */}
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAIPlanning}
                    disabled={isAIPlanning || saving}
                  >
                    {isAIPlanning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {isAIPlanning ? 'Planning...' : 'Auto-plan'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Itinerary Tab */}
              <TabsContent value="itinerary" className="mt-0">
                {days.length === 0 ? (
                  <TripEmptyState
                    type="no-days"
                    onAddFirst={() => setShowAddDialog(true)}
                  />
                ) : (
                  <div className="space-y-4">
                    {/* Day Selector */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {days.map((day) => (
                        <Button
                          key={day.dayNumber}
                          variant={selectedDayNumber === day.dayNumber ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedDayNumber(day.dayNumber)}
                          className="flex-shrink-0"
                        >
                          Day {day.dayNumber}
                          {day.date && (
                            <span className="ml-1 text-xs opacity-70">
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>

                    {/* Edit Mode Toggle */}
                    <div className="flex items-center justify-end">
                      <Button
                        variant={isEditMode ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setIsEditMode(!isEditMode)}
                      >
                        {isEditMode ? 'Done' : 'Edit'}
                      </Button>
                    </div>

                    {/* Selected Day */}
                    {days.filter(day => day.dayNumber === selectedDayNumber).map((day) => (
                      <TripDayCard
                        key={day.dayNumber}
                        day={day}
                        isEditMode={isEditMode}
                        activeItemId={activeItemId}
                        onEditItem={handleEditItem}
                        onRemoveItem={isEditMode ? removeItem : undefined}
                        onAddItem={() => setShowAddDialog(true)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Flights Tab */}
              <TabsContent value="flights" className="mt-0">
                <TripFlightsTab
                  flights={flights}
                  onEditFlight={handleEditItem}
                  onAddFlight={() => {
                    openDrawer('add-flight', {
                      tripId: trip.id,
                      dayNumber: selectedDayNumber,
                      onAdd: handleAddFlight,
                    });
                  }}
                />
              </TabsContent>

              {/* Hotels Tab */}
              <TabsContent value="hotels" className="mt-0">
                <TripHotelsTab
                  hotels={hotels}
                  tripStartDate={trip.start_date}
                  selectedItem={selectedItem}
                  onEditHotel={handleEditItem}
                  onAddHotel={() => setShowAddDialog(true)}
                />
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent value="notes" className="mt-0">
                <TripNotesTab tripId={trip.id} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sidebar */}
          <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <TripSidebar
              view={sidebarView}
              trip={trip}
              days={days}
              destinations={destinations}
              selectedDayNumber={selectedDayNumber}
              selectedItem={selectedItem}
              activeItemId={activeItemId}
              onViewChange={setSidebarView}
              onUpdateTrip={updateTrip}
              onDeleteTrip={() => router.push('/trips')}
              onUpdateItemTime={updateItemTime}
              onUpdateItem={updateItem}
              onRemoveItem={(id) => {
                removeItem(id);
                setSelectedItem(null);
                setActiveItemId(null);
              }}
              onCloseItem={() => {
                setSelectedItem(null);
                setActiveItemId(null);
                setSidebarView('suggestions');
              }}
              onMarkerClick={setActiveItemId}
            />
          </div>
        </div>

        {/* Add Dialog */}
        <AddToTripDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          city={primaryCity}
          dayNumber={selectedDayNumber}
          onAddPlace={handleAddPlace}
          onAddFlight={handleAddFlight}
          onAddActivity={handleAddActivity}
          onAddTrain={(trainData) => {
            addTrain(trainData, selectedDayNumber);
            setShowAddDialog(false);
          }}
        />

        {/* Mobile Floating Action Button */}
        <div className="fixed bottom-6 right-6 sm:hidden z-50">
          <Button
            size="lg"
            onClick={() => setShowAddDialog(true)}
            className="rounded-full shadow-lg h-14 w-14"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </main>
  );
}
