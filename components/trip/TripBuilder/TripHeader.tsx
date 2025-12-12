'use client';

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Users,
  ChevronDown,
  Pencil,
  FolderOpen,
} from 'lucide-react';
import { TripHeaderProps, TripSummary } from './types';
import { TripHealthBadge } from './TripInsightsBar';
import { formatDuration, formatDate } from './utils';

/**
 * TripHeader - Main header for the trip panel
 *
 * Features:
 * - Editable trip title
 * - Date picker
 * - Trip switcher dropdown
 * - Health score badge
 * - Key statistics display
 */
const TripHeader = memo(function TripHeader({
  trip,
  health,
  totalItems,
  savedTrips,
  onClose,
  onUpdateTitle,
  onUpdateDate,
  onSwitchTrip,
}: TripHeaderProps) {
  // Local state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(trip.title);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [showTripSelector, setShowTripSelector] = useState(false);

  // Refs
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Update title value when trip changes
  useEffect(() => {
    setTitleValue(trip.title);
  }, [trip.title]);

  // Focus input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingDate && dateInputRef.current) {
      dateInputRef.current.focus();
    }
  }, [isEditingDate]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showTripSelector) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setShowTripSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTripSelector]);

  // Handlers
  const handleTitleSubmit = useCallback(() => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== trip.title) {
      onUpdateTitle(trimmed);
    } else {
      setTitleValue(trip.title);
    }
    setIsEditingTitle(false);
  }, [titleValue, trip.title, onUpdateTitle]);

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdateDate(e.target.value);
      setIsEditingDate(false);
    },
    [onUpdateDate]
  );

  const handleSwitchTrip = useCallback(
    (tripId: string) => {
      setShowTripSelector(false);
      onSwitchTrip(tripId);
    },
    [onSwitchTrip]
  );

  // Computed
  const totalTime = trip.days.reduce((sum, d) => sum + d.totalTime, 0);
  const otherTrips = savedTrips.filter((t) => t.id !== trip.id).slice(0, 5);
  const hasOtherTrips = otherTrips.length > 0;

  return (
    <header className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-gray-800">
      {/* Top row: Title and close button */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="relative flex-1 min-w-0" ref={selectorRef}>
          {/* Title section */}
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setTitleValue(trip.title);
                  setIsEditingTitle(false);
                }
              }}
              className="w-full text-[18px] font-semibold text-gray-900 dark:text-white bg-transparent border-b-2 border-gray-300 dark:border-gray-600 focus:outline-none focus:border-gray-900 dark:focus:border-white transition-colors"
            />
          ) : (
            <button
              onClick={() => hasOtherTrips && setShowTripSelector(!showTripSelector)}
              className={`group flex items-center gap-2 text-left ${
                hasOtherTrips ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white truncate">
                {trip.title}
              </h2>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-all"
                aria-label="Edit title"
              >
                <Pencil className="w-3 h-3 text-gray-400" />
              </button>
              {hasOtherTrips && (
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    showTripSelector ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>
          )}

          {/* Trip metadata */}
          <div className="flex items-center gap-3 mt-1.5 text-[12px] text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {trip.city}
            </span>

            {/* Date picker */}
            {isEditingDate ? (
              <input
                ref={dateInputRef}
                type="date"
                value={trip.startDate || ''}
                onChange={handleDateChange}
                onBlur={() => setIsEditingDate(false)}
                className="text-[12px] bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none"
              />
            ) : (
              <button
                onClick={() => setIsEditingDate(true)}
                className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <Calendar className="w-3 h-3" />
                {trip.startDate ? formatDate(trip.startDate) : 'Set date'}
              </button>
            )}

            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {trip.travelers}
            </span>
          </div>

          {/* Trip selector dropdown */}
          {showTripSelector && hasOtherTrips && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Switch Trip
              </p>
              {otherTrips.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSwitchTrip(t.id)}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-white/10 flex items-center gap-3 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
                      {t.title}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {t.destination} · {t.itemCount} places
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-white/5">
        <StatItem value={totalItems} label="Places" />
        <Divider />
        <StatItem value={trip.days.length} label="Days" />
        <Divider />
        <StatItem value={formatDuration(totalTime)} label="Total" />
        {totalItems >= 3 && (
          <>
            <Divider />
            <TripHealthBadge score={health.score} label={health.label} />
          </>
        )}
      </div>
    </header>
  );
});

/**
 * Stat display item
 */
function StatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-[16px] font-semibold text-gray-900 dark:text-white tabular-nums">
        {value}
      </p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}

/**
 * Vertical divider
 */
function Divider() {
  return <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />;
}

export default TripHeader;
