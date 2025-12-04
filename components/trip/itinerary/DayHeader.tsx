'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { MoreHorizontal, Sparkles, Loader2 } from 'lucide-react';

interface DayHeaderProps {
  dayNumber: number;
  date?: string | null; // ISO date string
  itemCount?: number;
  cityName?: string;
  onOptimize?: () => void;
  onMore?: () => void;
  isOptimizing?: boolean;
  className?: string;
}

/**
 * DayHeader - Editorial style day header
 * Shows: "SUNDAY 14" with "Day 1" on right
 */
export default function DayHeader({
  dayNumber,
  date,
  itemCount,
  cityName,
  onOptimize,
  onMore,
  isOptimizing = false,
  className = '',
}: DayHeaderProps) {
  // Parse date components
  const getDayOfWeek = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'EEEE').toUpperCase();
    } catch {
      return '';
    }
  };

  const getDayNum = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'd');
    } catch {
      return '';
    }
  };

  const getMonthYear = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'MMMM yyyy');
    } catch {
      return '';
    }
  };

  const dayOfWeek = getDayOfWeek(date);
  const dayNum = getDayNum(date);
  const monthYear = getMonthYear(date);

  return (
    <div className={`flex items-end justify-between py-4 border-b border-stone-100 dark:border-gray-800 ${className}`}>
      {/* Left: Date */}
      <div>
        {date ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium tracking-widest text-stone-400 dark:text-gray-500">
                {dayOfWeek}
              </span>
              <span className="text-3xl font-bold text-stone-900 dark:text-white tracking-tight">
                {dayNum}
              </span>
            </div>
            <div className="text-xs text-stone-400 dark:text-gray-500 mt-0.5">
              {monthYear}
              {cityName && <span className="ml-2">· {cityName}</span>}
            </div>
          </>
        ) : (
          <div className="text-xl font-bold text-stone-900 dark:text-white">
            Day {dayNumber}
            {cityName && (
              <span className="text-sm font-normal text-stone-400 dark:text-gray-500 ml-2">
                {cityName}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Day number & actions */}
      <div className="flex items-center gap-3">
        {/* Item count */}
        {itemCount !== undefined && (
          <span className="text-xs text-stone-400 dark:text-gray-500">
            {itemCount} {itemCount === 1 ? 'stop' : 'stops'}
          </span>
        )}

        {/* Day badge */}
        <span className="px-2.5 py-1 rounded-full bg-stone-100 dark:bg-gray-800 text-xs font-medium text-stone-600 dark:text-gray-400">
          Day {dayNumber}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {onOptimize && (
            <button
              onClick={onOptimize}
              disabled={isOptimizing}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              title="Optimize day"
            >
              {isOptimizing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>
          )}
          {onMore && (
            <button
              onClick={onMore}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-800 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Day Header
// ============================================================================

interface CompactDayHeaderProps {
  dayNumber: number;
  date?: string | null;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * CompactDayHeader - Pill-style day selector
 * For use in horizontal day navigation
 */
export function CompactDayHeader({
  dayNumber,
  date,
  isSelected = false,
  onClick,
  className = '',
}: CompactDayHeaderProps) {
  const getDayOfWeek = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'EEE').toUpperCase();
    } catch {
      return '';
    }
  };

  const getDayNum = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'd');
    } catch {
      return '';
    }
  };

  const dayOfWeek = getDayOfWeek(date);
  const dayNum = getDayNum(date);

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center px-3 py-2 rounded-xl transition-all min-w-[56px]
        ${isSelected
          ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900'
          : 'bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-gray-700'
        }
        ${className}
      `}
    >
      {date ? (
        <>
          <span className="text-[9px] font-medium tracking-wider opacity-70">
            {dayOfWeek}
          </span>
          <span className="text-base font-bold leading-none mt-0.5">
            {dayNum}
          </span>
        </>
      ) : (
        <span className="text-sm font-medium">
          Day {dayNumber}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Day Navigation Bar
// ============================================================================

interface DayNavigationProps {
  days: Array<{
    dayNumber: number;
    date: string | null;
  }>;
  selectedDay: number;
  onSelectDay: (dayNumber: number) => void;
  className?: string;
}

/**
 * DayNavigation - Horizontal scrollable day selector
 */
export function DayNavigation({
  days,
  selectedDay,
  onSelectDay,
  className = '',
}: DayNavigationProps) {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-2 scrollbar-hide ${className}`}>
      {days.map((day) => (
        <CompactDayHeader
          key={day.dayNumber}
          dayNumber={day.dayNumber}
          date={day.date}
          isSelected={day.dayNumber === selectedDay}
          onClick={() => onSelectDay(day.dayNumber)}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Editorial Day Divider
// ============================================================================

interface DayDividerProps {
  dayNumber: number;
  date?: string | null;
  className?: string;
}

/**
 * DayDivider - Full-width editorial divider between days
 * For use in continuous scroll view
 */
export function DayDivider({
  dayNumber,
  date,
  className = '',
}: DayDividerProps) {
  const getDayOfWeek = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'EEEE');
    } catch {
      return '';
    }
  };

  const getFullDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'MMMM d, yyyy');
    } catch {
      return '';
    }
  };

  const dayOfWeek = getDayOfWeek(date);
  const fullDate = getFullDate(date);

  return (
    <div className={`py-8 ${className}`}>
      <div className="flex items-center gap-4">
        {/* Line left */}
        <div className="flex-1 h-px bg-stone-200 dark:bg-gray-700" />

        {/* Day indicator */}
        <div className="text-center">
          <div className="text-xs font-medium tracking-widest text-stone-400 dark:text-gray-500 uppercase">
            Day {dayNumber}
          </div>
          {date && (
            <div className="text-sm font-medium text-stone-900 dark:text-white mt-1">
              {dayOfWeek}, {fullDate}
            </div>
          )}
        </div>

        {/* Line right */}
        <div className="flex-1 h-px bg-stone-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
