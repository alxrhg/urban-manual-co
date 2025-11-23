'use client';

import React from 'react';
import { useTravelTime } from '@/hooks/useTravelTime';

interface Location {
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
  [key: string]: any;
}

interface TravelTimeBadgeProps {
  from: Location | null | undefined;
  to: Location | null | undefined;
  mode?: 'walking' | 'driving' | 'transit';
  className?: string;
}

export default function TravelTimeBadge({ from, to, mode = 'walking', className }: TravelTimeBadgeProps) {
  const { minutes, loading } = useTravelTime(from, to, mode);

  // Check if className suggests inline rendering (used in TripDay component)
  const isInline = className && (className.includes('text-') || className.includes('tracking-'));

  if (loading) {
    if (isInline) {
      return <span className={className}>Calculating...</span>;
    }
    return (
      <div className={`flex items-center justify-center my-6 ${className || ''}`}>
        <span className="px-3 py-1 text-xs bg-neutral-50 dark:bg-neutral-900 border border-[var(--um-border)] rounded-full text-[var(--um-text-muted)]">
          Calculating...
        </span>
      </div>
    );
  }

  if (!minutes) {
    return null;
  }

  if (isInline) {
    return <span className={className}>{minutes} min travel</span>;
  }

  return (
    <div className={`flex items-center justify-center my-6 ${className || ''}`}>
      <span className="px-3 py-1 text-xs bg-neutral-50 dark:bg-neutral-900 border border-[var(--um-border)] rounded-full text-[var(--um-text-muted)]">
        ⟶ {minutes} min
      </span>
    </div>
  );
}

