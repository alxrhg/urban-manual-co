/**
 * Sequence Prediction Component
 *
 * Shows predicted next actions based on user browsing patterns
 */

'use client';

import { useMLSequence } from '@/hooks/useMLSequence';
import { Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

interface SequencePredictionsProps {
  currentSequence: string[];
  onPredictionClick?: (action: string) => void;
  compact?: boolean;
}

export function SequencePredictions({ currentSequence, onPredictionClick, compact = false }: SequencePredictionsProps) {
  const { predictions, loading, error, predict } = useMLSequence({
    enabled: true
  });

  useEffect(() => {
    if (currentSequence && currentSequence.length > 0) {
      predict(currentSequence, 3);
    }
  }, [currentSequence, predict]);

  if (loading || error || !predictions || !predictions.predictions || predictions.predictions.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <Sparkles className="h-3 w-3" />
        <span>Next: {predictions.predictions[0]?.action}</span>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Suggested Next Steps
        </h3>
      </div>

      <div className="space-y-2">
        {predictions.predictions.map((pred, idx) => (
          <button
            key={idx}
            onClick={() => onPredictionClick?.(pred.action)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {pred.action}
              </div>
              <div className="text-xs text-gray-500">
                {(pred.probability * 100).toFixed(0)}% confidence
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
}

