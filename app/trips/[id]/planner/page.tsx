'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Share2, Download } from 'lucide-react';
import Link from 'next/link';
import TimelineCanvas from '@/components/planner/TimelineCanvas';
import PlannerMap from '@/components/planner/PlannerMap';
import PlannerHeader from '@/components/planner/PlannerHeader';
import MobileViewToggle from '@/components/planner/MobileViewToggle';
import type { DayPlan, TimeBlock, Place } from '@/lib/intelligence/types';

/**
 * Trip Planner Page - Editorial Intelligence Theme v3.0.0
 * Responsive split view with minimalist aesthetic
 */
export default function PlannerPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;

  const [tripName, setTripName] = useState('Untitled Trip');
  const [tripDestination, setTripDestination] = useState('');
  const [tripDates, setTripDates] = useState('');
  const [days, setDays] = useState<DayPlan[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const [isLoading, setIsLoading] = useState(true);

  // Load trip data
  useEffect(() => {
    async function loadTrip() {
      try {
        const res = await fetch(`/api/trips/${tripId}`);
        if (res.ok) {
          const data = await res.json();
          setTripName(data.name || 'Untitled Trip');
          setTripDestination(data.destination || '');
          setTripDates(data.dates || '');
          // Transform trip data to DayPlan format if needed
          if (data.days) {
            setDays(data.days);
          }
        }
      } catch (error) {
        console.error('Failed to load trip:', error);
      } finally {
        setIsLoading(false);
      }
    }
    if (tripId) loadTrip();
  }, [tripId]);

  const currentDay = days.find((d) => d.dayNumber === selectedDay) || days[0];

  // Get places for map
  const mapPlaces = currentDay?.blocks
    .filter((b) => b.type !== 'transit' && b.place)
    .map((b, idx) => ({
      ...b.place!,
      order: idx + 1,
      blockId: b.id,
    })) || [];

  const handleBlocksChange = useCallback(
    (dayNumber: number, blocks: TimeBlock[]) => {
      setDays((prev) =>
        prev.map((d) => (d.dayNumber === dayNumber ? { ...d, blocks } : d))
      );
    },
    []
  );

  const handleTitleChange = useCallback((newTitle: string) => {
    setTripName(newTitle);
    // Persist to API
    fetch(`/api/trips/${tripId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTitle }),
    }).catch(console.error);
  }, [tripId]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Minimal Header */}
      <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-gray-100 dark:border-gray-900 bg-white dark:bg-[#0a0a0a]">
        <Link
          href={`/trips/${tripId}`}
          className="p-2 -ml-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Link>

        <h1 className="font-serif text-lg md:text-xl text-gray-900 dark:text-white truncate max-w-[200px] md:max-w-none">
          {tripName}
        </h1>

        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors">
            <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors">
            <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </header>

      {/* Split View Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: The Editorial Timeline (Scrollable) */}
        <div
          className={`
            w-full md:w-[450px] lg:w-[500px] border-r border-gray-100 dark:border-gray-900
            flex flex-col bg-white dark:bg-[#0a0a0a]
            ${mobileView === 'map' ? 'hidden md:flex' : 'flex'}
          `}
        >
          {/* Editorial Header */}
          <PlannerHeader
            title={tripName}
            destination={tripDestination}
            dates={tripDates}
            onTitleChange={handleTitleChange}
          />

          {/* Timeline */}
          {currentDay && (
            <TimelineCanvas
              dayPlan={currentDay}
              onBlocksChange={(blocks) => handleBlocksChange(selectedDay, blocks)}
              className="flex-1"
            />
          )}
        </div>

        {/* Right: The Minimal Map (Fixed) */}
        <div
          className={`
            flex-1 relative bg-gray-50 dark:bg-gray-950
            ${mobileView === 'list' ? 'hidden md:block' : 'block'}
          `}
        >
          <PlannerMap
            places={mapPlaces}
            destination={tripDestination}
            className="h-full w-full"
            grayscale
          />
        </div>
      </div>

      {/* Mobile View Toggle */}
      <MobileViewToggle
        activeView={mobileView}
        onViewChange={setMobileView}
      />
    </>
  );
}
