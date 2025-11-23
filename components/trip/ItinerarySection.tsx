'use client';

import React from 'react';
import ItineraryCard from './ItineraryCard';
import DayHeader from './DayHeader';
import { useDrawerStore } from '@/lib/stores/drawer-store';

interface Day {
  date: string;
  city: string;
  locations?: Array<{
    name?: string;
    title?: string;
    image?: string | null;
    type?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

interface Trip {
  id?: string;
  days?: Day[];
  [key: string]: any;
}

interface ItinerarySectionProps {
  trip: Trip;
}

export default function ItinerarySection({ trip }: ItinerarySectionProps) {
  const openDrawer = useDrawerStore((s) => s.openDrawer);

  if (!trip.days || trip.days.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--um-text-muted)] text-sm">
        No days added yet
      </div>
    );
  }

  return (
    <section className="space-y-10">
      {trip.days.map((day, index) => (
        <div key={index} className="space-y-6">
          <DayHeader day={day} index={index} trip={trip} />

          {day.locations && day.locations.length > 0 ? (
            <div className="space-y-6">
              {day.locations.map((item, i) => (
                <ItineraryCard key={i} item={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--um-text-muted)] text-sm">
              No locations added yet
            </div>
          )}

          <button
            className="border border-[var(--um-border)] w-full rounded-full py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors bg-white dark:bg-gray-950"
            onClick={() => openDrawer('place-selector', { day, dayIndex: index, trip })}
          >
            + Add Location
          </button>
        </div>
      ))}
    </section>
  );
}

