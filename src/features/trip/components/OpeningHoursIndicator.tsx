'use client';

import { useEffect, useState } from 'react';
import {
  InsightText,
  getHoursVariant,
  getHoursIcon,
  getHoursLabel,
} from '@/components/ui/InsightChip';

interface OpeningHoursIndicatorProps {
  placeId?: string;
  scheduledTime?: string;
  scheduledDate?: string;
}

type OpenStatus = 'open' | 'closed' | 'closing_soon' | 'unknown';

/**
 * OpeningHoursIndicator - Shows open/closed status
 * Uses standardized InsightText for consistent styling
 */
export default function OpeningHoursIndicator({
  placeId,
  scheduledTime,
  scheduledDate,
}: OpeningHoursIndicatorProps) {
  const [status, setStatus] = useState<OpenStatus>('unknown');
  const [hours, setHours] = useState<string | null>(null);

  useEffect(() => {
    // In production, you would fetch opening hours from Google Places API
    // For now, we'll show unknown status
    if (!placeId) {
      setStatus('unknown');
      return;
    }

    // Mock: determine status based on scheduled time
    if (scheduledTime) {
      const [hour] = scheduledTime.split(':').map(Number);
      // Simple mock logic - most places open 9-21
      if (hour >= 9 && hour < 21) {
        setStatus('open');
        if (hour >= 20) {
          setStatus('closing_soon');
        }
      } else {
        setStatus('closed');
      }
    }
  }, [placeId, scheduledTime, scheduledDate]);

  if (status === 'unknown') {
    return null;
  }

  const variant = getHoursVariant(status);
  const icon = getHoursIcon(status);
  const label = getHoursLabel(status);

  return (
    <div className="flex items-center gap-1">
      <InsightText
        type="hours"
        variant={variant}
        label={label}
        icon={icon}
      />
      {hours && (
        <span className="text-[10px] text-gray-400 ml-1">({hours})</span>
      )}
    </div>
  );
}
