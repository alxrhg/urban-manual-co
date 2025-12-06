/**
 * Credits middleware for API routes
 *
 * Wraps API handlers to check and deduct credits for AI operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { checkCredits, deductCredits, checkAndResetCredits } from './service';
import { OperationType, CREDIT_COSTS, CreditCheckResult } from './types';
import { CustomError, ErrorCode } from '@/lib/errors/types';

/**
 * Custom error for insufficient credits
 */
export class InsufficientCreditsError extends CustomError {
  creditsRemaining: number;
  creditsRequired: number;
  resetAt: string;

  constructor(creditsRemaining: number, creditsRequired: number, resetAt: string) {
    super(
      ErrorCode.FORBIDDEN,
      `Insufficient credits. You have ${creditsRemaining} credits remaining, but this operation requires ${creditsRequired}.`,
      402, // Payment Required
      {
        creditsRemaining,
        creditsRequired,
        resetAt,
        upgradeUrl: '/account/upgrade',
      }
    );
    this.creditsRemaining = creditsRemaining;
    this.creditsRequired = creditsRequired;
    this.resetAt = resetAt;
  }
}

/**
 * Response type that includes credits info
 */
export interface CreditAwareResponse {
  credits?: {
    remaining: number;
    total: number;
    used: number;
    resetAt: string;
  };
}

/**
 * Extended request with credits info attached
 */
export interface CreditAwareRequest extends NextRequest {
  credits?: CreditCheckResult;
  userId?: string;
}

/**
 * Options for the credits middleware
 */
export interface WithCreditsOptions {
  /** The operation type for credit costing */
  operation: OperationType;
  /** Whether to deduct credits on success (default: true) */
  deductOnSuccess?: boolean;
  /** Whether to allow unauthenticated users (default: false) */
  allowUnauthenticated?: boolean;
}

/**
 * Middleware wrapper that checks and optionally deducts credits
 *
 * @example
 * export const POST = withCreditsCheck(
 *   { operation: 'plan_trip' },
 *   async (req, context, credits) => {
 *     // Your handler code
 *     return NextResponse.json({ data });
 *   }
 * );
 */
export function withCreditsCheck(
  options: WithCreditsOptions,
  handler: (
    req: NextRequest,
    context: { params?: Record<string, string> },
    credits: CreditCheckResult | null
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: { params?: Record<string, string> }): Promise<NextResponse> => {
    const { operation, deductOnSuccess = true, allowUnauthenticated = false } = options;
    const creditCost = CREDIT_COSTS[operation];

    // Get authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (allowUnauthenticated) {
        // Allow but with no credits info
        return handler(req, context || {}, null);
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Check and reset credits if needed
    await checkAndResetCredits(user.id);

    // Check current credits
    const credits = await checkCredits(user.id, operation);

    // If user doesn't have enough credits, return 402
    if (!credits.hasCredits) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient credits. You have ${credits.creditsRemaining} of ${credits.creditsTotal} auto-plans remaining.`,
          code: 'INSUFFICIENT_CREDITS',
          credits: {
            remaining: credits.creditsRemaining,
            total: credits.creditsTotal,
            required: creditCost,
            resetAt: credits.resetAt,
            upgradeUrl: '/account/upgrade',
          },
        },
        { status: 402 }
      );
    }

    // Execute the handler
    const response = await handler(req, context || {}, credits);

    // If successful and should deduct, deduct credits
    if (response.ok && deductOnSuccess && !credits.isUnlimited) {
      const deductResult = await deductCredits(user.id, operation, {
        endpoint: req.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      });

      // Add credits info to response if it's JSON
      try {
        const clonedResponse = response.clone();
        const body = await clonedResponse.json();

        return NextResponse.json(
          {
            ...body,
            credits: {
              remaining: deductResult.creditsRemaining,
              total: credits.creditsTotal,
              used: deductResult.creditsUsed,
              resetAt: credits.resetAt,
            },
          },
          {
            status: response.status,
            headers: response.headers,
          }
        );
      } catch {
        // If response isn't JSON, return as-is
        return response;
      }
    }

    // For unlimited users or when not deducting, still add credits info
    if (response.ok) {
      try {
        const clonedResponse = response.clone();
        const body = await clonedResponse.json();

        return NextResponse.json(
          {
            ...body,
            credits: {
              remaining: credits.creditsRemaining,
              total: credits.creditsTotal,
              used: 0,
              resetAt: credits.resetAt,
              isUnlimited: credits.isUnlimited,
            },
          },
          {
            status: response.status,
            headers: response.headers,
          }
        );
      } catch {
        return response;
      }
    }

    return response;
  };
}

/**
 * Helper to create a 402 Payment Required response
 */
export function createInsufficientCreditsResponse(credits: CreditCheckResult, required: number = 1): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: `Insufficient credits. You have ${credits.creditsRemaining} of ${credits.creditsTotal} auto-plans remaining.`,
      code: 'INSUFFICIENT_CREDITS',
      credits: {
        remaining: credits.creditsRemaining,
        total: credits.creditsTotal,
        required,
        resetAt: credits.resetAt,
        upgradeUrl: '/account/upgrade',
      },
    },
    { status: 402 }
  );
}
