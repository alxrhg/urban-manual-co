'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Map as MapIcon, Settings } from 'lucide-react';
import { useTripEditor } from '@/lib/hooks/useTripEditor';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/LoadingStates';
import DayTimeline from '@/components/trip/DayTimeline';
import DayTabNav from '@/components/trip/DayTabNav';
import TripSettingsBox from '@/components/trip/TripSettingsBox';
import AddPlaceBox from '@/components/trip/AddPlaceBox';

// Ground Up: Trip Builder
// Concept: Clean, "Canvas" feel. Less panels, more direct manipulation.

export default function TripBuilderPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const {
    trip,
    days,
    loading,
    updateTrip,
    addPlace,
    reorderItems,
    removeItem,
    updateItemTime,
    updateItem,
  } = useTripEditor({
    tripId: params.id,
    userId: user?.id
  });

  const [selectedDay, setSelectedDay] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  if (loading) return <PageLoader />;
  if (!trip) return <div>Trip not found</div>;

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 font-sans">
      {/* Header - Transparent & Minimal */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-stone-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/trips"
              className="p-2 -ml-2 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display font-medium text-lg text-stone-900 dark:text-white leading-none">
                {trip.title}
              </h1>
              <p className="text-xs text-stone-500 font-mono mt-1">
                {trip.start_date ? new Date(trip.start_date).getFullYear() : 'Planning'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-stone-400 hover:bg-stone-50 dark:hover:bg-gray-900 rounded-full transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button className="px-4 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full text-xs font-medium hover:opacity-90 transition-opacity">
              Share
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Main Timeline (Left/Center) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Day Navigation */}
            <div className="sticky top-20 z-30 bg-white dark:bg-gray-950 py-2">
              <DayTabNav
                days={days}
                selectedDayNumber={selectedDay}
                onSelectDay={setSelectedDay}
              />
            </div>

            {/* Timeline Content */}
            <div className="min-h-[50vh]">
               {/* Day Content */}
               {days.filter(d => d.dayNumber === selectedDay).map(day => (
                 <DayTimeline
                   key={day.dayNumber}
                   day={day}
                   onReorderItems={reorderItems}
                   onRemoveItem={removeItem}
                   onEditItem={(item) => console.log('Edit item', item)} // Hook up if needed
                   onTimeChange={updateItemTime}
                   onAddItem={(dayNum, cat) => setShowAdd(true)}
                   // TODO: Implement optimization/autofill hooks if desired for v2
                   isEditMode={true} // Always allow drag/drop in builder
                 />
               ))}
            </div>
          </div>

          {/* Sidebar (Right) - Context & Tools */}
          <div className="hidden lg:block lg:col-span-4 space-y-6">
            {showSettings && (
              <div className="mb-8">
                <TripSettingsBox trip={trip} onUpdate={updateTrip} onClose={() => setShowSettings(false)} />
              </div>
            )}

            {showAdd && (
              <div className="sticky top-24">
                <AddPlaceBox
                  city={trip.destination ? JSON.parse(trip.destination)[0] : ''}
                  dayNumber={selectedDay}
                  onSelect={(dest) => { addPlace(dest, selectedDay); setShowAdd(false); }}
                  onClose={() => setShowAdd(false)}
                />
              </div>
            )}

            {/* Map Placeholder */}
            {!showAdd && (
              <div className="bg-stone-100 dark:bg-gray-900 rounded-2xl aspect-[4/5] flex items-center justify-center text-stone-400">
                <div className="text-center">
                  <MapIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <span className="text-xs font-medium">Map View</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
