// Regression test for the KV heartbeat silently failing to keep Upstash alive.
//
// Upstash's free tier archives DBs it considers inactive, and PING doesn't
// count as activity — a daily PING cron returned 200 while the DB was still
// flagged inactive. touchRateLimitBackend() must issue a real data command
// (SET with a TTL, then GET) instead.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const set = vi.fn();
const get = vi.fn();
const ping = vi.fn();

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(function () {
    return { set, get, ping };
  }),
}));

const REDIS_ENV = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
] as const;

// getRedis() caches a module-level client, so re-import per test.
async function loadRateLimit() {
  vi.resetModules();
  return import("../rate-limit");
}

describe("touchRateLimitBackend", () => {
  beforeEach(() => {
    for (const name of REDIS_ENV) vi.stubEnv(name, undefined);
    set.mockReset().mockResolvedValue("OK");
    get.mockReset().mockResolvedValue(1_700_000_000_000);
    ping.mockReset().mockResolvedValue("PONG");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("writes the heartbeat key with a TTL and reads it back", async () => {
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kvtok");
    const { touchRateLimitBackend, HEARTBEAT_KEY, HEARTBEAT_TTL_SECONDS } =
      await loadRateLimit();

    await expect(touchRateLimitBackend()).resolves.toBe("ok");

    expect(set).toHaveBeenCalledWith(HEARTBEAT_KEY, expect.any(Number), {
      ex: HEARTBEAT_TTL_SECONDS,
    });
    expect(get).toHaveBeenCalledWith(HEARTBEAT_KEY);
    expect(set.mock.invocationCallOrder[0]).toBeLessThan(
      get.mock.invocationCallOrder[0]
    );
    // PING alone doesn't reset Upstash's inactivity clock.
    expect(ping).not.toHaveBeenCalled();
  });

  it("returns not-configured without touching Redis when env is absent", async () => {
    const { touchRateLimitBackend } = await loadRateLimit();

    await expect(touchRateLimitBackend()).resolves.toBe("not-configured");
    expect(set).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it("throws when the key is missing after SET", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://u.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "utok");
    get.mockResolvedValue(null);
    const { touchRateLimitBackend } = await loadRateLimit();

    await expect(touchRateLimitBackend()).rejects.toThrow(
      /missing after SET/
    );
  });
});
