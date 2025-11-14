/**
 * Explainable AI Panel Component
 *
 * Shows explanations for ML recommendations
 */

'use client';

import { useMLExplain } from '@/hooks/useMLExplain';
import { Sparkles, Loader2, ChevronRight, Info } from 'lucide-react';
import { useState } from 'react';

interface ExplanationPanelProps {
  destinationId: number;
  method?: 'shap' | 'lime' | 'simple';
  trigger?: 'hover' | 'click' | 'always';
}

export function ExplanationPanel({ destinationId, method = 'shap', trigger = 'click' }: ExplanationPanelProps) {
  const { explanation, loading, error, explain } = useMLExplain({
    destinationId,
    method,
    enabled: true
  });

  const [isOpen, setIsOpen] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  const handleTrigger = () => {
    if (!hasTriggered) {
      explain();
      setHasTriggered(true);
    }
    if (trigger === 'click') {
      setIsOpen(!isOpen);
    }
  };

  if (trigger === 'always' && !hasTriggered) {
    explain();
    setHasTriggered(true);
  }

  if (trigger === 'hover') {
    return (
      <div
        className="group relative"
        onMouseEnter={handleTrigger}
      >
        <button className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs hover:bg-purple-200 dark:hover:bg-purple-900/50">
          <Sparkles className="h-3 w-3" />
          Why?
        </button>
        {explanation && (
          <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            <p className="text-xs text-gray-700 dark:text-gray-300">
              {explanation.explanation}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleTrigger}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs hover:bg-purple-200 dark:hover:bg-purple-900/50"
      >
        <Sparkles className="h-3 w-3" />
        Why recommended?
        <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-2 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating explanation...</span>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {explanation && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Explanation ({explanation.method.toUpperCase()})
                </span>
              </div>

              <p className="text-sm text-gray-700 dark:text-gray-300">
                {explanation.explanation}
              </p>

              {explanation.predicted_score !== undefined && (
                <div className="text-xs text-gray-500">
                  Prediction score: {(explanation.predicted_score * 100).toFixed(1)}%
                </div>
              )}

              {explanation.feature_importance && (
                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                  {explanation.feature_importance.user_features && explanation.feature_importance.user_features.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        User Features:
                      </div>
                      <div className="space-y-1">
                        {explanation.feature_importance.user_features.slice(0, 3).map((feature, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">{feature.feature}</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {(feature.importance * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {explanation.feature_importance.item_features && explanation.feature_importance.item_features.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Destination Features:
                      </div>
                      <div className="space-y-1">
                        {explanation.feature_importance.item_features.slice(0, 3).map((feature, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">{feature.feature}</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {(feature.importance * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

