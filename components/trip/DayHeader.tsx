'use client';

import { format, parseISO } from 'date-fns';

interface DayHeaderProps {
  dayNumber: number;
  date: string | null;
  itemCount?: number;
  isSticky?: boolean;
  className?: string;
}

/**
 * DayHeader - Sticky section header for trip days
 * Lovably style: serif italic day number + mono/sans caps date
 */
export default function DayHeader({
  dayNumber,
  date,
  itemCount = 0,
  isSticky = true,
  className = '',
}: DayHeaderProps) {
  const formattedDate = date ? format(parseISO(date), 'EEEE, MMM d') : null;

  return (
    <div
      className={`
        ${isSticky ? 'sticky top-0 z-10' : ''}
        flex items-baseline justify-between
        py-4 px-6
        bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm
        border-b border-gray-100 dark:border-gray-900
        ${className}
      `}
    >
      {/* Day Number + Date */}
      <div className="flex items-baseline gap-3">
        <span className="font-serif italic text-2xl text-gray-900 dark:text-white">
          Day {dayNumber}
        </span>
        {formattedDate && (
          <span className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-600 font-medium">
            {formattedDate}
          </span>
        )}
      </div>

      {/* Item Count */}
      {itemCount > 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-600">
          {itemCount} {itemCount === 1 ? 'stop' : 'stops'}
        </span>
      )}
    </div>
  );
}
