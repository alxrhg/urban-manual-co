'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Cloud,
  CloudRain,
  Users,
  Clock,
  Plane,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { PlannerWarning } from '@/lib/intelligence/types';

interface IntelligenceWarningsProps {
  warnings: PlannerWarning[];
  onDismiss?: (warningId: string) => void;
  onApply?: (warning: PlannerWarning) => void;
}

/**
 * IntelligenceWarnings - Display contextual warnings and suggestions
 * Handles weather, crowd levels, timing conflicts, and AI recommendations
 */
export default function IntelligenceWarnings({
  warnings,
  onDismiss,
  onApply,
}: IntelligenceWarningsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (warnings.length === 0) return null;

  // Group warnings by severity for display order
  const sortedWarnings = [...warnings].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const getIcon = (type: PlannerWarning['type']) => {
    switch (type) {
      case 'weather':
        return CloudRain;
      case 'crowd':
        return Users;
      case 'timing':
        return Clock;
      case 'transit':
        return Plane;
      default:
        return AlertTriangle;
    }
  };

  const getColors = (severity: PlannerWarning['severity']) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-500',
          text: 'text-red-800 dark:text-red-200',
          button: 'bg-red-100 hover:bg-red-200 dark:bg-red-800/50 dark:hover:bg-red-800',
        };
      case 'medium':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          icon: 'text-amber-500',
          text: 'text-amber-800 dark:text-amber-200',
          button: 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-800/50 dark:hover:bg-amber-800',
        };
      case 'low':
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-500',
          text: 'text-blue-800 dark:text-blue-200',
          button: 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-800/50 dark:hover:bg-blue-800',
        };
    }
  };

  return (
    <div className="px-4 py-2 space-y-2 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
      {sortedWarnings.map((warning) => {
        const Icon = getIcon(warning.type);
        const colors = getColors(warning.severity);
        const isExpanded = expandedId === warning.id;

        return (
          <div
            key={warning.id}
            className={`
              rounded-lg border transition-all duration-200
              ${colors.bg} ${colors.border}
            `}
          >
            {/* Warning Header */}
            <div className="flex items-center gap-3 px-3 py-2">
              <Icon className={`w-4 h-4 flex-shrink-0 ${colors.icon}`} />

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${colors.text}`}>
                  {warning.message}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Suggestion toggle */}
                {warning.suggestion && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : warning.id)}
                    className={`
                      p-1.5 rounded-md text-xs font-medium flex items-center gap-1
                      ${colors.button} ${colors.text}
                    `}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span className="hidden sm:inline">Suggestion</span>
                    <ChevronRight
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>
                )}

                {/* Dismiss button */}
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(warning.id)}
                    className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Suggestion */}
            {isExpanded && warning.suggestion && (
              <div className="px-3 pb-3 pt-1 border-t border-black/5 dark:border-white/5">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {warning.suggestion}
                    </p>

                    {/* Alternative place suggestion */}
                    {warning.alternativePlace && (
                      <div className="bg-white dark:bg-gray-800 rounded-md p-2 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          {warning.alternativePlace.image ? (
                            <img
                              src={warning.alternativePlace.image}
                              alt={warning.alternativePlace.name}
                              className="w-full h-full object-cover rounded-md"
                            />
                          ) : (
                            <Cloud className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {warning.alternativePlace.name}
                          </p>
                          <p className="text-[10px] text-gray-500 capitalize">
                            {warning.alternativePlace.category}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Apply button */}
                  {onApply && (
                    <button
                      onClick={() => onApply(warning)}
                      className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-md hover:opacity-90 transition-opacity flex-shrink-0"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Collapse all button when multiple warnings */}
      {warnings.length > 2 && (
        <button
          onClick={() => setExpandedId(null)}
          className="w-full text-center py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {expandedId ? 'Collapse' : `${warnings.length} alerts`}
        </button>
      )}
    </div>
  );
}
