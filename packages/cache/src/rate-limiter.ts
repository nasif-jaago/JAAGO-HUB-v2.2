export interface RateLimitPolicy {
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMIT_POLICIES: Record<string, RateLimitPolicy> = {
  AUTH: { limit: 5, windowSeconds: 60 },
  API: { limit: 100, windowSeconds: 60 },
  REPORTS: { limit: 10, windowSeconds: 60 },
  EXPORT: { limit: 5, windowSeconds: 60 },
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfterSeconds?: number;
}

interface RequestRecord {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private requestHistory = new Map<string, RequestRecord>();

  public check(
    identifier: string,
    tier: keyof typeof RATE_LIMIT_POLICIES = 'API',
  ): RateLimitResult {
    const policy = RATE_LIMIT_POLICIES[tier] || RATE_LIMIT_POLICIES['API']!;
    const now = Date.now();
    const windowStart = now - policy.windowSeconds * 1000;

    let record = this.requestHistory.get(identifier);
    if (!record) {
      record = { timestamps: [] };
      this.requestHistory.set(identifier, record);
    }

    // Filter out timestamps outside current sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    const currentCount = record.timestamps.length;
    const resetTime = Math.ceil((now + policy.windowSeconds * 1000) / 1000);

    if (currentCount >= policy.limit) {
      const oldestInWindow = record.timestamps[0] || now;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldestInWindow + policy.windowSeconds * 1000 - now) / 1000),
      );

      return {
        allowed: false,
        limit: policy.limit,
        remaining: 0,
        resetTime,
        retryAfterSeconds,
      };
    }

    // Record request timestamp
    record.timestamps.push(now);

    return {
      allowed: true,
      limit: policy.limit,
      remaining: policy.limit - record.timestamps.length,
      resetTime,
    };
  }

  public reset(identifier: string): void {
    this.requestHistory.delete(identifier);
  }
}

export const globalRateLimiter = new SlidingWindowRateLimiter();
