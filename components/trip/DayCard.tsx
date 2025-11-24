'use client';

import React from 'react';
import Image from 'next/image';
import { MapPin, Coffee, Utensils, Sun, Moon, ChevronRight } from 'lucide-react';
import TravelTimeBadge from './TravelTimeBadge';
import UMCard from '@/components/ui/UMCard';

interface Location {
  name: string;
  type?: string;
  image?: string | null;
  travelTime?: number | string;
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
  slug?: string;
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

type DayCardMode = 'view' | 'edit';

interface DayCardProps {
  day: Day;
  index: number;
  openDrawer: (type: string, props: any) => void;
  trip?: any;
  className?: string;
  mode?: DayCardMode;
}

// Get icon for location type
function getTypeIcon(type?: string) {
  switch (type?.toLowerCase()) {
    case 'breakfast':
      return <Coffee className="w-4 h-4" />;
    case 'lunch':
      return <Sun className="w-4 h-4" />;
    case 'dinner':
      return <Moon className="w-4 h-4" />;
    default:
      return <MapPin className="w-4 h-4" />;
  }
}

// Get badge color for type
function getTypeBadge(type?: string) {
  switch (type?.toLowerCase()) {
    case 'breakfast':
      return { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' };
    case 'lunch':
      return { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' };
    case 'dinner':
      return { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' };
    default:
      return { bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-600 dark:text-neutral-400' };
  }
}

export default function DayCard({
  day,
  index,
  openDrawer,
  trip,
  className,
  mode = 'edit',
}: DayCardProps) {
  const isViewMode = mode === 'view';
  // Combine meals and activities into locations array
  const locations: Location[] = [];

  // Parse image from notes helper
  const parseImage = (item: any): string | null => {
    let image = item.image || item.image_thumbnail || null;
    if (!image && item.notes) {
      try {
        const notesData = typeof item.notes === 'string' ? JSON.parse(item.notes) : item.notes;
        image = notesData.image || null;
      } catch {
        // Ignore parse errors
      }
    }
    return image;
  };

  // Add meals as locations
  if (day.meals) {
    if (day.meals.breakfast) {
      const breakfast = day.meals.breakfast;
      locations.push({
        name: breakfast.title || breakfast.name || 'Breakfast',
        type: 'breakfast',
        image: parseImage(breakfast),
        travelTime: breakfast.travelTime,
        latitude: breakfast.latitude || null,
        longitude: breakfast.longitude || null,
        slug: breakfast.slug || breakfast.destination_slug,
      });
    }
    if (day.meals.lunch) {
      const lunch = day.meals.lunch;
      locations.push({
        name: lunch.title || lunch.name || 'Lunch',
        type: 'lunch',
        image: parseImage(lunch),
        travelTime: lunch.travelTime,
        latitude: lunch.latitude || null,
        longitude: lunch.longitude || null,
        slug: lunch.slug || lunch.destination_slug,
      });
    }
    if (day.meals.dinner) {
      const dinner = day.meals.dinner;
      locations.push({
        name: dinner.title || dinner.name || 'Dinner',
        type: 'dinner',
        image: parseImage(dinner),
        travelTime: dinner.travelTime,
        latitude: dinner.latitude || null,
        longitude: dinner.longitude || null,
        slug: dinner.slug || dinner.destination_slug,
      });
    }
  }

  // Add activities
  if (day.activities && day.activities.length > 0) {
    day.activities.forEach((activity: any) => {
      locations.push({
        name: activity.title || activity.name || 'Activity',
        type: activity.category || activity.description || 'activity',
        image: parseImage(activity),
        travelTime: activity.travelTime,
        latitude: activity.latitude || null,
        longitude: activity.longitude || null,
        slug: activity.slug || activity.destination_slug,
      });
    });
  }

  // Fallback to day.locations if available
  const displayLocations = locations.length > 0 ? locations : (day.locations || []);

  return (
    <UMCard className={`p-0 overflow-hidden ${className || ''}`}>
      {/* Locations Timeline */}
      {displayLocations.length > 0 ? (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {displayLocations.map((loc, i) => {
            const typeBadge = getTypeBadge(loc.type);

            return (
              <div key={i}>
                {/* Location Item */}
                <button
                  className="w-full flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-left group"
                  onClick={() => {
                    if (loc.slug) {
                      openDrawer('destination', { slug: loc.slug });
                    }
                  }}
                >
                  {/* Timeline Indicator */}
                  <div className="flex flex-col items-center self-stretch py-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${typeBadge.bg} ${typeBadge.text}`}>
                      {getTypeIcon(loc.type)}
                    </div>
                    {i < displayLocations.length - 1 && (
                      <div className="flex-1 w-0.5 bg-neutral-200 dark:bg-neutral-700 mt-2" />
                    )}
                  </div>

                  {/* Image */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-[12px] overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
                    {loc.image ? (
                      <Image
                        src={loc.image}
                        alt={loc.name || 'Location'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-neutral-300 dark:text-neutral-600" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[15px] sm:text-[17px] leading-tight text-gray-900 dark:text-white truncate">
                      {loc.name || 'Location'}
                    </p>
                    {loc.type && (
                      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 capitalize">
                        {loc.type}
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  {loc.slug && (
                    <ChevronRight className="w-5 h-5 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors flex-shrink-0" />
                  )}
                </button>

                {/* Travel Time Badge */}
                {i < displayLocations.length - 1 && (
                  <div className="pl-[52px] pb-2">
                    <TravelTimeBadge
                      from={displayLocations[i]}
                      to={displayLocations[i + 1]}
                      mode="walking"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            No locations added yet
          </p>
        </div>
      )}

      {/* Add Location Button */}
      {!isViewMode && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 p-4">
          <button
            className="w-full h-[44px] flex items-center justify-center gap-2 border border-neutral-200 dark:border-neutral-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-[0.98] transition-all"
            onClick={() => openDrawer('trip-add-place', { day, dayIndex: index })}
          >
            <span className="text-lg leading-none">+</span>
            Add Location
          </button>
        </div>
      )}
    </UMCard>
  );
}
