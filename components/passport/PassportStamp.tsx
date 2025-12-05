'use client';

import React from 'react';
import { getCountryFlag } from '@/lib/countryUtils';

export interface VisitedCountry {
  country: string;
  countryCode?: string;
  visitedAt: string;
  placesCount: number;
}

interface PassportStampProps {
  country: VisitedCountry;
  index: number;
}

// Generate a consistent rotation based on country name
function getStampRotation(countryName: string): number {
  const hash = countryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ((hash % 13) - 6); // Range: -6 to 6 degrees
}

// Get stamp style based on visit count
function getStampStyle(placesCount: number): { border: string; bg: string; text: string } {
  if (placesCount >= 10) {
    return {
      border: 'border-gray-900 dark:border-white',
      bg: 'bg-gray-900/5 dark:bg-white/5',
      text: 'text-gray-900 dark:text-white',
    };
  }
  if (placesCount >= 5) {
    return {
      border: 'border-gray-700 dark:border-gray-300',
      bg: 'bg-gray-700/5 dark:bg-gray-300/5',
      text: 'text-gray-700 dark:text-gray-300',
    };
  }
  return {
    border: 'border-gray-500 dark:border-gray-500',
    bg: 'bg-gray-500/5 dark:bg-gray-500/5',
    text: 'text-gray-600 dark:text-gray-400',
  };
}

export function PassportStamp({ country, index }: PassportStampProps) {
  const rotation = getStampRotation(country.country);
  const style = getStampStyle(country.placesCount);
  const flag = getCountryFlag(country.countryCode || country.country);

  // Format date as passport stamp style
  const visitDate = new Date(country.visitedAt);
  const formattedDate = visitDate.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();

  return (
    <div
      className={`relative p-3 border-2 border-dashed rounded-xl ${style.border} ${style.bg} transition-transform hover:scale-105`}
      style={{
        transform: `rotate(${rotation}deg)`,
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Stamp content */}
      <div className="flex flex-col items-center text-center space-y-1">
        {/* Flag */}
        <span className="text-2xl">{flag}</span>

        {/* Country name */}
        <span className={`text-[10px] font-bold uppercase tracking-wider ${style.text} line-clamp-1`}>
          {country.country}
        </span>

        {/* Date */}
        <span className="text-[8px] font-mono text-gray-500 dark:text-gray-500">
          {formattedDate}
        </span>

        {/* Places count badge */}
        {country.placesCount > 1 && (
          <span className={`text-[8px] font-medium ${style.text} opacity-70`}>
            {country.placesCount} places
          </span>
        )}
      </div>

      {/* Decorative corner elements */}
      <div className={`absolute top-1 left-1 w-1.5 h-1.5 border-t border-l ${style.border} opacity-50`} />
      <div className={`absolute top-1 right-1 w-1.5 h-1.5 border-t border-r ${style.border} opacity-50`} />
      <div className={`absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l ${style.border} opacity-50`} />
      <div className={`absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r ${style.border} opacity-50`} />
    </div>
  );
}

// Empty stamp placeholder for unvisited state
export function EmptyPassportPage() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <span className="text-2xl opacity-50">🌍</span>
      </div>
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
        Your passport is empty
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px]">
        Start marking places as visited to collect stamps from around the world
      </p>
    </div>
  );
}
