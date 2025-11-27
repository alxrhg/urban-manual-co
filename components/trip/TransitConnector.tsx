'use client';

import { Car, Footprints, Train, Bus } from 'lucide-react';
import { formatDuration } from '@/lib/utils/time-calculations';

type TransitMode = 'walk' | 'drive' | 'transit' | 'bus';

interface TransitConnectorProps {
  durationMinutes?: number;
  distanceKm?: number;
  mode?: TransitMode;
  className?: string;
}

const modeIcons: Record<TransitMode, typeof Car> = {
  walk: Footprints,
  drive: Car,
  transit: Train,
  bus: Bus,
};

const modeLabels: Record<TransitMode, string> = {
  walk: 'Walk',
  drive: 'Drive',
  transit: 'Transit',
  bus: 'Bus',
};

/**
 * TransitConnector - Refined travel time connector between timeline items
 * Featuring subtle dotted line and minimal transit pill
 */
export default function TransitConnector({
  durationMinutes,
  distanceKm,
  mode = 'walk',
  className = '',
}: TransitConnectorProps) {
  const Icon = modeIcons[mode];

  return (
    <div
      className={`
        relative flex items-center
        ml-20 pl-8 pr-6 py-1.5
        ${className}
      `}
    >
      {/* Connecting Line - Refined dotted style */}
      <div
        className="absolute left-[22px] top-0 bottom-0 w-px"
        style={{
          backgroundImage: `linear-gradient(to bottom, var(--line-color) 50%, transparent 50%)`,
          backgroundSize: '1px 6px',
          // Use CSS variable for theming
          ['--line-color' as string]: 'rgb(214 211 209)', // stone-300
        }}
      />

      {/* Transit Info Pill */}
      <div className="relative flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 dark:bg-stone-900/30 rounded-full border border-stone-100 dark:border-stone-800/50">
        <Icon className="w-3 h-3 text-stone-400 dark:text-stone-500" strokeWidth={1.5} />
        {durationMinutes ? (
          <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium tabular-nums">
            {formatDuration(durationMinutes)}
          </span>
        ) : (
          <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
            {modeLabels[mode]}
          </span>
        )}
        {distanceKm && (
          <>
            <span className="text-stone-300 dark:text-stone-600">·</span>
            <span className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">
              {distanceKm.toFixed(1)} km
            </span>
          </>
        )}
      </div>
    </div>
  );
}
