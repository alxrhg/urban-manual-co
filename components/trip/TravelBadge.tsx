'use client';

import React from 'react';

interface TravelBadgeProps {
  minutes?: number | string;
  className?: string;
}

export default function TravelBadge({ minutes, className }: TravelBadgeProps) {
  if (!minutes) return null;

  return (
    <div
      className={`flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 my-3 ${
        className || ''
      }`}
    >
      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
        ⟶ {minutes} min
      </span>
    </div>
  );
}

