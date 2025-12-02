'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useTripEditor } from '@/lib/hooks/useTripEditor';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Plus,
  Sparkles,
  Settings2,
  Loader2,
} from 'lucide-react';
import { parseDestinations } from '@/types/trip';
import { TripDayView } from './TripDayView';
import { TripItemSheet } from './TripItemSheet';
import { AddSheet } from './AddSheet';
import { SettingsSheet } from './SettingsSheet';
import { EmptyTrip } from './EmptyTrip';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { Destination } from '@/types/destination';
import type { FlightData, TrainData, ActivityData } from '@/types/trip';

export function TripPlanner() {
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
    addPlace,
    addFlight,
    addTrain,
    addActivity,
    removeItem,
    updateItemTime,
    updateItem,
    refresh,
  } = useTripEditor({
    tripId,
    userId: user?.id,
    onError: (error) => console.error('Trip error:', error),
  });

  // UI State
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedItem, setSelectedItem] = useState<EnrichedItineraryItem | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAIPlanning, setIsAIPlanning] = useState(false);

  const destinations = useMemo(() => parseDestinations(trip?.destination ?? null), [trip?.destination]);
  const primaryCity = destinations[0] || '';

  const currentDay = days.find(d => d.dayNumber === selectedDay);

  // Handlers
  const handleAddPlace = (destination: Destination) => {
    addPlace(destination, selectedDay);
    setShowAddSheet(false);
  };

  const handleAddFlight = (data: FlightData) => {
    addFlight(data, selectedDay);
    setShowAddSheet(false);
  };

  const handleAddTrain = (data: TrainData) => {
    addTrain(data, selectedDay);
    setShowAddSheet(false);
  };

  const handleAddActivity = (data: ActivityData) => {
    addActivity(data, selectedDay);
    setShowAddSheet(false);
  };

  const handleAIPlan = async () => {
    if (!trip || !user || !primaryCity || !trip.start_date || !trip.end_date) {
      setShowSettings(true);
      return;
    }

    setIsAIPlanning(true);
    try {
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
      if (response.ok) await refresh();
    } catch (err) {
      console.error('AI planning error:', err);
    } finally {
      setIsAIPlanning(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Not found
  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950 px-6">
        <p className="text-gray-500 mb-4">Trip not found</p>
        <Button variant="outline" asChild>
          <Link href="/trips">Back to trips</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header - Fixed */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/trips">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>

          <div className="flex-1 min-w-0 mx-3">
            <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate text-center">
              {trip.title}
            </h1>
            {primaryCity && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center truncate">
                {primaryCity}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="shrink-0"
          >
            <Settings2 className="w-5 h-5" />
          </Button>
        </div>

        {/* Day Pills - Scrollable */}
        {days.length > 0 && (
          <ScrollArea className="w-full">
            <div className="flex gap-2 px-4 pb-3">
              {days.map((day) => {
                const isSelected = selectedDay === day.dayNumber;
                const dateStr = day.date
                  ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
                  : null;

                return (
                  <button
                    key={day.dayNumber}
                    onClick={() => setSelectedDay(day.dayNumber)}
                    className={`
                      flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors
                      ${isSelected
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                      }
                    `}
                  >
                    <span>Day {day.dayNumber}</span>
                    {dateStr && (
                      <span className={`ml-1.5 ${isSelected ? 'opacity-70' : 'text-gray-400 dark:text-gray-500'}`}>
                        {dateStr}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-24">
        {days.length === 0 ? (
          <EmptyTrip onSetup={() => setShowSettings(true)} onAIPlan={handleAIPlan} />
        ) : currentDay ? (
          <TripDayView
            day={currentDay}
            onItemClick={setSelectedItem}
            onAddClick={() => setShowAddSheet(true)}
          />
        ) : null}
      </main>

      {/* Bottom Action Bar - Fixed */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 safe-area-pb">
        <div className="flex items-center justify-around px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAIPlan}
            disabled={isAIPlanning || saving}
            className="flex-1"
          >
            {isAIPlanning ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {isAIPlanning ? 'Planning...' : 'Auto-plan'}
          </Button>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />

          <Button
            size="sm"
            onClick={() => setShowAddSheet(true)}
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* Sheets */}
      <TripItemSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onTimeChange={(time) => selectedItem && updateItemTime(selectedItem.id, time)}
        onUpdate={(updates) => selectedItem && updateItem(selectedItem.id, updates)}
        onRemove={() => {
          if (selectedItem) {
            removeItem(selectedItem.id);
            setSelectedItem(null);
          }
        }}
      />

      <AddSheet
        open={showAddSheet}
        onOpenChange={setShowAddSheet}
        city={primaryCity}
        onAddPlace={handleAddPlace}
        onAddFlight={handleAddFlight}
        onAddTrain={handleAddTrain}
        onAddActivity={handleAddActivity}
      />

      <SettingsSheet
        open={showSettings}
        onOpenChange={setShowSettings}
        trip={trip}
        onUpdate={updateTrip}
        onDelete={() => router.push('/trips')}
      />
    </div>
  );
}
