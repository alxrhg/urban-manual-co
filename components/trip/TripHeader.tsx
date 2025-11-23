'use client';

import React from 'react';

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
    <header className={`pb-10 border-b border-[var(--um-border)] ${className || ''}`}>
      <p className="text-xs tracking-widest text-[var(--um-text-muted)] mb-2 uppercase">
        TRIP
      </p>

      <h1 className="text-[32px] font-[480] tracking-tight mb-1 text-gray-900 dark:text-white">
        {tripName}
      </h1>

      {(startDate || endDate) && (
        <p className="text-[var(--um-text-muted)] text-sm">
          {startDate} – {endDate}
        </p>
      )}

      <div className="flex gap-2 mt-6">
        <button className="border border-[var(--um-border)] rounded-full px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
          Save
        </button>
        <button className="border border-[var(--um-border)] rounded-full px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
          Share
        </button>
        <button className="border border-[var(--um-border)] rounded-full px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors">
          Print
        </button>
        <button
          className="bg-black dark:bg-white text-white dark:text-black rounded-full px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
          onClick={onOverview}
        >
          Overview
        </button>
      </div>
    </header>
  );
}

