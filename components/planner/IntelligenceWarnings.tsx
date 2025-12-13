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
  ChevronDown,
  Sparkles,
  Lightbulb,
} from 'lucide-react';
import type { PlannerWarning } from '@/lib/intelligence/types';

interface IntelligenceWarningsProps {
  warnings: PlannerWarning[];
  onDismiss?: (warningId: string) => void;
  onApply?: (warning: PlannerWarning) => void;
}

/**
 * Check if a warning has a clear actionable next step
 * Actionable = high severity OR has a suggestion/alternative the user can act on
 */
function hasAction(warning: PlannerWarning): boolean {
  return (
    warning.severity === 'high' ||
    !!warning.suggestion ||
    !!warning.alternative
  );
}

/**
 * IntelligenceWarnings - Display contextual warnings and suggestions
 *
 * Philosophy: Only show warnings prominently when they have a clear next action.
 * Non-actionable warnings are hidden behind "See suggestions" to reduce noise.
 */
export default function IntelligenceWarnings({
  warnings,
  onDismiss,
  onApply,
}: IntelligenceWarningsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHiddenWarnings, setShowHiddenWarnings] = useState(false);

  if (warnings.length === 0) return null;

  // Separate actionable warnings from non-actionable ones
  const actionableWarnings = warnings.filter(hasAction);
  const hiddenWarnings = warnings.filter((w) => !hasAction(w));

  // Sort actionable warnings by severity
  const sortedWarnings = [...actionableWarnings].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  // If no actionable warnings, only show "See suggestions" toggle
  const hasVisibleWarnings = sortedWarnings.length > 0;

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

  const renderWarning = (warning: PlannerWarning) => {
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
                {warning.alternative?.newPlace && (
                  <div className="bg-white dark:bg-gray-800 rounded-md p-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      {warning.alternative.newPlace.image ? (
                        <img
                          src={warning.alternative.newPlace.image}
                          alt={warning.alternative.newPlace.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <Cloud className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                        {warning.alternative.newPlace.name}
                      </p>
                      <p className="text-[10px] text-gray-500 capitalize">
                        {warning.alternative.newPlace.category}
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
  };

  return (
    <div className="px-4 py-2 space-y-2 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
      {/* Actionable warnings - always visible */}
      {sortedWarnings.map(renderWarning)}

      {/* Hidden warnings toggle - only show if there are non-actionable warnings */}
      {hiddenWarnings.length > 0 && (
        <div>
          <button
            onClick={() => setShowHiddenWarnings(!showHiddenWarnings)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <Lightbulb className="w-3 h-3" />
            <span>
              {showHiddenWarnings
                ? 'Hide suggestions'
                : `See ${hiddenWarnings.length} suggestion${hiddenWarnings.length > 1 ? 's' : ''}`}
            </span>
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showHiddenWarnings ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Hidden warnings list */}
          {showHiddenWarnings && (
            <div className="mt-2 space-y-2">
              {hiddenWarnings.map(renderWarning)}
            </div>
          )}
        </div>
      )}

      {/* Collapse all button when multiple actionable warnings */}
      {sortedWarnings.length > 2 && (
        <button
          onClick={() => setExpandedId(null)}
          className="w-full text-center py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {expandedId ? 'Collapse' : `${sortedWarnings.length} alerts`}
        </button>
      )}
    </div>
  );
}
