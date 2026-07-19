// Regression test for the Upstash credential-name mismatch that silently
// disabled the production rate limiter and keepalive cron.
//
// The Vercel Upstash Marketplace integration injects creds as KV_REST_API_*,
// while manual setup / @upstash/redis fromEnv() use UPSTASH_REDIS_REST_*.
// resolveRedisCreds() must accept EITHER pair so Redis is built in both cases.

import { describe, expect, it } from "vitest";
import { resolveRedisCreds } from "../rate-limit";

describe("resolveRedisCreds", () => {
  it("resolves from the manual UPSTASH_* names", () => {
    expect(
      resolveRedisCreds({
        UPSTASH_REDIS_REST_URL: "https://u.example",
        UPSTASH_REDIS_REST_TOKEN: "utok",
      })
    ).toEqual({ url: "https://u.example", token: "utok" });
  });

  it("resolves from the Vercel Marketplace KV_* names", () => {
    expect(
      resolveRedisCreds({
        KV_REST_API_URL: "https://kv.example",
        KV_REST_API_TOKEN: "kvtok",
      })
    ).toEqual({ url: "https://kv.example", token: "kvtok" });
  });

  it("prefers UPSTASH_* when both pairs are present", () => {
    expect(
      resolveRedisCreds({
        UPSTASH_REDIS_REST_URL: "https://u.example",
        UPSTASH_REDIS_REST_TOKEN: "utok",
        KV_REST_API_URL: "https://kv.example",
        KV_REST_API_TOKEN: "kvtok",
      })
    ).toEqual({ url: "https://u.example", token: "utok" });
  });

  it("returns null when neither pair is complete", () => {
    expect(resolveRedisCreds({})).toBeNull();
    // URL without token, and token without URL, both incomplete → null.
    expect(
      resolveRedisCreds({
        UPSTASH_REDIS_REST_URL: "https://u.example",
      })
    ).toBeNull();
    expect(
      resolveRedisCreds({
        KV_REST_API_TOKEN: "kvtok",
      })
    ).toBeNull();
  });
});
