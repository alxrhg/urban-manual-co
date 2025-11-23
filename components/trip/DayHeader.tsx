'use client';

import React from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';

interface Day {
  date: string;
  city: string;
  [key: string]: any;
}

interface Trip {
  id?: string;
  [key: string]: any;
}

interface DayHeaderProps {
  day: Day;
  index: number;
  trip: Trip;
}

export default function DayHeader({ day, index, trip }: DayHeaderProps) {
  const openFullscreen = useDrawerStore((s) => s.openFullscreen);

  return (
    <div className="flex justify-between items-center">
      <div>
        <p className="text-xs tracking-widest text-[var(--um-text-muted)] uppercase">
          DAY {index + 1}
        </p>
        <h2 className="text-xl font-medium text-gray-900 dark:text-white">{day.date}</h2>
        {day.city && (
          <p className="text-sm text-[var(--um-text-muted)]">{day.city}</p>
        )}
      </div>

      <button
        className="text-sm text-[var(--um-text-muted)] hover:text-gray-900 dark:hover:text-white transition-colors"
        onClick={() => openFullscreen('trip-day', { day, dayIndex: index, trip })}
      >
        Edit
      </button>
    </div>
  );
}

