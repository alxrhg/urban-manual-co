'use client';

import React from 'react';
import Image from 'next/image';
import TravelBadge from './TravelBadge';

interface Location {
  name: string;
  type?: string;
  image?: string | null;
  travelTime?: number | string;
  [key: string]: any;
}

interface Day {
  date: string;
  city: string;
  locations?: Location[];
  activities?: Location[];
  meals?: {
    breakfast?: Location | null;
    lunch?: Location | null;
    dinner?: Location | null;
  };
  [key: string]: any;
}

interface DayCardProps {
  day: Day;
  index: number;
  openDrawer: (type: string, props: any) => void;
  className?: string;
}

export default function DayCard({ day, index, openDrawer, className }: DayCardProps) {
  // Combine meals and activities into locations array
  const locations: Location[] = [];

  // Add meals as locations
  if (day.meals) {
    if (day.meals.breakfast) {
      const breakfast = day.meals.breakfast;
      // Parse notes for image if available
      let image = breakfast.image || breakfast.image_thumbnail || null;
      if (!image && breakfast.notes) {
        try {
          const notesData = typeof breakfast.notes === 'string' ? JSON.parse(breakfast.notes) : breakfast.notes;
          image = notesData.image || null;
        } catch {
          // Ignore parse errors
        }
      }
      locations.push({
        name: breakfast.title || breakfast.name || 'Breakfast',
        type: 'breakfast',
        image,
        travelTime: breakfast.travelTime,
      });
    }
    if (day.meals.lunch) {
      const lunch = day.meals.lunch;
      let image = lunch.image || lunch.image_thumbnail || null;
      if (!image && lunch.notes) {
        try {
          const notesData = typeof lunch.notes === 'string' ? JSON.parse(lunch.notes) : lunch.notes;
          image = notesData.image || null;
        } catch {
          // Ignore parse errors
        }
      }
      locations.push({
        name: lunch.title || lunch.name || 'Lunch',
        type: 'lunch',
        image,
        travelTime: lunch.travelTime,
      });
    }
    if (day.meals.dinner) {
      const dinner = day.meals.dinner;
      let image = dinner.image || dinner.image_thumbnail || null;
      if (!image && dinner.notes) {
        try {
          const notesData = typeof dinner.notes === 'string' ? JSON.parse(dinner.notes) : dinner.notes;
          image = notesData.image || null;
        } catch {
          // Ignore parse errors
        }
      }
      locations.push({
        name: dinner.title || dinner.name || 'Dinner',
        type: 'dinner',
        image,
        travelTime: dinner.travelTime,
      });
    }
  }

  // Add activities
  if (day.activities && day.activities.length > 0) {
    day.activities.forEach((activity: any) => {
      let image = activity.image || activity.image_thumbnail || null;
      if (!image && activity.notes) {
        try {
          const notesData = typeof activity.notes === 'string' ? JSON.parse(activity.notes) : activity.notes;
          image = notesData.image || null;
        } catch {
          // Ignore parse errors
        }
      }
      locations.push({
        name: activity.title || activity.name || 'Activity',
        type: activity.category || activity.description || 'activity',
        image,
        travelTime: activity.travelTime,
      });
    });
  }

  // Fallback to day.locations if available
  const displayLocations = locations.length > 0 ? locations : (day.locations || []);

  return (
    <div
      className={`bg-white dark:bg-gray-950 rounded-[var(--um-radius-xl)] border border-[var(--um-border)] p-6 space-y-6 ${
        className || ''
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs tracking-widest text-[var(--um-text-muted)] mb-1 uppercase">
            DAY {index + 1}
          </p>
          <h2 className="text-[20px] font-medium text-gray-900 dark:text-white">{day.date}</h2>
          <p className="text-sm text-[var(--um-text-muted)]">{day.city}</p>
        </div>

        <button
          className="text-xs text-[var(--um-text-muted)] hover:text-gray-900 dark:hover:text-white transition-colors"
          onClick={() => openDrawer('trip-day', { day, dayIndex: index })}
        >
          Edit
        </button>
      </div>

      {displayLocations.length > 0 && (
        <div className="space-y-10">
          {displayLocations.map((loc, i) => (
            <div key={i}>
              <div className="flex gap-4 items-center">
                {loc.image ? (
                  <div className="relative w-28 h-28 rounded-[20px] overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    <Image
                      src={loc.image}
                      alt={loc.name || 'Location'}
                      fill
                      className="object-cover"
                      sizes="112px"
                    />
                  </div>
                ) : (
                  <div className="w-28 h-28 rounded-[20px] bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-400 dark:text-gray-500 text-xs">No image</span>
                  </div>
                )}

                <div className="flex-1">
                  <p className="font-medium text-[17px] leading-tight text-gray-900 dark:text-white">
                    {loc.name || 'Location'}
                  </p>
                  {loc.type && (
                    <p className="text-sm text-[var(--um-text-muted)] mt-1 capitalize">{loc.type}</p>
                  )}
                </div>
              </div>

              {i < displayLocations.length - 1 && loc.travelTime && (
                <div className="flex items-center justify-center my-6">
                  <span className="px-3 py-1 text-xs bg-neutral-50 dark:bg-neutral-900 border border-[var(--um-border)] rounded-full text-[var(--um-text-muted)]">
                    ⟶ {loc.travelTime} min
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {displayLocations.length === 0 && (
        <div className="text-center py-8 text-[var(--um-text-muted)] text-sm">
          No locations added yet
        </div>
      )}

      <button
        className="w-full border border-[var(--um-border)] rounded-full py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
        onClick={() => openDrawer('trip-add-place', { day, dayIndex: index })}
      >
        + Add Location
      </button>
    </div>
  );
}

