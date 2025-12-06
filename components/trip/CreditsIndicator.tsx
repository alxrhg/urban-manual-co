'use client';

import { Sparkles, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useCredits, formatCreditsDisplay, formatResetDate } from '@/hooks/useCredits';

interface CreditsIndicatorProps {
  /** Show in compact mode (just count) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show upgrade link */
  showUpgrade?: boolean;
}

/**
 * CreditsIndicator - Displays remaining auto-plan credits
 *
 * Shows "3 of 3 auto-plans remaining" style display with optional upgrade CTA
 */
export default function CreditsIndicator({
  compact = false,
  className = '',
  showUpgrade = true,
}: CreditsIndicatorProps) {
  const { credits, loading, error } = useCredits();

  // Don't show anything while loading or if no credits
  if (loading || error || !credits) {
    return null;
  }

  // Don't show for unlimited users unless they want to see it
  if (credits.isUnlimited) {
    return null;
  }

  const isLow = credits.creditsRemaining <= 1;
  const isEmpty = credits.creditsRemaining === 0;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 text-xs ${
          isEmpty
            ? 'text-red-600 dark:text-red-400'
            : isLow
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-gray-500 dark:text-gray-400'
        } ${className}`}
      >
        <Sparkles className="w-3 h-3" />
        <span>{credits.creditsRemaining}/{credits.creditsTotal}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg ${
        isEmpty
          ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900'
          : isLow
          ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900'
          : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
      } ${className}`}
    >
      <div className="flex items-center gap-2">
        <Sparkles
          className={`w-4 h-4 ${
            isEmpty
              ? 'text-red-500'
              : isLow
              ? 'text-amber-500'
              : 'text-indigo-500'
          }`}
        />
        <div>
          <p
            className={`text-sm font-medium ${
              isEmpty
                ? 'text-red-700 dark:text-red-300'
                : isLow
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {isEmpty
              ? 'No auto-plans remaining'
              : `${credits.creditsRemaining} of ${credits.creditsTotal} auto-plans remaining`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatResetDate(credits.resetAt)}
          </p>
        </div>
      </div>

      {showUpgrade && (
        <Link
          href="/account/upgrade"
          className={`flex items-center gap-1 text-sm font-medium transition-colors ${
            isEmpty
              ? 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
              : 'text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300'
          }`}
        >
          Get more
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

/**
 * InsufficientCreditsMessage - Full-width message when user has no credits
 */
export function InsufficientCreditsMessage({
  className = '',
}: {
  className?: string;
}) {
  const { credits } = useCredits();

  if (!credits || credits.creditsRemaining > 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <Sparkles className="w-6 h-6 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        No auto-plans remaining
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
        You've used all your free auto-plans this month. Upgrade to Pro for unlimited AI-powered trip planning.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/account/upgrade"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Upgrade to Pro
        </Link>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {credits && formatResetDate(credits.resetAt)}
        </p>
      </div>
    </div>
  );
}
