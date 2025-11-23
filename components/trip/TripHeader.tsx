'use client';

import React from 'react';
import TripActions from './TripActions';

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
  onSave?: () => void;
  onShare?: () => void;
  onPrint?: () => void;
  className?: string;
}

export default function TripHeader({
  trip,
  onOverview,
  onSave,
  onShare,
  onPrint,
  className,
}: TripHeaderProps) {
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

      <TripActions
        onSave={onSave}
        onShare={onShare}
        onPrint={onPrint}
        onOverview={onOverview}
      />
    </header>
  );
}

