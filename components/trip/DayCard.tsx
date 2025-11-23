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
      locations.push({
        name: breakfast.title || breakfast.name || 'Breakfast',
        type: 'breakfast',
        image: breakfast.image || breakfast.image_thumbnail || null,
        travelTime: breakfast.travelTime,
      });
    }
    if (day.meals.lunch) {
      const lunch = day.meals.lunch;
      locations.push({
        name: lunch.title || lunch.name || 'Lunch',
        type: 'lunch',
        image: lunch.image || lunch.image_thumbnail || null,
        travelTime: lunch.travelTime,
      });
    }
    if (day.meals.dinner) {
      const dinner = day.meals.dinner;
      locations.push({
        name: dinner.title || dinner.name || 'Dinner',
        type: 'dinner',
        image: dinner.image || dinner.image_thumbnail || null,
        travelTime: dinner.travelTime,
      });
    }
  }

  // Add activities
  if (day.activities && day.activities.length > 0) {
    day.activities.forEach((activity: any) => {
      locations.push({
        name: activity.title || activity.name || 'Activity',
        type: activity.category || 'activity',
        image: activity.image || activity.image_thumbnail || null,
        travelTime: activity.travelTime,
      });
    });
  }

  // Fallback to day.locations if available
  const displayLocations = locations.length > 0 ? locations : (day.locations || []);

  return (
    <div
      className={`rounded-3xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-950 shadow-sm space-y-6 ${
        className || ''
      }`}
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Day {index + 1}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {day.date} · {day.city}
          </p>
        </div>

        <button
          className="text-sm text-gray-600 dark:text-gray-400 opacity-70 hover:opacity-100 transition-opacity"
          onClick={() => openDrawer('trip-day', { day, dayIndex: index })}
        >
          Open
        </button>
      </div>

      {displayLocations.length > 0 && (
        <div className="space-y-6">
          {displayLocations.map((loc, i) => (
            <div key={i}>
              {loc.image ? (
                <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={loc.image}
                    alt={loc.name || 'Location'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                </div>
              ) : (
                <div className="w-full h-44 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <span className="text-gray-400 dark:text-gray-500 text-sm">No image</span>
                </div>
              )}
              <div className="mt-2">
                <p className="font-medium text-gray-900 dark:text-white">{loc.name || 'Location'}</p>
                {loc.type && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{loc.type}</p>
                )}
              </div>

              {i < displayLocations.length - 1 && loc.travelTime && (
                <TravelBadge minutes={loc.travelTime} />
              )}
            </div>
          ))}
        </div>
      )}

      {displayLocations.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          No locations added yet
        </div>
      )}

      <button
        className="w-full border border-gray-200 dark:border-gray-800 rounded-full py-2 mt-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        onClick={() => openDrawer('trip-add-place', { day, dayIndex: index })}
      >
        + Add Location
      </button>
    </div>
  );
}

