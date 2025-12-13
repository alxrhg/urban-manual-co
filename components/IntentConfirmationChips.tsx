'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { type ExtractedIntent } from '@/app/api/intent/schema';
import { trackChipView, trackChipClick, trackChipRemove } from '@/lib/quality-telemetry';
import type { QualityPageContext, QualityFeatureContext } from '@/lib/intelligence/types';

interface IntentConfirmationChipsProps {
  intent: ExtractedIntent;
  onChipRemove?: (chipType: string, value: string) => void;
  onChipEdit?: (chipType: string, oldValue: string, newValue: string) => void;
  editable?: boolean;
  /** Enable quality tracking */
  trackQuality?: boolean;
  /** Page context for tracking */
  pageContext?: QualityPageContext;
  /** Feature context for tracking */
  featureContext?: QualityFeatureContext;
}

export function IntentConfirmationChips({
  intent,
  onChipRemove,
  onChipEdit,
  editable = true,
  trackQuality = false,
  pageContext,
  featureContext,
}: IntentConfirmationChipsProps) {
  const chips: Array<{ type: string; value: string; label: string; icon?: string }> = [];

  // Primary intent
  if (intent.primaryIntent) {
    const intentLabels: Record<string, string> = {
      discover: 'Discover',
      plan: 'Plan',
      compare: 'Compare',
      recommend: 'Recommend',
      learn: 'Learn',
      book: 'Book',
    };
    chips.push({
      type: 'intent',
      value: intent.primaryIntent,
      label: intentLabels[intent.primaryIntent] || intent.primaryIntent,
    });
  }

  // City
  if (intent.city) {
    chips.push({
      type: 'city',
      value: intent.city,
      label: intent.city,
    });
  }

  // Category
  if (intent.category) {
    chips.push({
      type: 'category',
      value: intent.category,
      label: intent.category,
    });
  }

  // Temporal context
  if (intent.temporalContext?.timeframe) {
    const timeLabels: Record<string, string> = {
      now: 'Right now',
      soon: 'Soon',
      future: 'Future',
      flexible: 'Flexible',
    };
    chips.push({
      type: 'time',
      value: intent.temporalContext.timeframe,
      label: timeLabels[intent.temporalContext.timeframe],
    });
  }

  // Budget constraints
  if (intent.constraints?.budget) {
    const { min, max, currency = '$' } = intent.constraints.budget;
    let budgetLabel = '';
    if (min && max) {
      budgetLabel = `${currency}${min}-${currency}${max}`;
    } else if (min) {
      budgetLabel = `${currency}${min}+`;
    } else if (max) {
      budgetLabel = `Under ${currency}${max}`;
    }
    chips.push({
      type: 'budget',
      value: `${min}-${max}`,
      label: budgetLabel,
    });
  }

  // Time of day
  if (intent.constraints?.time?.timeOfDay) {
    chips.push({
      type: 'timeOfDay',
      value: intent.constraints.time.timeOfDay,
      label: intent.constraints.time.timeOfDay,
    });
  }

  // Modifiers (up to 3)
  if (intent.modifiers && intent.modifiers.length > 0) {
    intent.modifiers.slice(0, 3).forEach((modifier) => {
      chips.push({
        type: 'modifier',
        value: modifier,
        label: modifier,
      });
    });
  }

  // Preferences (up to 2)
  if (intent.constraints?.preferences && intent.constraints.preferences.length > 0) {
    intent.constraints.preferences.slice(0, 2).forEach((pref) => {
      chips.push({
        type: 'preference',
        value: pref,
        label: pref,
      });
    });
  }

  // Exclusions (up to 2)
  if (intent.constraints?.exclusions && intent.constraints.exclusions.length > 0) {
    intent.constraints.exclusions.slice(0, 2).forEach((excl) => {
      chips.push({
        type: 'exclusion',
        value: excl,
        label: `Not ${excl}`,
      });
    });
  }

  const hasTrackedViews = useRef(false);

  // Track views on mount (once)
  useEffect(() => {
    if (trackQuality && !hasTrackedViews.current && chips.length > 0) {
      hasTrackedViews.current = true;
      chips.forEach((chip, index) => {
        trackChipView({
          sourceType: 'intent',
          sourceId: `${chip.type}-${chip.value}`,
          sourceLabel: chip.label,
          position: index,
          totalItems: chips.length,
          pageContext,
          featureContext,
        });
      });
    }
  }, [trackQuality, chips, pageContext, featureContext]);

  if (chips.length === 0) {
    return null;
  }

  const handleChipRemove = (chip: { type: string; value: string; label: string }, index: number) => {
    if (trackQuality) {
      trackChipRemove({
        sourceType: 'intent',
        sourceId: `${chip.type}-${chip.value}`,
        sourceLabel: chip.label,
        pageContext,
        featureContext,
      });
    }
    onChipRemove?.(chip.type, chip.value);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip, index) => (
        <div
          key={`${chip.type}-${chip.value}-${index}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <span>{chip.label}</span>
          {editable && onChipRemove && (
            <button
              onClick={() => handleChipRemove(chip, index)}
              className="ml-0.5 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label={`Remove ${chip.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
