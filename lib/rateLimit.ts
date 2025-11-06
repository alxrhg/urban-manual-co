/**
 * Rate Limiting Utility
 *
 * Simple in-memory rate limiter for development and small-scale production.
 * For high-scale production, replace with Upstash Redis rate limiting:
 *
 * ```bash
 * npm install @upstash/ratelimit @upstash/redis
 * ```
 *
 * Then use: https://github.com/upstash/ratelimit
 */

import { logRateLimit } from './logger';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.store = new Map();
    // Cleanup expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Check rate limit for an identifier
   * @param identifier - Usually user ID or IP address
   * @param limit - Maximum number of requests
   * @param windowMs - Time window in milliseconds
   * @returns Object with success status and metadata
   */
  async check(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // No entry or expired - create new
    if (!entry || entry.resetAt < now) {
      this.store.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      });
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: now + windowMs,
      };
    }

    // Entry exists and not expired
    if (entry.count >= limit) {
      // Log rate limit exceeded
      logRateLimit(identifier, 'rate-limited', true);

      return {
        success: false,
        limit,
        remaining: 0,
        reset: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;

    // Log successful check (debug level)
    if (entry.count === limit - 2) {
      // Warn when approaching limit
      logRateLimit(identifier, 'approaching-limit', false);
    }

    return {
      success: true,
      limit,
      remaining: limit - entry.count,
      reset: entry.resetAt,
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  AI_CHAT: {
    limit: 20, // 20 requests
    window: 60 * 1000, // per minute
  },
  SEARCH: {
    limit: 30,
    window: 60 * 1000,
  },
  RECOMMENDATIONS: {
    limit: 60,
    window: 60 * 1000,
  },
  UPLOAD: {
    limit: 5,
    window: 5 * 60 * 1000, // per 5 minutes
  },
  GENERAL: {
    limit: 100,
    window: 60 * 1000,
  },
  ADMIN: {
    limit: 10,
    window: 60 * 60 * 1000, // per hour
  },
} as const;

/**
 * Apply rate limiting to an API endpoint
 *
 * @example
 * ```typescript
 * const { success, ...rateLimit } = await applyRateLimit(
 *   userId || ip,
 *   RATE_LIMITS.AI_CHAT
 * );
 *
 * if (!success) {
 *   return NextResponse.json(
 *     { error: 'Rate limit exceeded' },
 *     { status: 429, headers: getRateLimitHeaders(rateLimit) }
 *   );
 * }
 * ```
 */
export async function applyRateLimit(
  identifier: string,
  config: { limit: number; window: number }
) {
  return rateLimiter.check(identifier, config.limit, config.window);
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(rateLimit: {
  limit: number;
  remaining: number;
  reset: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': rateLimit.limit.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': rateLimit.reset.toString(),
    'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString(),
  };
}

/**
 * Extract identifier for rate limiting (prefer user ID, fallback to IP)
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from headers
  const headers = request.headers;
  const ip =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'anonymous';

  return `ip:${ip}`;
}

export default rateLimiter;
