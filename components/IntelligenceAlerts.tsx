/**
 * Intelligence Alerts
 * Real-time adjustments with minimal, informative design
 */

'use client';

import { AlertCircle, Cloud, Users, Calendar, Info, ChevronRight } from 'lucide-react';
import type { RealtimeAdjustment } from '@/services/intelligence/realtime';

interface IntelligenceAlertsProps {
  adjustments: RealtimeAdjustment[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  weather: Cloud,
  crowding: Users,
  event: Calendar,
  availability: AlertCircle,
};

const severityStyles = {
  info: {
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-gray-200 dark:border-gray-800',
    icon: 'text-gray-500 dark:text-gray-400',
    text: 'text-gray-900 dark:text-white',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/10',
    border: 'border-yellow-200 dark:border-yellow-800/30',
    icon: 'text-yellow-600 dark:text-yellow-500',
    text: 'text-yellow-900 dark:text-yellow-100',
  },
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/10',
    border: 'border-red-200 dark:border-red-800/30',
    icon: 'text-red-600 dark:text-red-500',
    text: 'text-red-900 dark:text-red-100',
  },
};

export function IntelligenceAlerts({ adjustments }: IntelligenceAlertsProps) {
  if (!adjustments || adjustments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {adjustments.map((adjustment, index) => {
        const Icon = iconMap[adjustment.type] || Info;
        const styles = severityStyles[adjustment.severity] || severityStyles.info;

        return (
          <div
            key={index}
            className={`flex items-start gap-4 p-4 rounded-xl border ${styles.bg} ${styles.border}`}
          >
            <div className={`flex-shrink-0 p-2 rounded-lg ${styles.bg}`}>
              <Icon className={`h-4 w-4 ${styles.icon}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${styles.text}`}>
                {adjustment.message}
              </p>
              {adjustment.suggested_alternatives && adjustment.suggested_alternatives.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {adjustment.suggested_alternatives.slice(0, 3).map((alt, altIndex) => (
                    <span
                      key={altIndex}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300"
                    >
                      {alt.name}
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
