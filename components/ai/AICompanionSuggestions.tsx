'use client';

import { useState } from 'react';
import { X, Sparkles, Utensils, MapPin, AlertTriangle, Lightbulb, ChevronRight, Plus } from 'lucide-react';
import Image from 'next/image';
import { useAI, type ProactiveSuggestion } from '@/contexts/AIContext';

/**
 * AICompanionSuggestions - Proactive suggestion cards shown when chat is closed
 *
 * Shows context-aware suggestions like:
 * - Missing meals in trip
 * - Empty days
 * - Recommendations based on browsing
 */
export default function AICompanionSuggestions() {
  const { suggestions, handleSuggestionAction, openChat } = useAI();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleSuggestions = suggestions.filter(s => !dismissedIds.has(s.id));

  if (visibleSuggestions.length === 0) return null;

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set([...prev, id]));
  };

  // Only show top 2 suggestions to avoid clutter
  const topSuggestions = visibleSuggestions.slice(0, 2);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 space-y-2 pointer-events-none">
      {topSuggestions.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onAction={() => handleSuggestionAction(suggestion)}
          onDismiss={(e) => handleDismiss(suggestion.id, e)}
        />
      ))}

      {/* Show more button if there are additional suggestions */}
      {visibleSuggestions.length > 2 && (
        <button
          onClick={openChat}
          className="w-full py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors pointer-events-auto"
        >
          +{visibleSuggestions.length - 2} more suggestions
        </button>
      )}
    </div>
  );
}

// =============================================================================
// SUGGESTION CARD
// =============================================================================

interface SuggestionCardProps {
  suggestion: ProactiveSuggestion;
  onAction: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}

function SuggestionCard({ suggestion, onAction, onDismiss }: SuggestionCardProps) {
  const getIcon = () => {
    switch (suggestion.type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'recommendation':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'tip':
        return <Lightbulb className="w-4 h-4 text-blue-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-500" />;
    }
  };

  const getBgColor = () => {
    switch (suggestion.type) {
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
      case 'recommendation':
        return 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20';
      case 'tip':
        return 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20';
      default:
        return 'bg-white dark:bg-gray-900 border-gray-200 dark:border-white/10';
    }
  };

  return (
    <div
      onClick={onAction}
      className={`
        relative rounded-2xl p-4 border cursor-pointer
        ${getBgColor()}
        shadow-lg hover:shadow-xl transition-all
        pointer-events-auto
        animate-in slide-in-from-bottom-4 fade-in duration-300
      `}
    >
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 pr-8">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {suggestion.title}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
            {suggestion.description}
          </p>
        </div>
      </div>

      {/* Destination previews */}
      {suggestion.destinations && suggestion.destinations.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {suggestion.destinations.slice(0, 3).map((dest) => (
            <a
              key={dest.slug}
              href={`/destination/${dest.slug}`}
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 w-24 group"
            >
              <div className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden mb-1">
                {dest.image ? (
                  <Image
                    src={dest.image}
                    alt={dest.name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              <p className="text-[10px] font-medium text-gray-900 dark:text-white truncate">
                {dest.name}
              </p>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">
                {dest.category}
              </p>
            </a>
          ))}
        </div>
      )}

      {/* Action button */}
      {suggestion.action && (
        <div className="mt-3 flex justify-end">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400">
            {suggestion.action.label}
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      )}
    </div>
  );
}
