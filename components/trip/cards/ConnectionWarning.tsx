'use client';

import React from 'react';
import { AlertTriangle, Clock, ArrowRight, DoorOpen, Plane } from 'lucide-react';
import type { FlightStop } from '@/types/trip';

interface ConnectionWarningProps {
  /** Layover duration in minutes */
  layoverMinutes: number;
  /** Airport code where connection occurs */
  airport: string;
  /** City name */
  city?: string;
  /** Arrival terminal */
  arrivalTerminal?: string;
  /** Departure terminal for next flight */
  departureTerminal?: string;
  /** Whether terminals are different (requiring terminal change) */
  terminalChange?: boolean;
  /** Whether this is an international connection (needs more time) */
  isInternational?: boolean;
  /** Minimum recommended connection time for this airport (defaults to 60 domestic, 90 intl) */
  minimumConnectionTime?: number;
}

/** Threshold in minutes for different warning levels */
const WARNING_THRESHOLDS = {
  /** Connections under this are critical (red) */
  critical: 45,
  /** Connections under this are tight (orange) */
  tight: 60,
  /** International connections need extra time */
  internationalBuffer: 30,
  /** Terminal changes need extra time */
  terminalChangeBuffer: 15,
};

/**
 * ConnectionWarning - Alert component for short flight layovers
 * Displays warning when connection time is tight, with severity levels
 */
export default function ConnectionWarning({
  layoverMinutes,
  airport,
  city,
  arrivalTerminal,
  departureTerminal,
  terminalChange = false,
  isInternational = false,
  minimumConnectionTime,
}: ConnectionWarningProps) {
  // Calculate minimum required time
  const baseMinimum = minimumConnectionTime ?? (isInternational ? 90 : 60);
  const adjustedMinimum =
    baseMinimum +
    (terminalChange ? WARNING_THRESHOLDS.terminalChangeBuffer : 0) +
    (isInternational && !minimumConnectionTime ? WARNING_THRESHOLDS.internationalBuffer : 0);

  // Determine warning severity
  const isCritical = layoverMinutes < WARNING_THRESHOLDS.critical;
  const isTight = layoverMinutes < adjustedMinimum;

  // Don't show warning if connection time is adequate
  if (!isTight && !isCritical) {
    return null;
  }

  // Format layover duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  // Determine colors based on severity
  const colors = isCritical
    ? {
        bg: 'bg-red-50 dark:bg-red-900/30',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-600 dark:text-red-400',
        text: 'text-red-700 dark:text-red-300',
        badge: 'bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-300',
      }
    : {
        bg: 'bg-amber-50 dark:bg-amber-900/30',
        border: 'border-amber-200 dark:border-amber-800',
        icon: 'text-amber-600 dark:text-amber-400',
        text: 'text-amber-700 dark:text-amber-300',
        badge: 'bg-amber-100 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300',
      };

  return (
    <div
      className={`rounded-xl ${colors.bg} border ${colors.border} p-3`}
      role="alert"
      aria-label={`${isCritical ? 'Critical' : 'Tight'} connection warning: ${formatDuration(layoverMinutes)} layover at ${airport}`}
    >
      {/* Header with warning icon and time */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${colors.icon}`} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
            {isCritical ? 'Critical Connection' : 'Tight Connection'}
          </span>
        </div>

        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${colors.badge}`}>
          <Clock className="w-3 h-3" />
          <span className="text-xs font-medium">{formatDuration(layoverMinutes)}</span>
        </div>
      </div>

      {/* Connection details */}
      <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-gray-300 mb-2">
        <Plane className="w-3 h-3" />
        <span className="font-medium">{airport}</span>
        {city && <span className="text-stone-400">({city})</span>}
      </div>

      {/* Terminal change info */}
      {(arrivalTerminal || departureTerminal) && (
        <div className="flex items-center gap-2 text-[10px] text-stone-500 dark:text-gray-400">
          <DoorOpen className="w-3 h-3" />
          {arrivalTerminal && <span>Arrive T{arrivalTerminal}</span>}
          {arrivalTerminal && departureTerminal && (
            <ArrowRight className="w-3 h-3 text-stone-400" />
          )}
          {departureTerminal && <span>Depart T{departureTerminal}</span>}
          {terminalChange && (
            <span className={`ml-1 px-1.5 py-0.5 rounded ${colors.badge}`}>
              Terminal change required
            </span>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="mt-2 pt-2 border-t border-stone-200/50 dark:border-gray-700/50">
        <p className="text-[10px] text-stone-500 dark:text-gray-400">
          {isCritical
            ? 'Request airport assistance. Consider rebooking for more time.'
            : terminalChange
              ? 'Move quickly between terminals. Consider gate-to-gate transport.'
              : 'Proceed directly to your gate after landing.'}
        </p>
      </div>
    </div>
  );
}

/**
 * Helper function to create ConnectionWarning from FlightStop data
 */
export function createConnectionWarningFromStop(
  stop: FlightStop,
  isInternational: boolean = false
): React.ReactElement | null {
  if (!stop.durationMinutes || stop.durationMinutes >= 120) {
    return null;
  }

  return (
    <ConnectionWarning
      layoverMinutes={stop.durationMinutes}
      airport={stop.airport}
      city={stop.city}
      arrivalTerminal={stop.terminal}
      departureTerminal={stop.changeTerminal ? undefined : stop.terminal}
      terminalChange={stop.changeTerminal}
      isInternational={isInternational}
    />
  );
}
