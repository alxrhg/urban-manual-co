'use client';

import { useState, useEffect } from 'react';
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RealtimeStatus {
  waitTime?: {
    current: number;
    historical: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  availability?: {
    status: 'available' | 'limited' | 'full' | 'closed';
    details?: string;
  };
  specialHours?: {
    isOpen: boolean;
    closingSoon?: boolean;
    nextOpen?: string;
  };
}

interface RealtimeStatusBadgeProps {
  destinationId: number;
  compact?: boolean;
  showWaitTime?: boolean;
  showAvailability?: boolean;
}

export function RealtimeStatusBadge({
  destinationId,
  compact = false,
  showWaitTime = true,
  showAvailability = true,
}: RealtimeStatusBadgeProps) {
  const [status, setStatus] = useState<RealtimeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [destinationId]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/realtime/status?destination_id=${destinationId}`);
      const data = await response.json();
      setStatus(data.status || null);
    } catch (error) {
      console.error('Error fetching realtime status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !status) {
    return null;
  }

  // Don't show if no relevant data
  const hasData =
    (showWaitTime && status.waitTime) ||
    (showAvailability && status.availability && status.availability.status !== 'available');

  if (!hasData) {
    return null;
  }

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-3 w-3 text-orange-600" />;
      case 'decreasing':
        return <TrendingDown className="h-3 w-3 text-green-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {showAvailability && status.availability && status.availability.status === 'closed' && (
          <div className="px-2 py-0.5 rounded-full text-xs font-medium text-gray-600 bg-gray-100 dark:bg-gray-800">
            Closed
          </div>
        )}
        {showAvailability && status.availability && status.availability.status === 'limited' && (
          <div className="px-2 py-0.5 rounded-full text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20">
            Limited
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Right Now
      </h3>

      {/* Wait Time */}
      {showWaitTime && status.waitTime && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400">Wait Time</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{status.waitTime.current} min</span>
            {getTrendIcon(status.waitTime.trend)}
          </div>
        </div>
      )}

      {/* Availability */}
      {showAvailability && status.availability && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600 dark:text-gray-400">Status</span>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            status.availability.status === 'closed' ? 'text-gray-600 bg-gray-100 dark:bg-gray-800' :
            status.availability.status === 'limited' ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' :
            status.availability.status === 'full' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' :
            'text-green-600 bg-green-50 dark:bg-green-900/20'
          }`}>
            {status.availability.status === 'closed' ? 'Closed' :
             status.availability.status === 'limited' ? 'Limited' :
             status.availability.status === 'full' ? 'Full' :
             'Available'}
          </div>
        </div>
      )}

      {/* Closing Soon Warning */}
      {status.specialHours?.closingSoon && (
        <div className="text-xs text-orange-600 dark:text-orange-400">
          ⚠️ Closing soon
        </div>
      )}
    </div>
  );
}

