/**
 * Intelligence Alerts
 * Display real-time adjustments and alerts
 */

'use client';

import { AlertCircle, Cloud, Users, Calendar, Info } from 'lucide-react';
import type { RealtimeAdjustment } from '@/services/intelligence/realtime';

interface IntelligenceAlertsProps {
  adjustments: RealtimeAdjustment[];
}

const iconMap = {
  weather: Cloud,
  crowding: Users,
  event: Calendar,
  availability: AlertCircle,
};

const severityStyles = {
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
  critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
};

export function IntelligenceAlerts({ adjustments }: IntelligenceAlertsProps) {
  if (!adjustments || adjustments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold mb-4">Real-Time Intelligence</h3>
      {adjustments.map((adjustment, index) => {
        const Icon = iconMap[adjustment.type] || Info;
        const severityStyle = severityStyles[adjustment.severity] || severityStyles.info;

        return (
          <div
            key={index}
            className={`flex items-start gap-3 p-4 rounded-lg border ${severityStyle}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">{adjustment.message}</p>
              {adjustment.suggested_alternatives && adjustment.suggested_alternatives.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium mb-1">Suggested alternatives:</p>
                  <ul className="text-xs space-y-1">
                    {adjustment.suggested_alternatives.map((alt, altIndex) => (
                      <li key={altIndex}>• {alt.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

