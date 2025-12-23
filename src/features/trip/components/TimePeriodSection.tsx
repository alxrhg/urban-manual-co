'use client';

import { useMemo, ReactNode } from 'react';
import { Sunrise, Sun, Sunset, Moon } from 'lucide-react';

type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

interface TimePeriodSectionProps {
  period: TimePeriod;
  children: ReactNode;
  itemCount?: number;
  className?: string;
}

/**
 * TimePeriodSection - Groups itinerary items by time of day
 * Morning (5am-12pm), Afternoon (12pm-5pm), Evening (5pm-9pm), Night (9pm-5am)
 */
export default function TimePeriodSection({
  period,
  children,
  itemCount,
  className = '',
}: TimePeriodSectionProps) {
  const periodInfo = useMemo(() => {
    switch (period) {
      case 'morning':
        return {
          label: 'Morning',
          icon: Sunrise,
          timeRange: '5 AM – 12 PM',
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
        };
      case 'afternoon':
        return {
          label: 'Afternoon',
          icon: Sun,
          timeRange: '12 PM – 5 PM',
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
        };
      case 'evening':
        return {
          label: 'Evening',
          icon: Sunset,
          timeRange: '5 PM – 9 PM',
          color: 'text-rose-500',
          bgColor: 'bg-rose-500/10',
        };
      case 'night':
        return {
          label: 'Night',
          icon: Moon,
          timeRange: '9 PM – 5 AM',
          color: 'text-indigo-500',
          bgColor: 'bg-indigo-500/10',
        };
    }
  }, [period]);

  const Icon = periodInfo.icon;

  return (
    <div className={`${className}`}>
      {/* Period Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-md ${periodInfo.bgColor}`}>
          <Icon className={`w-3.5 h-3.5 ${periodInfo.color}`} />
        </div>
        <span
          className="text-[13px] font-medium text-[var(--editorial-text-primary)] uppercase tracking-wider"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
        >
          {periodInfo.label}
        </span>
        {itemCount !== undefined && itemCount > 0 && (
          <span className="text-[11px] text-[var(--editorial-text-tertiary)]">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="pl-1 border-l-2 border-[var(--editorial-border)]">
        {children}
      </div>
    </div>
  );
}

/**
 * Helper function to determine time period from a time string
 */
export function getTimePeriod(time: string | null | undefined): TimePeriod {
  if (!time) return 'afternoon'; // Default

  // Parse time (supports "HH:MM", "H:MM", "HH:MM AM/PM")
  let hours = 0;
  const timeStr = time.toLowerCase().trim();

  // Check for AM/PM format
  const isPM = timeStr.includes('pm');
  const isAM = timeStr.includes('am');

  // Extract hours
  const match = timeStr.match(/^(\d{1,2})/);
  if (match) {
    hours = parseInt(match[1], 10);

    // Convert to 24-hour format if needed
    if (isPM && hours !== 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    // Handle 24-hour format
    if (!isPM && !isAM && hours <= 12 && timeStr.includes(':')) {
      // Assume 24-hour format
      const parts = timeStr.split(':');
      hours = parseInt(parts[0], 10);
    }
  }

  // Determine period
  if (hours >= 5 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 17) return 'afternoon';
  if (hours >= 17 && hours < 21) return 'evening';
  return 'night';
}

/**
 * Groups items by time period
 */
export function groupItemsByTimePeriod<T extends { time?: string | null }>(
  items: T[]
): Record<TimePeriod, T[]> {
  const groups: Record<TimePeriod, T[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  items.forEach((item) => {
    const period = getTimePeriod(item.time);
    groups[period].push(item);
  });

  return groups;
}
