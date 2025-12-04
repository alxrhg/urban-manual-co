/**
 * Inline Sequence Prediction Component
 *
 * Shows predicted next actions in a compact, contextual way
 */

'use client';

import { Sparkles, ArrowRight, Search, Bookmark, Eye, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SequencePrediction {
  action: string;
  probability: number;
  confidence: number;
}

interface SequencePredictionsInlineProps {
  predictions: SequencePrediction[] | null;
  onActionClick?: (action: string) => void;
  compact?: boolean;
}

const actionIcons: Record<string, any> = {
  view: Eye,
  save: Bookmark,
  search: Search,
  filter: Filter,
  click: ArrowRight,
};

const actionLabels: Record<string, string> = {
  view: 'View more',
  save: 'Save places',
  search: 'Search',
  filter: 'Filter',
  click: 'Explore',
};

export function SequencePredictionsInline({ 
  predictions, 
  onActionClick,
  compact = false 
}: SequencePredictionsInlineProps) {
  const router = useRouter();

  if (!predictions || predictions.length === 0) {
    return null;
  }

  const handleAction = (action: string) => {
    if (onActionClick) {
      onActionClick(action);
    } else {
      // Default behavior
      switch (action) {
        case 'search':
          // Focus search input or navigate to search
          const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
          break;
        case 'filter':
          // Open filter panel if available
          const filterButton = document.querySelector('[aria-label*="filter" i], [aria-label*="Filter" i]') as HTMLElement;
          if (filterButton) {
            filterButton.click();
          }
          break;
        default:
          break;
      }
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <Sparkles className="h-3 w-3 text-gray-600 dark:text-gray-400" />
        <span className="font-medium">Next:</span>
        <button
          onClick={() => handleAction(predictions[0].action)}
          className="text-gray-900 dark:text-white hover:underline"
        >
          {actionLabels[predictions[0].action] || predictions[0].action}
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-3 bg-gray-50 dark:bg-gray-900/50">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
        <span className="text-xs font-medium text-gray-900 dark:text-white">
          Suggested next steps
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {predictions.slice(0, 3).map((pred, idx) => {
          const Icon = actionIcons[pred.action] || ArrowRight;
          const label = actionLabels[pred.action] || pred.action;
          
          return (
            <button
              key={idx}
              onClick={() => handleAction(pred.action)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs"
            >
              <Icon className="h-3 w-3" />
              <span>{label}</span>
              <span className="text-gray-600 dark:text-gray-400 text-[10px]">
                {Math.round(pred.probability * 100)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

