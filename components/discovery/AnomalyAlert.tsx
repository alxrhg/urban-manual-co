/**
 * Anomaly Detection Alert Component
 *
 * Shows anomaly alerts for destinations
 */

'use client';

import { useMLAnomaly } from '@/hooks/useMLAnomaly';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useState } from 'react';

interface AnomalyAlertProps {
  destinationId?: number;
  city?: string;
  days?: number;
  type?: 'traffic' | 'sentiment';
  onDismiss?: () => void;
}

export function AnomalyAlert({ destinationId, city, days = 30, type = 'traffic', onDismiss }: AnomalyAlertProps) {
  const { anomalies, loading, error } = useMLAnomaly({
    destinationId,
    city,
    days,
    type,
    enabled: true
  });

  const [dismissed, setDismissed] = useState(false);

  if (loading || error || dismissed || !anomalies || anomalies.anomaly_count === 0) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const severity = anomalies.anomaly_count > 5 ? 'high' : anomalies.anomaly_count > 2 ? 'medium' : 'low';

  return (
    <div className={`border rounded-xl p-4 ${
      severity === 'high'
        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
        : severity === 'medium'
        ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20'
        : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <AlertTriangle className={`h-5 w-5 mt-0.5 ${
            severity === 'high'
              ? 'text-red-600 dark:text-red-400'
              : severity === 'medium'
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-yellow-600 dark:text-yellow-400'
          }`} />
          <div className="flex-1 space-y-1">
            <h4 className={`text-sm font-medium ${
              severity === 'high'
                ? 'text-red-900 dark:text-red-100'
                : severity === 'medium'
                ? 'text-orange-900 dark:text-orange-100'
                : 'text-yellow-900 dark:text-yellow-100'
            }`}>
              {type === 'traffic' ? 'Traffic Anomaly Detected' : 'Sentiment Anomaly Detected'}
            </h4>
            <p className={`text-xs ${
              severity === 'high'
                ? 'text-red-700 dark:text-red-300'
                : severity === 'medium'
                ? 'text-orange-700 dark:text-orange-300'
                : 'text-yellow-700 dark:text-yellow-300'
            }`}>
              {anomalies.anomaly_count} unusual {anomalies.anomaly_count === 1 ? 'pattern' : 'patterns'} detected in the last {days} days.
            </p>
            {anomalies.anomalies && anomalies.anomalies.length > 0 && (
              <div className="mt-2 space-y-1">
                {anomalies.anomalies.slice(0, 3).map((anomaly, idx) => (
                  <div key={idx} className="text-xs opacity-75">
                    • {new Date(anomaly.date).toLocaleDateString()}: {anomaly.metric} ({anomaly.value.toFixed(1)} vs expected {anomaly.expected_value.toFixed(1)})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

