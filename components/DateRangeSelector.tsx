'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateRangeSelectorProps {
  startDate?: string | null;
  endDate?: string | null;
  onChange: (startDate: string, endDate: string) => void;
  minDate?: string;
  maxDate?: string;
  className?: string;
  placeholder?: string;
}

interface CalendarDay {
  date: Date;
  inMonth: boolean;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value?: Date | null): string {
  if (!value) return '';
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function buildCalendar(month: Date): CalendarDay[] {
  const firstDay = startOfMonth(month);
  const startOffset = firstDay.getDay();
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return { date, inMonth: date.getMonth() === month.getMonth() } satisfies CalendarDay;
  });
}

function formatLabel(date: Date | null) {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DateRangeSelector({
  startDate,
  endDate,
  onChange,
  minDate,
  maxDate,
  className = '',
  placeholder = 'Select dates',
}: DateRangeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => parseDate(startDate) || parseDate(endDate) || new Date());
  const [rangeStart, setRangeStart] = useState<Date | null>(() => parseDate(startDate));
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => parseDate(endDate));

  const popoverRef = useRef<HTMLDivElement | null>(null);

  const min = useMemo(() => parseDate(minDate) || null, [minDate]);
  const max = useMemo(() => parseDate(maxDate) || null, [maxDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    setRangeStart(parseDate(startDate));
    setRangeEnd(parseDate(endDate));
  }, [startDate, endDate]);

  const previousMonth = () => setMonth(addMonths(month, -1));
  const nextMonth = () => setMonth(addMonths(month, 1));

  const handleSelect = (date: Date) => {
    if ((min && date < min) || (max && date > max)) return;

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      onChange(formatDate(date), '');
    } else {
      if (date < rangeStart) {
        setRangeStart(date);
        setRangeEnd(null);
        onChange(formatDate(date), '');
        return;
      }
      setRangeEnd(date);
      onChange(formatDate(rangeStart), formatDate(date));
      setOpen(false);
    }
  };

  const renderMonth = (monthDate: Date) => {
    const days = buildCalendar(monthDate);

    return (
      <div className="w-[260px]">
        <div className="flex items-center justify-between mb-2 text-xs font-medium text-stone-700 dark:text-gray-200">
          <span>{monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="grid grid-cols-7 text-[11px] text-stone-400 uppercase tracking-wide mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(({ date, inMonth }) => {
            const disabled = Boolean(
              (min && date < min) || (max && date > max)
            );
            const isStart = rangeStart && isSameDay(date, rangeStart);
            const isEnd = rangeEnd && isSameDay(date, rangeEnd);
            const inRange =
              rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd;

            const baseClasses = [
              'h-9 w-9 rounded-lg text-xs flex items-center justify-center transition-all',
              !inMonth ? 'text-stone-300 dark:text-gray-600' : 'text-stone-700 dark:text-gray-200',
              disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-stone-100 dark:hover:bg-gray-800 cursor-pointer',
            ];

            if (inRange) {
              baseClasses.push('bg-stone-900/5 dark:bg-white/10');
            }
            if (isStart || isEnd) {
              baseClasses.push('bg-stone-900 text-white dark:bg-white dark:text-gray-900 hover:bg-stone-900');
            }

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleSelect(date)}
                disabled={disabled}
                className={baseClasses.join(' ')}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const displayLabel = rangeStart || rangeEnd ? `${formatLabel(rangeStart)}${rangeEnd ? ` – ${formatLabel(rangeEnd)}` : ''}` : placeholder;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-left flex items-center justify-between gap-2 hover:border-stone-300 dark:hover:border-gray-600 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="w-4 h-4 text-stone-400 flex-shrink-0" />
          <span className={`truncate ${rangeStart || rangeEnd ? 'text-stone-900 dark:text-white' : 'text-stone-400 dark:text-gray-500'}`}>
            {displayLabel}
          </span>
        </div>
        <span className="text-xs text-stone-400 dark:text-gray-500">{rangeStart && rangeEnd ? `${Math.max(1, Math.round(((rangeEnd as Date).getTime() - (rangeStart as Date).getTime()) / (1000 * 60 * 60 * 24)) + 1)}d` : ''}</span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-30 mt-2 bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 w-[560px]"
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={previousMonth}
              className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="text-sm font-medium text-stone-900 dark:text-white">Select date range</p>
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-gray-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-4">
            {renderMonth(month)}
            {renderMonth(addMonths(month, 1))}
          </div>
        </div>
      )}
    </div>
  );
}
