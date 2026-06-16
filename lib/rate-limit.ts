// Two-mode rate limiter:
//   - Production: Upstash Redis sliding-window (when UPSTASH_REDIS_REST_URL +
//     UPSTASH_REDIS_REST_TOKEN are present)
//   - Dev/fallback: in-process Map (state resets on server restart)
//
// Same `enforce()` API in both modes; callers do not change.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface InMemoryBucket {
  timestamps: number[];
}

const buckets = new Map<string, InMemoryBucket>();

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  // Optional short identifier for Upstash limiter caching (e.g. "vote-min")
  // so multiple call sites with the same config share one limiter instance.
  name?: string;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs?: number;
}

// Plan-specified rate limits
export const VOTE_PER_MINUTE: RateLimitConfig = {
  windowMs: 60_000,
  max: 30,
  name: "vote-min",
};
export const VOTE_PER_HOUR: RateLimitConfig = {
  windowMs: 3_600_000,
  max: 100,
  name: "vote-hr",
};
export const SUBMIT_PER_HOUR: RateLimitConfig = {
  windowMs: 3_600_000,
  max: 10,
  name: "submit-hr",
};

// Per-IP limits for unauthenticated auth endpoints (sign-in, NextAuth
// callbacks, magic-link sends). Numbers are deliberately small — real
// users hit sign-in a handful of times per session, while enumeration /
// brute-force / magic-link spam need >> 5 attempts to do anything useful.
export const AUTH_PER_MIN: RateLimitConfig = {
  windowMs: 60_000,
  max: 5,
  name: "auth-min",
};
export const AUTH_PER_HOUR: RateLimitConfig = {
  windowMs: 3_600_000,
  max: 30,
  name: "auth-hr",
};

// ── Upstash backend ──────────────────────────────────────────────
let redis: Redis | null = null;
const limiterCache = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function getUpstashLimiter(config: RateLimitConfig): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const cacheKey = `${config.name ?? `${config.max}@${config.windowMs}`}`;
  const cached = limiterCache.get(cacheKey);
  if (cached) return cached;
  const limiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(config.max, `${config.windowMs} ms`),
    prefix: "psf-rl",
    analytics: false,
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

async function enforceUpstash(
  limiter: Ratelimit,
  key: string
): Promise<RateLimitResult> {
  const result = await limiter.limit(key);
  return {
    ok: result.success,
    remaining: result.remaining,
    retryAfterMs: result.success ? undefined : result.reset - Date.now(),
  };
}

// ── In-memory backend ────────────────────────────────────────────
function enforceMemory(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const cutoff = now - config.windowMs;
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
  if (bucket.timestamps.length >= config.max) {
    const earliest = bucket.timestamps[0];
    buckets.set(key, bucket);
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: Math.max(0, earliest + config.windowMs - now),
    };
  }
  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: config.max - bucket.timestamps.length };
}

// ── Public API ───────────────────────────────────────────────────
export async function enforce(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(config);
  if (upstash) {
    return enforceUpstash(upstash, key);
  }
  return enforceMemory(key, config);
}
