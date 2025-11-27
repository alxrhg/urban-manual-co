'use client';

import { CalendarDays, KeyRound, MapPin } from 'lucide-react';

interface LodgingCardProps {
  hotelName: string;
  address?: string | null;
  checkInDate?: string;
  checkOutDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  confirmationNumber?: string;
}

const baseCardClasses =
  'rounded-xl bg-stone-50 p-4 shadow-sm ring-1 ring-stone-200 dark:bg-stone-800/60 dark:ring-stone-700/60';

function formatDate(dateStr?: string) {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    const day = date.getDate();
    const suffix =
      day % 10 === 1 && day !== 11
        ? 'st'
        : day % 10 === 2 && day !== 12
          ? 'nd'
          : day % 10 === 3 && day !== 13
            ? 'rd'
            : 'th';

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) + suffix;
  } catch {
    return dateStr;
  }
}

export default function LodgingCard({
  hotelName,
  address,
  checkInDate,
  checkOutDate,
  checkInTime,
  checkOutTime,
  confirmationNumber,
}: LodgingCardProps) {
  const hasDates = checkInDate || checkOutDate;

  return (
    <div className={baseCardClasses}>
      {/* REGION 1: Property Identity */}
      <div className="mb-3 space-y-1">
        <p className="text-lg font-semibold leading-tight text-stone-900 dark:text-white">{hotelName}</p>
        {address && (
          <p className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{address}</span>
          </p>
        )}
      </div>

      {/* REGION 2: Booking Dates */}
      <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300">
        <CalendarDays className="w-3 h-3 text-stone-400" />
        {hasDates ? (
          <>
            <span>{formatDate(checkInDate)}</span>
            <span className="px-1 text-stone-400">—</span>
            <span>{formatDate(checkOutDate)}</span>
          </>
        ) : (
          <span className="text-stone-400 dark:text-stone-500">Add check-in and check-out dates</span>
        )}
      </div>

      {/* REGION 3: Timing & Confirmation */}
      {(checkInTime || checkOutTime || confirmationNumber) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
          {checkInTime && <span>Check-in {checkInTime}</span>}
          {checkOutTime && <span>Check-out {checkOutTime}</span>}
          {confirmationNumber && (
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-stone-600 dark:bg-stone-700 dark:text-stone-200">
              <KeyRound className="w-3 h-3" />
              {confirmationNumber}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
