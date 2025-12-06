'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface Credits {
  hasCredits: boolean;
  creditsRemaining: number;
  creditsTotal: number;
  planTier: 'free' | 'pro' | 'unlimited';
  resetAt: string;
  isUnlimited: boolean;
}

export interface CreditUsageItem {
  id: string;
  operation_type: string;
  credits_used: number;
  credits_before: number;
  credits_after: number;
  created_at: string;
}

interface UseCreditsReturn {
  credits: Credits | null;
  history: CreditUsageItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasCreditsForOperation: (operation?: string) => boolean;
}

/**
 * Hook to fetch and manage user credits
 *
 * @example
 * const { credits, hasCreditsForOperation, refetch } = useCredits();
 *
 * if (!hasCreditsForOperation('plan_trip')) {
 *   showUpgradeModal();
 * }
 */
export function useCredits(includeHistory = false): UseCreditsReturn {
  const { user, isAuthenticated } = useAuth();
  const [credits, setCredits] = useState<Credits | null>(null);
  const [history, setHistory] = useState<CreditUsageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setCredits(null);
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = includeHistory
        ? '/api/account/credits?history=true'
        : '/api/account/credits';

      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          setCredits(null);
          setHistory([]);
          return;
        }
        throw new Error('Failed to fetch credits');
      }

      const data = await response.json();
      setCredits(data.credits);

      if (data.history?.usage) {
        setHistory(data.history.usage);
      }
    } catch (err) {
      console.error('[useCredits] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load credits');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, includeHistory]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const hasCreditsForOperation = useCallback(
    (operation?: string): boolean => {
      if (!credits) return false;
      if (credits.isUnlimited) return true;

      // Default credit cost is 1
      const cost = 1;
      return credits.creditsRemaining >= cost;
    },
    [credits]
  );

  return {
    credits,
    history,
    loading,
    error,
    refetch: fetchCredits,
    hasCreditsForOperation,
  };
}

/**
 * Helper to format remaining credits display
 */
export function formatCreditsDisplay(credits: Credits | null): string {
  if (!credits) return '';
  if (credits.isUnlimited) return 'Unlimited';
  return `${credits.creditsRemaining} of ${credits.creditsTotal}`;
}

/**
 * Helper to format reset date
 */
export function formatResetDate(resetAt: string): string {
  const date = new Date(resetAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Resets today';
  if (diffDays === 1) return 'Resets tomorrow';
  if (diffDays < 7) return `Resets in ${diffDays} days`;

  return `Resets on ${date.toLocaleDateString()}`;
}
