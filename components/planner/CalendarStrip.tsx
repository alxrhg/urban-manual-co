'use client';

interface CalendarDay {
  dayNumber: number;
  date: string;
  dayOfWeek: string;
  isActive?: boolean;
}

interface CalendarStripProps {
  days: CalendarDay[];
  activeDay: number;
  onDaySelect: (dayNumber: number) => void;
}

/**
 * CalendarStrip - Horizontal scrollable day selector
 * Lovably style: serif numbers with mono dates
 */
export default function CalendarStrip({
  days,
  activeDay,
  onDaySelect,
}: CalendarStripProps) {
  return (
    <div className="flex gap-4 overflow-x-auto p-4 border-b border-gray-100 dark:border-gray-900 no-scrollbar">
      {days.map((day) => {
        const isActive = day.dayNumber === activeDay;

        return (
          <button
            key={day.dayNumber}
            onClick={() => onDaySelect(day.dayNumber)}
            data-active={isActive}
            className={`
              min-w-[60px] flex flex-col items-center cursor-pointer transition-opacity
              ${isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'}
            `}
          >
            {/* Day of week */}
            <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-500 mb-1">
              {day.dayOfWeek.slice(0, 3)}
            </span>

            {/* Day number */}
            <span
              className={`
                font-serif text-2xl transition-colors
                ${isActive
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-400 dark:text-gray-600'
                }
              `}
            >
              {day.dayNumber}
            </span>

            {/* Date */}
            <span className="text-[10px] font-mono text-gray-400 dark:text-gray-600 mt-1">
              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>

            {/* Active indicator */}
            {isActive && (
              <div className="w-1 h-1 rounded-full bg-gray-900 dark:bg-white mt-2" />
            )}
          </button>
        );
      })}
    </div>
  );
}
