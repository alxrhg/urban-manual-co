'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface Trip {
  name?: string;
  title?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  [key: string]: any;
}

interface TripHeaderProps {
  trip: Trip;
  onOverview?: () => void;
  className?: string;
}

export default function TripHeader({ trip, onOverview, className }: TripHeaderProps) {
  const tripName = trip.name || trip.title || 'Untitled Trip';
  const startDate = trip.startDate || trip.start_date || '';
  const endDate = trip.endDate || trip.end_date || '';

  return (
    <header className={cn('space-y-3 pb-6 border-b border-gray-200 dark:border-gray-800', className)}>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            {tripName}
          </h1>
          {(startDate || endDate) && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {startDate} → {endDate}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button className="rounded-full border border-gray-200 dark:border-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            Save
          </button>
          <button className="rounded-full border border-gray-200 dark:border-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            Share
          </button>
          <button className="rounded-full border border-gray-200 dark:border-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            Print
          </button>
          <button
            className="rounded-full bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            onClick={onOverview}
          >
            Overview
          </button>
        </div>
      </div>
    </header>
  );
}

