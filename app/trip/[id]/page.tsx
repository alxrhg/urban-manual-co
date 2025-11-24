'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useTrip } from '@/hooks/useTrip';
import DayCard from '@/components/trip/DayCard';
import { PencilLine, Sparkles, Utensils, ListChecks, Building2, Plus } from 'lucide-react';

type Mode = 'view' | 'edit';
type UseTripResult = ReturnType<typeof useTrip>;
type TripWithDays = NonNullable<UseTripResult['trip']>;
type TripDay = TripWithDays['days'][number];
type DrawerOpener = (type: string, props?: any) => void;

export default function TripPage() {
  const params = useParams();
  const tripId = params?.id as string | null;
  const openDrawer = useDrawerStore((s) => s.openDrawer);
  const { trip, loading, error } = useTrip(tripId);
  const [mode, setMode] = useState<Mode>('view');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  useEffect(() => {
    if (!trip?.days || trip.days.length === 0) {
      setSelectedDayIndex(0);
      return;
    }
    setSelectedDayIndex((prev) => {
      if (prev >= trip.days.length) {
        return trip.days.length - 1;
      }
      return prev;
    });
  }, [trip?.id, trip?.days?.length]);

  if (loading) return <div className="px-4 py-8">Loading...</div>;
  if (error) return <div className="px-4 py-8 text-red-600">Error: {error}</div>;
  if (!trip) return <div className="px-4 py-8">Trip not found</div>;

  const metaParts = [trip.destination || 'Destination TBD'];
  if (trip.start_date && trip.end_date) {
    metaParts.push(`${trip.start_date} → ${trip.end_date}`);
  } else if (trip.start_date || trip.end_date) {
    metaParts.push(trip.start_date || trip.end_date || '');
  }
  const modeDescription =
    mode === 'view'
      ? 'Browse your itinerary without the editing chrome.'
      : 'Use the quick actions below to update meals, activities, and logistics for each day.';

  return (
    <div className="px-4 py-8 space-y-6">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 dark:text-neutral-400 mb-1">Trip</p>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{trip.title}</h1>
            {metaParts.filter(Boolean).length > 0 && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{metaParts.filter(Boolean).join(' • ')}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ModeToggle mode={mode} onChange={setMode} />
            <button
              className="px-4 py-2 rounded-full bg-black text-white text-sm font-medium dark:bg-white dark:text-black"
              onClick={() => openDrawer('trip-overview', { trip })}
            >
              Overview
            </button>
          </div>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400">{modeDescription}</p>
      </header>

      {mode === 'view' ? (
        <ItineraryViewSection
          trip={trip}
          openDrawer={openDrawer}
          selectedDayIndex={selectedDayIndex}
          onSelectDay={setSelectedDayIndex}
        />
      ) : (
        <EditModeSection
          trip={trip}
          openDrawer={openDrawer}
          selectedDayIndex={selectedDayIndex}
          onSelectDay={setSelectedDayIndex}
        />
      )}
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const options: { key: Mode; label: string }[] = [
    { key: 'view', label: 'View' },
    { key: 'edit', label: 'Edit' },
  ];

  return (
    <div className="inline-flex rounded-full bg-neutral-100 dark:bg-neutral-800 p-1">
      {options.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition ${
            mode === option.key
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white'
              : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ItineraryViewSection({
  trip,
  openDrawer,
  selectedDayIndex,
  onSelectDay,
}: {
  trip: TripWithDays;
  openDrawer: DrawerOpener;
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
}) {
  const hasDays = trip.days && trip.days.length > 0;

  if (!hasDays) {
    return (
      <EmptyItineraryState
        title="No itinerary yet"
        description="Add dates, meals, and activities to see your trip take shape."
        actionLabel="Plan this trip"
        onAction={() => openDrawer('trip-overview', { trip })}
      />
    );
  }

  return (
    <div className="space-y-4">
      <DayTabs days={trip.days} selectedIndex={selectedDayIndex} onSelect={onSelectDay} />
      {trip.days[selectedDayIndex] && (
        <>
          <DayCard
            key={`${trip.days[selectedDayIndex].date}-${selectedDayIndex}`}
            day={trip.days[selectedDayIndex]}
            index={selectedDayIndex}
            trip={trip}
            openDrawer={openDrawer}
            mode="view"
          />
          <AddPlaceButton trip={trip} selectedDayIndex={selectedDayIndex} openDrawer={openDrawer} />
        </>
      )}
    </div>
  );
}

function EditModeSection({
  trip,
  openDrawer,
  selectedDayIndex,
  onSelectDay,
}: {
  trip: TripWithDays;
  openDrawer: DrawerOpener;
  selectedDayIndex: number;
  onSelectDay: (index: number) => void;
}) {
  const hasDays = trip.days && trip.days.length > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#15161a] p-4 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="flex items-start gap-3 rounded-2xl border border-transparent bg-white dark:bg-[#0f1012] p-4 text-left shadow-sm hover:shadow-md transition-shadow"
            onClick={() => openDrawer('trip-overview', { trip })}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white dark:bg-white dark:text-black">
              <PencilLine className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Update overview</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Change title, dates, destination, or cover image.
              </p>
            </div>
          </button>

          <button
            className="flex items-start gap-3 rounded-2xl border border-transparent bg-white dark:bg-[#0f1012] p-4 text-left shadow-sm hover:shadow-md transition-shadow"
            onClick={() => openDrawer('trip-ai', { trip, suggestions: [] })}
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Ask AI for ideas</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Get meal or activity suggestions for any day.
              </p>
            </div>
          </button>
        </div>
      </div>

      {hasDays ? (
        <div className="space-y-4">
          <DayTabs days={trip.days} selectedIndex={selectedDayIndex} onSelect={onSelectDay} />
          {trip.days[selectedDayIndex] && (
            <DayEditCard
              key={`${trip.days[selectedDayIndex].date}-${selectedDayIndex}-edit`}
              day={trip.days[selectedDayIndex]}
              dayIndex={selectedDayIndex}
              trip={trip}
              openDrawer={openDrawer}
            />
          )}
          <AddPlaceButton trip={trip} selectedDayIndex={selectedDayIndex} openDrawer={openDrawer} variant="outlined" />
        </div>
      ) : (
        <EmptyItineraryState
          title="Nothing to edit yet"
          description="Add at least one day to unlock the editor."
          actionLabel="Open overview"
          onAction={() => openDrawer('trip-overview', { trip })}
        />
      )}
    </div>
  );
}

function DayEditCard({
  day,
  dayIndex,
  trip,
  openDrawer,
}: {
  day: TripDay;
  dayIndex: number;
  trip: TripWithDays;
  openDrawer: DrawerOpener;
}) {
  const mealSummary = getMealSummary(day);
  const activitySummary =
    day.activities && day.activities.length > 0 ? `${day.activities.length} planned` : 'No activities yet';
  const hotelSummary = day.hotel?.name || day.hotel?.title || 'No hotel saved';

  const infoBlocks = [
    { label: 'Meals', value: mealSummary, icon: Utensils },
    { label: 'Activities', value: activitySummary, icon: ListChecks },
    { label: 'Stay', value: hotelSummary, icon: Building2 },
  ];

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0f1012] p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-500">Day {dayIndex + 1}</p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{day.date}</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{day.city || 'City TBD'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="px-4 py-2 rounded-full border border-neutral-200 text-sm font-medium text-gray-900 hover:bg-neutral-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-900"
            onClick={() =>
              openDrawer('trip-day', {
                day,
                dayIndex,
                trip,
              })
            }
          >
            Edit day
          </button>
          <button
            className="px-4 py-2 rounded-full border border-neutral-200 text-sm font-medium text-gray-900 hover:bg-neutral-50 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-900 flex items-center gap-2"
            onClick={() =>
              openDrawer('trip-add-place', {
                day,
                dayIndex,
                trip,
              })
            }
          >
            <Plus className="w-4 h-4" />
            Add place
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {infoBlocks.map((block) => (
          <div
            key={block.label}
            className="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/40 p-3"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1">
              <block.icon className="w-3.5 h-3.5" />
              {block.label}
            </div>
            <p className="text-sm text-gray-900 dark:text-white leading-snug">{block.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyItineraryState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 p-10 text-center space-y-4">
      <p className="text-lg font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">{description}</p>
      <button
        onClick={onAction}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white text-sm font-semibold dark:bg-white dark:text-black"
      >
        <Plus className="w-4 h-4" />
        {actionLabel}
      </button>
    </div>
  );
}

function getMealSummary(day: TripDay): string {
  if (!day.meals) return 'Not set yet';
  const meals = ['breakfast', 'lunch', 'dinner']
    .map((mealType) => {
      const meal = (day.meals as Record<string, any>)[mealType];
      if (!meal) return null;
      return meal.title || meal.name || mealType;
    })
    .filter(Boolean);

  return meals.length > 0 ? (meals as string[]).join(' • ') : 'Not set yet';
}

function AddPlaceButton({
  trip,
  selectedDayIndex,
  openDrawer,
  variant = 'solid',
}: {
  trip: TripWithDays;
  selectedDayIndex: number;
  openDrawer: DrawerOpener;
  variant?: 'solid' | 'outlined';
}) {
  const day = trip.days?.[selectedDayIndex];
  if (!day) return null;

  const baseClasses = 'w-full max-w-md mx-auto flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition';
  const styles =
    variant === 'outlined'
      ? 'border border-neutral-300 text-neutral-800 dark:text-white dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900'
      : 'bg-black text-white dark:bg-white dark:text-black hover:opacity-90';

  return (
    <div className="flex justify-center">
      <button
        className={`${baseClasses} ${styles}`}
        onClick={() =>
          openDrawer('trip-add-place', {
            day,
            dayIndex: selectedDayIndex,
            trip,
          })
        }
      >
        <Plus className="w-4 h-4" />
        Add place to Day {selectedDayIndex + 1}
      </button>
    </div>
  );
}

function DayTabs({
  days,
  selectedIndex,
  onSelect,
}: {
  days: TripDay[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="-mx-4 px-4 md:mx-0 md:px-0">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {days.map((day, index) => (
          <button
            key={`${day.date}-${index}-tab`}
            onClick={() => onSelect(index)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedIndex === index
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
            }`}
          >
            Day {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

