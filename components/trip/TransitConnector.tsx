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
 * TransitConnector - Travel time connector between items
 * Lovably style: dotted line with transit info
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
        relative flex items-center gap-3
        pl-[88px] pr-6 py-2
        ${className}
      `}
    >
      {/* Dotted Line */}
      <div className="absolute left-[45px] top-0 bottom-0 w-px border-l border-dashed border-gray-200 dark:border-gray-800" />

      {/* Transit Info */}
      <div className="relative flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-900/50 rounded-full">
        <Icon className="w-3 h-3 text-gray-400" />
        {durationMinutes ? (
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            {formatDuration(durationMinutes)}
          </span>
        ) : (
          <span className="text-[11px] text-gray-400 dark:text-gray-600">
            {modeLabels[mode]}
          </span>
        )}
        {distanceKm && (
          <span className="text-[10px] text-gray-400 dark:text-gray-600">
            ({distanceKm.toFixed(1)} km)
          </span>
        )}
      </div>
    </div>
  );
}
