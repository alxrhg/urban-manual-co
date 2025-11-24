"use client";

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import UMCard from '@/components/ui/UMCard';
import UMActionPill from '@/components/ui/UMActionPill';
import UMSectionTitle from '@/components/ui/UMSectionTitle';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import Image from 'next/image';

interface Day {
  date: string;
  city: string;
  breakfast?: any;
  lunch?: any;
  dinner?: any;
  activities?: any[];
  hotel?: any;
  [key: string]: any;
}

interface TripDayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  day: Day | null;
}

export default function TripDayDrawer({ isOpen, onClose, day }: TripDayDrawerProps) {
  const { openDrawer } = useDrawerStore();

  if (!day) return null;

  const getMealName = (meal: any) => {
    return meal?.name || meal?.title || null;
  };

  const getMealImage = (meal: any) => {
    if (meal?.image) return meal.image;
    if (meal?.image_thumbnail) return meal.image_thumbnail;
    if (meal?.notes) {
      try {
        const notesData = typeof meal.notes === 'string' ? JSON.parse(meal.notes) : meal.notes;
        return notesData.image || null;
      } catch {
        return null;
      }
    }
    return null;
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      fullScreen={true}
      desktopWidth="100vw"
      desktopSpacing="inset-0"
      mobileVariant="side"
      mobileExpanded={true}
      mobileHeight="100vh"
    >
      <div className="px-6 py-8 space-y-10">
        {/* TITLE */}
        <div className="space-y-1">
          <h1 className="text-[20px] font-semibold text-gray-900 dark:text-white">
            {day.date}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {day.city || 'Unknown'}
          </p>
        </div>

        {/* MEALS SECTION */}
        <section className="space-y-6">
          <UMSectionTitle>Meals</UMSectionTitle>

          {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => {
            const meal = day[mealType];
            const mealName = getMealName(meal);
            const mealImage = meal ? getMealImage(meal) : null;

            return (
              <UMCard key={mealType} className="p-4 space-y-3">
                <p className="font-medium capitalize text-[15px] text-gray-900 dark:text-white">
                  {mealType}
                </p>

                {mealName ? (
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

                    <UMActionPill
                      onClick={() =>
                        openDrawer('place-selector', {
                          day,
                          mealType,
                        })
                      }
                    >
                      Replace
                    </UMActionPill>
                  </div>
                ) : (
                  <UMActionPill
                    variant="primary"
                    onClick={() =>
                      openDrawer('place-selector', {
                        day,
                        mealType,
                      })
                    }
                  >
                    + Add {mealType}
                  </UMActionPill>
                )}
              </UMCard>
            );
          })}
        </section>

        {/* ACTIVITIES SECTION */}
        {day.activities && day.activities.length > 0 && (
          <section className="space-y-6">
            <UMSectionTitle>Activities</UMSectionTitle>
            <div className="space-y-4">
              {day.activities.map((activity: any, i: number) => {
                const activityName = activity?.name || activity?.title || 'Activity';
                const activityImage = activity?.image || activity?.image_thumbnail || null;

                return (
                  <UMCard key={i} className="p-4 space-y-3">
                    {activityImage && (
                      <div className="w-full h-32 relative overflow-hidden rounded-[16px]">
                        <Image
                          src={activityImage}
                          alt={activityName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    <p className="text-[17px] font-semibold text-gray-900 dark:text-white">
                      {activityName}
                    </p>

                    <UMActionPill
                      onClick={() => console.log('Remove activity', i)}
                    >
                      Remove
                    </UMActionPill>
                  </UMCard>
                );
              })}
            </div>
          </section>
        )}

        {/* HOTEL SECTION */}
        <section className="space-y-6">
          <UMSectionTitle>Hotel</UMSectionTitle>

          {day.hotel ? (
            <UMCard className="p-4 space-y-3">
              {day.hotel.image && (
                <div className="w-full h-32 relative overflow-hidden rounded-[16px]">
                  <Image
                    src={day.hotel.image}
                    alt={day.hotel.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <p className="text-[17px] font-semibold text-gray-900 dark:text-white">
                {day.hotel.name || day.hotel.title}
              </p>

              <UMActionPill
                onClick={() =>
                  openDrawer('add-hotel', {
                    day,
                  })
                }
              >
                Change Hotel
              </UMActionPill>
            </UMCard>
          ) : (
            <UMCard className="p-4">
              <UMActionPill
                variant="primary"
                className="w-full justify-center"
                onClick={() =>
                  openDrawer('add-hotel', {
                    day,
                  })
                }
              >
                + Add Hotel
              </UMActionPill>
            </UMCard>
          )}
        </section>
      </div>
    </Drawer>
  );
}
