/**
 * Credits service for managing user credits
 *
 * Server-side only - uses service role client for credit operations
 */

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import {
  UserCredits,
  CreditCheckResult,
  DeductCreditsResult,
  OperationType,
  CREDIT_COSTS,
  TIER_DEFAULTS,
} from './types';

/**
 * Get or initialize user credits
 * Creates a new credits record if one doesn't exist
 */
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const supabase = createServiceRoleClient();

  // Try to get existing credits
  const { data: existing, error: fetchError } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    console.error('[Credits] Error fetching user credits:', fetchError);
    return null;
  }

  if (existing) {
    return existing as UserCredits;
  }

  // Initialize credits for new user
  const { data: newCredits, error: insertError } = await supabase
    .from('user_credits')
    .insert({
      user_id: userId,
      plan_tier: 'free',
      credits_remaining: TIER_DEFAULTS.free.total,
      credits_total: TIER_DEFAULTS.free.total,
      reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    // Handle race condition - another request might have inserted
    if (insertError.code === '23505') {
      const { data: retryFetch } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single();
      return retryFetch as UserCredits;
    }
    console.error('[Credits] Error initializing user credits:', insertError);
    return null;
  }

  return newCredits as UserCredits;
}

/**
 * Check if user has enough credits for an operation
 */
export async function checkCredits(
  userId: string,
  operation?: OperationType
): Promise<CreditCheckResult> {
  const credits = await getUserCredits(userId);

  if (!credits) {
    // Default to no credits if we can't fetch
    return {
      hasCredits: false,
      creditsRemaining: 0,
      creditsTotal: 3,
      planTier: 'free',
      resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isUnlimited: false,
    };
  }

  const isUnlimited = TIER_DEFAULTS[credits.plan_tier].isUnlimited;
  const requiredCredits = operation ? CREDIT_COSTS[operation] : 1;

  return {
    hasCredits: isUnlimited || credits.credits_remaining >= requiredCredits,
    creditsRemaining: credits.credits_remaining,
    creditsTotal: credits.credits_total,
    planTier: credits.plan_tier,
    resetAt: credits.reset_at,
    isUnlimited,
  };
}

/**
 * Deduct credits for an operation
 * Returns false if user doesn't have enough credits
 */
export async function deductCredits(
  userId: string,
  operation: OperationType,
  metadata: Record<string, unknown> = {}
): Promise<DeductCreditsResult> {
  const supabase = createServiceRoleClient();
  const creditCost = CREDIT_COSTS[operation];

  // Check current credits first
  const credits = await getUserCredits(userId);

  if (!credits) {
    return {
      success: false,
      creditsRemaining: 0,
      creditsUsed: 0,
      error: 'Failed to fetch user credits',
    };
  }

  // Unlimited tier users don't consume credits
  if (TIER_DEFAULTS[credits.plan_tier].isUnlimited) {
    // Still log usage for analytics
    await supabase.from('credit_usage').insert({
      user_id: userId,
      operation_type: operation,
      credits_used: 0,
      credits_before: credits.credits_remaining,
      credits_after: credits.credits_remaining,
      metadata: { ...metadata, unlimited: true },
    });

    return {
      success: true,
      creditsRemaining: credits.credits_remaining,
      creditsUsed: 0,
    };
  }

  // Check if user has enough credits
  if (credits.credits_remaining < creditCost) {
    return {
      success: false,
      creditsRemaining: credits.credits_remaining,
      creditsUsed: 0,
      error: 'Insufficient credits',
    };
  }

  const newRemaining = credits.credits_remaining - creditCost;

  // Update credits
  const { error: updateError } = await supabase
    .from('user_credits')
    .update({
      credits_remaining: newRemaining,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('credits_remaining', credits.credits_remaining); // Optimistic locking

  if (updateError) {
    console.error('[Credits] Error updating credits:', updateError);
    return {
      success: false,
      creditsRemaining: credits.credits_remaining,
      creditsUsed: 0,
      error: 'Failed to update credits',
    };
  }

  // Log usage
  await supabase.from('credit_usage').insert({
    user_id: userId,
    operation_type: operation,
    credits_used: creditCost,
    credits_before: credits.credits_remaining,
    credits_after: newRemaining,
    metadata,
  });

  return {
    success: true,
    creditsRemaining: newRemaining,
    creditsUsed: creditCost,
  };
}

/**
 * Get user's credit usage history
 */
export async function getCreditHistory(
  userId: string,
  limit: number = 20
): Promise<{ usage: import('./types').CreditUsage[]; total: number }> {
  const supabase = createServiceRoleClient();

  const { data, error, count } = await supabase
    .from('credit_usage')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Credits] Error fetching credit history:', error);
    return { usage: [], total: 0 };
  }

  return {
    usage: data as import('./types').CreditUsage[],
    total: count || 0,
  };
}

/**
 * Check if reset is needed and perform it
 * Called automatically when checking credits
 */
export async function checkAndResetCredits(userId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: credits } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!credits) return;

  // Check if reset is due
  const resetAt = new Date(credits.reset_at);
  if (resetAt > new Date()) return;

  // Only reset free tier
  if (credits.plan_tier !== 'free') return;

  const newResetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await supabase
    .from('user_credits')
    .update({
      credits_remaining: credits.credits_total,
      reset_at: newResetAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  // Log the reset
  await supabase.from('credit_usage').insert({
    user_id: userId,
    operation_type: 'credit_reset',
    credits_used: 0,
    credits_before: credits.credits_remaining,
    credits_after: credits.credits_total,
    metadata: { reset_type: 'automatic' },
  });
}

/**
 * Get credits for the current authenticated user
 * Uses the user's session, not service role
 */
export async function getCurrentUserCredits(): Promise<CreditCheckResult | null> {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Check and reset if needed
  await checkAndResetCredits(user.id);

  return checkCredits(user.id);
}
