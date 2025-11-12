'use client';

import { Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
      <Badge variant="neutralOutline" className="gap-1.5 px-2.5 py-1">
        <Navigation className="h-3 w-3 text-gray-600 dark:text-gray-200" />
        <span>{formatDistance(distanceKm)}</span>
      </Badge>
    );
  }

  return (
    <Badge variant="neutralInverse" className="gap-2 px-3 py-2 text-left">
      <Navigation className="h-3.5 w-3.5 text-gray-200" />
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-semibold text-gray-100">
          {formatDistance(distanceKm)}
        </span>
        {walkingTime && (
          <span className="text-[11px] text-gray-300">
            {walkingTime}
          </span>
        )}
      </div>
    </Badge>
  );
}
