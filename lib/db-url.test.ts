import { describe, it, expect } from "vitest";
import { normalizeDatabaseUrl } from "./db-url";

// Helper: normalize `raw`, then parse the result's query string for
// order-independent assertions (param serialization order isn't part of the
// contract). The normalize call is the point — assert on its output, not input.
function params(raw: string): URLSearchParams {
  return new URL(normalizeDatabaseUrl(raw)).searchParams;
}

describe("normalizeDatabaseUrl", () => {
  // Fabricated endpoint — the normalizer only keys on the "-pooler" substring,
  // so a placeholder host exercises the same branch without publishing a real
  // database endpoint in this public repo.
  const NEON_POOLER =
    "postgresql://u:p@ep-example-000-pooler.us-east-1.aws.neon.tech:5432/db";

  it("adds the full pool budget to a bare Neon pooler URL", () => {
    const out = params(`${NEON_POOLER}?sslmode=require`);
    expect(out.get("connect_timeout")).toBe("8");
    expect(out.get("pool_timeout")).toBe("10");
    expect(out.get("connection_limit")).toBe("10");
    expect(out.get("pgbouncer")).toBe("true");
    expect(out.get("sslmode")).toBe("require"); // existing params preserved
  });

  it("keeps connect_timeout strictly below pool_timeout (P2024 invariant)", () => {
    const out = params(`${NEON_POOLER}`);
    expect(Number(out.get("connect_timeout"))).toBeLessThan(
      Number(out.get("pool_timeout"))
    );
  });

  it("caps the managed connect_timeout=15 down to the ceiling", () => {
    // Vercel's Neon integration ships =15, which exceeds pool_timeout and was
    // the direct trigger for the cold-start P2024 — must be clamped, not kept.
    const out = params(`${NEON_POOLER}?pgbouncer=true&connect_timeout=15`);
    expect(out.get("connect_timeout")).toBe("8");
  });

  it("respects an explicit connect_timeout below the ceiling", () => {
    const out = params(`${NEON_POOLER}?connect_timeout=5`);
    expect(out.get("connect_timeout")).toBe("5");
  });

  it("never overrides an explicit pool_timeout or connection_limit", () => {
    const out = params(`${NEON_POOLER}?pool_timeout=20&connection_limit=3`);
    expect(out.get("pool_timeout")).toBe("20");
    expect(out.get("connection_limit")).toBe("3");
  });

  it("never overrides an explicit pgbouncer=false on the pooler", () => {
    const out = params(`${NEON_POOLER}?pgbouncer=false`);
    expect(out.get("pgbouncer")).toBe("false");
  });

  it("leaves a fully-configured pooler URL byte-for-byte unchanged", () => {
    const configured =
      `${NEON_POOLER}?sslmode=require&pgbouncer=true` +
      `&connect_timeout=8&pool_timeout=10&connection_limit=10`;
    expect(normalizeDatabaseUrl(configured)).toBe(configured);
  });

  it("applies connect_timeout but NO pool params to a non-pooler (direct) host", () => {
    const out = params(
      "postgresql://u:p@ep-example-000.us-east-1.aws.neon.tech:5432/db"
    );
    expect(out.get("connect_timeout")).toBe("8");
    expect(out.has("pool_timeout")).toBe(false);
    expect(out.has("connection_limit")).toBe(false);
    expect(out.has("pgbouncer")).toBe(false);
  });

  it("applies connect_timeout but NO pool params to a local Docker Postgres", () => {
    const out = params(
      "postgresql://postgres:postgres@localhost:5435/presidential_scoring"
    );
    expect(out.get("connect_timeout")).toBe("8");
    expect(out.has("pool_timeout")).toBe(false);
    expect(out.has("connection_limit")).toBe(false);
    expect(out.has("pgbouncer")).toBe(false);
  });

  it("returns an unparseable value untouched so Prisma surfaces the real error", () => {
    expect(normalizeDatabaseUrl("not-a-url")).toBe("not-a-url");
    expect(normalizeDatabaseUrl("")).toBe("");
  });
});
