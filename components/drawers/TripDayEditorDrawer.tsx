"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import UMCard from '@/components/ui/UMCard';
import UMActionPill from '@/components/ui/UMActionPill';
import UMSectionTitle from '@/components/ui/UMSectionTitle';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import Image from 'next/image';

interface Location {
  name?: string;
  title?: string;
  type?: string;
  category?: string;
  image?: string;
  image_thumbnail?: string;
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

interface Trip {
  id?: string;
  [key: string]: any;
}

interface TripDayEditorDrawerProps {
  day: Day | null;
  index?: number;
  trip?: Trip | null;
  hideHeader?: boolean;
  className?: string;
}

export default function TripDayEditorDrawer({
  day,
  index = 0,
  trip,
  hideHeader = false,
  className,
}: TripDayEditorDrawerProps) {
  const { openDrawer } = useDrawerStore();
  const router = useRouter();
  const [selectedDayIndex, setSelectedDayIndex] = useState(index);
  const [editorDays, setEditorDays] = useState<Day[]>(() => {
    if (trip?.days?.length) return [...trip.days];
    if (day) return [day];
    return [];
  });

  useEffect(() => {
    if (trip?.days?.length) {
      setEditorDays([...trip.days]);
      setSelectedDayIndex((prev) => Math.min(prev, trip.days.length - 1));
    } else if (day) {
      setEditorDays([day]);
      setSelectedDayIndex(0);
    }
  }, [trip?.id, trip?.updated_at, trip?.days?.length, day]);

  const allDays = editorDays.length ? editorDays : day ? [day] : [];

  const currentDay = allDays[selectedDayIndex] || day;

  if (!currentDay && !day) return null;

  // Combine locations and activities for display
  const allLocations = [
    ...(currentDay.locations || []),
    ...(currentDay.activities || []),
  ];

  const getLocationImage = (loc: Location) => {
    if (loc.image) return loc.image;
    if (loc.image_thumbnail) return loc.image_thumbnail;
    if (loc.notes) {
      try {
        const notesData = typeof loc.notes === 'string' ? JSON.parse(loc.notes) : loc.notes;
        return notesData.image || null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const handleRemoveStop = async (stopIndex: number) => {
    if (!trip?.id || !currentDay) return;
    const target = allLocations[stopIndex];
    if (!target?.id) return;
    try {
      const supabaseClient = createClient();
      const { error } = await supabaseClient
        .from('itinerary_items')
        .delete()
        .eq('id', target.id)
        .eq('trip_id', trip.id);
      if (error) throw error;

      setEditorDays((prev) =>
        prev.map((d, idx) => {
          if (idx !== selectedDayIndex) return d;
          const filteredLocations = (d.locations || []).filter((loc) => loc.id !== target.id);
          const filteredActivities = (d.activities || []).filter((loc) => loc.id !== target.id);
          return {
            ...d,
            locations: filteredLocations,
            activities: filteredActivities,
          };
        }),
      );
      router.refresh();
    } catch (error) {
      console.error('Error removing stop', error);
      alert('Failed to remove this stop. Please try again.');
    }
  };

  const handleClearMeal = (mealType: string) => {
    console.log("Clear meal", mealType);
    // TODO: Implement clear meal functionality
  };

  const handleDuplicateDay = () => {
    console.log("Duplicate day", index);
    // TODO: Implement duplicate day functionality
  };

  const handleDeleteDay = () => {
    if (confirm('Are you sure you want to delete this day?')) {
      console.log("Delete day", index);
      // TODO: Implement delete day functionality
    }
  };

  const containerClass =
    className ?? (hideHeader ? 'space-y-10' : 'px-6 py-6 space-y-10');

  return (
    <div className={containerClass}>
      {/* DAY TABS */}
      {allDays.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 border-b border-gray-200 dark:border-gray-800">
          {allDays.map((d: Day, i: number) => (
            <button
              key={i}
              onClick={() => setSelectedDayIndex(i)}
              className={`px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                selectedDayIndex === i
                  ? 'text-black dark:text-white border-b-2 border-black dark:border-white'
                  : 'text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
              }`}
            >
              Day {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* TITLE */}
      {!hideHeader && (
        <div className="space-y-1">
          <h1 className="text-2xl font-light text-gray-900 dark:text-white">
            Day {selectedDayIndex + 1}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {currentDay.city || 'Unknown'} • {currentDay.date || ''}
          </p>
        </div>
      )}

      {/* STOPS LIST */}
      {allLocations.length > 0 && (
        <section className="space-y-4">
          <UMSectionTitle>Stops</UMSectionTitle>

          <div className="space-y-6">
            {allLocations.map((loc, i) => {
              const locationImage = getLocationImage(loc);
              const locationName = loc.name || loc.title || 'Unknown';
              const locationType = loc.type || loc.category || '';

              return (
                <UMCard key={i} className="p-4 space-y-4">
                  {/* IMAGE */}
                  {locationImage && (
                    <div className="w-full h-40 relative overflow-hidden rounded-[16px]">
                      <Image
                        src={locationImage}
                        alt={locationName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* STOP DETAILS */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {locationName}
                    </p>
                    {locationType && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {locationType}
                      </p>
                    )}
                  </div>

                  {/* ACTION ROW */}
                  <div className="flex gap-3 pt-2">
                    <UMActionPill
                      onClick={() =>
                        openDrawer("place-selector", {
                          day: currentDay,
                          trip,
                          index: selectedDayIndex,
                          replaceIndex: i,
                        })
                      }
                    >
                      Replace
                    </UMActionPill>

                    <UMActionPill
                      onClick={() => handleRemoveStop(i)}
                    >
                      Remove
                    </UMActionPill>
                  </div>
                </UMCard>
              );
            })}
          </div>
        </section>
      )}

      {/* ADD LOCATION */}
      <section className="space-y-4">
        {allLocations.length === 0 && <UMSectionTitle>Stops</UMSectionTitle>}
        <UMActionPill
          variant="primary"
          className="w-full justify-center"
          onClick={() =>
            openDrawer("place-selector", {
              day: currentDay,
              trip,
              index: selectedDayIndex,
              replaceIndex: null,
            })
          }
        >
          + Add Location
        </UMActionPill>
      </section>

      {/* MEALS */}
      <section className="space-y-6">
        <UMSectionTitle>Meals</UMSectionTitle>

        {(["breakfast", "lunch", "dinner"] as const).map((meal) => {
          const mealData = currentDay.meals?.[meal];
          const mealImage = mealData ? getLocationImage(mealData) : null;
          const mealName = mealData?.name || mealData?.title || '';
          const mealCategory = mealData?.category || mealData?.type || '';

          return (
            <UMCard key={meal} className="p-4 space-y-3">
              <p className="text-sm font-medium capitalize text-gray-900 dark:text-white">
                {meal}
              </p>

              {mealData ? (
                <div className="space-y-2">
                  {mealImage && (
                    <div className="w-full h-32 relative overflow-hidden rounded-[16px]">
                      <Image
                        src={mealImage}
                        alt={mealName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {mealName}
                  </p>
                  {mealCategory && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {mealCategory}
                    </p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <UMActionPill
                      onClick={() =>
                        openDrawer("place-selector", {
                          day: currentDay,
                          trip,
                          index: selectedDayIndex,
                          mealType: meal,
                          replaceIndex: null,
                        })
                      }
                    >
                      Replace
                    </UMActionPill>

                    <UMActionPill
                      onClick={() => handleClearMeal(meal)}
                    >
                      Clear
                    </UMActionPill>
                  </div>
                </div>
              ) : (
                <UMActionPill
                  variant="primary"
                  onClick={() =>
                    openDrawer("place-selector", {
                      day: currentDay,
                      trip,
                      index: selectedDayIndex,
                      mealType: meal,
                    })
                  }
                >
                  + Add {meal}
                </UMActionPill>
              )}
            </UMCard>
          );
        })}
      </section>

      {/* AI SUGGESTIONS */}
      <section>
        <UMActionPill
          variant="primary"
          className="w-full justify-center"
          onClick={() =>
            openDrawer("ai-suggestions", { day: currentDay, index: selectedDayIndex, trip })
          }
        >
          Get AI Suggestions
        </UMActionPill>
      </section>

      {/* DUPLICATE / DELETE */}
      <section className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex justify-between pt-4">
          <button
            onClick={handleDuplicateDay}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            Duplicate Day
          </button>
          <button
            onClick={handleDeleteDay}
            className="text-xs text-red-500 hover:text-red-600 transition-colors"
          >
            Delete Day
          </button>
        </div>
      </section>
    </div>
  );
}

