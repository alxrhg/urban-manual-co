'use client';

import { format, parseISO } from 'date-fns';
import { ChevronDown } from 'lucide-react';

interface DayHeaderProps {
  dayNumber: number;
  date: string | null;
  itemCount?: number;
  isSticky?: boolean;
  isExpanded?: boolean;
  className?: string;
}

/**
 * DayHeader - Editorial section header for trip days
 * Featuring Instrument Serif display font and refined typography hierarchy
 */
export default function DayHeader({
  dayNumber,
  date,
  itemCount = 0,
  isSticky = true,
  isExpanded = true,
  className = '',
}: DayHeaderProps) {
  const formattedDate = date ? format(parseISO(date), 'EEEE, MMM d') : null;

  return (
    <div
      className={`
        ${isSticky ? 'sticky top-0 z-10' : ''}
        flex items-center justify-between
        py-5 px-6
        bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm
        border-b border-stone-100 dark:border-stone-800/50
        transition-colors duration-200
        hover:bg-stone-50/50 dark:hover:bg-stone-900/30
        ${className}
      `}
    >
      {/* Left: Day Number + Date */}
      <div className="flex items-baseline gap-4">
        {/* Day number with editorial italic styling */}
        <span className="font-display italic text-2xl text-stone-900 dark:text-white tracking-tight">
          Day {dayNumber}
        </span>
        {/* Date in refined uppercase */}
        {formattedDate && (
          <span className="text-[11px] uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500 font-medium">
            {formattedDate}
          </span>
        )}
      </div>

      {/* Right: Meta info */}
      <div className="flex items-center gap-3">
        {/* Item Count Badge */}
        {itemCount > 0 && (
          <span className="text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
            {itemCount} {itemCount === 1 ? 'stop' : 'stops'}
          </span>
        )}
        {/* Expand/Collapse indicator */}
        <ChevronDown
          className={`
            w-4 h-4 text-stone-300 dark:text-stone-600
            transition-transform duration-300
            ${isExpanded ? 'rotate-0' : '-rotate-90'}
          `}
        />
      </div>
    </div>
  );
}
