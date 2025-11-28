'use client';

interface TripHealthIndicatorProps {
  itemCount: number;
  dayCount: number;
  hasHotel: boolean;
  hasFlight: boolean;
  status?: string;
  className?: string;
}

/**
 * TripHealthDots - Shows trip planning progress as dots
 * Minimal indicator for trip cards
 */
export function TripHealthDots({
  itemCount,
  dayCount,
  hasHotel,
  hasFlight,
}: Omit<TripHealthIndicatorProps, 'status' | 'className'>) {
  const avgItemsPerDay = dayCount > 0 ? itemCount / dayCount : 0;

  // Calculate progress (0-4 dots)
  const dots = [
    itemCount > 0, // Has any items
    avgItemsPerDay >= 1, // At least 1 item per day
    avgItemsPerDay >= 2, // At least 2 items per day
    hasHotel || hasFlight, // Has logistics
  ];

  const filledCount = dots.filter(Boolean).length;

  return (
    <div className="flex items-center gap-0.5">
      {dots.map((filled, i) => (
        <div
          key={i}
          className={`w-1 h-1 rounded-full ${
            filled
              ? 'bg-stone-900 dark:bg-white'
              : 'bg-stone-300 dark:bg-gray-600'
          }`}
        />
      ))}
      {filledCount < 4 && (
        <span className="ml-1 text-[9px] text-stone-400 dark:text-gray-500">
          {Math.round((filledCount / 4) * 100)}%
        </span>
      )}
    </div>
  );
}

export default TripHealthDots;
