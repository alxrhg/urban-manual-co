'use client';

import { useState, useCallback } from 'react';
import { Lightbulb, Plus, Loader2 } from 'lucide-react';

interface Suggestion {
  id: string;
  text: string;
  label?: string;
  category?: string;
  dayNumber?: number;
}

interface TravelAISidebarProps {
  suggestions?: Suggestion[];
  onAddSuggestion?: (suggestion: Suggestion) => void;
  onOpenChat?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * TravelAISidebar - Subtle suggestions panel for trip planning
 *
 * Apple Design System:
 * - No AI branding or sparkles
 * - Clean, minimal design
 * - Suggestions appear naturally
 */
export default function TravelAISidebar({
  suggestions = [],
  onAddSuggestion,
  onOpenChat,
  isLoading = false,
  className = '',
}: TravelAISidebarProps) {
  // Default suggestions if none provided
  const displaySuggestions = suggestions.length > 0 ? suggestions : [
    { id: '1', text: 'Add a morning cafe', category: 'cafe' },
    { id: '2', text: 'Museum for Day 2', category: 'museum', dayNumber: 2 },
  ];

  if (displaySuggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className={`rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <Lightbulb className="w-4 h-4 text-gray-400" />
        <span className="text-[13px] font-medium text-gray-600 dark:text-gray-300">Suggestions</span>
        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-gray-400 ml-auto" />}
      </div>

      {/* Suggestions */}
      <div className="p-3 space-y-2">
        {displaySuggestions.slice(0, 3).map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => onAddSuggestion?.(suggestion)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors text-left group"
          >
            <span className="text-[13px] text-gray-700 dark:text-gray-200">
              {suggestion.text}
            </span>
            <Plus className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
