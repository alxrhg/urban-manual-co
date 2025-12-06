/**
 * Credits system types
 */

export type PlanTier = 'free' | 'pro' | 'unlimited';

export type OperationType =
  | 'plan_trip'
  | 'plan_day'
  | 'smart_suggestions'
  | 'multi_day_plan'
  | 'credit_reset'
  | 'credit_purchase';

export interface UserCredits {
  id: string;
  user_id: string;
  plan_tier: PlanTier;
  credits_remaining: number;
  credits_total: number;
  reset_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreditUsage {
  id: string;
  user_id: string;
  operation_type: OperationType;
  credits_used: number;
  credits_before: number;
  credits_after: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreditCheckResult {
  hasCredits: boolean;
  creditsRemaining: number;
  creditsTotal: number;
  planTier: PlanTier;
  resetAt: string;
  isUnlimited: boolean;
}

export interface DeductCreditsResult {
  success: boolean;
  creditsRemaining: number;
  creditsUsed: number;
  error?: string;
}

/**
 * Credit costs per operation type
 * Operations not listed here are free
 */
export const CREDIT_COSTS: Record<OperationType, number> = {
  plan_trip: 1,
  plan_day: 1,
  smart_suggestions: 1,
  multi_day_plan: 1,
  credit_reset: 0,
  credit_purchase: 0,
};

/**
 * Default credits for each plan tier
 */
export const TIER_DEFAULTS: Record<PlanTier, { total: number; isUnlimited: boolean }> = {
  free: { total: 3, isUnlimited: false },
  pro: { total: 50, isUnlimited: false },
  unlimited: { total: 999999, isUnlimited: true },
};
