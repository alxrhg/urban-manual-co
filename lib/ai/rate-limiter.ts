/**
 * Rate Limiting for AI Endpoints
 * Prevents abuse and controls API costs
 */

import { RATE_LIMIT_CONFIG } from './config';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private minuteLimit = new Map<string, RateLimitEntry>();
  private hourLimit = new Map<string, RateLimitEntry>();

  /**
   * Check if a request is allowed
   */
  async checkLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    if (!RATE_LIMIT_CONFIG.ENABLED) {
      return { allowed: true, remaining: Infinity, resetTime: Date.now() };
    }

    const now = Date.now();

    // Check minute limit
    const minuteKey = `${identifier}:minute`;
    const minuteEntry = this.minuteLimit.get(minuteKey);
    const minuteResetTime = Math.floor(now / 60000) * 60000 + 60000; // Next minute

    if (minuteEntry) {
      if (now >= minuteEntry.resetTime) {
        // Reset counter
        this.minuteLimit.set(minuteKey, { count: 1, resetTime: minuteResetTime });
      } else if (minuteEntry.count >= RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: minuteEntry.resetTime,
        };
      } else {
        minuteEntry.count++;
      }
    } else {
      this.minuteLimit.set(minuteKey, { count: 1, resetTime: minuteResetTime });
    }

    // Check hour limit
    const hourKey = `${identifier}:hour`;
    const hourEntry = this.hourLimit.get(hourKey);
    const hourResetTime = Math.floor(now / 3600000) * 3600000 + 3600000; // Next hour

    if (hourEntry) {
      if (now >= hourEntry.resetTime) {
        // Reset counter
        this.hourLimit.set(hourKey, { count: 1, resetTime: hourResetTime });
      } else if (hourEntry.count >= RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: hourEntry.resetTime,
        };
      } else {
        hourEntry.count++;
      }
    } else {
      this.hourLimit.set(hourKey, { count: 1, resetTime: hourResetTime });
    }

    const currentMinuteEntry = this.minuteLimit.get(minuteKey);
    const remaining = RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE - (currentMinuteEntry?.count || 0);

    return {
      allowed: true,
      remaining: Math.max(0, remaining),
      resetTime: minuteResetTime,
    };
  }

  /**
   * Clean up old entries (call periodically)
   */
  cleanup() {
    const now = Date.now();
    
    // Clean minute limits
    for (const [key, entry] of this.minuteLimit.entries()) {
      if (now >= entry.resetTime) {
        this.minuteLimit.delete(key);
      }
    }

    // Clean hour limits
    for (const [key, entry] of this.hourLimit.entries()) {
      if (now >= entry.resetTime) {
        this.hourLimit.delete(key);
      }
    }
  }
}

// Singleton instance
export const rateLimiter = new InMemoryRateLimiter();

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);
}

/**
 * Get identifier for rate limiting (user ID or IP)
 */
export function getRateLimitIdentifier(userId?: string, ip?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  if (ip) {
    return `ip:${ip}`;
  }
  return 'anonymous';
}
