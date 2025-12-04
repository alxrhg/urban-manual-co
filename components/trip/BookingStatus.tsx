'use client';

import { CheckCircle2, Clock, AlertCircle, HelpCircle } from 'lucide-react';

export type BookingStatusValue = 'confirmed' | 'pending' | 'not_booked' | 'need-to-book' | 'booked' | 'waitlist' | 'walk-in' | 'cancelled';

interface BookingStatusProps {
  status?: BookingStatusValue | string | null;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

// Status configuration with colors and icons
const STATUS_CONFIG: Record<string, {
  label: string;
  icon: typeof CheckCircle2;
  colors: string;
  darkColors: string;
}> = {
  // Standard statuses
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle2,
    colors: 'text-green-600 bg-green-50 border-green-200',
    darkColors: 'dark:text-green-400 dark:bg-green-900/30 dark:border-green-800',
  },
  booked: {
    label: 'Booked',
    icon: CheckCircle2,
    colors: 'text-green-600 bg-green-50 border-green-200',
    darkColors: 'dark:text-green-400 dark:bg-green-900/30 dark:border-green-800',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    colors: 'text-amber-600 bg-amber-50 border-amber-200',
    darkColors: 'dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800',
  },
  'need-to-book': {
    label: 'Need to book',
    icon: AlertCircle,
    colors: 'text-amber-600 bg-amber-50 border-amber-200',
    darkColors: 'dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800',
  },
  waitlist: {
    label: 'Waitlist',
    icon: Clock,
    colors: 'text-blue-600 bg-blue-50 border-blue-200',
    darkColors: 'dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800',
  },
  'walk-in': {
    label: 'Walk-in',
    icon: HelpCircle,
    colors: 'text-stone-600 bg-stone-50 border-stone-200',
    darkColors: 'dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700',
  },
  not_booked: {
    label: 'Not booked',
    icon: HelpCircle,
    colors: 'text-stone-500 bg-stone-50 border-stone-200',
    darkColors: 'dark:text-gray-500 dark:bg-gray-800 dark:border-gray-700',
  },
  cancelled: {
    label: 'Cancelled',
    icon: AlertCircle,
    colors: 'text-red-600 bg-red-50 border-red-200',
    darkColors: 'dark:text-red-400 dark:bg-red-900/30 dark:border-red-800',
  },
};

/**
 * BookingStatus - Reusable booking status badge
 * Displays the booking status with appropriate icon and colors
 *
 * @example
 * <BookingStatus status="confirmed" />
 * <BookingStatus status="pending" size="sm" />
 * <BookingStatus status="need-to-book" showIcon={false} />
 */
export default function BookingStatus({
  status,
  size = 'sm',
  showIcon = true,
  className = '',
}: BookingStatusProps) {
  // Return null if no status
  if (!status) return null;

  // Get config for the status, fallback to not_booked
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_booked;
  const Icon = config.icon;

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${sizeClasses[size]}
        ${config.colors}
        ${config.darkColors}
        ${className}
      `}
    >
      {showIcon && <Icon className={iconSizeClasses[size]} />}
      {config.label}
    </span>
  );
}

/**
 * Hook to get booking status display info
 * Useful when you need the config without rendering the component
 */
export function useBookingStatusConfig(status?: BookingStatusValue | string | null) {
  if (!status) return null;
  return STATUS_CONFIG[status] || STATUS_CONFIG.not_booked;
}
