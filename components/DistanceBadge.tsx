'use client';

import { InsightChip, InsightText } from '@/ui/InsightChip';

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
      <InsightText
        type="distance"
        variant="neutral"
        label={formatDistance(distanceKm)}
      />
    );
  }

  return (
    <InsightChip
      type="distance"
      variant="info"
      label={formatDistance(distanceKm)}
      sublabel={walkingTime ?? undefined}
    />
  );
}
