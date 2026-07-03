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

  it("adds connect_timeout and pgbouncer to a bare Neon pooler URL", () => {
    const out = params(`${NEON_POOLER}?sslmode=require`);
    expect(out.get("connect_timeout")).toBe("15");
    expect(out.get("pgbouncer")).toBe("true");
    expect(out.get("sslmode")).toBe("require"); // existing params preserved
  });

  it("leaves an already-configured pooler URL byte-for-byte unchanged", () => {
    const configured = `${NEON_POOLER}?sslmode=require&pgbouncer=true&connect_timeout=15`;
    expect(normalizeDatabaseUrl(configured)).toBe(configured);
  });

  it("never overrides an explicit connect_timeout", () => {
    const out = params(`${NEON_POOLER}?connect_timeout=5`);
    expect(out.get("connect_timeout")).toBe("5");
  });

  it("never overrides an explicit pgbouncer=false on the pooler", () => {
    const out = params(`${NEON_POOLER}?pgbouncer=false`);
    expect(out.get("pgbouncer")).toBe("false");
  });

  it("adds connect_timeout but NOT pgbouncer to a non-pooler (direct) host", () => {
    const out = params(
      "postgresql://u:p@ep-example-000.us-east-1.aws.neon.tech:5432/db"
    );
    expect(out.get("connect_timeout")).toBe("15");
    expect(out.has("pgbouncer")).toBe(false);
  });

  it("adds connect_timeout to a local Docker Postgres (harmless there)", () => {
    const out = params(
      "postgresql://postgres:postgres@localhost:5435/presidential_scoring"
    );
    expect(out.get("connect_timeout")).toBe("15");
    expect(out.has("pgbouncer")).toBe(false);
  });

  it("returns an unparseable value untouched so Prisma surfaces the real error", () => {
    expect(normalizeDatabaseUrl("not-a-url")).toBe("not-a-url");
    expect(normalizeDatabaseUrl("")).toBe("");
  });
});
