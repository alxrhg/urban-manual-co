'use client';

import { Navigation } from 'lucide-react';

interface Props {
  distanceKm: number;
  compact?: boolean;
}

export function DistanceBadge({ distanceKm, compact = false }: Props) {
  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)}m`;
    }
    if (km < 10) {
      return `${km.toFixed(1)}km`;
    }
    return `${Math.round(km)}km`;
  };

  const getWalkingTime = (km: number): string | null => {
    const walkingSpeedKmH = 5; // Average walking speed
    const minutes = Math.round((km / walkingSpeedKmH) * 60);

    if (minutes < 5) return null; // Too short to display
    if (minutes < 60) return `${minutes} min walk`;

    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0
      ? `${hours}h ${remainingMins}m walk`
      : `${hours}h walk`;
  };

  const walkingTime = getWalkingTime(distanceKm);

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
        <Navigation className="h-3 w-3" />
        <span>{formatDistance(distanceKm)}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-full">
      <Navigation className="h-3 w-3 text-blue-600" />
      <div className="flex flex-col">
        <span className="text-xs font-medium text-blue-600">
          {formatDistance(distanceKm)}
        </span>
        {walkingTime && (
          <span className="text-xs text-blue-500">
            {walkingTime}
          </span>
        )}
      </div>
    </div>
  );
}
