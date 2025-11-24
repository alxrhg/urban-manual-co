"use client";

import { useState } from 'react';
import UMCard from "@/components/ui/UMCard";
import UMActionPill from "@/components/ui/UMActionPill";
import UMSectionTitle from "@/components/ui/UMSectionTitle";
import { useDrawerStore } from "@/lib/stores/drawer-store";
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
}

export default function TripDayEditorDrawer({ day, index = 0, trip }: TripDayEditorDrawerProps) {
  const { openDrawer } = useDrawerStore();
  const [selectedDayIndex, setSelectedDayIndex] = useState(index);

  // Get all days from trip
  const allDays = trip?.days || (day ? [day] : []);
  
  // Get the currently selected day
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

  const handleRemoveStop = (stopIndex: number) => {
    console.log("Remove stop", stopIndex);
    // TODO: Implement remove stop functionality
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

  return (
    <div className="px-6 py-6 space-y-10">
      {/* DAY TABS */}
      {allDays.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 border-b border-neutral-200 dark:border-white/10">
          {allDays.map((d: Day, i: number) => (
            <button
              key={i}
              onClick={() => setSelectedDayIndex(i)}
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                selectedDayIndex === i
                  ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Day {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* TITLE */}
      <div className="space-y-1">
        <h1 className="text-[20px] font-semibold text-gray-900 dark:text-white">
          Day {selectedDayIndex + 1}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {currentDay.city || 'Unknown'} • {currentDay.date || ''}
        </p>
      </div>

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
                    <p className="text-[17px] font-semibold text-gray-900 dark:text-white">
                      {locationName}
                    </p>
                    {locationType && (
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">
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
              <p className="font-medium capitalize text-[15px] text-gray-900 dark:text-white">
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

                  <p className="text-[16px] font-medium text-gray-900 dark:text-white">
                    {mealName}
                  </p>
                  {mealCategory && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">
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
      <section className="pt-4 border-t border-neutral-200 dark:border-white/10">
        <div className="flex justify-between pt-4">
          <button
            onClick={handleDuplicateDay}
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:underline"
          >
            Duplicate Day
          </button>
          <button
            onClick={handleDeleteDay}
            className="text-sm text-red-500 hover:underline"
          >
            Delete Day
          </button>
        </div>
      </section>
    </div>
  );
}

