'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, X, AlertTriangle, Clock, Route, Info } from 'lucide-react';
import type { PlannerWarning } from '@/lib/intelligence/types';

interface AlertsDropdownProps {
  warnings: PlannerWarning[];
  onDismiss?: (id: string) => void;
  className?: string;
}

const severityConfig = {
  high: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
  medium: {
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
  },
  low: {
    icon: Info,
    color: 'text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700',
  },
};

/**
 * AlertsDropdown - Dropdown menu for trip alerts and warnings
 */
export default function AlertsDropdown({
  warnings,
  onDismiss,
  className = '',
}: AlertsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const highCount = warnings.filter(w => w.severity === 'high').length;
  const hasWarnings = warnings.length > 0;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2.5 rounded-xl transition-colors
          ${hasWarnings
            ? 'hover:bg-gray-100 dark:hover:bg-gray-800'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 opacity-50'
          }
        `}
        title={hasWarnings ? `${warnings.length} alerts` : 'No alerts'}
      >
        <Bell className={`w-5 h-5 ${highCount > 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} />
        {hasWarnings && (
          <span className={`
            absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-medium
            flex items-center justify-center
            ${highCount > 0
              ? 'bg-red-500 text-white'
              : 'bg-amber-500 text-white'
            }
          `}>
            {warnings.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Alerts
            </h3>
            <span className="text-xs text-gray-400">
              {warnings.length} {warnings.length === 1 ? 'alert' : 'alerts'}
            </span>
          </div>

          {/* Alerts List */}
          <div className="max-h-80 overflow-y-auto">
            {warnings.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-700 mb-2" />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  No alerts for your trip
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {warnings.map((warning) => {
                  const config = severityConfig[warning.severity];
                  const Icon = config.icon;

                  return (
                    <div
                      key={warning.id}
                      className={`p-4 ${config.bg} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
                    >
                      <div className="flex gap-3">
                        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {warning.message}
                          </p>
                          {warning.suggestion && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {warning.suggestion}
                            </p>
                          )}
                        </div>
                        {onDismiss && (
                          <button
                            onClick={() => onDismiss(warning.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
