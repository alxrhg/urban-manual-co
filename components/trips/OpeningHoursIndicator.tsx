'use client';

import { useEffect, useState } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface OpeningHoursIndicatorProps {
  placeId?: string;
  scheduledTime?: string;
  scheduledDate?: string;
}

type OpenStatus = 'open' | 'closed' | 'closing_soon' | 'unknown';

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

  const statusConfig = {
    open: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      text: 'Open',
      className: 'text-green-600 dark:text-green-400',
    },
    closed: {
      icon: <XCircle className="w-3 h-3" />,
      text: 'Closed',
      className: 'text-red-600 dark:text-red-400',
    },
    closing_soon: {
      icon: <AlertCircle className="w-3 h-3" />,
      text: 'Closing soon',
      className: 'text-orange-600 dark:text-orange-400',
    },
    unknown: {
      icon: <Clock className="w-3 h-3" />,
      text: 'Hours unknown',
      className: 'text-gray-400',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-1 text-[10px] ${config.className}`}>
      {config.icon}
      <span>{config.text}</span>
      {hours && <span className="text-gray-400 ml-1">({hours})</span>}
    </div>
  );
}
