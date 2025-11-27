interface DaySeparatorProps {
  dayNumber: number;
  date?: string;
}

/**
 * DaySeparator - Minimalist divider
 * Simple horizontal rule with centered date
 */
export default function DaySeparator({ dayNumber, date }: DaySeparatorProps) {
  // Format date if provided
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : `Day ${dayNumber}`;

  return (
    <div className="flex items-center gap-4 py-6 px-4">
      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
      <span className="font-serif text-xl italic text-gray-400 dark:text-gray-600">
        {formattedDate}
      </span>
      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}
