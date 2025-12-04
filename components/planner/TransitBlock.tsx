import { Footprints, Car, Train } from 'lucide-react';
import type { TransitMode } from '@/services/intelligence/planner/types';

interface TransitBlockProps {
  mode: TransitMode;
  durationMinutes: number;
  distanceKm?: number;
}

/**
 * TransitBlock - Ultra-subtle connector
 * Dotted vertical line with minimal transit info
 */
export default function TransitBlock({
  mode,
  durationMinutes,
  distanceKm,
}: TransitBlockProps) {
  const Icon = mode === 'walk' ? Footprints : mode === 'drive' ? Car : Train;

  // Format duration
  const durationText =
    durationMinutes < 60
      ? `${durationMinutes} min`
      : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;

  return (
    <div className="flex items-center gap-4 py-2 px-4">
      {/* Time column spacer */}
      <div className="w-12" />

      {/* Dotted line connector */}
      <div className="w-16 flex justify-center">
        <div className="w-px h-8 border-l border-dashed border-gray-200 dark:border-gray-800" />
      </div>

      {/* Transit info */}
      <div className="flex items-center gap-2 text-[10px] text-gray-300 dark:text-gray-700">
        <Icon className="w-3 h-3" />
        <span>{durationText}</span>
        {distanceKm && distanceKm > 0.1 && (
          <span className="text-gray-200 dark:text-gray-800">
            \u00b7 {distanceKm.toFixed(1)} km
          </span>
        )}
      </div>
    </div>
  );
}
